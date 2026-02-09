'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const PREVIEW_BANNER_HEIGHT = '2rem';

export function PreviewBanner() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'draft';

  useEffect(() => {
    if (isPreview) {
      document.body.classList.add('preview-banner-visible');
      document.documentElement.style.setProperty('--preview-banner-height', PREVIEW_BANNER_HEIGHT);
    } else {
      document.body.classList.remove('preview-banner-visible');
      document.documentElement.style.removeProperty('--preview-banner-height');
    }
    return () => {
      document.body.classList.remove('preview-banner-visible');
      document.documentElement.style.removeProperty('--preview-banner-height');
    };
  }, [isPreview]);

  if (!isPreview) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        display: 'flex',
        width: '100%',
        height: PREVIEW_BANNER_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fbbf24',
        flexShrink: 0,
        boxSizing: 'border-box'
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
        Preview
      </span>
    </div>
  );
}
