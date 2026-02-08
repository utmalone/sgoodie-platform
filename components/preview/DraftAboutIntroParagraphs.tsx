'use client';

import { useEffect, useState } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';

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
  const [draftParagraphs, setDraftParagraphs] = useState<string[] | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const load = () => {
      const draft = loadDraftAboutContent();
      const value = draft?.introParagraphs;
      setDraftParagraphs(Array.isArray(value) ? value : null);
    };

    load();

    const pollId = window.setInterval(load, 500);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DRAFT_ABOUT_STORAGE_KEY && event.key !== PREVIEW_REFRESH_KEY) return;
      load();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(pollId);
    };
  }, [enabled]);

  const paragraphs = enabled && draftParagraphs ? draftParagraphs : fallback;

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
