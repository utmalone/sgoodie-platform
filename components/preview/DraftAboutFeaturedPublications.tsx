'use client';

import { useEffect, useState } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';

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
  const [draftList, setDraftList] = useState<string[] | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const load = () => {
      const draft = loadDraftAboutContent();
      const value = draft?.featuredPublications;
      setDraftList(Array.isArray(value) ? value : null);
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

  const list = enabled && draftList ? draftList : fallback;

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
