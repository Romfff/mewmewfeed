'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppContext } from '@/components/AppProvider'
import { searchUser } from '../actions'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { t } = useAppContext()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setLoading(true)
      setError('')
      const res = await searchUser(query.trim())
      setLoading(false)
      if (res.success && res.username) {
        router.push(`/user/${encodeURIComponent(res.username)}`)
      } else {
        setError(res.error || 'User not found')
      }
    }
  }

  return (
    <div className="container">
      <nav className="nav">
        <h1>{t('searchUsers')}</h1>
        <div className="nav-links">
          <Link href="/leaderboard" className="btn btn-secondary">{t('leaderboard')}</Link>
          <Link href="/" className="btn btn-secondary">{t('backToGame')}</Link>
        </div>
      </nav>

      <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <h2>{t('findPlayer')}</h2>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Enter their exact username to view their public profile and meme collection.</p>
        
        <form onSubmit={handleSearch} className="flex-form">
          <div className="form-group flex-form-input">
            <input 
              type="text" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder={t('searchPlaceholder')} 
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <button type="submit" className="btn flex-form-btn" disabled={loading}>
            {loading ? t('loading') : t('search')}
          </button>
        </form>
        {error && <p style={{ color: 'var(--error-color)', marginTop: '1rem' }}>{error}</p>}
      </div>
    </div>
  )
}
