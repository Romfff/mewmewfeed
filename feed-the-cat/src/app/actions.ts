'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { encrypt } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function login(prevState: any, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Username and password are required' }
  }

  const user = await prisma.user.findUnique({
    where: { username }
  })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: 'Invalid credentials' }
  }

  const session = await encrypt({ id: user.id, username: user.username })
  const cookieStore = await cookies()
  cookieStore.set('session', session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' })

  redirect('/')
}

export async function register(prevState: any, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password || username.length < 3 || username.length > 20 || password.length < 6 || password.length > 100) {
    return { error: 'Username must be 3-20 chars and password 6-100 chars' }
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/
  if (!usernameRegex.test(username)) {
    return { error: 'Username can only contain letters, numbers, and underscores' }
  }

  const existingUser = await prisma.user.findUnique({
    where: { username }
  })

  if (existingUser) {
    return { error: 'Username already exists' }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash
    }
  })

  const session = await encrypt({ id: user.id, username: user.username })
  const cookieStore = await cookies()
  cookieStore.set('session', session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' })

  redirect('/')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
  redirect('/login')
}

// Game Actions
export async function feedCat(userId: string, clicks: number = 1) {
  // Anti-Cheat: Max 100 clicks per batch (1 second throttle). This limits server-side bypasses but accommodates lag spikes.
  const validClicks = Math.min(Math.max(1, clicks), 100)
  const expToNextLevelBase = 100
  const getExpNeededForLevel = (lvl: number) => expToNextLevelBase + (lvl - 1) * 50

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({ url: redisUrl, token: redisToken })
    
    const expKey = `user:${userId}:exp`
    const levelKey = `user:${userId}:level`

    let fallbackExp = await redis.get(expKey) as number | null
    let fallbackLevel = await redis.get(levelKey) as number | null

    if (fallbackExp === null || fallbackLevel === null) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return { error: 'User not found' }
      fallbackExp = user.exp
      fallbackLevel = user.level
    }

    const script = `
      local exp = tonumber(redis.call("GET", KEYS[1]) or ARGV[1])
      local level = tonumber(redis.call("GET", KEYS[2]) or ARGV[2])
      local clicks = tonumber(ARGV[3])
      local expToNextLevelBase = 100
      
      exp = exp + clicks
      local expNeeded = expToNextLevelBase + (level - 1) * 50
      
      while exp >= expNeeded do
        level = level + 1
        exp = exp - expNeeded
        expNeeded = expToNextLevelBase + (level - 1) * 50
      end
      
      redis.call("SET", KEYS[1], exp)
      redis.call("SET", KEYS[2], level)
      redis.call("SADD", "sync_queue", KEYS[3])
      
      return {exp, level}
    `

    const result = await redis.eval(script, [expKey, levelKey, userId], [fallbackExp, fallbackLevel, validClicks]) as [number, number]
    const currentExp = result[0]
    const currentLevel = result[1]
    const expNeeded = getExpNeededForLevel(currentLevel)

    revalidatePath('/', 'layout')
    return {
      success: true,
      level: currentLevel,
      exp: currentExp,
      expNeeded,
      leveledUp: false // We can omit this for batch API
    }
  }

  // Fallback to Prisma if Redis is not configured
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'User not found' }

  let newExp = user.exp + validClicks
  let newLevel = user.level
  let expNeeded = getExpNeededForLevel(newLevel)
  let leveledUp = false

  while (newExp >= expNeeded) {
    newLevel += 1
    newExp -= expNeeded
    expNeeded = getExpNeededForLevel(newLevel)
    leveledUp = true
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { exp: newExp, level: newLevel }
  })

  revalidatePath('/', 'layout')
  return {
    success: true,
    level: updatedUser.level,
    exp: updatedUser.exp,
    expNeeded: getExpNeededForLevel(updatedUser.level),
    leveledUp
  }
}

export async function claimReward(userId: string) {
  // 1. Force sync from Redis to Postgres to ensure we reward the correct level
  await syncRedisToPostgres().catch(console.error)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'User not found' }

  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  
  let redis: any = null
  if (redisUrl && redisToken) {
    const { Redis } = await import('@upstash/redis')
    redis = new Redis({ url: redisUrl, token: redisToken })
    
    // Check cooldown (5 minutes)
    const cooldown = await redis.get(`user:${userId}:reward_cooldown`)
    if (cooldown) {
      return { error: 'Vui lòng đợi 5 phút để nhận lại phần thưởng!' }
    }
  }

  const expToNextLevelBase = 100
  const getExpNeededForLevel = (lvl: number) => expToNextLevelBase + (lvl - 1) * 50

  const expNeeded = getExpNeededForLevel(user.level)
  const rewardExp = Math.floor(expNeeded * 0.5) // 50% exp bonus

  let newExp = user.exp + rewardExp
  let newLevel = user.level

  let leveledUp = false
  if (newExp >= expNeeded) {
    newLevel += 1
    newExp -= expNeeded
    leveledUp = true
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      exp: newExp,
      level: newLevel
    }
  })

  // 2. Update Redis so the game doesn't roll back to the old state on the next click!
  if (redis) {
    await redis.set(`user:${userId}:exp`, newExp)
    await redis.set(`user:${userId}:level`, newLevel)
    await redis.set(`user:${userId}:reward_cooldown`, '1', { ex: 300 }) // 5 minutes cooldown
  }

  revalidatePath('/', 'layout')
  return {
    success: true,
    level: updatedUser.level,
    exp: updatedUser.exp,
    expNeeded: getExpNeededForLevel(updatedUser.level),
    rewardAmount: rewardExp,
    leveledUp
  }
}

