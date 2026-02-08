'use client';

import { useEffect, useState } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';

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
  const [draftParagraphs, setDraftParagraphs] = useState<string[] | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const load = () => {
      const draft = loadDraftAboutContent();
      const value = draft?.bio?.paragraphs;
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
        <p key={idx} className={paragraphClassName}>
          {paragraph}
        </p>
      ))}
    </>
  );
}
