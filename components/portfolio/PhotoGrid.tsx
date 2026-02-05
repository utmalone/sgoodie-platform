'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PhotoAsset } from '@/types';
import { GalleryLightbox } from './GalleryLightbox';
import styles from '@/styles/public/PhotoGrid.module.css';

type PhotoGridProps = {
  photos: PhotoAsset[];
};

export function PhotoGrid({ photos }: PhotoGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return null;
  }

  function handlePrev() {
    setActiveIndex((idx) =>
      idx === null ? null : idx > 0 ? idx - 1 : photos.length - 1
    );
  }

  function handleNext() {
    setActiveIndex((idx) =>
      idx === null ? null : idx < photos.length - 1 ? idx + 1 : 0
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {photos.map((photo, idx) => (
          <figure key={photo.id} className={styles.figure}>
            <div className={styles.imageWrap}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={styles.image}
              />
            </div>
            <button type="button" onClick={() => setActiveIndex(idx)} className={styles.button}>
              View fullsize
            </button>
          </figure>
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
