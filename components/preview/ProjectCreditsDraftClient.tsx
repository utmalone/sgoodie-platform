'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProjectCredit } from '@/types';
import { loadDraftProject } from '@/lib/admin/draft-project-store';
import styles from '@/styles/public/WorkDetailPage.module.css';

type ProjectCreditsDraftClientProps = {
  projectId: string;
  fallbackCredits?: ProjectCredit[];
  enabled?: boolean;
};

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function ProjectCreditsDraftClient({
  projectId,
  fallbackCredits,
  enabled = false
}: ProjectCreditsDraftClientProps) {
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

  const credits = draft?.credits ?? fallbackCredits ?? [];
  if (!credits.length) return null;

  return (
    <section className={styles.credits}>
      <p className={styles.eyebrow}>Credits</p>
      <div className={styles.creditsGrid}>
        {credits.map((credit) => (
          <div key={`${credit.label}-${credit.value}`} className={styles.creditRow}>
            <span className={styles.creditKey}>{credit.label}</span>
            <span>{credit.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

