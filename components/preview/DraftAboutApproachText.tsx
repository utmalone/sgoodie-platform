'use client';

import { useMemo } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

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
  const signal = usePreviewKeySignal([DRAFT_ABOUT_STORAGE_KEY, PREVIEW_REFRESH_KEY], enabled);

  const draftValue = useMemo(() => {
    if (!enabled) return null;
    void signal; // Recompute when draft about content changes.
    const draft = loadDraftAboutContent();
    const items = draft?.approachItems;
    if (!Array.isArray(items)) {
      return null;
    }

    const match = items.find((item) => item.id === itemId);
    const value = match?.[field];
    return typeof value === 'string' ? value : null;
  }, [enabled, field, itemId, signal]);

  if (!enabled) return fallback;
  return draftValue ?? fallback;
}
