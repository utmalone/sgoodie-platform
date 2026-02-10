'use client';

import { useMemo } from 'react';
import type { EditorialRow, EditorialRowCaption, PhotoAsset } from '@/types';
import { loadDraftProject } from '@/lib/admin/draft-project-store';
import { EditorialGallery } from '@/components/portfolio/EditorialGallery';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

type ProjectEditorialGalleryDraftClientProps = {
  projectId: string;
  photos: PhotoAsset[];
  rows?: EditorialRow[];
  fallbackCaptions?: EditorialRowCaption[];
  enabled?: boolean;
};

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function ProjectEditorialGalleryDraftClient({
  projectId,
  photos,
  rows,
  fallbackCaptions,
  enabled = false
}: ProjectEditorialGalleryDraftClientProps) {
  const draftKey = useMemo(() => `sgoodie.admin.draft.project.${projectId}`, [projectId]);
  const signal = usePreviewKeySignal([draftKey, PREVIEW_REFRESH_KEY], enabled);

  const draft = useMemo(() => {
    if (!enabled) return null;
    void signal; // Recompute when draft project changes.
    return loadDraftProject(projectId);
  }, [enabled, projectId, signal]);

  const captions = draft?.editorialCaptions ?? fallbackCaptions;

  return <EditorialGallery photos={photos} rows={rows} captions={captions} />;
}
