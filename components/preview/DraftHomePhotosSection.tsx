'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PhotoAsset } from '@/types';
import { FullBleedHero } from '@/components/portfolio/FullBleedHero';
import { HomeGalleryGrid } from '@/components/portfolio/HomeGalleryGrid';
import styles from '@/styles/public/HomePage.module.css';

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

type DraftHomePhotosSectionProps = {
  isPreview: boolean;
  initialHeroPhoto: PhotoAsset | null;
  initialFeaturePhotos: PhotoAsset[];
  heroContent: ReactNode;
  introContent: ReactNode;
};

export function DraftHomePhotosSection({
  isPreview,
  initialHeroPhoto,
  initialFeaturePhotos,
  heroContent,
  introContent
}: DraftHomePhotosSectionProps) {
  const [heroPhoto, setHeroPhoto] = useState(initialHeroPhoto);
  const [featurePhotos, setFeaturePhotos] = useState(initialFeaturePhotos);

  useEffect(() => {
    if (!isPreview) return;

    const load = async () => {
      try {
        const layoutRes = await fetch('/api/admin/layouts/home');
        if (!layoutRes.ok) return;
        const layout = await layoutRes.json();
        const ids = [
          layout.heroPhotoId,
          ...(layout.featurePhotoIds || [])
        ].filter(Boolean);
        if (ids.length === 0) {
          setHeroPhoto(null);
          setFeaturePhotos([]);
          return;
        }
        const photosRes = await fetch(`/api/photos?ids=${encodeURIComponent(ids.join(','))}`);
        if (!photosRes.ok) return;
        const photos: PhotoAsset[] = await photosRes.json();
        const photoMap = new Map(photos.map((p) => [p.id, p]));
        setHeroPhoto(layout.heroPhotoId ? photoMap.get(layout.heroPhotoId) ?? null : null);
        setFeaturePhotos(
          (layout.featurePhotoIds || [])
            .map((id: string) => photoMap.get(id))
            .filter(Boolean)
        );
      } catch {
        // Keep existing data on error
      }
    };

    load();

    // React to admin changes: storage event fires in other tabs when admin calls refreshPreview()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PREVIEW_REFRESH_KEY) load();
    };
    window.addEventListener('storage', handleStorage);

    // Load when tab becomes visible (in case a storage event was missed while backgrounded)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isPreview]);

  return (
    <>
      {heroPhoto && (
        <FullBleedHero photo={heroPhoto} minHeight="screen">
          {heroContent}
        </FullBleedHero>
      )}
      <section className={styles.introSection}>
        <div className={styles.introWrapper}>{introContent}</div>
        <HomeGalleryGrid photos={featurePhotos} />
      </section>
    </>
  );
}
