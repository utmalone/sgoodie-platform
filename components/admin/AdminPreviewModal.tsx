'use client';

import { useEffect, useState } from 'react';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

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

  if (!isOpen) return null;

  // Add preview query param so pages know to show draft content
  const separator = initialPath.includes('?') ? '&' : '?';
  const previewUrl = `${initialPath}${separator}preview=draft&refresh=${refreshKey}`;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
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
          key={previewUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          onLoad={() => setIsLoading(false)}
          title="Site Preview"
        />
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
