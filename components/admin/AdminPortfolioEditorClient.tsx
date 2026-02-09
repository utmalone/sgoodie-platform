'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PhotoAsset, Project, ProjectCategory, EditorialRowCaption } from '@/types';
import { AdminPhotoSelector } from './AdminPhotoSelector';
import { AdminCreditsEditor } from './AdminCreditsEditor';
import { AiFixButton } from './AiFixButton';
import { PhotoGuidelineTooltip } from './PhotoGuidelines';
import { FieldInfoTooltip } from './FieldInfoTooltip';
import { loadAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { loadDraftProject, saveDraftProject, clearDraftProject } from '@/lib/admin/draft-project-store';
import { usePreview } from '@/lib/admin/preview-context';
import { useSave } from '@/lib/admin/save-context';
import {
  portfolioCategories,
  portfolioCategoryLabels,
  type PortfolioCategory
} from '@/lib/admin/portfolio-config';
import { editorialGalleryGuideline, heroFullBleedGuideline } from '@/lib/admin/photo-guidelines';
import guidelineStyles from '@/styles/admin/PhotoGuidelines.module.css';
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

const portfolioFieldHelp = {
  title: [
    'Project name shown on cards and the project page.',
    'Example: The Meridian Hotel.'
  ],
  slug: [
    'URL-friendly project name. Use lowercase and hyphens.',
    'Example: the-meridian-hotel.'
  ],
  subtitle: [
    'Short descriptor shown under the title.',
    'Example: Boutique Hotel Photography.'
  ],
  hoverTitle: [
    'Short title shown when hovering on the project card.',
    'Example: The Meridian.'
  ],
  intro: [
    'Short intro shown near the top of the project page.',
    'Example: A modern hotel in downtown DC.'
  ],
  category: [
    'Where this project appears in the portfolio.',
    'Example: Hotels.'
  ],
  status: [
    'Draft hides it from the site. Published makes it visible.'
  ],
  featured: [
    'Highlight this project in featured sections.'
  ],
  metaTitle: [
    'SEO title shown in search results. Keep around 50-60 characters.',
    'Example: The Meridian Hotel | Portfolio.'
  ],
  metaDescription: [
    'SEO summary shown in search results. Aim for 140-160 characters.',
    'Example: Boutique hotel photography project for The Meridian in DC.'
  ],
  metaKeywords: [
    'Comma-separated keywords (optional).',
    'Example: hotel photography, boutique hotel, hospitality branding.'
  ]
};

const CAPTION_TITLE_MAX = 40;
const CAPTION_BODY_MAX = 180;

function getCaptionSlotCount(photoCount: number) {
  // Matches the public EditorialGallery "double -> single" pattern:
  // every 3 photos produces 1 double row, plus a final double row when 2 photos remain.
  const doubleRowCount = Math.floor((photoCount + 1) / 3);
  // Captions appear on every other double row (0, 2, 4, ...).
  return Math.ceil(doubleRowCount / 2);
}

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
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);
  const [aiResultKey, setAiResultKey] = useState<string | null>(null);
  const [aiResultSuccess, setAiResultSuccess] = useState(false);
  const aiResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [showHeroSelector, setShowHeroSelector] = useState(false);
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  // Check if project has unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(project) !== JSON.stringify(savedProject);
  }, [project, savedProject]);

  const setAiResult = useCallback((key: string, success: boolean) => {
    if (aiResultTimeoutRef.current) clearTimeout(aiResultTimeoutRef.current);
    setAiResultKey(key);
    setAiResultSuccess(success);
    aiResultTimeoutRef.current = setTimeout(() => {
      setAiResultKey(null);
      aiResultTimeoutRef.current = null;
    }, 2500);
  }, []);

  const getAiFixRowClass = useCallback(
    (key: string) => {
      if (aiResultKey !== key) return '';
      return aiResultSuccess ? styles.aiFixRowSuccess : styles.aiFixRowError;
    },
    [aiResultKey, aiResultSuccess]
  );

  useEffect(() => () => {
    if (aiResultTimeoutRef.current) clearTimeout(aiResultTimeoutRef.current);
  }, []);

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
      setStatus('Please fill in title, slug, and select a hero photo.');
      return false;
    }

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
        return false;
      }

      const saved = (await res.json()) as Project;
      setStatus('Saved successfully.');
      setProject(saved);
      setSavedProject(saved);

      if (isNew) {
        router.push(`/admin/portfolio/${saved.id}`);
      }

      refreshPreview();
      return true;
    } catch {
      setStatus('Failed to save project.');
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

  const draftSnapshot = useMemo(
    () => ({
      title: project.title,
      subtitle: project.subtitle,
      heroPhotoId: project.heroPhotoId,
      galleryPhotoIds: project.galleryPhotoIds,
      editorialCaptions: project.editorialCaptions,
      credits: project.credits,
      heroTitleColor: project.heroTitleColor,
      heroSubtitleColor: project.heroSubtitleColor
    }),
    [project]
  );

  const draftSerialized = useMemo(() => JSON.stringify(draftSnapshot), [draftSnapshot]);

  // Persist draft changes for preview before Save All.
  useEffect(() => {
    if (!projectId || isLoading) return;

    if (isDirty) {
      saveDraftProject(projectId, JSON.parse(draftSerialized));
    } else {
      clearDraftProject(projectId);
    }
  }, [draftSerialized, isDirty, isLoading, projectId]);

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
          const draft = loadDraftProject(projectData.id);
          setProject(draft ? { ...projectData, ...draft } : projectData);
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

  async function handleAiFix(
    field:
      | 'title'
      | 'subtitle'
      | 'hoverTitle'
      | 'intro'
      | 'body'
      | 'metaTitle'
      | 'metaDescription'
      | 'metaKeywords',
    mode: 'text' | 'seo'
  ) {
    const key = `portfolio-${field}`;
    if (aiLoadingKey) return;
    setAiLoadingKey(key);
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
        setAiResult(key, false);
        return;
      }

      const data = (await res.json()) as { output?: string };
      if (data.output) {
        updateField(field, data.output);
        setAiStatus('AI update complete.');
        setAiResult(key, true);
      } else {
        setAiStatus('AI did not return a result.');
        setAiResult(key, false);
      }
    } catch {
      setAiStatus('AI request failed.');
      setAiResult(key, false);
    } finally {
      setAiLoadingKey(null);
    }
  }

  async function handleAiFixCaption(index: number, field: 'title' | 'body') {
    const key = `portfolio-caption-${index}-${field}`;
    if (aiLoadingKey) return;
    setAiLoadingKey(key);
    setAiStatus('Optimizing with AI...');

    try {
      const model = loadAiModel();
      const caption = (project.editorialCaptions || [])[index] || { title: '', body: '' };
      const res = await fetch('/api/admin/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'text',
          target: 'page',
          field: `editorialCaptions[${index}].${field}`,
          input: String(caption[field] || ''),
          model,
          context: {
            page: {
              slug: project.slug,
              title: project.title,
              subtitle: project.subtitle,
              intro: project.intro,
              body: project.body
            },
            captionSlot: index + 1,
            captionLimits: { titleMax: CAPTION_TITLE_MAX, bodyMax: CAPTION_BODY_MAX }
          }
        })
      });

      if (!res.ok) {
        const message = await getApiErrorMessage(res, 'AI request failed.');
        setAiStatus(message);
        setAiResult(key, false);
        return;
      }

      const data = (await res.json()) as { output?: string };
      if (data.output) {
        const capped =
          field === 'title' ? data.output.slice(0, CAPTION_TITLE_MAX) : data.output.slice(0, CAPTION_BODY_MAX);
        updateCaption(index, { ...caption, [field]: capped });
        setAiStatus('AI update complete.');
        setAiResult(key, true);
      } else {
        setAiStatus('AI did not return a result.');
        setAiResult(key, false);
      }
    } catch {
      setAiStatus('AI request failed.');
      setAiResult(key, false);
    } finally {
      setAiLoadingKey(null);
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

    const reordered = [...current];
    [reordered[fromIndex], reordered[toIndex]] = [reordered[toIndex], reordered[fromIndex]];

    updateField('galleryPhotoIds', reordered);
    refreshPreview();
  }

  function handleGalleryDropAtEnd() {
    if (!draggedPhotoId) return;

    const current = [...(project.galleryPhotoIds || [])];
    if (current.length < 2 || !current.includes(draggedPhotoId)) return;

    const reordered = current.filter((id) => id !== draggedPhotoId);
    reordered.push(draggedPhotoId);

    updateField('galleryPhotoIds', reordered);
    setDraggedPhotoId(null);
    refreshPreview();
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

  const projectCategory = project.category as PortfolioCategory;
  const captionSlotCount = useMemo(
    () => getCaptionSlotCount((project.galleryPhotoIds || []).length),
    [project.galleryPhotoIds]
  );

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
            <>
              <button
                type="button"
                onClick={() => openPreview(`/portfolio/${project.category}/${project.slug}`)}
                className={styles.btnSecondary}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `/portfolio/${project.category}/${project.slug}?preview=draft`,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
                className={styles.btnSecondary}
              >
                Preview Tab
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => router.push('/admin/portfolio')}
            className={styles.btnSecondary}
          >
            Cancel
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
            <label className={`${styles.label} ${getAiFixRowClass('portfolio-title')}`}>
              <div className={styles.fieldHeader}>
                <span className={styles.labelText}>
                  Title *
                  <FieldInfoTooltip label="Title" lines={portfolioFieldHelp.title} />
                </span>
                <AiFixButton onClick={() => handleAiFix('title', 'text')} loading={aiLoadingKey === 'portfolio-title'} />
              </div>
              <input
                value={project.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className={styles.input}
                placeholder="Project title"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>
                Slug *
                <FieldInfoTooltip label="Slug" lines={portfolioFieldHelp.slug} />
              </span>
              <input
                value={project.slug || ''}
                onChange={(e) => updateField('slug', e.target.value)}
                className={styles.input}
                placeholder="project-slug"
              />
            </label>
          </div>
          <div className={styles.formGrid2}>
            <label className={`${styles.label} ${getAiFixRowClass('portfolio-subtitle')}`}>
              <div className={styles.fieldHeader}>
                <span className={styles.labelText}>
                  Subtitle
                  <FieldInfoTooltip label="Subtitle" lines={portfolioFieldHelp.subtitle} />
                </span>
                <AiFixButton onClick={() => handleAiFix('subtitle', 'text')} loading={aiLoadingKey === 'portfolio-subtitle'} />
              </div>
              <input
                value={project.subtitle || ''}
                onChange={(e) => updateField('subtitle', e.target.value)}
                className={styles.input}
                placeholder="e.g., Interior Photography"
              />
            </label>
            <label className={`${styles.label} ${getAiFixRowClass('portfolio-hoverTitle')}`}>
              <div className={styles.fieldHeader}>
                <span className={styles.labelText}>
                  Hover Title
                  <FieldInfoTooltip label="Hover Title" lines={portfolioFieldHelp.hoverTitle} />
                </span>
                <AiFixButton onClick={() => handleAiFix('hoverTitle', 'text')} loading={aiLoadingKey === 'portfolio-hoverTitle'} />
              </div>
              <input
                value={project.hoverTitle || ''}
                onChange={(e) => updateField('hoverTitle', e.target.value)}
                className={styles.input}
                placeholder="Title shown on hover"
              />
            </label>
          </div>
          <label className={`${styles.label} ${getAiFixRowClass('portfolio-intro')}`}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>
                Introduction
                <FieldInfoTooltip label="Introduction" lines={portfolioFieldHelp.intro} />
              </span>
              <AiFixButton onClick={() => handleAiFix('intro', 'text')} loading={aiLoadingKey === 'portfolio-intro'} />
            </div>
            <textarea
              value={project.intro || ''}
              onChange={(e) => updateField('intro', e.target.value)}
              className={styles.textarea}
              placeholder="Brief introduction..."
            />
          </label>
          <div className={styles.formGrid3}>
            <label className={styles.label}>
              <span className={styles.labelText}>
                Category *
                <FieldInfoTooltip label="Category" lines={portfolioFieldHelp.category} />
              </span>
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
              <span className={styles.labelText}>
                Status
                <FieldInfoTooltip label="Status" lines={portfolioFieldHelp.status} />
              </span>
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
              <span className={styles.labelText}>
                Featured project
                <FieldInfoTooltip label="Featured project" lines={portfolioFieldHelp.featured} />
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Hero Photo */}
      <section className={styles.card}>
        <div className={styles.quickLinkCard}>
          <div>
            <div className={guidelineStyles.headingRow}>
              <h2 className={styles.cardTitle}>Hero Photo *</h2>
              <PhotoGuidelineTooltip
                label={heroFullBleedGuideline.label}
                lines={heroFullBleedGuideline.lines}
              />
            </div>
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
            <div className={styles.heroPreviewWithColors}>
              <div
                className={styles.heroPreviewLarge}
                style={{
                  ...(project.heroTitleColor ? { '--hero-title-color': project.heroTitleColor } : {}),
                  ...(project.heroSubtitleColor ? { '--hero-subtitle-color': project.heroSubtitleColor } : {})
                } as React.CSSProperties}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroPhoto.src} alt={heroPhoto.alt} />
                <div className={styles.heroPreviewOverlay} aria-hidden="true" />
                <div className={styles.heroPreviewTextBlock} aria-hidden="true">
                  {project.subtitle && (
                    <p className={styles.heroPreviewSubtitleText}>{project.subtitle}</p>
                  )}
                  <p className={styles.heroPreviewTitleText}>
                    {project.title || 'Project Title'}
                  </p>
                </div>
              </div>
              <div className={styles.heroColorPickerPanel}>
                <div className={styles.heroColorPickerRow}>
                  <span className={styles.heroColorLabel}>Title</span>
                  <input
                    type="color"
                    value={project.heroTitleColor || '#ffffff'}
                    onChange={(e) => updateField('heroTitleColor', e.target.value)}
                    className={styles.heroColorPicker}
                  />
                  <input
                    type="text"
                    value={project.heroTitleColor || ''}
                    onChange={(e) => updateField('heroTitleColor', e.target.value)}
                    placeholder="#ffffff"
                    className={styles.heroColorHexInput}
                  />
                </div>
                <div className={styles.heroColorPickerRow}>
                  <span className={styles.heroColorLabel}>Subtitle</span>
                  <input
                    type="color"
                    value={project.heroSubtitleColor || '#ffffff'}
                    onChange={(e) => updateField('heroSubtitleColor', e.target.value)}
                    className={styles.heroColorPicker}
                  />
                  <input
                    type="text"
                    value={project.heroSubtitleColor || ''}
                    onChange={(e) => updateField('heroSubtitleColor', e.target.value)}
                    placeholder="#ffffff"
                    className={styles.heroColorHexInput}
                  />
                </div>
                {(project.heroTitleColor || project.heroSubtitleColor) && (
                  <button
                    type="button"
                    onClick={() => {
                      updateField('heroTitleColor', '');
                      updateField('heroSubtitleColor', '');
                    }}
                    className={styles.btnSecondary}
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </div>
            <p className={styles.mutedText}>{heroPhoto.alt || 'No alt text'}</p>
          </div>
        )}
      </section>

      {/* Gallery Photos */}
      <section className={styles.card}>
        <div className={styles.quickLinkCard}>
          <div>
            <div className={guidelineStyles.headingRow}>
              <h2 className={styles.cardTitle}>Gallery Photos</h2>
              <PhotoGuidelineTooltip
                label={editorialGalleryGuideline.label}
                lines={editorialGalleryGuideline.lines}
              />
            </div>
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
            {galleryPhotos.length >= 2 && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleGalleryDropAtEnd();
                }}
                className={styles.galleryItem}
                style={{ opacity: 0.6, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className={styles.cardDescription}>Drop here to move to end</span>
              </div>
            )}
          </div>
        ) : (
          <p className={styles.mutedText}>No gallery photos added yet.</p>
        )}
      </section>

      {/* Editorial Captions */}
      <section className={styles.card}>
        <div className={styles.quickLinkCard}>
          <div>
            <div className={guidelineStyles.headingRow}>
              <h2 className={styles.cardTitle}>Editorial Captions</h2>
              <FieldInfoTooltip
                label="Editorial Captions"
                lines={[
                  'Captions attach to specific rows in the editorial gallery pattern.',
                  'They appear on the 1st, 3rd, 5th... double-photo rows (roughly every 6 photos).',
                  'You will see a new caption slot automatically after you add more gallery photos.',
                  'Leaving a caption slot blank is fine (it will not show on the site).'
                ]}
                align="right"
                example={{ src: '/admin/examples/portfolio-caption.svg', alt: 'Editorial caption example' }}
              />
            </div>
            <p className={styles.cardDescription}>
              Caption slots are generated automatically from your gallery photo count.
            </p>
          </div>
        </div>

        {captionSlotCount === 0 ? (
          <p className={styles.mutedText}>
            Add at least 2 gallery photos to unlock caption slots.
          </p>
        ) : (
          <div className={styles.captionsContainer}>
            {Array.from({ length: captionSlotCount }).map((_, index) => {
              const caption = (project.editorialCaptions || [])[index] || { title: '', body: '' };
              return (
                <div key={index} className={styles.captionCard}>
                  <div className={styles.captionHeader}>
                    <span className={styles.captionLabel}>Caption Slot {index + 1}</span>
                  </div>
                  <div className={styles.captionFields}>
                    <div className={getAiFixRowClass(`portfolio-caption-${index}-title`)}>
                      <div className={styles.fieldHeader}>
                        <span className={styles.labelText}>Title</span>
                        <div className={styles.actionsRow}>
                          <span className={styles.charCount}>
                            {(caption.title || '').length}/{CAPTION_TITLE_MAX}
                          </span>
                          <AiFixButton onClick={() => handleAiFixCaption(index, 'title')} loading={aiLoadingKey === `portfolio-caption-${index}-title`} />
                        </div>
                      </div>
                      <input
                        value={caption.title}
                        onChange={(e) => updateCaption(index, { ...caption, title: e.target.value })}
                        placeholder="Infinity Views"
                        className={styles.input}
                        maxLength={CAPTION_TITLE_MAX}
                      />
                    </div>
                    <div className={getAiFixRowClass(`portfolio-caption-${index}-body`)}>
                      <div className={styles.fieldHeader}>
                        <span className={styles.labelText}>Body</span>
                        <div className={styles.actionsRow}>
                          <span className={styles.charCount}>
                            {(caption.body || '').length}/{CAPTION_BODY_MAX}
                          </span>
                          <AiFixButton onClick={() => handleAiFixCaption(index, 'body')} loading={aiLoadingKey === `portfolio-caption-${index}-body`} />
                        </div>
                      </div>
                      <textarea
                      value={caption.body}
                        onChange={(e) => updateCaption(index, { ...caption, body: e.target.value })}
                        placeholder="The signature infinity pool creates a seamless visual connection..."
                        className={styles.textarea}
                        maxLength={CAPTION_BODY_MAX}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
          <label className={`${styles.label} ${getAiFixRowClass('portfolio-metaTitle')}`}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>
                Meta Title
                <FieldInfoTooltip label="Meta Title" lines={portfolioFieldHelp.metaTitle} />
              </span>
              <AiFixButton onClick={() => handleAiFix('metaTitle', 'seo')} loading={aiLoadingKey === 'portfolio-metaTitle'} />
            </div>
            <input
              value={project.metaTitle || ''}
              onChange={(e) => updateField('metaTitle', e.target.value)}
              className={styles.input}
            />
          </label>
          <label className={`${styles.label} ${getAiFixRowClass('portfolio-metaDescription')}`}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>
                Meta Description
                <FieldInfoTooltip label="Meta Description" lines={portfolioFieldHelp.metaDescription} />
              </span>
              <AiFixButton onClick={() => handleAiFix('metaDescription', 'seo')} loading={aiLoadingKey === 'portfolio-metaDescription'} />
            </div>
            <textarea
              value={project.metaDescription || ''}
              onChange={(e) => updateField('metaDescription', e.target.value)}
              className={styles.textarea}
            />
          </label>
          <label className={`${styles.label} ${getAiFixRowClass('portfolio-metaKeywords')}`}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>
                Meta Keywords
                <FieldInfoTooltip label="Meta Keywords" lines={portfolioFieldHelp.metaKeywords} />
              </span>
              <AiFixButton onClick={() => handleAiFix('metaKeywords', 'seo')} loading={aiLoadingKey === 'portfolio-metaKeywords'} />
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
