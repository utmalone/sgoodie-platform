'use client';

import { useEffect, useState } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';

type AboutTextField =
  | 'heroTitle'
  | 'heroSubtitle'
  | 'approachTitle'
  | 'featuredTitle'
  | 'bioName';

type DraftAboutTextProps = {
  field: AboutTextField;
  fallback: string;
  enabled?: boolean;
};

const DRAFT_ABOUT_STORAGE_KEY = 'sgoodie.admin.draft.about';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftAboutText({
  field,
  fallback,
  enabled = false
}: DraftAboutTextProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const load = () => {
      const draft = loadDraftAboutContent();
      const value =
        field === 'bioName'
          ? draft?.bio?.name
          : draft?.[field];

      setDraftValue(typeof value === 'string' ? value : null);
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
  }, [enabled, field]);

  if (!enabled) return fallback;
  return draftValue ?? fallback;
}
