'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { JournalPost, PhotoAsset } from '@/types';
import { AdminPhotoSelector } from './AdminPhotoSelector';
import { AdminCreditsEditor } from './AdminCreditsEditor';
import { AiFixButton } from './AiFixButton';
import { PhotoGuidelineTooltip } from './PhotoGuidelines';
import { FieldInfoTooltip } from './FieldInfoTooltip';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { loadAiModel } from '@/lib/admin/ai-model';
import { loadDraftJournalPost, saveDraftJournalPost, clearDraftJournalPost } from '@/lib/admin/draft-journal-post-store';
import { usePreview } from '@/lib/admin/preview-context';
import { useSave } from '@/lib/admin/save-context';
import { journalPhotoGuideline } from '@/lib/admin/photo-guidelines';
import guidelineStyles from '@/styles/admin/PhotoGuidelines.module.css';
import sharedStyles from '@/styles/admin/AdminShared.module.css';
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

const journalFieldHelp = {
  title: [
    'Headline for the post.',
    'Example: Behind the Scenes at The Meridian.'
  ],
  slug: [
    'URL-friendly version of the title. Use lowercase and hyphens.',
    'Example: behind-the-scenes-meridian.'
  ],
  category: [
    'Label shown on the journal list.',
    'Example: Project Feature.'
  ],
  author: [
    'Name shown under the post title.',
    'Example: S.Goodie Studio.'
  ],
  date: [
    'Publish date used for ordering.',
    'Example: 2026-02-07.'
  ],
  excerpt: [
    'Short summary used on the journal list.',
    'Example: A quick look at our latest hotel shoot.'
  ],
  body: [
    'Full article content. Use paragraphs and line breaks.'
  ]
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
  const [aiStatus, setAiStatus] = useState('');
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);
  const [aiResultKey, setAiResultKey] = useState<string | null>(null);
  const [aiResultSuccess, setAiResultSuccess] = useState(false);
  const aiResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [showHeroSelector, setShowHeroSelector] = useState(false);
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  // Check if post has unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(post) !== JSON.stringify(savedPost);
  }, [post, savedPost]);

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
    if (!post.title || !post.slug) {
      setStatus('Please fill in title and slug.');
      return false;
    }

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
        return false;
      }

      const saved = (await res.json()) as JournalPost;
      setStatus('Saved successfully.');
      setPost(saved);
      setSavedPost(saved);

      if (isNew) {
        router.push(`/admin/journal/${saved.id}`);
      }

      refreshPreview();
      return true;
    } catch {
      setStatus('Failed to save post.');
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
      return aiResultSuccess ? sharedStyles.aiFixRowSuccess : sharedStyles.aiFixRowError;
    },
    [aiResultKey, aiResultSuccess]
  );

  useEffect(() => () => {
    if (aiResultTimeoutRef.current) clearTimeout(aiResultTimeoutRef.current);
  }, []);

  const draftSnapshot = useMemo(
    () => ({
      title: post.title,
      category: post.category,
      excerpt: post.excerpt,
      body: post.body,
      heroPhotoId: post.heroPhotoId,
      galleryPhotoIds: post.galleryPhotoIds,
      credits: post.credits
    }),
    [post]
  );

  const draftSerialized = useMemo(() => JSON.stringify(draftSnapshot), [draftSnapshot]);

  // Persist draft changes for preview before Save All.
  useEffect(() => {
    if (!postId || isLoading) return;

    if (isDirty) {
      saveDraftJournalPost(postId, JSON.parse(draftSerialized));
    } else {
      clearDraftJournalPost(postId);
    }
  }, [draftSerialized, isDirty, isLoading, postId]);

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
          const draft = loadDraftJournalPost(postData.id);
          setPost(draft ? { ...postData, ...draft } : postData);
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

  function handleHeroSelect(photoIds: string[]) {
    updateField('heroPhotoId', photoIds[0] || '');
  }

  function removeFeaturedPhoto() {
    updateField('heroPhotoId', '');
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

    const reordered = [...current];
    [reordered[fromIndex], reordered[toIndex]] = [reordered[toIndex], reordered[fromIndex]];

    updateField('galleryPhotoIds', reordered);
    refreshPreview();
  }

  function handleGalleryDropAtEnd() {
    if (!draggedPhotoId) return;

    const current = [...(post.galleryPhotoIds || [])];
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
      (post.galleryPhotoIds || []).filter((id) => id !== photoId)
    );
  }

  async function handleAiFix(field: 'title' | 'excerpt' | 'body') {
    const key = `journal-${field}`;
    if (aiLoadingKey) return;
    setAiLoadingKey(key);
    setAiStatus('Optimizing with AI...');

    try {
      const model = loadAiModel();
      const res = await fetch('/api/admin/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'text',
          target: 'page',
          field: `journal.${field}`,
          input: String((post as JournalPost)[field] || ''),
          model,
          context: {
            post: {
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
              body: post.body,
              category: post.category,
              author: post.author,
              date: post.date
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
            <>
              <button
                type="button"
                onClick={() => openPreview(`/journal/${post.slug}`)}
                className={styles.btnSecondary}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open(`/journal/${post.slug}?preview=draft`, '_blank', 'noopener,noreferrer')
                }
                className={styles.btnSecondary}
              >
                Preview Tab
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => router.push('/admin/journal')}
            className={styles.btnSecondaryWide}
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
          <div className={styles.formRowTwo}>
            <label className={`${styles.label} ${getAiFixRowClass('journal-title')}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.labelText}>
                  Title *
                  <FieldInfoTooltip label="Title" lines={journalFieldHelp.title} />
                </span>
                <AiFixButton onClick={() => handleAiFix('title')} loading={aiLoadingKey === 'journal-title'} />
              </div>
              <input
                value={post.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                className={styles.input}
                placeholder="Post title"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>
                Slug *
                <FieldInfoTooltip label="Slug" lines={journalFieldHelp.slug} />
              </span>
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
              <span className={styles.labelText}>
                Category
                <FieldInfoTooltip label="Category" lines={journalFieldHelp.category} />
              </span>
              <input
                value={post.category || ''}
                onChange={(e) => updateField('category', e.target.value)}
                className={styles.input}
                placeholder="e.g., Project Feature"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>
                Author
                <FieldInfoTooltip label="Author" lines={journalFieldHelp.author} />
              </span>
              <input
                value={post.author || ''}
                onChange={(e) => updateField('author', e.target.value)}
                className={styles.input}
                placeholder="S.Goodie Studio"
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelText}>
                Date
                <FieldInfoTooltip label="Date" lines={journalFieldHelp.date} />
              </span>
              <input
                type="date"
                value={post.date || ''}
                onChange={(e) => updateField('date', e.target.value)}
                className={styles.input}
              />
            </label>
          </div>
          <label className={`${styles.label} ${getAiFixRowClass('journal-excerpt')}`}>
            <div className={styles.sectionHeader}>
              <span className={styles.labelText}>
                Excerpt
                <FieldInfoTooltip label="Excerpt" lines={journalFieldHelp.excerpt} />
              </span>
              <AiFixButton onClick={() => handleAiFix('excerpt')} loading={aiLoadingKey === 'journal-excerpt'} />
            </div>
            <textarea
              value={post.excerpt || ''}
              onChange={(e) => updateField('excerpt', e.target.value)}
              className={`${styles.textarea} ${styles.textareaShort}`}
              placeholder="Brief summary shown on the journal index page..."
            />
          </label>
          <label className={`${styles.label} ${getAiFixRowClass('journal-body')}`}>
            <div className={styles.sectionHeader}>
              <span className={styles.labelText}>
                Body
                <FieldInfoTooltip label="Body" lines={journalFieldHelp.body} />
              </span>
              <AiFixButton onClick={() => handleAiFix('body')} loading={aiLoadingKey === 'journal-body'} />
            </div>
            <textarea
              value={post.body || ''}
              onChange={(e) => updateField('body', e.target.value)}
              className={`${styles.textarea} ${styles.textareaBody}`}
              placeholder="Full post content. Use double line breaks for paragraphs..."
            />
          </label>
        </div>
      </section>

      {/* Featured Photo */}
      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={guidelineStyles.headingRow}>
              <h2 className={styles.cardTitle}>Featured Photo</h2>
              <PhotoGuidelineTooltip
                label={journalPhotoGuideline.label}
                lines={journalPhotoGuideline.lines}
              />
            </div>
            <p className={styles.cardDescription}>
              Featured image shown on the journal index. Optional.
            </p>
          </div>
          <div className={styles.heroButtonRow}>
            <button
              type="button"
              onClick={() => setShowHeroSelector(true)}
              className={styles.heroButton}
            >
              {heroPhoto ? 'Change' : 'Select Photo'}
            </button>
            {heroPhoto && (
              <button
                type="button"
                onClick={removeFeaturedPhoto}
                className={styles.removeButton}
              >
                Remove
              </button>
            )}
          </div>
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
                  aria-label="Remove photo from gallery"
                  title="Remove"
                >
                  x
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
          <p className={styles.emptyText}>No gallery photos added yet.</p>
        )}
      </section>

      {/* Credits */}
      <section className={styles.card}>
        <div className={guidelineStyles.headingRow}>
          <h2 className={styles.cardTitle}>Credits</h2>
          <FieldInfoTooltip
            label="Credits"
            lines={[
              'Credits appear on the journal post detail page (right column).',
              'Add one credit per line (label + value).'
            ]}
            align="right"
            example={{ src: '/admin/examples/journal-credits.svg', alt: 'Credits block example' }}
          />
        </div>
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
        title="Select Featured Photo"
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
