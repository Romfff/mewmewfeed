'use client'

import Link from 'next/link'
import { useAppContext } from '@/components/AppProvider'

export default function UserClient({ user, numSlots, slots }: { user: any, numSlots: number, slots: number[] }) {
  const { t } = useAppContext()

  return (
    <div className="container">
      <nav className="nav">
        <h1>{user.displayName || user.username}'s {t('profile')}</h1>
        <div className="nav-links">
          <Link href="/search" className="btn btn-secondary">{t('searchUsers')}</Link>
          <Link href="/" className="btn btn-secondary">{t('backToGame')}</Link>
        </div>
      </nav>

      <div className="card" style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--primary-color)', marginBottom: '1rem', backgroundColor: 'rgba(0,0,0,0.05)' }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
              👤
            </div>
          )}
        </div>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{user.displayName || user.username}</h2>
        <p style={{ opacity: 0.8, fontSize: '1.2rem', marginBottom: '1rem' }}>
          {t('level')} {user.level} • {user.exp} {t('totalExp')}
        </p>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <h2>{user.displayName || user.username}'s Memes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {slots.map(slotIndex => {
            const meme = user.memes.find((m: any) => m.slotIndex === slotIndex)
            return (
              <div 
                key={slotIndex} 
                className="meme-slot" 
                style={{ 
                  border: '2px solid var(--primary-color)', 
                  borderRadius: '12px', 
                  height: '150px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  overflow: 'hidden', 
                  backgroundColor: 'rgba(0,0,0,0.05)'
                }}
              >
                {meme ? (
                  <img src={meme.imageUrl} alt={`Meme ${slotIndex}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', opacity: 0.5 }}>
                    <span style={{ fontSize: '2rem', display: 'block' }}>?</span>
                    <span style={{ fontSize: '0.8rem' }}>Empty</span>
                  </div>
                )}
              </div>
            )
          })}
          {numSlots === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>No meme slots unlocked.</p>}
        </div>
      </div>
    </div>
  )
}
