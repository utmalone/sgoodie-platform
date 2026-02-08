'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EditorialRow, EditorialRowCaption, PhotoAsset } from '@/types';
import { loadDraftProject } from '@/lib/admin/draft-project-store';
import { EditorialGallery } from '@/components/portfolio/EditorialGallery';

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

  const captions = draft?.editorialCaptions ?? fallbackCaptions;

  return <EditorialGallery photos={photos} rows={rows} captions={captions} />;
}

