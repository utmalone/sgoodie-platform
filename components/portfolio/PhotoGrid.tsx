'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PhotoAsset } from '@/types';
import { Lightbox } from './Lightbox';
import styles from '@/styles/public/PhotoGrid.module.css';

type PhotoGridProps = {
  photos: PhotoAsset[];
};

export function PhotoGrid({ photos }: PhotoGridProps) {
  const [activePhoto, setActivePhoto] = useState<PhotoAsset | null>(null);

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.grid}>
        {photos.map((photo) => (
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
            <button type="button" onClick={() => setActivePhoto(photo)} className={styles.button}>
              View fullsize
            </button>
          </figure>
        ))}
      </div>
      <Lightbox photo={activePhoto} onClose={() => setActivePhoto(null)} />
    </>
  );
}
