'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { PhotoAsset, Project, WorkIndex } from '@/types';
import { usePreview } from '@/lib/admin/preview-context';
import { useSave } from '@/lib/admin/save-context';
import {
  loadDraftWorkIndex,
  saveDraftWorkIndex,
  clearDraftWorkIndex
} from '@/lib/admin/draft-work-index-store';
import {
  portfolioCategories,
  portfolioCategoryLabels,
  type PortfolioCategory
} from '@/lib/admin/portfolio-config';
import styles from '@/styles/admin/AdminShared.module.css';

export function AdminPortfolioClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workIndex, setWorkIndex] = useState<WorkIndex | null>(null);
  const [savedWorkIndex, setSavedWorkIndex] = useState<WorkIndex | null>(null);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory>('hotels');
  const { openPreview, refreshPreview } = usePreview();
  const { registerChange, unregisterChange } = useSave();

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const categoryProjects = useMemo(() => {
    return projects.filter((p) => p.category === activeCategory);
  }, [projects, activeCategory]);

  const orderedProjects = useMemo(() => {
    if (!workIndex) return categoryProjects;
    const projectMap = new Map(categoryProjects.map((p) => [p.id, p]));
    const ordered = workIndex.projectIds
      .map((id) => projectMap.get(id))
      .filter(Boolean) as Project[];
    const remaining = categoryProjects.filter((p) => !workIndex.projectIds.includes(p.id));
    return [...ordered, ...remaining];
  }, [categoryProjects, workIndex]);

  const hasWorkIndexChanges = useMemo(() => {
    if (!workIndex || !savedWorkIndex) return false;
    return (
      JSON.stringify(workIndex.projectIds) !== JSON.stringify(savedWorkIndex.projectIds)
    );
  }, [workIndex, savedWorkIndex]);

  const saveWorkIndex = useCallback(async (): Promise<boolean> => {
    if (!workIndex) return true;
    try {
      const res = await fetch('/api/admin/layout/work', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: workIndex.projectIds })
      });
      if (!res.ok) return false;
      setSavedWorkIndex(workIndex);
      clearDraftWorkIndex();
      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [workIndex, refreshPreview]);

  useEffect(() => {
    if (hasWorkIndexChanges && !isLoading) {
      registerChange({
        id: 'work-index',
        type: 'layout',
        save: saveWorkIndex
      });
    } else {
      unregisterChange('work-index');
    }
  }, [hasWorkIndexChanges, isLoading, registerChange, unregisterChange, saveWorkIndex]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setStatus('');

    try {
      const [projectsRes, workRes, photosRes] = await Promise.all([
        fetch('/api/admin/projects'),
        fetch('/api/admin/layout/work'),
        fetch('/api/admin/photos')
      ]);

      if (!projectsRes.ok || !workRes.ok || !photosRes.ok) {
        setStatus('Unable to load data. Please refresh.');
        setIsLoading(false);
        return;
      }

      const projectsData = (await projectsRes.json()) as Project[];
      const workData = (await workRes.json()) as WorkIndex;
      const photosData = (await photosRes.json()) as PhotoAsset[];

      const draft = loadDraftWorkIndex();
      const mergedWorkIndex = draft ?? workData;

      setProjects(projectsData);
      setWorkIndex(mergedWorkIndex);
      setSavedWorkIndex(workData);
      setPhotos(photosData);
    } catch {
      setStatus('Unable to load data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleDragStart(projectId: string) {
    setDraggedId(projectId);
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId || !workIndex) return;

    const currentOrder = [...orderedProjects.map((p) => p.id)];
    const fromIndex = currentOrder.indexOf(draggedId);
    const toIndex = currentOrder.indexOf(targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...currentOrder];
    [reordered[fromIndex], reordered[toIndex]] = [reordered[toIndex], reordered[fromIndex]];

    const otherProjects = projects.filter((p) => p.category !== activeCategory);
    const otherIds = otherProjects.map((p) => p.id);
    const fullOrder = [...reordered, ...otherIds.filter((id) => !reordered.includes(id))];

    const newIndex = { projectIds: fullOrder };
    setWorkIndex(newIndex);
    saveDraftWorkIndex(newIndex);
    setStatus('Order updated.');
    refreshPreview();
    setTimeout(() => setStatus(''), 2000);
  }

  function handleDropAtEnd() {
    if (!draggedId || !workIndex) return;

    const currentOrder = [...orderedProjects.map((p) => p.id)];
    const fromIndex = currentOrder.indexOf(draggedId);
    if (fromIndex < 0) return;

    const reordered = [...currentOrder];
    reordered.splice(fromIndex, 1);
    reordered.push(draggedId);

    const otherProjects = projects.filter((p) => p.category !== activeCategory);
    const otherIds = otherProjects.map((p) => p.id);
    const fullOrder = [...reordered, ...otherIds.filter((id) => !reordered.includes(id))];

    const newIndex = { projectIds: fullOrder };
    setWorkIndex(newIndex);
    saveDraftWorkIndex(newIndex);
    setStatus('Order updated.');
    refreshPreview();
    setTimeout(() => setStatus(''), 2000);
  }

  async function handleToggleStatus(project: Project) {
    const newStatus = project.status === 'published' ? 'draft' : 'published';
    setStatus('Updating...');

    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        setStatus('Failed to update status.');
        return;
      }

      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: newStatus } : p))
      );
      setStatus(newStatus === 'published' ? 'Published.' : 'Set to draft.');
      refreshPreview();
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Failed to update status.');
    }
  }

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;

    setStatus('Deleting...');
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        setStatus('Failed to delete project.');
        return;
      }

      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      setWorkIndex((prev) =>
        prev ? { projectIds: prev.projectIds.filter((id) => id !== project.id) } : null
      );
      setStatus('Deleted.');
      refreshPreview();
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Failed to delete project.');
    }
  }

  const categoryCounts = useMemo(() => {
    const counts: Record<PortfolioCategory, number> = {
      hotels: 0,
      restaurants: 0,
      travel: 0,
      'home-garden': 0,
      brand: 0
    };
    projects.forEach((p) => {
      if (p.category && counts[p.category as PortfolioCategory] !== undefined) {
        counts[p.category as PortfolioCategory]++;
      }
    });
    return counts;
  }, [projects]);

  if (isLoading) {
    return <p className={styles.statusMessage}>Loading projects...</p>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Portfolio</h1>
          <p className={styles.pageDescription}>
            Manage portfolio projects by category. Drag to reorder within each category.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => openPreview(`/portfolio/${activeCategory}`)}
            className={styles.btnSecondary}
          >
            Preview
          </button>
          <Link
            href={`/admin/portfolio/new?category=${activeCategory}`}
            className={styles.btnPrimary}
          >
            Add Project
          </Link>
        </div>
      </div>

      {/* Category Tabs */}
      <div className={styles.subTabGroup}>
        {portfolioCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`${styles.tab} ${activeCategory === cat ? styles.tabActive : ''}`}
          >
            {portfolioCategoryLabels[cat]}
            <span className={styles.tabCount}>({categoryCounts[cat]})</span>
          </button>
        ))}
      </div>

      {status && <p className={styles.statusMessage}>{status}</p>}

      {/* Projects List */}
      <div className={styles.listContainer}>
        {orderedProjects.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              No {portfolioCategoryLabels[activeCategory].toLowerCase()} projects yet.
            </p>
            <Link
              href={`/admin/portfolio/new?category=${activeCategory}`}
              className={styles.emptyStateLink}
            >
              Create your first {portfolioCategoryLabels[activeCategory].toLowerCase()} project
            </Link>
          </div>
        ) : (
          orderedProjects.map((project, index) => {
            const heroPhoto = photosById.get(project.heroPhotoId);
            const isDraft = project.status === 'draft';

            return (
              <div
                key={project.id}
                draggable
                onDragStart={() => handleDragStart(project.id)}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(project.id)}
                className={`${styles.projectItem} ${draggedId === project.id ? styles.projectItemDragging : ''}`}
              >
                {/* Drag Handle */}
                <div className={styles.dragHandle}>
                  <span>⋮⋮</span>
                </div>

                {/* Order Number */}
                <div className={styles.orderNumber}>{index + 1}</div>

                {/* Thumbnail */}
                <div className={styles.projectThumbnail}>
                  {heroPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroPhoto.src} alt={heroPhoto.alt} />
                  ) : (
                    <div className={styles.projectThumbnailEmpty}>No image</div>
                  )}
                </div>

                {/* Info */}
                <div className={styles.projectInfo}>
                  <div className={styles.projectTitleRow}>
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    {isDraft && <span className={styles.badgeDraft}>Draft</span>}
                  </div>
                  <p className={styles.projectPath}>
                    /portfolio/{activeCategory}/{project.slug}
                  </p>
                </div>

                {/* Actions */}
                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    onClick={() => openPreview(`/portfolio/${activeCategory}/${project.slug}`)}
                    className={styles.btnSmallIcon}
                    title="Preview"
                  >
                    👁
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(project)}
                    className={`${styles.btnSmall} ${isDraft ? styles.btnPublish : styles.btnUnpublish}`}
                  >
                    {isDraft ? 'Publish' : 'Unpublish'}
                  </button>
                  <Link href={`/admin/portfolio/${project.id}`} className={styles.btnSmall}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(project)}
                    className={styles.btnSmallDanger}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
        {orderedProjects.length >= 2 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleDropAtEnd();
              setDraggedId(null);
            }}
            className={styles.projectItem}
            style={{ opacity: 0.6, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}
          >
            <span className={styles.projectPath}>Drop here to move to end</span>
          </div>
        )}
      </div>
    </div>
  );
}
