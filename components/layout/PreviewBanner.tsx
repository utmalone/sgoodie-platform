'use client';

import { useSearchParams } from 'next/navigation';

export function PreviewBanner() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'draft';

  if (!isPreview) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fbbf24',
        padding: '0.375rem 0',
        flexShrink: 0
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
