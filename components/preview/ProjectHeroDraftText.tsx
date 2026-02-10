'use client';

import { useMemo } from 'react';
import { loadDraftProject } from '@/lib/admin/draft-project-store';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';
import styles from '@/styles/public/ProjectHero.module.css';

type ProjectHeroDraftTextProps = {
  projectId: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  enabled?: boolean;
};

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function ProjectHeroDraftText({
  projectId,
  fallbackTitle,
  fallbackSubtitle,
  enabled = false
}: ProjectHeroDraftTextProps) {
  const draftKey = useMemo(() => `sgoodie.admin.draft.project.${projectId}`, [projectId]);
  const signal = usePreviewKeySignal([draftKey, PREVIEW_REFRESH_KEY], enabled);

  const draft = useMemo(() => {
    if (!enabled) return null;
    void signal; // Recompute when draft project changes.
    return loadDraftProject(projectId);
  }, [enabled, projectId, signal]);

  const title = draft?.title ?? fallbackTitle;
  const subtitle = draft?.subtitle ?? fallbackSubtitle ?? '';

  return (
    <>
      {subtitle.trim().length > 0 && <p className={styles.subtitle}>{subtitle}</p>}
      <h1 className={styles.title}>{title}</h1>
    </>
  );
}
