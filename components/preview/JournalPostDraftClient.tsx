'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { JournalPost, PhotoAsset } from '@/types';
import { loadDraftJournalPost } from '@/lib/admin/draft-journal-post-store';
import { JournalPhotoGrid } from '@/components/portfolio/JournalPhotoGrid';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';
import styles from '@/styles/public/JournalPostPage.module.css';

type JournalPostDraftClientProps = {
  fallbackPost: JournalPost;
  gridPhotos: PhotoAsset[];
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

export function JournalPostDraftClient({
  fallbackPost,
  gridPhotos,
  enabled = false
}: JournalPostDraftClientProps) {
  const draftKey = useMemo(
    () => `sgoodie.admin.draft.journal.${fallbackPost.id}`,
    [fallbackPost.id]
  );
  const draftSignal = usePreviewKeySignal([draftKey], enabled);
  const refreshSignal = usePreviewKeySignal([PREVIEW_REFRESH_KEY], enabled);

  const draft = useMemo(() => {
    if (!enabled) return null;
    void draftSignal; // Recompute when draft post changes.
    return loadDraftJournalPost(fallbackPost.id);
  }, [draftSignal, enabled, fallbackPost.id]);

  const post = useMemo(() => {
    if (!draft) return fallbackPost;
    const merged: JournalPost = { ...fallbackPost };
    for (const [key, value] of Object.entries(draft)) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    return merged;
  }, [draft, fallbackPost]);

  const requestedPhotoIds = useMemo(() => {
    const ids = [post.heroPhotoId, ...(post.galleryPhotoIds || [])]
      .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      .map((id) => id.trim());
    return Array.from(new Set(ids));
  }, [post.galleryPhotoIds, post.heroPhotoId]);

  const requestedPhotoKey = useMemo(() => requestedPhotoIds.join(','), [requestedPhotoIds]);

  const photosQuery = useQuery({
    queryKey: ['preview', 'photos', 'journal', fallbackPost.id, requestedPhotoKey, refreshSignal],
    queryFn: () => fetchPhotosByIds(requestedPhotoIds),
    enabled: enabled && requestedPhotoIds.length > 0,
    placeholderData: (previous) => previous ?? gridPhotos,
    staleTime: Infinity
  });

  const photosById = useMemo(() => {
    const photos = photosQuery.data ?? gridPhotos;
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [gridPhotos, photosQuery.data]);

  const resolvedGridPhotos = useMemo(() => {
    return requestedPhotoIds.map((id) => photosById.get(id)).filter(Boolean) as PhotoAsset[];
  }, [photosById, requestedPhotoIds]);

  return (
    <>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.category}>{post.category}</p>
      </header>

      {/* Photo Grid */}
      {resolvedGridPhotos.length > 0 && (
        <section className={styles.gridSection}>
          <JournalPhotoGrid photos={resolvedGridPhotos} />
        </section>
      )}

      {/* Content Section - Body and Credits */}
      <section className={styles.contentSection}>
        <div className={styles.contentGrid}>
          {/* Body Text */}
          <div className={styles.bodyColumn}>
            {post.body.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className={styles.bodyParagraph}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Credits */}
          {post.credits && post.credits.length > 0 && (
            <aside className={styles.creditsColumn}>
              <p className={styles.creditsLabel}>Credits</p>
              <div className={styles.creditsDivider} />
              <div className={styles.creditsList}>
                {post.credits.map((credit) => (
                  <div key={`${credit.label}-${credit.value}`} className={styles.creditItem}>
                    <span className={styles.creditLabel}>{credit.label}:</span>
                    <span className={styles.creditValue}>{credit.value}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </section>
    </>
  );
}
