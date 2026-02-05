'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PhotoAsset, Project, ProjectCredit, EditorialRowCaption } from '@/types';
import { AdminPhotoSelector } from './AdminPhotoSelector';
import { AdminCreditsEditor } from './AdminCreditsEditor';
import { AiFixButton } from './AiFixButton';
import { loadAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { usePreview } from '@/lib/admin/preview-context';

type AdminWorkEditorClientProps = {
  projectId?: string; // undefined for new project
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const emptyProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  slug: '',
  subtitle: '',
  intro: '',
  body: '',
  category: 'hotels',
  status: 'draft',
  featured: false,
  hoverTitle: '',
  heroPhotoId: '',
  galleryPhotoIds: [],
  editorialCaptions: [],
  credits: [],
  metaTitle: '',
  metaDescription: '',
  metaKeywords: ''
};

export function AdminWorkEditorClient({ projectId }: AdminWorkEditorClientProps) {
  const router = useRouter();
  const { openPreview } = usePreview();
  const isNew = !projectId;

  const [project, setProject] = useState<Partial<Project>>(emptyProject);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [showHeroSelector, setShowHeroSelector] = useState(false);
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const heroPhoto = project.heroPhotoId ? photosById.get(project.heroPhotoId) : null;
  const galleryPhotos = useMemo(() => {
    return (project.galleryPhotoIds || [])
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }, [project.galleryPhotoIds, photosById]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadData() {
    setIsLoading(true);

    try {
      const photosRes = await fetch('/api/admin/photos');
      if (photosRes.ok) {
        const photosData = (await photosRes.json()) as PhotoAsset[];
        setPhotos(photosData);
      }

      if (!isNew) {
        const projectRes = await fetch(`/api/admin/projects/${projectId}`);
        if (projectRes.ok) {
          const projectData = (await projectRes.json()) as Project;
          setProject(projectData);
        } else {
          setStatus('Project not found.');
        }
      }
    } catch {
      setStatus('Unable to load data.');
    } finally {
      setIsLoading(false);
    }
  }

  function updateField<K extends keyof Project>(field: K, value: Project[K]) {
    setProject((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from title if slug is empty
      if (field === 'title' && !prev.slug) {
        updated.slug = generateSlug(value as string);
      }
      // Auto-generate hoverTitle from title if empty
      if (field === 'title' && !prev.hoverTitle) {
        updated.hoverTitle = value as string;
      }
      return updated;
    });
  }

  async function handleSave() {
    if (!project.title || !project.slug || !project.heroPhotoId) {
      setStatus('Please fill in title, slug, and select a hero photo.');
      return;
    }

    setIsSaving(true);
    setStatus('Saving...');

    try {
      const url = isNew ? '/api/admin/projects' : `/api/admin/projects/${projectId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });

      if (!res.ok) {
        const message = await getApiErrorMessage(res, 'Failed to save project.');
        setStatus(message);
        setIsSaving(false);
        return;
      }

      const saved = (await res.json()) as Project;
      setStatus('Saved successfully.');
      
      if (isNew) {
        router.push(`/admin/work/${saved.id}`);
      } else {
        setProject(saved);
      }
    } catch {
      setStatus('Failed to save project.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAiFix(
    field: 'intro' | 'body' | 'metaTitle' | 'metaDescription' | 'metaKeywords',
    mode: 'text' | 'seo'
  ) {
    if (isAiBusy) return;
    setIsAiBusy(true);
    setAiStatus('Optimizing with AI...');

    try {
      const model = loadAiModel();
      const res = await fetch('/api/admin/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          target: 'page',
          field,
          input: (project[field] || '') as string,
          model,
          context: {
            page: {
              slug: project.slug,
              title: project.title,
              intro: project.intro,
              body: project.body
            }
          }
        })
      });

      if (!res.ok) {
        const message = await getApiErrorMessage(res, 'AI request failed.');
        setAiStatus(message);
        return;
      }

      const data = (await res.json()) as { output?: string };
      if (data.output) {
        updateField(field, data.output);
        setAiStatus('AI update complete.');
      } else {
        setAiStatus('AI did not return a result.');
      }
    } catch {
      setAiStatus('AI request failed.');
    } finally {
      setIsAiBusy(false);
    }
  }

  function handleHeroSelect(photoIds: string[]) {
    if (photoIds[0]) {
      updateField('heroPhotoId', photoIds[0]);
    }
  }

  function handleGallerySelect(photoIds: string[]) {
    updateField('galleryPhotoIds', photoIds);
  }

  function handleGalleryDragStart(photoId: string) {
    setDraggedPhotoId(photoId);
  }

  function handleGalleryDrop(targetId: string) {
    if (!draggedPhotoId || draggedPhotoId === targetId) return;
    
    const current = [...(project.galleryPhotoIds || [])];
    const fromIndex = current.indexOf(draggedPhotoId);
    const toIndex = current.indexOf(targetId);
    
    if (fromIndex < 0 || toIndex < 0) return;
    
    current.splice(fromIndex, 1);
    current.splice(toIndex, 0, draggedPhotoId);
    
    updateField('galleryPhotoIds', current);
  }

  function removeFromGallery(photoId: string) {
    updateField(
      'galleryPhotoIds',
      (project.galleryPhotoIds || []).filter((id) => id !== photoId)
    );
  }

  function updateCaption(index: number, caption: EditorialRowCaption) {
    const captions = [...(project.editorialCaptions || [])];
    captions[index] = caption;
    updateField('editorialCaptions', captions);
  }

  function addCaption() {
    updateField('editorialCaptions', [
      ...(project.editorialCaptions || []),
      { title: '', body: '' }
    ]);
  }

  function removeCaption(index: number) {
    const captions = (project.editorialCaptions || []).filter((_, i) => i !== index);
    updateField('editorialCaptions', captions);
  }

  if (isLoading) {
    return <p className="text-sm text-black/60">Loading project...</p>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">
            {isNew ? 'New Project' : 'Edit Project'}
          </h1>
          <p className="mt-2 text-sm text-black/60">
            {isNew ? 'Create a new portfolio project.' : `Editing: ${project.title}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && project.slug && (
            <button
              type="button"
              onClick={() => openPreview(`/work/${project.slug}`)}
              className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-black/60 hover:border-black/40 hover:text-black"
            >
              Preview
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/admin/work')}
            className="rounded-full border border-black/20 px-5 py-2 text-xs uppercase tracking-[0.35em] text-black/60 hover:text-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-full bg-black px-5 py-2 text-xs uppercase tracking-[0.35em] text-white disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {status && <p className="text-sm text-black/60">{status}</p>}
      {aiStatus && <p className="text-sm text-black/60">{aiStatus}</p>}

      {/* Basic Info */}
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Basic Information</h2>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="text-black/60">Title *</span>
              <input
                value={project.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
                placeholder="Project title"
              />
            </label>
            <label className="text-sm">
              <span className="text-black/60">Slug *</span>
              <input
                value={project.slug || ''}
                onChange={(e) => updateField('slug', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
                placeholder="project-slug"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="text-black/60">Subtitle</span>
              <input
                value={project.subtitle || ''}
                onChange={(e) => updateField('subtitle', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
                placeholder="e.g., Interior Photography"
              />
            </label>
            <label className="text-sm">
              <span className="text-black/60">Hover Title</span>
              <input
                value={project.hoverTitle || ''}
                onChange={(e) => updateField('hoverTitle', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
                placeholder="Title shown on hover"
              />
            </label>
          </div>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Introduction</span>
              <AiFixButton onClick={() => handleAiFix('intro', 'text')} disabled={isAiBusy} />
            </div>
            <textarea
              value={project.intro || ''}
              onChange={(e) => updateField('intro', e.target.value)}
              className="mt-2 min-h-[80px] w-full rounded-2xl border border-black/20 px-4 py-2"
              placeholder="Brief introduction..."
            />
          </label>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Body</span>
              <AiFixButton onClick={() => handleAiFix('body', 'text')} disabled={isAiBusy} />
            </div>
            <textarea
              value={project.body || ''}
              onChange={(e) => updateField('body', e.target.value)}
              className="mt-2 min-h-[120px] w-full rounded-2xl border border-black/20 px-4 py-2"
              placeholder="Full project description..."
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              <span className="text-black/60">Category</span>
              <select
                value={project.category || 'interiors'}
                onChange={(e) => updateField('category', e.target.value as Project['category'])}
                className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
              >
                <option value="interiors">Interiors</option>
                <option value="architecture">Architecture</option>
                <option value="brand-marketing">Brand Marketing</option>
                <option value="travel">Travel</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-black/60">Status</span>
              <select
                value={project.status || 'draft'}
                onChange={(e) => updateField('status', e.target.value as Project['status'])}
                className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="flex items-center gap-3 pt-6 text-sm">
              <input
                type="checkbox"
                checked={project.featured || false}
                onChange={(e) => updateField('featured', e.target.checked)}
                className="h-5 w-5 rounded border-black/20"
              />
              <span className="text-black/60">Featured project</span>
            </label>
          </div>
        </div>
      </section>

      {/* Hero Photo */}
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Hero Photo *</h2>
            <p className="mt-1 text-sm text-black/60">Main image shown on the work page.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHeroSelector(true)}
            className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-black/60 hover:text-black"
          >
            {heroPhoto ? 'Change' : 'Select Photo'}
          </button>
        </div>
        {heroPhoto && (
          <div className="mt-4">
            <div className="relative aspect-[16/9] max-w-2xl overflow-hidden rounded-2xl bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPhoto.src}
                alt={heroPhoto.alt}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-2 text-sm text-black/60">{heroPhoto.alt || 'No alt text'}</p>
          </div>
        )}
      </section>

      {/* Gallery Photos */}
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gallery Photos</h2>
            <p className="mt-1 text-sm text-black/60">
              Drag to reorder. These appear in the editorial gallery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGallerySelector(true)}
            className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-black/60 hover:text-black"
          >
            Add Photos
          </button>
        </div>
        {galleryPhotos.length > 0 ? (
          <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleGalleryDragStart(photo.id)}
                onDragEnd={() => setDraggedPhotoId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleGalleryDrop(photo.id)}
                className={`group relative aspect-square overflow-hidden rounded-xl border border-black/10 ${
                  draggedPhotoId === photo.id ? 'opacity-50' : ''
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFromGallery(photo.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-black/50">No gallery photos added yet.</p>
        )}
      </section>

      {/* Editorial Captions */}
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Editorial Captions</h2>
            <p className="mt-1 text-sm text-black/60">
              Captions appear on alternating double rows in the gallery.
            </p>
          </div>
          <button
            type="button"
            onClick={addCaption}
            className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-black/60 hover:text-black"
          >
            Add Caption
          </button>
        </div>
        {(project.editorialCaptions || []).length > 0 ? (
          <div className="mt-4 space-y-4">
            {(project.editorialCaptions || []).map((caption, index) => (
              <div
                key={index}
                className="rounded-2xl border border-black/10 bg-white/60 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-black/40">
                    Caption {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCaption(index)}
                    className="text-xs text-black/40 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3">
                  <input
                    value={caption.title}
                    onChange={(e) =>
                      updateCaption(index, { ...caption, title: e.target.value })
                    }
                    placeholder="Caption title"
                    className="w-full rounded-xl border border-black/20 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={caption.body}
                    onChange={(e) =>
                      updateCaption(index, { ...caption, body: e.target.value })
                    }
                    placeholder="Caption body text..."
                    className="min-h-[80px] w-full rounded-xl border border-black/20 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-black/50">No captions added yet.</p>
        )}
      </section>

      {/* Credits */}
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Credits</h2>
        <p className="mt-1 text-sm text-black/60">
          Credit collaborators on this project.
        </p>
        <div className="mt-4">
          <AdminCreditsEditor
            credits={project.credits || []}
            onChange={(credits) => updateField('credits', credits)}
          />
        </div>
      </section>

      {/* SEO */}
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">SEO Metadata</h2>
        <p className="mt-1 text-sm text-black/60">
          Search engine metadata for this project page.
        </p>
        <div className="mt-4 grid gap-4">
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Meta Title</span>
              <AiFixButton onClick={() => handleAiFix('metaTitle', 'seo')} disabled={isAiBusy} />
            </div>
            <input
              value={project.metaTitle || ''}
              onChange={(e) => updateField('metaTitle', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Meta Description</span>
              <AiFixButton onClick={() => handleAiFix('metaDescription', 'seo')} disabled={isAiBusy} />
            </div>
            <textarea
              value={project.metaDescription || ''}
              onChange={(e) => updateField('metaDescription', e.target.value)}
              className="mt-2 min-h-[100px] w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Meta Keywords</span>
              <AiFixButton onClick={() => handleAiFix('metaKeywords', 'seo')} disabled={isAiBusy} />
            </div>
            <textarea
              value={project.metaKeywords || ''}
              onChange={(e) => updateField('metaKeywords', e.target.value)}
              className="mt-2 min-h-[80px] w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
        </div>
      </section>

      {/* Photo Selectors */}
      <AdminPhotoSelector
        isOpen={showHeroSelector}
        onClose={() => setShowHeroSelector(false)}
        onSelect={handleHeroSelect}
        selectedIds={project.heroPhotoId ? [project.heroPhotoId] : []}
        title="Select Hero Photo"
      />
      <AdminPhotoSelector
        isOpen={showGallerySelector}
        onClose={() => setShowGallerySelector(false)}
        onSelect={handleGallerySelect}
        selectedIds={project.galleryPhotoIds || []}
        multiple
        title="Select Gallery Photos"
      />
    </div>
  );
}
