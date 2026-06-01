'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import type { JournalPost, PhotoAsset } from '@/types';
import { loadDraftJournalPost } from '@/lib/admin/draft-journal-post-store';
import { JournalArticle } from '@/components/portfolio/JournalArticle';
import { useMounted } from '@/lib/preview/use-mounted';
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
  const mounted = useMounted();
  const draftKey = useMemo(
    () => `sgoodie.admin.draft.journal.${fallbackPost.id}`,
    [fallbackPost.id]
  );
  const draftSignal = usePreviewKeySignal([draftKey], enabled);
  const refreshSignal = usePreviewKeySignal([PREVIEW_REFRESH_KEY], enabled);

  const draft = useMemo(() => {
    if (!enabled || !mounted) return null;
    void draftSignal;
    return loadDraftJournalPost(fallbackPost.id);
  }, [draftSignal, enabled, fallbackPost.id, mounted]);

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

  const heroPhoto = post.heroPhotoId ? photosById.get(post.heroPhotoId) : undefined;
  const resolvedGalleryPhotos = useMemo(() => {
    return (post.galleryPhotoIds || [])
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }, [photosById, post.galleryPhotoIds]);

  const dateLabel = post.date
    ? new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  return (
    <>
      {heroPhoto ? (
        <section className={styles.heroSection}>
          <div className={styles.heroImageWrap}>
            <Image
              src={heroPhoto.src}
              alt={heroPhoto.alt || post.title}
              fill
              priority
              sizes="100vw"
              className={styles.heroImg}
            />
          </div>
        </section>
      ) : null}

      <header className={styles.header}>
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.category}>{post.category}</p>
        {dateLabel ? (
          <p className={styles.metaRow}>
            {post.author} · {dateLabel}
          </p>
        ) : (
          <p className={styles.metaRow}>{post.author}</p>
        )}
      </header>

      <section className={styles.contentSection}>
        <JournalArticle body={post.body || ''} photos={resolvedGalleryPhotos} />
      </section>
    </>
  );
}
