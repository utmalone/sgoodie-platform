'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PhotoAsset, Project } from '@/types';
import { EditorialGallery } from '@/components/portfolio/EditorialGallery';
import { loadDraftProject } from '@/lib/admin/draft-project-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';
import heroStyles from '@/styles/public/ProjectHero.module.css';
import detailStyles from '@/styles/public/WorkDetailPage.module.css';

type ProjectPageDraftClientProps = {
  fallbackProject: Project;
  initialPhotos: PhotoAsset[];
  enabled?: boolean;
};

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

async function fetchPhotosByIds(ids: string[]) {
  const params = new URLSearchParams();
  params.set('ids', ids.join(','));
  const res = await fetch(`/api/photos?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load photos');
  }
  return (await res.json()) as PhotoAsset[];
}

export function ProjectPageDraftClient({
  fallbackProject,
  initialPhotos,
  enabled = false
}: ProjectPageDraftClientProps) {
  const draftKey = useMemo(
    () => `sgoodie.admin.draft.project.${fallbackProject.id}`,
    [fallbackProject.id]
  );

  const draftSignal = usePreviewKeySignal([draftKey], enabled);
  const refreshSignal = usePreviewKeySignal([PREVIEW_REFRESH_KEY], enabled);

  const draft = useMemo(() => {
    if (!enabled) return null;
    void draftSignal; // Recompute when draft project changes.
    return loadDraftProject(fallbackProject.id);
  }, [draftSignal, enabled, fallbackProject.id]);

  const project = useMemo(() => {
    if (!draft) return fallbackProject;
    const merged: Project = { ...fallbackProject };
    for (const [key, value] of Object.entries(draft)) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    return merged;
  }, [draft, fallbackProject]);

  const requestedPhotoIds = useMemo(() => {
    const ids = [project.heroPhotoId, ...(project.galleryPhotoIds || [])]
      .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      .map((id) => id.trim());
    return Array.from(new Set(ids));
  }, [project.galleryPhotoIds, project.heroPhotoId]);

  const requestedPhotoKey = useMemo(() => requestedPhotoIds.join(','), [requestedPhotoIds]);

  const photosQuery = useQuery({
    queryKey: ['preview', 'photos', 'project', fallbackProject.id, requestedPhotoKey, refreshSignal],
    queryFn: () => fetchPhotosByIds(requestedPhotoIds),
    enabled: enabled && requestedPhotoIds.length > 0,
    placeholderData: (previous) => previous ?? initialPhotos,
    staleTime: Infinity
  });

  const photosById = useMemo(() => {
    const photos = photosQuery.data ?? initialPhotos;
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [initialPhotos, photosQuery.data]);

  const heroPhoto = photosById.get(project.heroPhotoId) ?? null;
  const galleryPhotos = (project.galleryPhotoIds || [])
    .map((id) => photosById.get(id))
    .filter(Boolean) as PhotoAsset[];

  return (
    <>
      {heroPhoto && (
        <section
          className={heroStyles.wrapper}
          data-hero="true"
          style={{
            ...(project.heroTitleColor ? { '--hero-title-color': project.heroTitleColor } : {}),
            ...(project.heroSubtitleColor ? { '--hero-subtitle-color': project.heroSubtitleColor } : {})
          } as React.CSSProperties}
        >
          <div className={heroStyles.imageContainer}>
            <Image
              src={heroPhoto.src}
              alt={heroPhoto.alt}
              fill
              priority
              sizes="100vw"
              className={heroStyles.image}
            />
            <div className={heroStyles.overlay} />
            <div className={heroStyles.textBlock}>
              {project.subtitle && project.subtitle.trim().length > 0 && (
                <p className={heroStyles.subtitle}>{project.subtitle}</p>
              )}
              <h1 className={heroStyles.title}>{project.title}</h1>
            </div>
          </div>
        </section>
      )}

      {galleryPhotos.length > 0 && (
        <EditorialGallery
          photos={galleryPhotos}
          rows={project.editorialRows}
          captions={project.editorialCaptions}
        />
      )}

      {project.credits && project.credits.length > 0 && (
        <section className={detailStyles.credits}>
          <p className={detailStyles.eyebrow}>Credits</p>
          <div className={detailStyles.creditsGrid}>
            {project.credits.map((credit) => (
              <div
                key={`${credit.label}-${credit.value}`}
                className={detailStyles.creditRow}
              >
                <span className={detailStyles.creditKey}>{credit.label}</span>
                <span>{credit.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
