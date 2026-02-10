'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PhotoAsset, Project, ProjectCategory } from '@/types';
import { loadDraftWorkIndex } from '@/lib/admin/draft-work-index-store';
import { WorkGalleryGrid } from '@/components/portfolio/WorkGalleryGrid';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';
const DRAFT_WORK_INDEX_KEY = 'sgoodie.admin.draft.workIndex';

type DraftPortfolioProjectsSectionProps = {
  isPreview: boolean;
  initialItems: Array<{ project: Project; photo: PhotoAsset }>;
  projects: Project[];
  photosById: Map<string, PhotoAsset>;
  category: ProjectCategory;
};

async function fetchWorkIndex() {
  const res = await fetch('/api/admin/layout/work', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load work index');
  return (await res.json()) as { projectIds?: string[] };
}

export function DraftPortfolioProjectsSection({
  isPreview,
  initialItems,
  projects,
  photosById,
  category
}: DraftPortfolioProjectsSectionProps) {
  const draftSignal = usePreviewKeySignal([DRAFT_WORK_INDEX_KEY], isPreview);
  const refreshSignal = usePreviewKeySignal([PREVIEW_REFRESH_KEY], isPreview);

  const draftIndex = useMemo(() => {
    if (!isPreview) return null;
    void draftSignal; // Recompute when draft work index changes.
    return loadDraftWorkIndex();
  }, [draftSignal, isPreview]);

  const workIndexQuery = useQuery({
    queryKey: ['admin', 'layout', 'work', refreshSignal],
    queryFn: fetchWorkIndex,
    enabled: isPreview,
    staleTime: Infinity
  });

  const items = useMemo(() => {
    if (!isPreview) return initialItems;

    const workIndex = draftIndex ?? workIndexQuery.data ?? null;
    const ids = Array.isArray(workIndex?.projectIds) ? workIndex.projectIds : [];
    if (!ids.length) return initialItems;

    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const orderedProjects = ids
      .map((id) => projectMap.get(id))
      .filter(Boolean) as Project[];
    const idSet = new Set(ids);
    const remainingProjects = projects.filter((project) => !idSet.has(project.id));
    const list = [...orderedProjects, ...remainingProjects];

    return list.reduce<Array<{ project: Project; photo: PhotoAsset }>>((acc, project) => {
      const photo = photosById.get(project.heroPhotoId);
      if (!photo) return acc;
      acc.push({ project, photo });
      return acc;
    }, []);
  }, [draftIndex, initialItems, isPreview, photosById, projects, workIndexQuery.data]);

  if (items.length === 0) return null;

  return <WorkGalleryGrid items={items} isPreview={isPreview} category={category} />;
}
