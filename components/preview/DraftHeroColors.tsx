'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { loadDraftPages } from '@/lib/admin/draft-store';

type DraftHeroColorsProps = {
  store: 'about' | 'pages';
  slug?: string;
  savedTitleColor?: string;
  savedSubtitleColor?: string;
  children: ReactNode;
};

export function DraftHeroColors({
  store,
  slug,
  savedTitleColor,
  savedSubtitleColor,
  children
}: DraftHeroColorsProps) {
  const [titleColor, setTitleColor] = useState(savedTitleColor);
  const [subtitleColor, setSubtitleColor] = useState(savedSubtitleColor);

  useEffect(() => {
    const load = () => {
      if (store === 'about') {
        const draft = loadDraftAboutContent();
        if (draft) {
          setTitleColor(draft.heroTitleColor || savedTitleColor);
          setSubtitleColor(draft.heroSubtitleColor || savedSubtitleColor);
        }
      } else if (store === 'pages' && slug) {
        const pages = loadDraftPages();
        const page = pages?.find((p) => p.slug === slug);
        if (page) {
          setTitleColor(page.heroTitleColor || savedTitleColor);
          setSubtitleColor(page.heroSubtitleColor || savedSubtitleColor);
        }
      }
    };

    load();
    const pollId = window.setInterval(load, 500);
    return () => window.clearInterval(pollId);
  }, [store, slug, savedTitleColor, savedSubtitleColor]);

  const style = {
    ...(titleColor ? { '--hero-title-color': titleColor } : {}),
    ...(subtitleColor ? { '--hero-subtitle-color': subtitleColor } : {})
  } as React.CSSProperties;

  return <div style={style}>{children}</div>;
}
