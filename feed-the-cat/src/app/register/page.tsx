'use client'

import { useActionState } from 'react'
import { register } from '../actions'
import { useAppContext } from '@/components/AppProvider'

export default function Register() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await register(prevState, formData)
    },
    null
  )
  const { t, lang, setLang, theme, setTheme } = useAppContext()

  return (
    <div className="container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}>
          {lang === 'en' ? '🇻🇳 VI' : '🇬🇧 EN'}
        </button>
        <button className="btn btn-secondary" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
          <img src="/logo.jpg" alt="MewMewFeed Logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          <h1 style={{ margin: 0, color: '#d84366' }}>MewMewFeed</h1>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>{t('registerTitle')}</h2>
        
        {state?.error && <div className="error">{state.error}</div>}
        
        <form action={formAction}>
          <div className="form-group">
            <label htmlFor="username">{t('username')}</label>
            <input type="text" id="username" name="username" required minLength={3} maxLength={20} />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <input type="password" id="password" name="password" required minLength={6} maxLength={100} />
          </div>
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }} disabled={isPending}>
            {isPending ? t('loading') : t('register')}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem' }}>
          <p>{t('haveAccount')} <a href="/login">{t('login')}</a></p>
        </div>
      </div>
    </div>
  )
}
