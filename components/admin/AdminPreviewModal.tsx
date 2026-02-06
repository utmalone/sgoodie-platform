'use client';

import { Activity, useEffect, useState } from 'react';

type AdminPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialPath?: string;
  refreshKey?: number;
};

export function AdminPreviewModal({
  isOpen,
  onClose,
  initialPath = '/',
  refreshKey = 0
}: AdminPreviewModalProps) {
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [toastMessage] = useState<string>('Preview refreshed');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialPath]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Add preview query param so pages know to show draft content
  const separator = initialPath.includes('?') ? '&' : '?';
  const previewUrl = `${initialPath}${separator}preview=draft&refresh=${refreshKey}`;
  const iframeKey = previewUrl;
  const isLoading = isOpen && loadedKey !== iframeKey;
  const showToast = isOpen && refreshKey > 0;

  return (
    <Activity mode={isOpen ? 'visible' : 'hidden'} name="AdminPreviewModal">
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: isOpen ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Preview Bar - Yellow sliver */}
        <button
          type="button"
          onClick={onClose}
          style={{
            flexShrink: 0,
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fbbf24',
            padding: '0.375rem 0',
            cursor: 'pointer',
            border: 'none'
          }}
        >
          <span 
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#000',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Close Preview
          </span>
        </button>

        {/* iframe container - takes remaining space */}
        <div 
          style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden',
            backgroundColor: '#fff'
          }}
        >
          {showToast && (
            <div
              key={`toast-${refreshKey}`}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                zIndex: 20,
                padding: '0.5rem 0.75rem',
                backgroundColor: 'rgba(17, 24, 39, 0.92)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '999px',
                boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
                animation: 'toastFade 2.2s ease-out',
                animationFillMode: 'forwards',
                pointerEvents: 'none'
              }}
              aria-live="polite"
            >
              {toastMessage}
            </div>
          )}
          {isLoading && (
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff',
                zIndex: 10
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div 
                  style={{
                    height: '1.5rem',
                    width: '1.5rem',
                    borderRadius: '50%',
                    border: '2px solid rgba(0,0,0,0.1)',
                    borderTopColor: 'rgba(0,0,0,0.6)',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: 'rgba(0,0,0,0.5)' }}>Loading...</span>
              </div>
            </div>
          )}
          <iframe
            src={previewUrl}
            key={iframeKey}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            onLoad={() => setLoadedKey(iframeKey)}
            title="Site Preview"
          />
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes toastFade {
            0% { opacity: 0; transform: translateY(-6px); }
            15% { opacity: 1; transform: translateY(0); }
            70% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-6px); }
          }
        `}</style>
      </div>
    </Activity>
  );
}
