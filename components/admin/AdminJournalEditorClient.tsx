'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { JournalPost, PhotoAsset } from '@/types';
import { AdminPhotoSelector } from './AdminPhotoSelector';
import { AdminCreditsEditor } from './AdminCreditsEditor';
import { PhotoGuidelineTooltip } from './PhotoGuidelines';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { usePreview } from '@/lib/admin/preview-context';
import { useSave } from '@/lib/admin/save-context';
import { journalPhotoGuideline } from '@/lib/admin/photo-guidelines';
import guidelineStyles from '@/styles/admin/PhotoGuidelines.module.css';
import styles from '@/styles/admin/AdminJournalEditorClient.module.css';

type AdminJournalEditorClientProps = {
  postId?: string;
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const emptyPost: Omit<JournalPost, 'id'> = {
  title: '',
  slug: '',
  category: 'Project Feature',
  author: 'S.Goodie Studio',
  date: new Date().toISOString().split('T')[0],
  excerpt: '',
  body: '',
  heroPhotoId: '',
  galleryPhotoIds: [],
  credits: []
};

export function AdminJournalEditorClient({ postId }: AdminJournalEditorClientProps) {
  const router = useRouter();
  const { openPreview, refreshPreview } = usePreview();
  const { registerChange, unregisterChange } = useSave();
  const isNew = !postId;

  const [post, setPost] = useState<Partial<JournalPost>>(emptyPost);
  const [savedPost, setSavedPost] = useState<Partial<JournalPost>>(emptyPost);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [showHeroSelector, setShowHeroSelector] = useState(false);
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  // Check if post has unsaved changes
  const isDirty = useMemo(() => {
    if (isNew) {
      // For new posts, dirty if any required field has content
      return !!(post.title || post.heroPhotoId);
    }
    return JSON.stringify(post) !== JSON.stringify(savedPost);
  }, [post, savedPost, isNew]);

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const heroPhoto = post.heroPhotoId ? photosById.get(post.heroPhotoId) : null;
  const galleryPhotos = useMemo(() => {
    return (post.galleryPhotoIds || [])
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }, [post.galleryPhotoIds, photosById]);

  // Save function for master save
  const savePost = useCallback(async (): Promise<boolean> => {
    if (!post.title || !post.slug || !post.heroPhotoId) {
      return false;
    }

    try {
      const url = isNew ? '/api/admin/journal' : `/api/admin/journal/${postId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });

      if (!res.ok) return false;

      const saved = (await res.json()) as JournalPost;
      setPost(saved);
      setSavedPost(saved);

      if (isNew) {
        router.push(`/admin/journal/${saved.id}`);
      }

      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [post, isNew, postId, router, refreshPreview]);

  // Register/unregister changes with master save context
  useEffect(() => {
    const changeId = `journal-${postId || 'new'}`;
    if (isDirty && !isLoading) {
      registerChange({
        id: changeId,
        type: 'journal',
        save: savePost
      });
    } else {
      unregisterChange(changeId);
    }
    
    return () => {
      unregisterChange(changeId);
    };
  }, [isDirty, isLoading, postId, registerChange, unregisterChange, savePost]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function loadData() {
    setIsLoading(true);

    try {
      const photosRes = await fetch('/api/admin/photos');
      if (photosRes.ok) {
        const photosData = (await photosRes.json()) as PhotoAsset[];
        setPhotos(photosData);
      }

      if (!isNew) {
        const postRes = await fetch(`/api/admin/journal/${postId}`);
        if (postRes.ok) {
          const postData = (await postRes.json()) as JournalPost;
          setPost(postData);
          setSavedPost(postData);
        } else {
          setStatus('Post not found.');
        }
      }
    } catch {
      setStatus('Unable to load data.');
    } finally {
      setIsLoading(false);
    }
  }

  function updateField<K extends keyof JournalPost>(field: K, value: JournalPost[K]) {
    setPost((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from title if slug is empty
      if (field === 'title' && !prev.slug) {
        updated.slug = generateSlug(value as string);
      }
      return updated;
    });
  }

  async function handleSave() {
    if (!post.title || !post.slug || !post.heroPhotoId) {
      setStatus('Please fill in title, slug, and select a hero photo.');
      return;
    }

    setIsSaving(true);
    setStatus('Saving...');

    try {
      const url = isNew ? '/api/admin/journal' : `/api/admin/journal/${postId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });

      if (!res.ok) {
        const message = await getApiErrorMessage(res, 'Failed to save post.');
        setStatus(message);
        setIsSaving(false);
        return;
      }

      const saved = (await res.json()) as JournalPost;
      setStatus('Saved successfully.');
      setPost(saved);
      setSavedPost(saved);

      if (isNew) {
        router.push(`/admin/journal/${saved.id}`);
      }
      refreshPreview();
    } catch {
      setStatus('Failed to save post.');
    } finally {
      setIsSaving(false);
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

    const current = [...(post.galleryPhotoIds || [])];
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
      (post.galleryPhotoIds || []).filter((id) => id !== photoId)
    );
  }

  if (isLoading) {
    return <p className={styles.statusMessage}>Loading post...</p>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{isNew ? 'New Journal Post' : 'Edit Post'}</h1>
          <p className={styles.pageDescription}>
            {isNew ? 'Create a new journal entry.' : `Editing: ${post.title}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          {!isNew && post.slug && (
            <button
              type="button"
              onClick={() => openPreview(`/journal/${post.slug}`)}
              className={styles.btnSecondary}
            >
              Preview
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/admin/journal')}
            className={styles.btnSecondaryWide}
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

      {/* Basic Info */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Basic Information</h2>
        <div className={styles.formGrid}>
          <div className={styles.formRowTwo}>
            <label className={styles.label}>
              <span className={styles.labelText}>Title *</span>
              <input
                value={post.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className={styles.input}
                placeholder="Post title"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>Slug *</span>
              <input
                value={post.slug || ''}
                onChange={(e) => updateField('slug', e.target.value)}
                className={styles.input}
                placeholder="post-slug"
              />
            </label>
          </div>
          <div className={styles.formRowThree}>
            <label className={styles.label}>
              <span className={styles.labelText}>Category</span>
              <input
                value={post.category || ''}
                onChange={(e) => updateField('category', e.target.value)}
                className={styles.input}
                placeholder="e.g., Project Feature"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>Author</span>
              <input
                value={post.author || ''}
                onChange={(e) => updateField('author', e.target.value)}
                className={styles.input}
                placeholder="S.Goodie Studio"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>Date</span>
              <input
                type="date"
                value={post.date || ''}
                onChange={(e) => updateField('date', e.target.value)}
                className={styles.input}
              />
            </label>
          </div>
          <label className={styles.label}>
            <span className={styles.labelText}>Excerpt</span>
            <textarea
              value={post.excerpt || ''}
              onChange={(e) => updateField('excerpt', e.target.value)}
              className={`${styles.textarea} ${styles.textareaShort}`}
              placeholder="Brief summary shown on the journal index page..."
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>Body</span>
            <textarea
              value={post.body || ''}
              onChange={(e) => updateField('body', e.target.value)}
              className={`${styles.textarea} ${styles.textareaBody}`}
              placeholder="Full post content. Use double line breaks for paragraphs..."
            />
          </label>
        </div>
      </section>

      {/* Hero Photo */}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={guidelineStyles.headingRow}>
              <h2 className={styles.cardTitle}>Hero Photo *</h2>
              <PhotoGuidelineTooltip
                label={journalPhotoGuideline.label}
                lines={journalPhotoGuideline.lines}
              />
            </div>
            <p className={styles.cardDescription}>
              Main image shown on the journal index.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHeroSelector(true)}
            className={styles.heroButton}
          >
            {heroPhoto ? 'Change' : 'Select Photo'}
          </button>
        </div>
        {heroPhoto && (
          <div className={styles.sectionBody}>
            <div className={styles.heroImageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPhoto.src}
                alt={heroPhoto.alt}
                className={styles.heroImage}
              />
            </div>
            <p className={styles.heroAlt}>{heroPhoto.alt || 'No alt text'}</p>
          </div>
        )}
      </section>

      {/* Gallery Photos */}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={guidelineStyles.headingRow}>
              <h2 className={styles.cardTitle}>Gallery Photos</h2>
              <PhotoGuidelineTooltip
                label={journalPhotoGuideline.label}
                lines={journalPhotoGuideline.lines}
              />
            </div>
            <p className={styles.cardDescription}>
              Additional photos shown on the post detail page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGallerySelector(true)}
            className={styles.heroButton}
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
                className={`${styles.galleryItem} ${
                  draggedPhotoId === photo.id ? styles.galleryItemDragging : ''
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className={styles.heroImage}
                />
                <button
                  type="button"
                  onClick={() => removeFromGallery(photo.id)}
                  className={styles.galleryRemove}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>No gallery photos added yet.</p>
        )}
      </section>

      {/* Credits */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Credits</h2>
        <p className={styles.cardDescription}>
          Credit collaborators on this project.
        </p>
        <div className={styles.sectionBody}>
          <AdminCreditsEditor
            credits={post.credits || []}
            onChange={(credits) => updateField('credits', credits)}
          />
        </div>
      </section>

      {/* Photo Selectors */}
      <AdminPhotoSelector
        isOpen={showHeroSelector}
        onClose={() => setShowHeroSelector(false)}
        onSelect={handleHeroSelect}
        selectedIds={post.heroPhotoId ? [post.heroPhotoId] : []}
        title="Select Hero Photo"
      />
      <AdminPhotoSelector
        isOpen={showGallerySelector}
        onClose={() => setShowGallerySelector(false)}
        onSelect={handleGallerySelect}
        selectedIds={post.galleryPhotoIds || []}
        multiple
        title="Select Gallery Photos"
      />
    </div>
  );
}
