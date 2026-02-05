'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PhotoAsset, Project, ProjectCategory, EditorialRowCaption } from '@/types';
import { AdminPhotoSelector } from './AdminPhotoSelector';
import { AdminCreditsEditor } from './AdminCreditsEditor';
import { AiFixButton } from './AiFixButton';
import { loadAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { usePreview } from '@/lib/admin/preview-context';
import { useSave } from '@/lib/admin/save-context';
import {
  portfolioCategories,
  portfolioCategoryLabels,
  type PortfolioCategory
} from '@/lib/admin/portfolio-config';
import styles from '@/styles/admin/AdminShared.module.css';

type AdminPortfolioEditorClientProps = {
  projectId?: string;
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

export function AdminPortfolioEditorClient({ projectId }: AdminPortfolioEditorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openPreview, refreshPreview } = usePreview();
  const { registerChange, unregisterChange } = useSave();
  const isNew = !projectId;

  const initialCategory = (searchParams.get('category') as PortfolioCategory) || 'hotels';

  const [project, setProject] = useState<Partial<Project>>({
    ...emptyProject,
    category: initialCategory
  });
  const [savedProject, setSavedProject] = useState<Partial<Project>>({
    ...emptyProject,
    category: initialCategory
  });
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [showHeroSelector, setShowHeroSelector] = useState(false);
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  // Check if project has unsaved changes
  const isDirty = useMemo(() => {
    if (isNew) {
      // For new projects, dirty if any required field has content
      return !!(project.title || project.heroPhotoId);
    }
    return JSON.stringify(project) !== JSON.stringify(savedProject);
  }, [project, savedProject, isNew]);

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const heroPhoto = project.heroPhotoId ? photosById.get(project.heroPhotoId) : null;
  const galleryPhotos = useMemo(() => {
    return (project.galleryPhotoIds || [])
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }, [project.galleryPhotoIds, photosById]);

  // Save function for master save
  const saveProject = useCallback(async (): Promise<boolean> => {
    if (!project.title || !project.slug || !project.heroPhotoId) {
      return false;
    }

    try {
      const url = isNew ? '/api/admin/projects' : `/api/admin/projects/${projectId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });

      if (!res.ok) return false;

      const saved = (await res.json()) as Project;
      setProject(saved);
      setSavedProject(saved);

      if (isNew) {
        router.push(`/admin/portfolio/${saved.id}`);
      }

      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [project, isNew, projectId, router, refreshPreview]);

  // Register/unregister changes with master save context
  useEffect(() => {
    const changeId = `project-${projectId || 'new'}`;
    if (isDirty && !isLoading) {
      registerChange({
        id: changeId,
        type: 'project',
        save: saveProject
      });
    } else {
      unregisterChange(changeId);
    }
    
    return () => {
      unregisterChange(changeId);
    };
  }, [isDirty, isLoading, projectId, registerChange, unregisterChange, saveProject]);

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
          setSavedProject(projectData);
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
      if (field === 'title' && !prev.slug) {
        updated.slug = generateSlug(value as string);
      }
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
      setProject(saved);
      setSavedProject(saved);

      if (isNew) {
        router.push(`/admin/portfolio/${saved.id}`);
      }
      refreshPreview();
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

  const projectCategory = project.category as PortfolioCategory;

  if (isLoading) {
    return <p className={styles.statusMessage}>Loading project...</p>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>
            {isNew ? 'New Project' : 'Edit Project'}
          </h1>
          <p className={styles.pageDescription}>
            {isNew
              ? `Create a new ${portfolioCategoryLabels[projectCategory] || 'portfolio'} project.`
              : `Editing: ${project.title}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          {!isNew && project.slug && project.category && (
            <button
              type="button"
              onClick={() => openPreview(`/portfolio/${project.category}/${project.slug}`)}
              className={styles.btnSecondary}
            >
              Preview
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/admin/portfolio')}
            className={styles.btnSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={styles.btnPrimary}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {status && <p className={styles.statusMessage}>{status}</p>}
      {aiStatus && <p className={styles.statusMessage}>{aiStatus}</p>}

      {/* Basic Info */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Basic Information</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGrid2}>
            <label className={styles.label}>
              <span className={styles.labelText}>Title *</span>
              <input
                value={project.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className={styles.input}
                placeholder="Project title"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>Slug *</span>
              <input
                value={project.slug || ''}
                onChange={(e) => updateField('slug', e.target.value)}
                className={styles.input}
                placeholder="project-slug"
              />
            </label>
          </div>
          <div className={styles.formGrid2}>
            <label className={styles.label}>
              <span className={styles.labelText}>Subtitle</span>
              <input
                value={project.subtitle || ''}
                onChange={(e) => updateField('subtitle', e.target.value)}
                className={styles.input}
                placeholder="e.g., Interior Photography"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>Hover Title</span>
              <input
                value={project.hoverTitle || ''}
                onChange={(e) => updateField('hoverTitle', e.target.value)}
                className={styles.input}
                placeholder="Title shown on hover"
              />
            </label>
          </div>
          <label className={styles.label}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>Introduction</span>
              <AiFixButton onClick={() => handleAiFix('intro', 'text')} disabled={isAiBusy} />
            </div>
            <textarea
              value={project.intro || ''}
              onChange={(e) => updateField('intro', e.target.value)}
              className={styles.textarea}
              placeholder="Brief introduction..."
            />
          </label>
          <label className={styles.label}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>Body</span>
              <AiFixButton onClick={() => handleAiFix('body', 'text')} disabled={isAiBusy} />
            </div>
            <textarea
              value={project.body || ''}
              onChange={(e) => updateField('body', e.target.value)}
              className={styles.textarea}
              placeholder="Full project description..."
            />
          </label>
          <div className={styles.formGrid3}>
            <label className={styles.label}>
              <span className={styles.labelText}>Category *</span>
              <select
                value={project.category || 'hotels'}
                onChange={(e) => updateField('category', e.target.value as ProjectCategory)}
                className={styles.select}
              >
                {portfolioCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {portfolioCategoryLabels[cat]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>Status</span>
              <select
                value={project.status || 'draft'}
                onChange={(e) => updateField('status', e.target.value as Project['status'])}
                className={styles.select}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={project.featured || false}
                onChange={(e) => updateField('featured', e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.labelText}>Featured project</span>
            </label>
          </div>
        </div>
      </section>

      {/* Hero Photo */}
      <section className={styles.card}>
        <div className={styles.quickLinkCard}>
          <div>
            <h2 className={styles.cardTitle}>Hero Photo *</h2>
            <p className={styles.cardDescription}>Main image shown on the portfolio page.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHeroSelector(true)}
            className={styles.btnSecondary}
          >
            {heroPhoto ? 'Change' : 'Select Photo'}
          </button>
        </div>
        {heroPhoto && (
          <div className={styles.formGrid}>
            <div className={styles.heroPreviewLarge}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroPhoto.src} alt={heroPhoto.alt} />
            </div>
            <p className={styles.mutedText}>{heroPhoto.alt || 'No alt text'}</p>
          </div>
        )}
      </section>

      {/* Gallery Photos */}
      <section className={styles.card}>
        <div className={styles.quickLinkCard}>
          <div>
            <h2 className={styles.cardTitle}>Gallery Photos</h2>
            <p className={styles.cardDescription}>
              Drag to reorder. These appear in the editorial gallery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGallerySelector(true)}
            className={styles.btnSecondary}
          >
            Add Photos
          </button>
        </div>
        {galleryPhotos.length > 0 ? (
          <div className={styles.galleryGrid}>
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleGalleryDragStart(photo.id)}
                onDragEnd={() => setDraggedPhotoId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleGalleryDrop(photo.id)}
                className={`${styles.galleryItem} ${draggedPhotoId === photo.id ? styles.galleryItemDragging : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt={photo.alt} />
                <button
                  type="button"
                  onClick={() => removeFromGallery(photo.id)}
                  className={styles.galleryItemRemove}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.mutedText}>No gallery photos added yet.</p>
        )}
      </section>

      {/* Editorial Captions */}
      <section className={styles.card}>
        <div className={styles.quickLinkCard}>
          <div>
            <h2 className={styles.cardTitle}>Editorial Captions</h2>
            <p className={styles.cardDescription}>
              Captions appear on alternating double rows in the gallery.
            </p>
          </div>
          <button type="button" onClick={addCaption} className={styles.btnSecondary}>
            Add Caption
          </button>
        </div>
        {(project.editorialCaptions || []).length > 0 ? (
          <div className={styles.captionsContainer}>
            {(project.editorialCaptions || []).map((caption, index) => (
              <div key={index} className={styles.captionCard}>
                <div className={styles.captionHeader}>
                  <span className={styles.captionLabel}>Caption {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeCaption(index)}
                    className={styles.captionRemove}
                  >
                    Remove
                  </button>
                </div>
                <div className={styles.captionFields}>
                  <input
                    value={caption.title}
                    onChange={(e) => updateCaption(index, { ...caption, title: e.target.value })}
                    placeholder="Caption title"
                    className={styles.input}
                  />
                  <textarea
                    value={caption.body}
                    onChange={(e) => updateCaption(index, { ...caption, body: e.target.value })}
                    placeholder="Caption body text..."
                    className={styles.textarea}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.mutedText}>No captions added yet.</p>
        )}
      </section>

      {/* Credits */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Credits</h2>
        <p className={styles.cardDescription}>Credit collaborators on this project.</p>
        <div className={styles.formGrid}>
          <AdminCreditsEditor
            credits={project.credits || []}
            onChange={(credits) => updateField('credits', credits)}
          />
        </div>
      </section>

      {/* SEO */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>SEO Metadata</h2>
        <p className={styles.cardDescription}>Search engine metadata for this project page.</p>
        <div className={styles.formGrid}>
          <label className={styles.label}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>Meta Title</span>
              <AiFixButton onClick={() => handleAiFix('metaTitle', 'seo')} disabled={isAiBusy} />
            </div>
            <input
              value={project.metaTitle || ''}
              onChange={(e) => updateField('metaTitle', e.target.value)}
              className={styles.input}
            />
          </label>
          <label className={styles.label}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>Meta Description</span>
              <AiFixButton onClick={() => handleAiFix('metaDescription', 'seo')} disabled={isAiBusy} />
            </div>
            <textarea
              value={project.metaDescription || ''}
              onChange={(e) => updateField('metaDescription', e.target.value)}
              className={styles.textarea}
            />
          </label>
          <label className={styles.label}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>Meta Keywords</span>
              <AiFixButton onClick={() => handleAiFix('metaKeywords', 'seo')} disabled={isAiBusy} />
            </div>
            <textarea
              value={project.metaKeywords || ''}
              onChange={(e) => updateField('metaKeywords', e.target.value)}
              className={styles.textarea}
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
