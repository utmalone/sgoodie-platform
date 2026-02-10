'use client';

import { useMemo } from 'react';
import type { HomeLayout } from '@/types';
import { loadDraftHomeLayout } from '@/lib/admin/draft-home-layout-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

type HomeTextField = keyof Pick<HomeLayout, 'introText' | 'heroEyebrow'>;

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
  const signal = usePreviewKeySignal([HOME_LAYOUT_DRAFT_KEY, PREVIEW_REFRESH_KEY], enabled);

  const draftValue = useMemo(() => {
    if (!enabled) return null;
    void signal; // Recompute when draft home layout changes.
    const draft = loadDraftHomeLayout();
    const value = draft?.[field];
    return typeof value === 'string' ? value : null;
  }, [enabled, field, signal]);

  if (!enabled) return fallback;
  return draftValue ?? fallback;
}
