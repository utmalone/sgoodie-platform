'use client';

import { useMemo } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

type DraftAboutFeaturedPublicationsProps = {
  fallback: string[];
  itemClassName: string;
  enabled?: boolean;
};

const DRAFT_ABOUT_STORAGE_KEY = 'sgoodie.admin.draft.about';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftAboutFeaturedPublications({
  fallback,
  itemClassName,
  enabled = false
}: DraftAboutFeaturedPublicationsProps) {
  const signal = usePreviewKeySignal([DRAFT_ABOUT_STORAGE_KEY, PREVIEW_REFRESH_KEY], enabled);

  const list = useMemo(() => {
    if (!enabled) return fallback;
    void signal; // Recompute when draft about content changes.
    const draft = loadDraftAboutContent();
    const value = draft?.featuredPublications;
    return Array.isArray(value) ? value : fallback;
  }, [enabled, fallback, signal]);

  return (
    <>
      {list.map((pub, idx) => (
        <p key={idx} className={itemClassName}>
          {pub}
        </p>
      ))}
    </>
  );
}
