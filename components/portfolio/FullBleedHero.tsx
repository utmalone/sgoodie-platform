'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import type { PhotoAsset } from '@/types';
import styles from '@/styles/public/FullBleedHero.module.css';

type FullBleedHeroProps = {
  photo: PhotoAsset;
  children?: ReactNode;
  minHeight?: 'screen' | 'tall';
  overlay?: 'dark' | 'light' | 'none';
  offset?: boolean;
};

export function FullBleedHero({
  photo,
  children,
  minHeight = 'screen',
  overlay = 'dark',
  offset = true
}: FullBleedHeroProps) {
  const minHeightClass = minHeight === 'tall' ? styles.minTall : styles.minScreen;
  const overlayClass =
    overlay === 'light' ? styles.overlayLight : overlay === 'none' ? styles.overlayNone : styles.overlayDark;
  const offsetClass = offset ? styles.offsetHeader : '';

  return (
    <section className={`${styles.wrapper} ${minHeightClass} ${offsetClass}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        priority
        sizes="100vw"
        className={styles.image}
      />
      <div className={`${styles.overlay} ${overlayClass}`} />
      {children && (
        <div className={styles.content}>{children}</div>
      )}
    </section>
  );
}
