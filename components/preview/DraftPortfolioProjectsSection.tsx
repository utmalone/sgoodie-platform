'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PhotoAsset, Project, ProjectCategory } from '@/types';
import { loadDraftWorkIndex } from '@/lib/admin/draft-work-index-store';
import { WorkGalleryGrid } from '@/components/portfolio/WorkGalleryGrid';
import styles from '@/styles/public/WorkPage.module.css';

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';
const DRAFT_WORK_INDEX_KEY = 'sgoodie.admin.draft.workIndex';

type DraftPortfolioProjectsSectionProps = {
  isPreview: boolean;
  initialItems: Array<{ project: Project; photo: PhotoAsset }>;
  projects: Project[];
  photosById: Map<string, PhotoAsset>;
  category: ProjectCategory;
};

export function DraftPortfolioProjectsSection({
  isPreview,
  initialItems,
  projects,
  photosById,
  category
}: DraftPortfolioProjectsSectionProps) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    if (!isPreview) {
      queueMicrotask(() => setItems(initialItems));
      return;
    }

    const load = async () => {
      try {
        const [workRes, draft] = await Promise.all([
          fetch('/api/admin/layout/work'),
          Promise.resolve(typeof window !== 'undefined' ? loadDraftWorkIndex() : null)
        ]);
        if (!workRes.ok) return;
        const workData = await workRes.json();
        const workIndex = draft ?? workData;

        const projectMap = new Map(projects.map((p) => [p.id, p]));
        const orderedProjects = (workIndex.projectIds || [])
          .map((id: string) => projectMap.get(id))
          .filter(Boolean) as Project[];
        const remaining = projects.filter((p) => !workIndex.projectIds?.includes(p.id));
        const list = [...orderedProjects, ...remaining];

        const newItems = list.reduce<Array<{ project: Project; photo: PhotoAsset }>>((acc, project) => {
          if (!project) return acc;
          const photo = photosById.get(project.heroPhotoId);
          if (!photo) return acc;
          acc.push({ project, photo });
          return acc;
        }, []);

        setItems(newItems);
      } catch {
        setItems(initialItems);
      }
    };

    load();

    const pollId = window.setInterval(load, 500);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DRAFT_WORK_INDEX_KEY || event.key === PREVIEW_REFRESH_KEY) load();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isPreview, initialItems, projects, photosById]);

  if (items.length === 0) return null;

  return <WorkGalleryGrid items={items} isPreview={isPreview} category={category} />;
}
