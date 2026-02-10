'use client';

import { useMemo } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

type DraftAboutBioParagraphsProps = {
  fallback: string[];
  paragraphClassName: string;
  enabled?: boolean;
};

const DRAFT_ABOUT_STORAGE_KEY = 'sgoodie.admin.draft.about';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftAboutBioParagraphs({
  fallback,
  paragraphClassName,
  enabled = false
}: DraftAboutBioParagraphsProps) {
  const signal = usePreviewKeySignal([DRAFT_ABOUT_STORAGE_KEY, PREVIEW_REFRESH_KEY], enabled);

  const paragraphs = useMemo(() => {
    if (!enabled) return fallback;
    void signal; // Recompute when draft about content changes.
    const draft = loadDraftAboutContent();
    const value = draft?.bio?.paragraphs;
    return Array.isArray(value) ? value : fallback;
  }, [enabled, fallback, signal]);

  return (
    <>
      {paragraphs.map((paragraph, idx) => (
        <p key={idx} className={paragraphClassName}>
          {paragraph}
        </p>
      ))}
    </>
  );
}
