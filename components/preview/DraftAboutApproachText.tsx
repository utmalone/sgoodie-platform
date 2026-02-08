'use client';

import { useEffect, useState } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';

type DraftAboutApproachTextProps = {
  itemId: string;
  field: 'title' | 'description';
  fallback: string;
  enabled?: boolean;
};

const DRAFT_ABOUT_STORAGE_KEY = 'sgoodie.admin.draft.about';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftAboutApproachText({
  itemId,
  field,
  fallback,
  enabled = false
}: DraftAboutApproachTextProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const load = () => {
      const draft = loadDraftAboutContent();
      const items = draft?.approachItems;
      if (!Array.isArray(items)) {
        setDraftValue(null);
        return;
      }

      const match = items.find((item) => item.id === itemId);
      const value = match?.[field];
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
  }, [enabled, field, itemId]);

  if (!enabled) return fallback;
  return draftValue ?? fallback;
}
