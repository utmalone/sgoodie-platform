'use client';

import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { loadDraftPages } from '@/lib/admin/draft-store';
import { useMounted } from '@/lib/preview/use-mounted';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

type DraftHeroColorsProps = {
  store: 'about' | 'pages';
  slug?: string;
  savedTitleColor?: string;
  savedSubtitleColor?: string;
  children: ReactNode;
};

const DRAFT_ABOUT_STORAGE_KEY = 'sgoodie.admin.draft.about';
const DRAFT_PAGES_STORAGE_KEY = 'sgoodie.admin.draft';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftHeroColors({
  store,
  slug,
  savedTitleColor,
  savedSubtitleColor,
  children
}: DraftHeroColorsProps) {
  const mounted = useMounted();
  const keys = store === 'about'
    ? [DRAFT_ABOUT_STORAGE_KEY, PREVIEW_REFRESH_KEY]
    : [DRAFT_PAGES_STORAGE_KEY, PREVIEW_REFRESH_KEY];
  const signal = usePreviewKeySignal(keys);

  const [titleColor, subtitleColor] = useMemo(() => {
    void signal; // Recompute when the preview signal changes.
    if (!mounted) {
      return [savedTitleColor, savedSubtitleColor];
    }
    if (store === 'about') {
      const draft = loadDraftAboutContent();
      return [
        draft?.heroTitleColor || savedTitleColor,
        draft?.heroSubtitleColor || savedSubtitleColor
      ];
    }

    if (store === 'pages' && slug) {
      const pages = loadDraftPages();
      const page = pages?.find((p) => p.slug === slug);
      return [
        page?.heroTitleColor || savedTitleColor,
        page?.heroSubtitleColor || savedSubtitleColor
      ];
    }

    return [savedTitleColor, savedSubtitleColor];
  }, [savedSubtitleColor, savedTitleColor, signal, slug, store, mounted]);

  const style = {
    ...(titleColor ? { '--hero-title-color': titleColor } : {}),
    ...(subtitleColor ? { '--hero-subtitle-color': subtitleColor } : {})
  } as CSSProperties;

  return <div style={style}>{children}</div>;
}
