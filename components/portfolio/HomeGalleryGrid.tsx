'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { PhotoAsset } from '@/types';
import { GalleryLightbox } from './GalleryLightbox';
import styles from '@/styles/public/HomeGalleryGrid.module.css';

type HomeGalleryGridProps = {
  photos: PhotoAsset[];
};

export function HomeGalleryGrid({ photos }: HomeGalleryGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const safePhotos = useMemo(() => photos.filter(Boolean), [photos]);

  if (safePhotos.length === 0) return null;

  const handlePrev = () => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current - 1 + safePhotos.length) % safePhotos.length;
    });
  };

  const handleNext = () => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current + 1) % safePhotos.length;
    });
  };

  return (
    <>
      <div className={styles.grid}>
        {safePhotos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={styles.item}
            aria-label={`Open ${photo.alt}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
              className={styles.image}
            />
          </button>
        ))}
      </div>
      <GalleryLightbox
        photos={safePhotos}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </>
  );
}
