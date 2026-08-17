'use client'

import { useState } from 'react'
import { updateProfile, uploadMeme, uploadAvatar, deleteAvatar, deleteMeme } from '../actions'
import Link from 'next/link'
import { useAppContext } from '@/components/AppProvider'
import ImageCropperModal from '@/components/ImageCropperModal'

export default function ProfileClient({ user }: { user: any }) {
  const [displayName, setDisplayName] = useState(user.displayName || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')
  const [memes, setMemes] = useState<any[]>(user.memes || [])
  const [saving, setSaving] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null)
  const [lastNameChangeAt, setLastNameChangeAt] = useState<string | null>(user.lastNameChangeAt)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<'avatar' | number | null>(null)
  const { t } = useAppContext()

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3000)
  }
  
  let canChangeName = true
  let nextAvailableDate = ''
  if (lastNameChangeAt) {
    const lastChange = new Date(lastNameChangeAt)
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 30) {
      canChangeName = false
      const nextDate = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000)
      nextAvailableDate = nextDate.toLocaleDateString()
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canChangeName) return
    setSaving(true)
    const res = await updateProfile(user.id, displayName)
    setSaving(false)
    if (res.success) {
      showToast('Profile updated successfully!')
      if (res.lastNameChangeAt) {
        setLastNameChangeAt(res.lastNameChangeAt)
      }
    } else {
      showToast(res.error || 'Failed to update profile.', 'error')
    }
  }

  const handleUpload = async (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result as string)
      setCropTarget(slotIndex)
    }
    reader.readAsDataURL(file)
    // Clear input so same file can be selected again
    e.target.value = ''
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result as string)
      setCropTarget('avatar')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropComplete = async (croppedFile: File) => {
    setCropImageSrc(null)
    const target = cropTarget
    setCropTarget(null)

    const formData = new FormData()
    formData.append('file', croppedFile)

    setIsProcessing(true)
    if (target === 'avatar') {
      const res = await uploadAvatar(user.id, formData)
      if (res.success) {
        setAvatarUrl(res.avatarUrl)
        showToast('Avatar updated!')
      } else {
        showToast('Failed to upload avatar.', 'error')
      }
    } else if (typeof target === 'number') {
      const res = await uploadMeme(user.id, target, formData)
      if (res.success && res.meme) {
        setMemes(prev => {
          const next = prev.filter(m => m.slotIndex !== target)
          next.push(res.meme)
          return next
        })
        showToast('Meme uploaded!')
      } else {
        showToast('Failed to upload meme.', 'error')
      }
    }
    setIsProcessing(false)
  }

  const handleDeleteAvatar = () => {
    setConfirmDialog({
      message: t('deleteAvatarConfirm'),
      onConfirm: async () => {
        setConfirmDialog(null)
        setIsProcessing(true)
        const res = await deleteAvatar(user.id)
        if (res.success) {
          setAvatarUrl('')
          showToast('Avatar deleted.')
        } else {
          showToast('Failed to delete avatar.', 'error')
        }
        setIsProcessing(false)
      }
    })
  }

  const handleDeleteMeme = (slotIndex: number) => {
    setConfirmDialog({
      message: t('deleteMemeConfirm'),
      onConfirm: async () => {
        setConfirmDialog(null)
        setIsProcessing(true)
        const res = await deleteMeme(user.id, slotIndex)
        if (res.success) {
          setMemes(prev => prev.filter(m => m.slotIndex !== slotIndex))
          showToast('Meme deleted.')
        } else {
          showToast('Failed to delete meme.', 'error')
        }
        setIsProcessing(false)
      }
    })
  }

  const numSlots = Math.floor(user.level / 2)
  const slots = Array.from({ length: numSlots }).map((_, i) => i)

  return (
    <div className="container">
      <nav className="nav">
        <h1>{t('profile')}</h1>
        <div className="nav-links">
          <Link href="/" className="btn btn-secondary">{t('backToGame')}</Link>
        </div>
      </nav>

      <div className="card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <h2>{t('updateProfile')}</h2>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginTop: '1.5rem' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
            {/* Inner mask for the avatar image */}
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--primary-color)' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                  {t('uploadAvatar')}
                </div>
              )}
            </div>

            {avatarUrl && (
              <button 
                onClick={handleDeleteAvatar}
                style={{ 
                  position: 'absolute', 
                  top: -5, right: -5, 
                  background: 'var(--bg-color, #fff)', 
                  color: 'var(--primary-color)', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '28px', height: '28px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', zIndex: 10, fontSize: '16px', fontWeight: 'bold',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
                title="Delete Avatar"
              >
                X
              </button>
            )}

            {!avatarUrl && (
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', borderRadius: '50%' }} 
                title={t('uploadAvatar')}
              />
            )}
            
            {avatarUrl && (
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 5, borderRadius: '50%' }} 
                title={t('uploadAvatar')}
              />
            )}
          </div>

          <div style={{ flexGrow: 1 }}>
            <form onSubmit={handleSave} className="flex-form">
              <div className="form-group flex-form-input">
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  placeholder={t('displayNamePlaceholder')} 
                  className="input"
                  style={{ width: '100%' }}
                  disabled={!canChangeName}
                />
              </div>
              <button type="submit" className="btn flex-form-btn" disabled={saving || !canChangeName}>
                {saving ? t('saving') : t('save')}
              </button>
            </form>
            {!canChangeName && (
              <p style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {t('changeNameLimitMsg')} {nextAvailableDate}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <h2>{t('yourMemeCollection')}</h2>
        <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
          Level {user.level} unlocks {numSlots} slots.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {slots.map(slotIndex => {
            const meme = memes.find((m: any) => m.slotIndex === slotIndex)
            return (
              <div 
                key={slotIndex} 
                className="meme-slot" 
                style={{ 
                  position: 'relative',
                  height: '150px'
                }}
              >
                <div style={{ 
                  width: '100%', height: '100%',
                  border: meme ? 'none' : '2px dashed var(--primary-color)', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                }}>
                  {meme ? (
                    <img src={meme.imageUrl} alt={`Meme ${slotIndex}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--primary-color)' }}>
                      <span style={{ fontSize: '2rem', display: 'block' }}>+</span>
                    </div>
                  )}
                </div>

                {meme && (
                  <button 
                    onClick={() => handleDeleteMeme(slotIndex)}
                    style={{ 
                      position: 'absolute', 
                      top: -10, right: -10, 
                      background: 'var(--bg-color, #fff)', 
                      color: 'var(--primary-color)', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: '28px', height: '28px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', zIndex: 10, fontSize: '16px', fontWeight: 'bold',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}
                    title="Delete Meme"
                  >
                    X
                  </button>
                )}
                
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleUpload(slotIndex, e)} 
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 5, borderRadius: '12px' }} 
                />
              </div>
            )
          })}
          {numSlots === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Reach Level 2 to unlock your first meme slot!</p>}
        </div>
      </div>

      {cropImageSrc && (
        <ImageCropperModal 
          imageSrc={cropImageSrc}
          onClose={() => { setCropImageSrc(null); setCropTarget(null) }}
          onCropComplete={handleCropComplete}
          circularCrop={cropTarget === 'avatar'}
        />
      )}
      
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--primary-color)', padding: '2rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <div style={{ width: '20px', height: '20px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Processing...
            </div>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          background: toastMsg.type === 'error' ? '#d32f2f' : 'var(--primary-color)', 
          color: '#fff', 
          padding: '1rem 2rem', 
          borderRadius: '8px', 
          zIndex: 9999,
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {toastMsg.text}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideUp { 0% { transform: translate(-50%, 100%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }
          `}} />
        </div>
      )}

      {/* Confirm Dialog Modal */}
      {confirmDialog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--primary-color)', padding: '2.5rem', borderRadius: '12px', color: '#fff', width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '1.25rem' }}>{confirmDialog.message}</h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => setConfirmDialog(null)}
                style={{ background: 'var(--bg-color)', color: 'var(--primary-color)', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '999px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDialog.onConfirm} 
                style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '999px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
