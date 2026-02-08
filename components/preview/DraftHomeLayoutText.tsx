'use client';

import { useEffect, useState } from 'react';
import type { HomeLayout } from '@/types';
import { loadDraftHomeLayout } from '@/lib/admin/draft-home-layout-store';

type HomeTextField = keyof Pick<HomeLayout, 'introText'>;

type DraftHomeLayoutTextProps = {
  field: HomeTextField;
  fallback: string;
  enabled?: boolean;
};

const HOME_LAYOUT_DRAFT_KEY = 'sgoodie.admin.draft.homeLayout';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftHomeLayoutText({
  field,
  fallback,
  enabled = false
}: DraftHomeLayoutTextProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const load = () => {
      const draft = loadDraftHomeLayout();
      const value = draft?.[field];
      setDraftValue(typeof value === 'string' ? value : null);
    };

    load();

    const pollId = window.setInterval(load, 500);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== HOME_LAYOUT_DRAFT_KEY && event.key !== PREVIEW_REFRESH_KEY) return;
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
