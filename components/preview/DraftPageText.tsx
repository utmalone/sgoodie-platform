'use client';

import { useEffect, useState } from 'react';
import type { PageContent } from '@/types';
import { loadDraftPages } from '@/lib/admin/draft-store';

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
  const [draftValue, setDraftValue] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const load = () => {
      const pages = loadDraftPages();
      const page = pages?.find((item) => item.slug === slug);
      const value = page?.[field];
      setDraftValue(typeof value === 'string' ? value : null);
    };

    load();

    const pollId = window.setInterval(load, 500);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DRAFT_PAGES_STORAGE_KEY && event.key !== PREVIEW_REFRESH_KEY) return;
      load();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(pollId);
    };
  }, [enabled, field, slug]);

  if (!enabled) return fallback;
  return draftValue ?? fallback;
}
