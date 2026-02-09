'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PhotoAsset } from '@/types';
import { FullBleedHero } from '@/components/portfolio/FullBleedHero';
import { HomeGalleryGrid } from '@/components/portfolio/HomeGalleryGrid';
import { loadDraftHomeLayout } from '@/lib/admin/draft-home-layout-store';
import styles from '@/styles/public/HomePage.module.css';

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';
const HOME_LAYOUT_DRAFT_KEY = 'sgoodie.admin.draft.homeLayout';

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
  const [heroTitleColor, setHeroTitleColor] = useState<string | undefined>();
  const [heroSubtitleColor, setHeroSubtitleColor] = useState<string | undefined>();

  useEffect(() => {
    if (!isPreview) return;

    const load = async () => {
      try {
        const [layoutRes, draft] = await Promise.all([
          fetch('/api/admin/layouts/home'),
          Promise.resolve(typeof window !== 'undefined' ? loadDraftHomeLayout() : null)
        ]);
        if (!layoutRes.ok) return;
        const layout = await layoutRes.json();

        // Merge draft layout over API - draft takes precedence for preview (unsaved changes)
        const heroPhotoId = draft?.heroPhotoId ?? layout.heroPhotoId;
        const featurePhotoIds = draft?.featurePhotoIds ?? layout.featurePhotoIds ?? [];

        setHeroTitleColor(draft?.heroTitleColor ?? layout.heroTitleColor ?? undefined);
        setHeroSubtitleColor(draft?.heroSubtitleColor ?? layout.heroSubtitleColor ?? undefined);

        const ids = [heroPhotoId, ...featurePhotoIds].filter(Boolean);
        if (ids.length === 0) {
          setHeroPhoto(null);
          setFeaturePhotos([]);
          return;
        }
        const photosRes = await fetch(`/api/photos?ids=${encodeURIComponent(ids.join(','))}`);
        if (!photosRes.ok) return;
        const photos: PhotoAsset[] = await photosRes.json();
        const photoMap = new Map(photos.map((p) => [p.id, p]));
        setHeroPhoto(heroPhotoId ? photoMap.get(heroPhotoId) ?? null : null);
        setFeaturePhotos(
          featurePhotoIds.map((id: string) => photoMap.get(id)).filter(Boolean)
        );
      } catch {
        // Keep existing data on error
      }
    };

    load();

    // React to admin changes: storage event when admin calls refreshPreview() or updates draft
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PREVIEW_REFRESH_KEY || event.key === HOME_LAYOUT_DRAFT_KEY) load();
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

  // Poll draft store for unsaved color changes
  useEffect(() => {
    if (!isPreview) return;

    const loadDraftColors = () => {
      const draft = loadDraftHomeLayout();
      if (draft) {
        if (typeof draft.heroTitleColor === 'string') setHeroTitleColor(draft.heroTitleColor || undefined);
        if (typeof draft.heroSubtitleColor === 'string') setHeroSubtitleColor(draft.heroSubtitleColor || undefined);
      }
    };

    loadDraftColors();

    const pollId = window.setInterval(loadDraftColors, 500);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === HOME_LAYOUT_DRAFT_KEY) loadDraftColors();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isPreview]);

  return (
    <>
      {heroPhoto && (
        <FullBleedHero
          photo={heroPhoto}
          minHeight="screen"
          style={{
            ...(heroTitleColor ? { '--hero-title-color': heroTitleColor } : {}),
            ...(heroSubtitleColor ? { '--hero-subtitle-color': heroSubtitleColor } : {})
          } as React.CSSProperties}
        >
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
