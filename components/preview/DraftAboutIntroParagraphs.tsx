'use client';

import { useMemo } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

type DraftAboutIntroParagraphsProps = {
  fallback: string[];
  normalClassName: string;
  boldClassName: string;
  enabled?: boolean;
  boldIndex?: number;
};

const DRAFT_ABOUT_STORAGE_KEY = 'sgoodie.admin.draft.about';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftAboutIntroParagraphs({
  fallback,
  normalClassName,
  boldClassName,
  enabled = false,
  boldIndex = 1
}: DraftAboutIntroParagraphsProps) {
  const signal = usePreviewKeySignal([DRAFT_ABOUT_STORAGE_KEY, PREVIEW_REFRESH_KEY], enabled);

  const paragraphs = useMemo(() => {
    if (!enabled) return fallback;
    void signal; // Recompute when draft about content changes.
    const draft = loadDraftAboutContent();
    const value = draft?.introParagraphs;
    return Array.isArray(value) ? value : fallback;
  }, [enabled, fallback, signal]);

  return (
    <>
      {paragraphs.map((paragraph, idx) => (
        <p key={idx} className={idx === boldIndex ? boldClassName : normalClassName}>
          {paragraph}
        </p>
      ))}
    </>
  );
}
