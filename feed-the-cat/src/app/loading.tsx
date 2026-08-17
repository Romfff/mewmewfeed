'use client'

import { useAppContext } from '@/components/AppProvider'

export default function Loading() {
  const { t } = useAppContext()

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '80vh', 
      gap: '1.5rem',
      width: '100%'
    }}>
      <div className="loading-container">
        <img 
          src="/logo.jpg" 
          alt="Loading" 
          style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            objectFit: 'cover', 
            animation: 'pulse-image 2s infinite ease-in-out' 
          }} 
        />
      </div>
      <h2 style={{ 
        color: 'var(--text-color)', 
        animation: 'pulse-image 2s infinite ease-in-out', 
        fontWeight: 'bold',
        fontSize: '1.5rem',
        letterSpacing: '2px'
      }}>
        {t('loading') || 'Processing...'}
      </h2>
      
      <style>{`
        .loading-container {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: var(--bg-color);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse-shadow-light 2s infinite;
        }

        @keyframes pulse-image {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
        @keyframes pulse-shadow-light {
          0% { box-shadow: 5px 5px 10px #e6d8db, -5px -5px 10px #ffffff; }
          50% { box-shadow: 15px 15px 30px #e6d8db, -15px -15px 30px #ffffff; }
          100% { box-shadow: 5px 5px 10px #e6d8db, -5px -5px 10px #ffffff; }
        }
        
        [data-theme='dark'] .loading-container {
          animation: pulse-shadow-dark 2s infinite;
        }
        
        @keyframes pulse-shadow-dark {
          0% { box-shadow: 5px 5px 10px #1e1718, -5px -5px 10px #382b2e; }
          50% { box-shadow: 15px 15px 30px #1e1718, -15px -15px 30px #382b2e; }
          100% { box-shadow: 5px 5px 10px #1e1718, -5px -5px 10px #382b2e; }
        }
      `}</style>
    </div>
  )
}
