'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import type { PhotoAsset } from '@/types';
import styles from '@/styles/public/GalleryLightbox.module.css';

type GalleryLightboxProps = {
  photos: PhotoAsset[];
  index: number | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export function GalleryLightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext
}: GalleryLightboxProps) {
  const photo = index === null ? null : photos[index];

  useEffect(() => {
    if (index === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, onClose, onPrev, onNext]);

  useEffect(() => {
    if (index === null) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [index]);

  if (!photo) return null;

  return (
    <div className={styles.overlay}>
      <button type="button" onClick={onClose} className={styles.closeButton}>
        Close
      </button>
      <button
        type="button"
        onClick={onPrev}
        className={`${styles.navButton} ${styles.navButtonLeft}`}
        aria-label="Previous photo"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNext}
        className={`${styles.navButton} ${styles.navButtonRight}`}
        aria-label="Next photo"
      >
        ›
      </button>
      <div className={styles.imageWrap}>
        <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} className={styles.image} />
      </div>
    </div>
  );
}
