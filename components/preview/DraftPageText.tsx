'use client';

import { useMemo } from 'react';
import type { PageContent } from '@/types';
import { loadDraftPages } from '@/lib/admin/draft-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

type PageTextField = keyof Pick<
  PageContent,
  | 'title'
  | 'intro'
  | 'metaTitle'
  | 'metaDescription'
  | 'metaKeywords'
>;

type DraftPageTextProps = {
  slug: string;
  field: PageTextField;
  fallback: string;
  enabled?: boolean;
};

const DRAFT_PAGES_STORAGE_KEY = 'sgoodie.admin.draft';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftPageText({
  slug,
  field,
  fallback,
  enabled = false
}: DraftPageTextProps) {
  const signal = usePreviewKeySignal([DRAFT_PAGES_STORAGE_KEY, PREVIEW_REFRESH_KEY], enabled);

  const draftValue = useMemo(() => {
    if (!enabled) return null;
    void signal; // Recompute when draft pages change.
    const pages = loadDraftPages();
    const page = pages?.find((item) => item.slug === slug);
    const value = page?.[field];
    return typeof value === 'string' ? value : null;
  }, [enabled, field, signal, slug]);

  if (!enabled) return fallback;
  return draftValue ?? fallback;
}
