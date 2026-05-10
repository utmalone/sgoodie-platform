'use client';

import { useMemo } from 'react';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { useMounted } from '@/lib/preview/use-mounted';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';
import styles from '@/styles/public/AboutPage.module.css';

type DraftAboutClientsProps = {
  fallback: string[];
  itemClassName: string;
  enabled?: boolean;
};

const DRAFT_ABOUT_STORAGE_KEY = 'sgoodie.admin.draft.about';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function DraftAboutClients({ fallback, itemClassName, enabled = false }: DraftAboutClientsProps) {
  const mounted = useMounted();
  const signal = usePreviewKeySignal([DRAFT_ABOUT_STORAGE_KEY, PREVIEW_REFRESH_KEY], enabled);

  const list = useMemo(() => {
    const safeFallback = Array.isArray(fallback) ? fallback : [];
    if (!enabled) return safeFallback;
    if (!mounted) return safeFallback;
    void signal;
    const draft = loadDraftAboutContent();
    const value = draft?.clients;
    return Array.isArray(value) ? value : safeFallback;
  }, [enabled, fallback, signal, mounted]);

  return (
    <>
      {list.map((name, idx) =>
        name.trim() ? (
          <p key={idx} className={itemClassName}>
            {name}
          </p>
        ) : null
      )}
    </>
  );
}
