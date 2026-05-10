'use client';

import { useMemo } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { useMounted } from '@/lib/preview/use-mounted';
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
  const mounted = useMounted();
  const signal = usePreviewKeySignal([DRAFT_ABOUT_STORAGE_KEY, PREVIEW_REFRESH_KEY], enabled);

  const paragraphs = useMemo(() => {
    const safeFallback = Array.isArray(fallback) ? fallback : [];
    if (!enabled) return safeFallback;
    if (!mounted) return safeFallback;
    void signal; // Recompute when draft about content changes.
    const draft = loadDraftAboutContent();
    const value = draft?.introParagraphs;
    return Array.isArray(value) ? value : safeFallback;
  }, [enabled, fallback, signal, mounted]);

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
