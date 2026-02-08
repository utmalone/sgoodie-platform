'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadDraftProject } from '@/lib/admin/draft-project-store';
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
  const [draft, setDraft] = useState(() => loadDraftProject(projectId));

  const draftKey = useMemo(() => `sgoodie.admin.draft.project.${projectId}`, [projectId]);

  useEffect(() => {
    if (!enabled) return;

    const load = () => setDraft(loadDraftProject(projectId));
    load();

    const pollId = window.setInterval(load, 500);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== draftKey && event.key !== PREVIEW_REFRESH_KEY) return;
      load();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(pollId);
    };
  }, [draftKey, enabled, projectId]);

  const title = draft?.title ?? fallbackTitle;
  const subtitle = draft?.subtitle ?? fallbackSubtitle ?? '';

  return (
    <>
      {subtitle.trim().length > 0 && <p className={styles.subtitle}>{subtitle}</p>}
      <h1 className={styles.title}>{title}</h1>
    </>
  );
}

