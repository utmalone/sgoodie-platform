'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { PhotoAsset, Project, WorkIndex } from '@/types';
import { usePreview } from '@/lib/admin/preview-context';

export function AdminWorkClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workIndex, setWorkIndex] = useState<WorkIndex | null>(null);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { openPreview, refreshPreview } = usePreview();

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const orderedProjects = useMemo(() => {
    if (!workIndex) return projects;
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const ordered = workIndex.projectIds
      .map((id) => projectMap.get(id))
      .filter(Boolean) as Project[];
    const remaining = projects.filter((p) => !workIndex.projectIds.includes(p.id));
    return [...ordered, ...remaining];
  }, [projects, workIndex]);

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

      setProjects(projectsData);
      setWorkIndex(workData);
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

    currentOrder.splice(fromIndex, 1);
    currentOrder.splice(toIndex, 0, draggedId);

    // Optimistic update
    setWorkIndex({ projectIds: currentOrder });

    // Save to server
    saveOrder(currentOrder);
  }

  async function saveOrder(projectIds: string[]) {
    setStatus('Saving order...');
    try {
      const res = await fetch('/api/admin/layout/work', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds })
      });

      if (!res.ok) {
        setStatus('Failed to save order.');
        loadData(); // Reload to get correct state
        return;
      }

      setStatus('Order saved.');
      refreshPreview();
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Failed to save order.');
      loadData();
    }
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

  if (isLoading) {
    return <p className="text-sm text-black/60">Loading projects...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Work</h1>
          <p className="mt-2 text-sm text-black/60">
            Manage portfolio projects. Drag to reorder.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openPreview('/work')}
            className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-black/60 hover:border-black/40 hover:text-black"
          >
            Preview
          </button>
          <Link
            href="/admin/work/new"
            className="rounded-full bg-black px-5 py-2 text-xs uppercase tracking-[0.35em] text-white"
          >
            Add Project
          </Link>
        </div>
      </div>

      {status && (
        <p className="text-sm text-black/60">{status}</p>
      )}

      {/* Projects List */}
      <div className="space-y-3">
        {orderedProjects.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-black/60">No projects yet.</p>
            <Link
              href="/admin/work/new"
              className="mt-4 inline-block text-sm text-black/70 underline hover:text-black"
            >
              Create your first project
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
                className={`flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition ${
                  draggedId === project.id ? 'opacity-50' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="cursor-grab text-black/30 hover:text-black/50">
                  <span className="text-lg">⋮⋮</span>
                </div>

                {/* Order Number */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-xs font-semibold text-black/40">
                  {index + 1}
                </div>

                {/* Thumbnail */}
                <div className="h-16 w-24 overflow-hidden rounded-xl bg-black/5">
                  {heroPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroPhoto.src}
                      alt={heroPhoto.alt}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-black/30">
                      No image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{project.title}</h3>
                    {isDraft && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-700">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-black/60">
                    /work/{project.slug}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPreview(`/work/${project.slug}`)}
                    className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-black/40 hover:border-black/40 hover:text-black/60"
                    title="Preview"
                  >
                    👁
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(project)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] ${
                      isDraft
                        ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    {isDraft ? 'Publish' : 'Unpublish'}
                  </button>
                  <Link
                    href={`/admin/work/${project.id}`}
                    className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-black/60 hover:border-black/40 hover:text-black"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(project)}
                    className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-black/40 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
