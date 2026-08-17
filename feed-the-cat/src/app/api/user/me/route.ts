import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { syncRedisToPostgres } from '@/app/actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  // Force sync from Redis to Postgres before returning user data
  await syncRedisToPostgres().catch(console.error)

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, username: true, displayName: true, level: true, exp: true }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const expToNextLevelBase = 100
  const getExpNeededForLevel = (lvl: number) => expToNextLevelBase + (lvl - 1) * 50

  return NextResponse.json({
    user: { id: user.id, username: user.username, displayName: user.displayName },
    level: user.level,
    exp: user.exp,
    expNeeded: getExpNeededForLevel(user.level)
  })
}
