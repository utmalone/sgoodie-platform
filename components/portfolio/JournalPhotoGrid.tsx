'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PhotoAsset } from '@/types';
import { GalleryLightbox } from './GalleryLightbox';
import styles from '@/styles/public/JournalPhotoGrid.module.css';

type JournalPhotoGridProps = {
  photos: PhotoAsset[];
};

/**
 * Photo grid for journal post detail pages.
 * 3-column grid with smaller photos and more side padding.
 */
export function JournalPhotoGrid({ photos }: JournalPhotoGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const handlePrev = () => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current - 1 + photos.length) % photos.length;
    });
  };

  const handleNext = () => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current + 1) % photos.length;
    });
  };

  return (
    <>
      <div className={styles.grid}>
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            type="button"
            className={styles.item}
            onClick={() => setActiveIndex(idx)}
            aria-label={`View ${photo.alt}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
              className={styles.image}
            />
          </button>
        ))}
      </div>
      <GalleryLightbox
        photos={photos}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </>
  );
}
