'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HomeLayout } from '@/types';
import type { PhotoAsset } from '@/types';
import { FullBleedHero } from '@/components/portfolio/FullBleedHero';
import { HomeGalleryGrid } from '@/components/portfolio/HomeGalleryGrid';
import { loadDraftHomeLayout } from '@/lib/admin/draft-home-layout-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';
import styles from '@/styles/public/HomePage.module.css';

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';
const HOME_LAYOUT_DRAFT_KEY = 'sgoodie.admin.draft.homeLayout';

type DraftHomePhotosSectionProps = {
  isPreview: boolean;
  initialLayout: HomeLayout;
  initialHeroPhoto: PhotoAsset | null;
  initialFeaturePhotos: PhotoAsset[];
  heroContent: ReactNode;
  introContent: ReactNode;
};

export function DraftHomePhotosSection({
  isPreview,
  initialLayout,
  initialHeroPhoto,
  initialFeaturePhotos,
  heroContent,
  introContent
}: DraftHomePhotosSectionProps) {
  const draftSignal = usePreviewKeySignal([HOME_LAYOUT_DRAFT_KEY], isPreview);
  const refreshSignal = usePreviewKeySignal([PREVIEW_REFRESH_KEY], isPreview);

  const draftLayout = useMemo(() => {
    if (!isPreview) return null;
    void draftSignal; // Recompute when draft home layout changes.
    return loadDraftHomeLayout();
  }, [draftSignal, isPreview]);

  const layoutQuery = useQuery({
    queryKey: ['admin', 'layout', 'home', refreshSignal],
    queryFn: async () => {
      const res = await fetch('/api/admin/layouts/home', { cache: 'no-store' });
      if (!res.ok) return null;
      return (await res.json()) as HomeLayout;
    },
    enabled: isPreview,
    staleTime: Infinity
  });

  const effectiveLayout = useMemo(() => {
    const savedLayout = layoutQuery.data ?? initialLayout;
    if (!draftLayout) return savedLayout;

    const merged: HomeLayout = { ...savedLayout };
    for (const [key, value] of Object.entries(draftLayout)) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    return merged;
  }, [draftLayout, initialLayout, layoutQuery.data]);

  const photoIds = useMemo(() => {
    const ids = [effectiveLayout.heroPhotoId, ...(effectiveLayout.featurePhotoIds || [])]
      .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      .map((id) => id.trim());
    return Array.from(new Set(ids));
  }, [effectiveLayout.featurePhotoIds, effectiveLayout.heroPhotoId]);

  const photoIdsKey = useMemo(() => photoIds.join(','), [photoIds]);
  const initialPhotos = useMemo(() => {
    const photos: PhotoAsset[] = [];
    if (initialHeroPhoto) photos.push(initialHeroPhoto);
    initialFeaturePhotos.forEach((photo) => photos.push(photo));
    return photos;
  }, [initialFeaturePhotos, initialHeroPhoto]);

  const photosQuery = useQuery({
    queryKey: ['preview', 'photos', 'home', photoIdsKey, refreshSignal],
    queryFn: async () => {
      if (!photoIds.length) return [];
      const res = await fetch(`/api/photos?ids=${encodeURIComponent(photoIds.join(','))}`, {
        cache: 'no-store'
      });
      if (!res.ok) return [];
      return (await res.json()) as PhotoAsset[];
    },
    enabled: isPreview,
    placeholderData: (previous) => previous ?? initialPhotos,
    staleTime: Infinity
  });

  const photoMap = useMemo(() => {
    const photos = photosQuery.data ?? initialPhotos;
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [initialPhotos, photosQuery.data]);

  const heroPhoto = photoMap.get(effectiveLayout.heroPhotoId) ?? null;
  const featurePhotos = (effectiveLayout.featurePhotoIds || [])
    .map((id) => photoMap.get(id))
    .filter(Boolean) as PhotoAsset[];

  const heroEyebrowColor = effectiveLayout.heroEyebrowColor || undefined;
  const heroTitleColor = effectiveLayout.heroTitleColor || undefined;
  const heroSubtitleColor = effectiveLayout.heroSubtitleColor || undefined;

  return (
    <>
      {heroPhoto && (
        <FullBleedHero
          photo={heroPhoto}
          minHeight="screen"
          style={{
            ...(heroEyebrowColor ? { '--hero-eyebrow-color': heroEyebrowColor } : {}),
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
