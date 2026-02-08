'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JournalPost, PhotoAsset } from '@/types';
import { loadDraftJournalPost } from '@/lib/admin/draft-journal-post-store';
import { JournalPhotoGrid } from '@/components/portfolio/JournalPhotoGrid';
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
  const res = await fetch(`/api/photos?${params.toString()}`);
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
  const [draft, setDraft] = useState(() => loadDraftJournalPost(fallbackPost.id));
  const draftKey = useMemo(
    () => `sgoodie.admin.draft.journal.${fallbackPost.id}`,
    [fallbackPost.id]
  );

  useEffect(() => {
    if (!enabled) return;

    const load = () => setDraft(loadDraftJournalPost(fallbackPost.id));
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
  }, [draftKey, enabled, fallbackPost.id]);

  const post = useMemo(() => ({ ...fallbackPost, ...(draft ?? {}) }), [draft, fallbackPost]);

  const requestedPhotoIds = useMemo(() => {
    const ids = [post.heroPhotoId, ...(post.galleryPhotoIds || [])]
      .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      .map((id) => id.trim());
    return Array.from(new Set(ids));
  }, [post.galleryPhotoIds, post.heroPhotoId]);

  const requestedPhotoKey = useMemo(() => requestedPhotoIds.join(','), [requestedPhotoIds]);

  const [photosById, setPhotosById] = useState<Map<string, PhotoAsset>>(
    () => new Map(gridPhotos.map((photo) => [photo.id, photo]))
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

  const resolvedGridPhotos = useMemo(() => {
    const ids = requestedPhotoKey ? requestedPhotoKey.split(',').filter(Boolean) : [];
    return ids.map((id) => photosById.get(id)).filter(Boolean) as PhotoAsset[];
  }, [photosById, requestedPhotoKey]);

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
