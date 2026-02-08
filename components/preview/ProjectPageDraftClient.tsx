'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { PhotoAsset, Project } from '@/types';
import { EditorialGallery } from '@/components/portfolio/EditorialGallery';
import { loadDraftProject } from '@/lib/admin/draft-project-store';
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
  const res = await fetch(`/api/photos?${params.toString()}`);
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
  const [draft, setDraft] = useState(() => loadDraftProject(fallbackProject.id));

  const draftKey = useMemo(
    () => `sgoodie.admin.draft.project.${fallbackProject.id}`,
    [fallbackProject.id]
  );

  useEffect(() => {
    if (!enabled) return;

    const load = () => setDraft(loadDraftProject(fallbackProject.id));
    load();

    const pollId = window.setInterval(load, 500);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== draftKey && event.key !== PREVIEW_REFRESH_KEY) return;
      load();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(pollId);
    };
  }, [draftKey, enabled, fallbackProject.id]);

  const project = useMemo(
    () => ({ ...fallbackProject, ...(draft ?? {}) }),
    [draft, fallbackProject]
  );

  const requestedPhotoIds = useMemo(() => {
    const ids = [project.heroPhotoId, ...(project.galleryPhotoIds || [])]
      .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      .map((id) => id.trim());
    return Array.from(new Set(ids));
  }, [project.galleryPhotoIds, project.heroPhotoId]);

  const requestedPhotoKey = useMemo(() => requestedPhotoIds.join(','), [requestedPhotoIds]);

  const [photosById, setPhotosById] = useState<Map<string, PhotoAsset>>(
    () => new Map(initialPhotos.map((photo) => [photo.id, photo]))
  );

  useEffect(() => {
    if (!enabled) return;
    if (!requestedPhotoKey) return;

    let cancelled = false;

    void (async () => {
      try {
        const ids = requestedPhotoKey.split(',').filter(Boolean);
        if (!ids.length) return;
        const photos = await fetchPhotosByIds(ids);
        if (cancelled) return;
        setPhotosById(new Map(photos.map((photo) => [photo.id, photo])));
      } catch (err) {
        // Keep initial photos if the request fails.
        console.error(err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, requestedPhotoKey]);

  const heroPhoto = photosById.get(project.heroPhotoId) ?? null;
  const galleryPhotos = (project.galleryPhotoIds || [])
    .map((id) => photosById.get(id))
    .filter(Boolean) as PhotoAsset[];

  return (
    <>
      {heroPhoto && (
        <section className={heroStyles.wrapper} data-hero="true">
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
