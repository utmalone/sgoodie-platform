'use client';

import { useMemo } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

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
  const signal = usePreviewKeySignal([DRAFT_ABOUT_STORAGE_KEY, PREVIEW_REFRESH_KEY], enabled);

  const draftValue = useMemo(() => {
    if (!enabled) return null;
    void signal; // Recompute when draft about content changes.
    const draft = loadDraftAboutContent();
    const value = field === 'bioName' ? draft?.bio?.name : draft?.[field];
    return typeof value === 'string' ? value : null;
  }, [enabled, field, signal]);

  if (!enabled) return fallback;
  return draftValue ?? fallback;
}
