'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PhotoAsset } from '@/types';
import { GalleryLightbox } from './GalleryLightbox';
import styles from '@/styles/public/HeroImage.module.css';

type HeroImageProps = {
  photo: PhotoAsset;
};

export function HeroImage({ photo }: HeroImageProps) {
  const [active, setActive] = useState(false);

  return (
    <>
      <div className={styles.wrapper}>
        <div className={styles.imageWrap}>
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 80vw"
            className={styles.image}
          />
        </div>
        <button
          type="button"
          onClick={() => setActive(true)}
          className={styles.button}
        >
          View fullsize
        </button>
      </div>
      <GalleryLightbox
        photos={[photo]}
        index={active ? 0 : null}
        onClose={() => setActive(false)}
        onPrev={() => {}}
        onNext={() => {}}
      />
    </>
  );
}
