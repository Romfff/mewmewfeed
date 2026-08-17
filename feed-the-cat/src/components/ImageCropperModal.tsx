'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/utils/cropImage'
import { useAppContext } from './AppProvider'

interface ImageCropperModalProps {
  imageSrc: string
  onClose: () => void
  onCropComplete: (croppedFile: File) => void
  circularCrop?: boolean
  aspectRatio?: number
}

export default function ImageCropperModal({ 
  imageSrc, 
  onClose, 
  onCropComplete, 
  circularCrop = true,
  aspectRatio = 1 
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { t } = useAppContext()

  const handleCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    try {
      setIsProcessing(true)
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (croppedFile) {
        onCropComplete(croppedFile)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div className="modal" style={{ width: '90%', maxWidth: '500px', padding: '1rem', display: 'flex', flexDirection: 'column', height: '80vh' }}>
        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>{t('cropImage') || 'Crop Image'}</h2>
        
        <div style={{ position: 'relative', flex: 1, backgroundColor: '#333', borderRadius: '8px', overflow: 'hidden' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={circularCrop ? 'round' : 'rect'}
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        
        <div style={{ padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ whiteSpace: 'nowrap' }}>Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }} disabled={isProcessing}>
            {t('close') || 'Cancel'}
          </button>
          <button className="btn" onClick={handleSave} style={{ flex: 1 }} disabled={isProcessing}>
            {isProcessing ? t('saving') : (t('save') || 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}
