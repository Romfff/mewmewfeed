'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { feedCat, claimReward } from './actions'
import { useAppContext } from '@/components/AppProvider'
import Loading from './loading'

type FoodIcon = {
  id: number
  x: number
  y: number
  emoji: string
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; username: string; displayName?: string } | null>(null)
  const [level, setLevel] = useState(1)
  const [exp, setExp] = useState(0)
  const [expNeeded, setExpNeeded] = useState(100)
  const [foods, setFoods] = useState<FoodIcon[]>([])
  const [showAd, setShowAd] = useState(false)
  const [isMouthOpen, setIsMouthOpen] = useState(false)
  
  const { t, lang, setLang, theme, setTheme } = useAppContext()

  // Web Audio API for zero-latency, high quality overlapping sound
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const catRef = useRef<HTMLImageElement>(null)
  
  // Batching mechanism
  const pendingClicksRef = useRef(0)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getExpNeededForLevel = (lvl: number) => 100 + (lvl - 1) * 50

  useEffect(() => {
    // Ping the sync route every 15 seconds to ensure Redis -> Postgres synchronization
    // This acts as a decentralized cron job while players are active
    const interval = setInterval(() => {
      fetch('/api/cron/sync', { cache: 'no-store' }).catch(console.error)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Initialize Web Audio API for pristine pop sound
    if (typeof window !== 'undefined' && !audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass()
        fetch('/pop.mp3')
          .then(res => res.arrayBuffer())
          .then(buffer => audioCtxRef.current?.decodeAudioData(buffer))
          .then(decodedData => {
            if (decodedData) audioBufferRef.current = decodedData
          })
          .catch(err => console.error("Error decoding audio:", err))
      }
    }

    fetch('/api/user/me', { cache: 'no-store' })
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Not logged in')
      })
      .then(data => {
        setUser(data.user)
        setLevel(data.level)
        setExp(data.exp)
        setExpNeeded(data.expNeeded)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  const playPopSound = () => {
    if (audioCtxRef.current && audioBufferRef.current) {
      // Resume context if it was suspended (iOS requires this inside user interaction)
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      const source = audioCtxRef.current.createBufferSource()
      source.buffer = audioBufferRef.current
      
      const gainNode = audioCtxRef.current.createGain()
      gainNode.gain.value = 0.2 // Soft volume
      
      source.connect(gainNode)
      gainNode.connect(audioCtxRef.current.destination)
      source.start(0)
    }
  }

  const handlePointerUp = useCallback(() => {
    setIsMouthOpen(false)
  }, [])

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerUp])

  const clickTimestampsRef = useRef<number[]>([])

  const handleFeed = useCallback(
    async (e: React.MouseEvent | React.TouchEvent) => {
      // 1. Anti-Cheat: Reject programmatic clicks (console scripts)
      if (!e.isTrusted) return

      // Prevent double firing if children are clicked
      if (e.target instanceof HTMLElement && e.target.closest('.modal')) return

      if (!user) return

      // 2. Anti-Cheat: Max Clicks Per Second (CPS) limit
      const now = Date.now()
      // Remove timestamps older than 1 second
      clickTimestampsRef.current = clickTimestampsRef.current.filter(t => now - t < 1000)
      
      // Limit to 20 CPS (clicks per second). Anything faster is blocked.
      if (clickTimestampsRef.current.length >= 20) {
        return // Ignore this click
      }
      clickTimestampsRef.current.push(now)

      let spawnX = 0
      let spawnY = 0

      // Calculate the position of the cat's mouth
      if (catRef.current) {
        const rect = catRef.current.getBoundingClientRect()
        spawnX = rect.left + rect.width / 2
        // The mouth is approximately at 65% of the image's height from the top
        spawnY = rect.top + rect.height * 0.65
      } else {
        // Fallback to center of screen
        spawnX = window.innerWidth / 2
        spawnY = window.innerHeight / 2
      }

      // Add a small random offset so icons don't perfectly stack
      spawnX += (Math.random() - 0.5) * 40
      spawnY += (Math.random() - 0.5) * 40

      // Visual / Audio feedback for popcat
      setIsMouthOpen(true)
      playPopSound()

      // Add food icon animation
      const foodEmojis = ['🐟', '🍗', '🥩', '🥛', '🍤']
      const newFood: FoodIcon = {
        id: Date.now() + Math.random(),
        x: spawnX,
        y: spawnY,
        emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
      }

      setFoods(prev => [...prev, newFood])
      
      // Remove food icon after animation
      setTimeout(() => {
        setFoods(prev => prev.filter(f => f.id !== newFood.id))
      }, 1000)

      // Clean up previous timeouts for mouth animation
      if ((window as any).mouthTimeout) {
        clearTimeout((window as any).mouthTimeout)
      }

      setIsMouthOpen(true)
      playPopSound()

      ;(window as any).mouthTimeout = setTimeout(() => {
        setIsMouthOpen(false)
      }, 150)

      // --- OPTIMISTIC UI UPDATE ---
      let newExp = exp + 1
      let newLevel = level
      let currentExpNeeded = expNeeded
      let leveledUpNow = false

      if (newExp >= currentExpNeeded) {
        newLevel += 1
        newExp -= currentExpNeeded
        currentExpNeeded = getExpNeededForLevel(newLevel)
        leveledUpNow = true
      }

      setExp(newExp)
      setLevel(newLevel)
      setExpNeeded(currentExpNeeded)
      
      if (leveledUpNow) {
        setShowAd(true)
      }

      // --- BATCH REQUEST TO SERVER ---
      pendingClicksRef.current += 1

      if (!syncTimeoutRef.current) {
        syncTimeoutRef.current = setTimeout(() => {
          syncTimeoutRef.current = null
          
          const clicksToSync = pendingClicksRef.current
          if (clicksToSync > 0) {
            pendingClicksRef.current = 0 // Reset immediately to capture new clicks
            
            feedCat(user.id, clicksToSync).then(res => {
              if (res && res.success) {
                // Only sync if server is strictly AHEAD of our local optimistic state
                // This prevents older requests that resolve late from dragging the level down
                setLevel(prevLevel => {
                  setExp(prevExp => {
                    if (res.level > prevLevel || (res.level === prevLevel && res.exp > prevExp)) {
                      setExpNeeded(res.expNeeded)
                      return res.exp
                    }
                    return prevExp
                  })
                  if (res.level > prevLevel) return res.level
                  return prevLevel
                })
              }
            }).catch(() => {
              // If request fails, add the clicks back to the queue
              pendingClicksRef.current += clicksToSync
            })
          }
        }, 1000)
      }
    },
    [user, exp, level, expNeeded]
  )

  const handleClaimReward = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user) return

    // Mở tab quảng cáo
    window.open("https://omg10.com/4/11584778", "_blank", "noopener,noreferrer")

    // Ẩn modal ngay lập tức
    setShowAd(false)

    // Gọi API cộng điểm
    try {
      // 1. MUST flush pending clicks to server first! Otherwise server doesn't know we leveled up!
      if (pendingClicksRef.current > 0) {
        const clicksToSync = pendingClicksRef.current
        pendingClicksRef.current = 0
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current)
        }
        await feedCat(user.id, clicksToSync)
      }

      // 2. Now it's safe to claim reward because server state is synced
      const res = await claimReward(user.id)
      if (res.success && res.level !== undefined && res.exp !== undefined && res.expNeeded !== undefined) {
        setLevel(res.level)
        setExp(res.exp)
        setExpNeeded(res.expNeeded)
        if (res.leveledUp) {
          setShowAd(true)
        }
      }
    } catch (error) {
      console.error('Failed to claim reward', error)
    }
  }, [user])

  if (!user) return <Loading />

  const progressPercentage = Math.min((exp / expNeeded) * 100, 100)

  return (
    <div className="container" style={{ padding: 0 }}>
      <nav className="nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.jpg" alt="MewMewFeed Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
          <h1>MewMewFeed</h1>
        </div>
        <div className="nav-links">
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
            onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
          >
            {lang === 'en' ? '🇻🇳 VI' : '🇬🇧 EN'}
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <span style={{ fontWeight: 'bold' }}>{t('welcome')}, {user.displayName || user.username}</span>
          <Link href="/profile" className="btn btn-secondary">{t('profile')}</Link>
          <Link href="/leaderboard" className="btn btn-secondary">{t('leaderboard')}</Link>
          <Link href="/search" className="btn btn-secondary">{t('search')}</Link>
          <form action="/api/auth/logout" method="POST">
            <button className="btn" style={{ padding: '0.5rem 1rem' }}>{t('logout')}</button>
          </form>
        </div>
      </nav>

      <main className="game-area" onPointerDown={handleFeed}>
        <div className="level-info" onPointerDown={(e) => e.stopPropagation()}>
          <h2>{t('level')} {level}</h2>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
            <div className="progress-text">{exp} / {expNeeded} EXP</div>
          </div>
        </div>

        <div className="cat-container">
          <img 
            ref={catRef}
            src={isMouthOpen ? "/popcat_open.png" : "/popcat_closed.png"} 
            alt="Popcat" 
            className="cat-image main-cat"
            draggable="false"
          />
        </div>

        {/* Background Meme Cats */}
        <div className="bg-memes-container">
          <img src="/side_cat_1.png" alt="Sticker 1" className="bg-meme bg-meme-1" draggable="false" />
          <img src="/side_cat_2.png" alt="Sticker 2" className="bg-meme bg-meme-2" draggable="false" />
          <img src="/side_cat_1.png" alt="Sticker 3" className="bg-meme bg-meme-3" draggable="false" />
          <img src="/side_cat_2.png" alt="Sticker 4" className="bg-meme bg-meme-4" draggable="false" />
          <img src="/side_cat_1.png" alt="Sticker 5" className="bg-meme bg-meme-5" draggable="false" />
          <img src="/side_cat_2.png" alt="Sticker 6" className="bg-meme bg-meme-6" draggable="false" />
        </div>

        {foods.map(food => (
          <div
            key={food.id}
            className="food-icon"
            style={{ left: food.x - 20, top: food.y - 20, position: 'fixed' }}
          >
            {food.emoji}
          </div>
        ))}
      </main>

      {showAd && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{t('levelUp')}</h2>
            <p style={{ marginBottom: '1rem' }}>{t('reachedLevel')} {level}!</p>
            <p>{t('claimRewardText')}</p>
            <a 
              href="https://omg10.com/4/11584778" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ad-link"
              onClick={handleClaimReward}
            >
              {t('claimRewardBtn')}
            </a>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAd(false)}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