// Profile Actions
export async function updateProfile(userId: string, displayName: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { error: 'User not found' }

    if (user.lastNameChangeAt) {
      const daysSinceChange = (Date.now() - user.lastNameChangeAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceChange < 30) {
        return { error: 'You can only change your display name once every 30 days.' }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        displayName,
        lastNameChangeAt: new Date()
      }
    })
    revalidatePath('/', 'layout')
    return { success: true, displayName: updatedUser.displayName, lastNameChangeAt: updatedUser.lastNameChangeAt }
  } catch (error) {
    return { error: 'Failed to update profile' }
  }
}

export async function searchUser(query: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: query, mode: 'insensitive' } },
          { displayName: { equals: query, mode: 'insensitive' } }
        ]
      }
    })
    
    if (user) {
      return { success: true, username: user.username }
    }
    return { success: false, error: 'User not found' }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Search failed' }
  }
}

async function deleteFromCloudinary(url: string | null) {
  if (!url || !url.includes('cloudinary.com')) return;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return;
    
    let startIndex = uploadIndex + 1;
    if (parts[startIndex].startsWith('v') && !isNaN(parseInt(parts[startIndex].substring(1)))) {
      startIndex++;
    }
    const publicIdWithExt = parts.slice(startIndex).join('/');
    const publicId = publicIdWithExt.split('.').slice(0, -1).join('.');

    const cloudinary = await import('cloudinary').then(m => m.v2)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })
    
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete from cloudinary:', error);
  }
}

export async function uploadAvatar(userId: string, formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user?.avatarUrl) {
      await deleteFromCloudinary(user.avatarUrl)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const cloudinary = await import('cloudinary').then(m => m.v2)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })

    const imageUrl = await new Promise<string>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'feed-the-cat-avatars', width: 256, height: 256, crop: 'fill', gravity: 'auto' }, 
        (error, result) => {
          if (error || !result) reject(error)
          else resolve(result.secure_url)
        }
      ).end(buffer)
    })

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: imageUrl }
    })

    revalidatePath('/', 'layout')
    return { success: true, avatarUrl: updatedUser.avatarUrl }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to upload avatar' }
  }
}

export async function deleteAvatar(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user?.avatarUrl) {
      await deleteFromCloudinary(user.avatarUrl)
    }
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null }
    })
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to delete avatar' }
  }
}

export async function uploadMeme(userId: string, slotIndex: number, formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  try {
    const existingMeme = await prisma.meme.findUnique({
      where: { userId_slotIndex: { userId, slotIndex } }
    })
    if (existingMeme?.imageUrl) {
      await deleteFromCloudinary(existingMeme.imageUrl)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const cloudinary = await import('cloudinary').then(m => m.v2)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })

    const imageUrl = await new Promise<string>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'feed-the-cat-memes', width: 400, height: 400, crop: 'fill', gravity: 'auto' }, 
        (error, result) => {
          if (error || !result) reject(error)
          else resolve(result.secure_url)
        }
      ).end(buffer)
    })

    const meme = await prisma.meme.upsert({
      where: { userId_slotIndex: { userId, slotIndex } },
      update: { imageUrl },
      create: { userId, slotIndex, imageUrl }
    })

    revalidatePath('/', 'layout')
    return { success: true, meme }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to upload meme' }
  }
}

export async function deleteMeme(userId: string, slotIndex: number) {
  try {
    const existingMeme = await prisma.meme.findUnique({
      where: { userId_slotIndex: { userId, slotIndex } }
    })
    if (existingMeme?.imageUrl) {
      await deleteFromCloudinary(existingMeme.imageUrl)
    }
    await prisma.meme.delete({
      where: { userId_slotIndex: { userId, slotIndex } }
    })
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: 'Failed to delete meme' }
  }
}


export async function syncRedisToPostgres() {
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) return { success: false, message: 'Redis not configured' }

  const { Redis } = await import('@upstash/redis')
  const redis = new Redis({ url: redisUrl, token: redisToken })

  // Pop up to 100 users from the sync_queue
  const userIds = (await redis.spop('sync_queue', 100)) as string[] | null
  if (!userIds || userIds.length === 0) return { success: true, message: 'No users to sync', count: 0 }

  let syncedCount = 0

  for (const userId of userIds) {
    const expKey = `user:${userId}:exp`
    const levelKey = `user:${userId}:level`

    const exp = await redis.get(expKey) as number | null
    const level = await redis.get(levelKey) as number | null

    if (exp !== null && level !== null) {
      await prisma.user.update({
        where: { id: userId as string },
        data: { exp, level }
      })
      syncedCount++
    }
  }

  return { success: true, message: `Synced ${syncedCount} users`, count: syncedCount }
}

