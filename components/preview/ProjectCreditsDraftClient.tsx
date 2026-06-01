'use client';

import { useMemo } from 'react';
import type { ProjectCredit } from '@/types';
import { loadDraftProject } from '@/lib/admin/draft-project-store';
import { useMounted } from '@/lib/preview/use-mounted';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';
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
  const mounted = useMounted();
  const draftKey = useMemo(() => `sgoodie.admin.draft.project.${projectId}`, [projectId]);
  const signal = usePreviewKeySignal([draftKey, PREVIEW_REFRESH_KEY], enabled);

  const draft = useMemo(() => {
    if (!enabled || !mounted) return null;
    void signal; // Recompute when draft project changes.
    return loadDraftProject(projectId);
  }, [enabled, projectId, signal, mounted]);

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
