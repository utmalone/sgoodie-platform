'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { PageContent, PageSlug, PhotoAsset, HomeLayout, AboutPageContent, ContactPageContent } from '@/types';
import { useSave } from '@/lib/admin/save-context';
import { pageLabels, photoPageOrder } from '@/lib/admin/page-config';
import { loadAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { AiFixButton } from '@/components/admin/AiFixButton';
import { PhotoGuidelineRow } from '@/components/admin/PhotoGuidelines';
import { FieldInfoTooltip } from '@/components/admin/FieldInfoTooltip';
import { usePreview } from '@/lib/admin/preview-context';
import { pagePhotoGuidelinesBySlug } from '@/lib/admin/photo-guidelines';
import {
  getPhotoLibraryGroup,
  getLibraryGroupOrderForPage,
  getPhotoSuitabilityLabels,
  getSlotForAdd,
  getMismatchWarning,
  LIBRARY_GROUP_LABELS,
  type LibraryGroupKey
} from '@/lib/admin/photo-suitability';
import {
  loadDraftAboutContent,
  saveDraftAboutContent
} from '@/lib/admin/draft-about-store';
import { saveDraftHomeLayout } from '@/lib/admin/draft-home-layout-store';
import { saveDraftContactContent } from '@/lib/admin/draft-contact-store';
import guidelineStyles from '@/styles/admin/PhotoGuidelines.module.css';
import sharedStyles from '@/styles/admin/AdminShared.module.css';
import styles from '@/styles/admin/AdminPhotosClient.module.css';

type PageLayouts = {
  home: HomeLayout | null;
  about: AboutPageContent | null;
  contact: ContactPageContent | null;
};

type BulkUploadItem = {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'ready' | 'uploading' | 'done' | 'error';
  alt: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  width?: number;
  height?: number;
  error?: string;
};

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function getAspectRatioLabel(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '';
  const aspect = width / height;
  if (aspect >= 1.6 && aspect <= 2.0) return '16:9';
  if (aspect >= 1.4 && aspect <= 1.7) return '3:2';
  if (aspect >= 0.6 && aspect <= 0.72) return '2:3';
  if (aspect >= 0.7 && aspect <= 0.8) return '3:4';
  if (aspect >= 1.2 && aspect <= 1.4) return '4:3';
  if (aspect >= 0.95 && aspect <= 1.05) return '1:1';
  return '';
}

const MAX_BULK_PHOTOS = 50;
const ABOUT_MAX_APPROACH_PHOTOS = 4;

/** Drop target: either a photo (reorder) or a slot (section + index) */
type DropTarget =
  | { type: 'photo'; id: string }
  | { type: 'slot'; section: 'hero' | 'feature' | 'approach' | 'bio'; index?: number };

/** Renders a single photo card with drag/drop and edit controls */
function PagePhotoCard({
  photo,
  label,
  canReorder,
  draggedId,
  dragOverTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDropOnPhoto,
  onDropOnSlot,
  togglePhotoDetails,
  removeFromGallery,
  expandedPhotoId,
  updatePhotoField,
  getAiFixRowClass,
  handleAiFixPhoto,
  aiLoadingKey,
  photoFieldHelp,
  styles,
  slotIndex,
  slotSection
}: {
  photo: PhotoAsset;
  label: string;
  canReorder: boolean;
  draggedId: string | null;
  dragOverTarget: DropTarget | null;
  onDragStart: (id: string) => void;
  onDragOver: (t: DropTarget) => void;
  onDragLeave: () => void;
  onDropOnPhoto: (id: string, targetSlot?: { section: 'hero' | 'approach' | 'bio' | 'feature'; index?: number }) => void;
  onDropOnSlot: (t: DropTarget & { type: 'slot' }) => void;
  togglePhotoDetails: (id: string) => void;
  removeFromGallery: (id: string, slot?: { section: 'hero' | 'approach' | 'bio' | 'feature'; index?: number }) => void;
  expandedPhotoId: string | null;
  updatePhotoField: (id: string, f: 'alt' | 'metaTitle' | 'metaDescription' | 'metaKeywords', v: string) => void;
  getAiFixRowClass: (k: string) => string;
  handleAiFixPhoto: (id: string, f: 'alt' | 'metaTitle' | 'metaDescription' | 'metaKeywords', m: 'text' | 'seo') => void;
  aiLoadingKey: string | null;
  photoFieldHelp: Record<string, string[]>;
  styles: Record<string, string>;
  slotIndex?: number;
  slotSection?: 'hero' | 'approach' | 'bio' | 'feature';
}) {
  const slotInfo =
    slotSection === 'hero'
      ? { section: 'hero' as const }
      : slotSection === 'bio'
        ? { section: 'bio' as const }
        : slotSection === 'approach' && slotIndex != null
          ? { section: 'approach' as const, index: slotIndex }
          : slotSection === 'feature' && slotIndex != null
            ? { section: 'feature' as const, index: slotIndex }
            : undefined;
  const isTargetPhoto = dragOverTarget?.type === 'photo' && dragOverTarget.id === photo.id;
  const isTargetSlot = dragOverTarget?.type === 'slot' && dragOverTarget.section === 'approach' && dragOverTarget.index === slotIndex;

  return (
    <div
      key={photo.id}
      draggable={canReorder}
      onDragStart={() => onDragStart(photo.id)}
      onDragEnd={() => {
        onDragLeave();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isTargetPhoto) onDragOver({ type: 'photo', id: photo.id });
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDragLeave();
        onDropOnPhoto(photo.id, slotInfo);
      }}
      className={`${styles.photoCard} ${canReorder ? styles.photoCardDraggable : ''} ${
        draggedId === photo.id ? styles.photoCardDragging : ''
      } ${(isTargetPhoto || isTargetSlot) ? styles.photoCardDropTarget : ''}`}
    >
      <div className={styles.photoPreviewLarge}>
        <Image src={photo.src} alt={photo.alt} fill className={styles.photoImage} sizes="(max-width: 768px) 100vw, 33vw" />
        <div className={styles.photoBadge}>{label}</div>
      </div>
      <div className={styles.photoCardMeta}>
        <span className={styles.truncate}>{photo.alt || 'Untitled photo'}</span>
        <div className={styles.bulkItemMeta}>
          <button type="button" onClick={() => togglePhotoDetails(photo.id)} className={styles.textButton}>
            {expandedPhotoId === photo.id ? 'Close' : 'Edit'}
          </button>
          <button type="button" onClick={() => removeFromGallery(photo.id, slotInfo)} className={styles.textButton}>
            Remove
          </button>
        </div>
      </div>
      {expandedPhotoId === photo.id && (
        <div className={styles.detailsPanel}>
          <label className={`${styles.block} ${getAiFixRowClass(`photo-${photo.id}-alt`)}`}>
            <div className={styles.buttonRow}>
              <span className={styles.inlineLabel}>
                Alt Text
                <FieldInfoTooltip label="Alt Text" lines={photoFieldHelp.altText} />
              </span>
              <AiFixButton onClick={() => handleAiFixPhoto(photo.id, 'alt', 'text')} loading={aiLoadingKey === `photo-${photo.id}-alt`} />
            </div>
            <input value={photo.alt || ''} onChange={(e) => updatePhotoField(photo.id, 'alt', e.target.value)} className={styles.inputTiny} />
          </label>
          <label className={`${styles.block} ${getAiFixRowClass(`photo-${photo.id}-metaTitle`)}`}>
            <div className={styles.buttonRow}>
              <span className={styles.inlineLabel}>
                Meta Title
                <FieldInfoTooltip label="Meta Title" lines={photoFieldHelp.metaTitle} />
              </span>
              <AiFixButton onClick={() => handleAiFixPhoto(photo.id, 'metaTitle', 'seo')} loading={aiLoadingKey === `photo-${photo.id}-metaTitle`} />
            </div>
            <input value={photo.metaTitle || ''} onChange={(e) => updatePhotoField(photo.id, 'metaTitle', e.target.value)} className={styles.inputTiny} />
          </label>
          <label className={`${styles.block} ${getAiFixRowClass(`photo-${photo.id}-metaDescription`)}`}>
            <div className={styles.buttonRow}>
              <span className={styles.inlineLabel}>
                Meta Description
                <FieldInfoTooltip label="Meta Description" lines={photoFieldHelp.metaDescription} />
              </span>
              <AiFixButton onClick={() => handleAiFixPhoto(photo.id, 'metaDescription', 'seo')} loading={aiLoadingKey === `photo-${photo.id}-metaDescription`} />
            </div>
            <textarea value={photo.metaDescription || ''} onChange={(e) => updatePhotoField(photo.id, 'metaDescription', e.target.value)} className={styles.textareaMedium} />
          </label>
          <label className={`${styles.block} ${getAiFixRowClass(`photo-${photo.id}-metaKeywords`)}`}>
            <div className={styles.buttonRow}>
              <span className={styles.inlineLabel}>
                Meta Keywords
                <FieldInfoTooltip label="Meta Keywords" lines={photoFieldHelp.metaKeywords} />
              </span>
              <AiFixButton onClick={() => handleAiFixPhoto(photo.id, 'metaKeywords', 'seo')} loading={aiLoadingKey === `photo-${photo.id}-metaKeywords`} />
            </div>
            <textarea value={photo.metaKeywords || ''} onChange={(e) => updatePhotoField(photo.id, 'metaKeywords', e.target.value)} className={styles.textareaShort} />
          </label>
        </div>
      )}
    </div>
  );
}

/** Grey placeholder slot for empty section positions */
function SlotPlaceholder({
  label,
  slotTarget,
  dragOverTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  styles
}: {
  label: string;
  slotTarget: DropTarget & { type: 'slot' };
  dragOverTarget: DropTarget | null;
  onDragOver: (t: DropTarget) => void;
  onDragLeave: () => void;
  onDrop: (t: DropTarget & { type: 'slot' }) => void;
  styles: Record<string, string>;
}) {
  const isTarget =
    dragOverTarget?.type === 'slot' &&
    dragOverTarget.section === slotTarget.section &&
    (slotTarget.index == null || dragOverTarget.index === slotTarget.index);

  return (
    <div
      className={`${styles.slotPlaceholder} ${isTarget ? styles.photoCardDropTarget : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isTarget) onDragOver(slotTarget);
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDragLeave();
        onDrop(slotTarget);
      }}
    >
      <div className={styles.slotPlaceholderInner}>
        <span className={styles.slotPlaceholderText}>{label}</span>
        <span className={styles.slotPlaceholderHint}>Drop photo here</span>
      </div>
    </div>
  );
}

const photoFieldHelp = {
  selectPhoto: [
    'Choose an image file to upload.',
    'Example: JPG or PNG.'
  ],
  selectPhotos: [
    'Choose multiple image files to upload.',
    'Example: Up to 50 photos.'
  ],
  altText: [
    'Describe what is in the photo for accessibility.',
    'Example: Sunlit hotel lobby with marble staircase.'
  ],
  seoTitle: [
    'Short SEO title for this image.',
    'Example: Meridian Hotel Lobby Photo.'
  ],
  seoKeywords: [
    'Comma-separated keywords about the photo.',
    'Example: hotel lobby, marble staircase, boutique hotel.'
  ],
  seoDescription: [
    'Short description for search results.',
    'Example: Warm lobby interior with marble staircase and pendant lights.'
  ],
  applyToPage: [
    'Adds uploaded photos to the active page automatically.',
    'Uncheck if you only want them in the library.'
  ],
  metaTitle: [
    'SEO title for this photo.',
    'Example: Meridian Hotel Lobby Photo.'
  ],
  metaDescription: [
    'SEO description for this photo.',
    'Example: Warm lobby interior with marble staircase and pendant lights.'
  ],
  metaKeywords: [
    'Comma-separated keywords for this photo.',
    'Example: hotel lobby, marble staircase, boutique hotel.'
  ]
};

export function AdminPhotosClient() {
  const { registerChange, unregisterChange } = useSave();
  const { refreshPreview } = usePreview();
  const [pages, setPages] = useState<PageContent[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [savedPhotos, setSavedPhotos] = useState<PhotoAsset[]>([]);
  const [layouts, setLayouts] = useState<PageLayouts>({ home: null, about: null, contact: null });
  const [savedLayouts, setSavedLayouts] = useState<PageLayouts>({ home: null, about: null, contact: null });
  const [activeSlug, setActiveSlug] = useState<PageSlug>('home');
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);
  const [aiResultKey, setAiResultKey] = useState<string | null>(null);
  const [aiResultSuccess, setAiResultSuccess] = useState(false);
  const aiResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Single upload state
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadMetaTitle, setUploadMetaTitle] = useState('');
  const [uploadMetaDescription, setUploadMetaDescription] = useState('');
  const [uploadMetaKeywords, setUploadMetaKeywords] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false);
  
  // Bulk upload state
  const [bulkItems, setBulkItems] = useState<BulkUploadItem[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkApplyToPage, setBulkApplyToPage] = useState(true);
  const [bulkAccordionOpen, setBulkAccordionOpen] = useState(false);
  const [bulkExpandedId, setBulkExpandedId] = useState<string | null>(null);
  
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<DropTarget | null>(null);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [addConfirm, setAddConfirm] = useState<{
    photoId?: string;
    message: string;
    blocking?: boolean;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const pageGuidelines = useMemo(
    () => pagePhotoGuidelinesBySlug[activeSlug] || [],
    [activeSlug]
  );

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

  // Check if any photos have unsaved metadata changes
  const hasPhotoChanges = useMemo(() => {
    return photos.some((photo) => {
      const saved = savedPhotos.find((s) => s.id === photo.id);
      if (!saved) return true;
      return (
        saved.alt !== photo.alt ||
        saved.metaTitle !== photo.metaTitle ||
        saved.metaDescription !== photo.metaDescription ||
        saved.metaKeywords !== photo.metaKeywords
      );
    });
  }, [photos, savedPhotos]);

  // Check if layout (photo assignments/order) has unsaved changes
  const hasLayoutChanges = useMemo(() => {
    if (!layouts.home || !savedLayouts.home) return false;
    if (
      layouts.home.heroPhotoId !== savedLayouts.home.heroPhotoId ||
      JSON.stringify(layouts.home.featurePhotoIds || []) !==
        JSON.stringify(savedLayouts.home.featurePhotoIds || [])
    )
      return true;
    if (!layouts.about || !savedLayouts.about) return false;
    const layoutApproach = layouts.about.approachItems || [];
    const savedApproach = savedLayouts.about.approachItems || [];
    if (layoutApproach.length !== savedApproach.length) return true;
    if (layouts.about.heroPhotoId !== savedLayouts.about.heroPhotoId) return true;
    if (layouts.about.bio?.photoId !== savedLayouts.about.bio?.photoId) return true;
    for (let i = 0; i < layoutApproach.length; i++) {
      if (layoutApproach[i]?.photoId !== savedApproach[i]?.photoId) return true;
    }
    if (!layouts.contact || !savedLayouts.contact) return false;
    return layouts.contact.heroPhotoId !== savedLayouts.contact.heroPhotoId;
  }, [layouts, savedLayouts]);

  // Save layouts to API (called by Save All)
  const saveLayouts = useCallback(async (): Promise<boolean> => {
    try {
      const knownPhotoIds = new Set(photos.map((photo) => photo.id));
      if (layouts.home) {
        const heroPhotoId =
          layouts.home.heroPhotoId && knownPhotoIds.has(layouts.home.heroPhotoId)
            ? layouts.home.heroPhotoId
            : '';
        const featurePhotoIds = Array.from(
          new Set(
            (layouts.home.featurePhotoIds || [])
              .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
              .filter((id) => id !== heroPhotoId && knownPhotoIds.has(id))
          )
        );
        const res = await fetch('/api/admin/layouts/home', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            heroPhotoId,
            featurePhotoIds
          })
        });
        if (!res.ok) return false;
      }
      if (layouts.about) {
        const sanitizedAbout: typeof layouts.about = {
          ...layouts.about,
          heroPhotoId:
            layouts.about.heroPhotoId && knownPhotoIds.has(layouts.about.heroPhotoId)
              ? layouts.about.heroPhotoId
              : '',
          approachItems: (layouts.about.approachItems || []).map((item) => ({
            ...item,
            photoId: item.photoId && knownPhotoIds.has(item.photoId) ? item.photoId : ''
          })),
          bio: {
            ...layouts.about.bio,
            photoId:
              layouts.about.bio?.photoId && knownPhotoIds.has(layouts.about.bio.photoId)
                ? layouts.about.bio.photoId
                : ''
          }
        };
        const res = await fetch('/api/admin/layouts/about', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitizedAbout)
        });
        if (!res.ok) return false;
      }
      if (layouts.contact) {
        const heroPhotoId =
          layouts.contact.heroPhotoId && knownPhotoIds.has(layouts.contact.heroPhotoId)
            ? layouts.contact.heroPhotoId
            : '';
        const res = await fetch('/api/admin/layouts/contact', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ heroPhotoId })
        });
        if (!res.ok) return false;
      }
      setSavedLayouts({ ...layouts });
      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [layouts, refreshPreview, photos]);

  // Save function for master save
  const savePhotos = useCallback(async (): Promise<boolean> => {
    const changedPhotos = photos.filter((photo) => {
      const saved = savedPhotos.find((s) => s.id === photo.id);
      if (!saved) return true;
      return (
        saved.alt !== photo.alt ||
        saved.metaTitle !== photo.metaTitle ||
        saved.metaDescription !== photo.metaDescription ||
        saved.metaKeywords !== photo.metaKeywords
      );
    });

    if (changedPhotos.length === 0) return true;

    try {
      const results = await Promise.all(
        changedPhotos.map((photo) =>
          fetch(`/api/admin/photos/${photo.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alt: photo.alt,
              metaTitle: photo.metaTitle || '',
              metaDescription: photo.metaDescription || '',
              metaKeywords: photo.metaKeywords || ''
            })
          })
        )
      );

      if (results.some((res) => !res.ok)) return false;
      setSavedPhotos([...photos]);
      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [photos, savedPhotos, refreshPreview]);

  // Register/unregister photo changes with master save context
  useEffect(() => {
    if (hasPhotoChanges && !isLoading) {
      registerChange({
        id: 'photos',
        type: 'photo',
        save: savePhotos
      });
    } else {
      unregisterChange('photos');
    }
  }, [hasPhotoChanges, isLoading, registerChange, unregisterChange, savePhotos]);

  // Register layout changes (photo order/assignments) with master save context
  useEffect(() => {
    if (hasLayoutChanges && !isLoading) {
      registerChange({
        id: 'layouts',
        type: 'layout',
        save: saveLayouts
      });
    } else {
      unregisterChange('layouts');
    }
  }, [hasLayoutChanges, isLoading, registerChange, unregisterChange, saveLayouts]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const activePage = useMemo(() => {
    return pages.find((page) => page.slug === activeSlug);
  }, [pages, activeSlug]);

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  // Get photo IDs for current page from the correct source (deduplicated)
  const pagePhotoIds = useMemo((): string[] => {
    const ids: string[] = [];
    const seen = new Set<string>();
    
    const addId = (id: string | undefined) => {
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    };
    
    if (activeSlug === 'home' && layouts.home) {
      addId(layouts.home.heroPhotoId);
      layouts.home.featurePhotoIds?.forEach(addId);
    } else if (activeSlug === 'about' && layouts.about) {
      addId(layouts.about.heroPhotoId);
      layouts.about.approachItems?.forEach(item => addId(item.photoId));
      addId(layouts.about.bio?.photoId);
    } else if (activeSlug === 'contact' && layouts.contact) {
      addId(layouts.contact.heroPhotoId);
    }
    
    return ids;
  }, [activeSlug, layouts]);

  const galleryPhotos = useMemo(() => {
    return pagePhotoIds
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }, [pagePhotoIds, photosById]);

  /** Sectioned data for Home: hero (1 slot) + features (collapse on remove) */
  const homeSections = useMemo(() => {
    const heroId = layouts.home?.heroPhotoId || '';
    const featureIds = (layouts.home?.featurePhotoIds || []).filter(Boolean);
    return {
      hero: heroId ? [heroId] : [],
      feature: featureIds
    };
  }, [layouts.home]);

  /** Sectioned data for About: hero (1) + approach (4 slots) + bio (1) */
  const aboutSections = useMemo(() => {
    const heroId = layouts.about?.heroPhotoId || '';
    const approachItems = layouts.about?.approachItems || [];
    const approachIds = Array.from({ length: ABOUT_MAX_APPROACH_PHOTOS }, (_, i) =>
      approachItems[i]?.photoId ?? ''
    );
    const bioId = layouts.about?.bio?.photoId || '';
    return {
      hero: heroId ? [heroId] : [],
      approach: approachIds,
      bio: bioId ? [bioId] : []
    };
  }, [layouts.about]);

  /** Sectioned data for Contact: hero (1 slot) */
  const contactSections = useMemo(() => {
    const heroId = layouts.contact?.heroPhotoId || '';
    return {
      hero: heroId ? [heroId] : []
    };
  }, [layouts.contact]);

  /** True when About or Contact has max photos (blocks adding) */
  const isPageFull = useMemo(() => {
    if (activeSlug === 'about' && layouts.about) {
      const heroId = layouts.about.heroPhotoId || '';
      const approachItems = layouts.about.approachItems || [];
      const approachFull = Array.from({ length: ABOUT_MAX_APPROACH_PHOTOS }, (_, i) =>
        approachItems[i]?.photoId ?? ''
      ).every((id) => !!id);
      const hasBio = Boolean(layouts.about.bio?.photoId);
      return Boolean(heroId) && approachFull && hasBio;
    }
    if (activeSlug === 'contact' && layouts.contact) {
      return Boolean(layouts.contact.heroPhotoId);
    }
    return false;
  }, [activeSlug, layouts.about, layouts.contact]);

  const PAGE_FULL_MESSAGE =
    'This page has the maximum number of photos. Remove a photo first if you want to add another.';

  const availablePhotos = useMemo(() => {
    const current = new Set(pagePhotoIds);
    return photos.filter((photo) => !current.has(photo.id));
  }, [photos, pagePhotoIds]);

  const availablePhotosGrouped = useMemo(() => {
    const order = getLibraryGroupOrderForPage(activeSlug);
    const groups = new Map<LibraryGroupKey, PhotoAsset[]>();
    order.forEach((k) => groups.set(k, []));
    availablePhotos.forEach((photo) => {
      const group = getPhotoLibraryGroup(photo);
      groups.get(group)?.push(photo);
    });
    return order.map((key) => ({ key, photos: groups.get(key) || [] })).filter((g) => g.photos.length > 0);
  }, [availablePhotos, activeSlug]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setStatus('');
      const [pagesRes, photosRes, homeRes, aboutRes, contactRes] = await Promise.all([
        fetch('/api/admin/pages'),
        fetch('/api/admin/photos'),
        fetch('/api/admin/layouts/home'),
        fetch('/api/admin/layouts/about'),
        fetch('/api/admin/layouts/contact')
      ]);

      if (!pagesRes.ok || !photosRes.ok) {
        setStatus('Unable to load admin content. Please refresh and try again.');
        setIsLoading(false);
        return;
      }

      const pagesData = (await pagesRes.json()) as PageContent[];
      const photosData = (await photosRes.json()) as PhotoAsset[];
      const homeData = homeRes.ok ? (await homeRes.json()) as HomeLayout : null;
      let aboutData = aboutRes.ok ? (await aboutRes.json()) as AboutPageContent : null;
      const contactData = contactRes.ok ? (await contactRes.json()) as ContactPageContent : null;

      if (aboutData) {
        const draftAbout = loadDraftAboutContent();
        if (draftAbout?.approachItems?.length) {
          const apiById = new Map(aboutData.approachItems.map((i) => [i.id, i]));
          const draftIds = draftAbout.approachItems.map((d) => d.id);
          const seen = new Set<string>();
          const mergedFromDraftOrder = draftIds
            .map((id) => {
              if (seen.has(id)) return null;
              seen.add(id);
              return apiById.get(id);
            })
            .filter(Boolean) as typeof aboutData.approachItems;
          const mergedIds = new Set(mergedFromDraftOrder.map((i) => i.id));
          const newFromApi = aboutData.approachItems.filter(
            (i) => i.photoId && !mergedIds.has(i.id)
          );
          const emptySlots = aboutData.approachItems.filter((i) => !i.photoId);
          aboutData = {
            ...aboutData,
            approachItems: [...mergedFromDraftOrder, ...newFromApi, ...emptySlots].slice(0, 4)
          };
        }
      }

      setPages(pagesData);
      setPhotos(photosData);
      setSavedPhotos(photosData);
      const loadedLayouts = { home: homeData, about: aboutData, contact: contactData };
      setLayouts(loadedLayouts);
      setSavedLayouts(loadedLayouts);
      setIsLoading(false);
    }

    load();
  }, []);

  function updatePhotoField(
    photoId: string,
    field: 'alt' | 'metaTitle' | 'metaDescription' | 'metaKeywords',
    value: string
  ) {
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === photoId ? { ...photo, [field]: value } : photo))
    );
  }

  function togglePhotoDetails(photoId: string) {
    setExpandedPhotoId((prev) => (prev === photoId ? null : photoId));
  }

  async function handleAiFixPhoto(
    photoId: string,
    field: 'alt' | 'metaTitle' | 'metaDescription' | 'metaKeywords',
    mode: 'text' | 'seo'
  ) {
    const key = `photo-${photoId}-${field}`;
    if (aiLoadingKey) return;
    const photo = photosById.get(photoId);
    if (!photo) return;

    setAiLoadingKey(key);
    setAiStatus('Optimizing with AI...');

    try {
      const model = loadAiModel();
      const response = await fetch('/api/admin/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          target: 'photo',
          field,
          input: (photo[field] || '') as string,
          model,
          context: {
            photo: {
              id: photo.id,
              src: photo.src,
              alt: photo.alt,
              metaTitle: photo.metaTitle || '',
              metaDescription: photo.metaDescription || '',
              metaKeywords: photo.metaKeywords || ''
            }
          }
        })
      });

      if (!response.ok) {
        const message = await getApiErrorMessage(response, 'AI request failed.');
        setAiStatus(message);
        setAiResult(key, false);
        return;
      }

      const data = (await response.json()) as { output?: string };
      if (data.output) {
        updatePhotoField(photoId, field, data.output);
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

  function handleDragStart(photoId: string) {
    setDraggedId(photoId);
  }

  function handleDropOnPhoto(targetId: string, targetSlot?: { section: 'hero' | 'approach' | 'bio' | 'feature'; index?: number }) {
    if (!draggedId || draggedId === targetId) return;

    if (activeSlug === 'about' && layouts.about && targetSlot?.section === 'bio') {
      const heroId = layouts.about.heroPhotoId || '';
      const approachItems = layouts.about.approachItems || [];
      const approachIds = Array.from({ length: ABOUT_MAX_APPROACH_PHOTOS }, (_, i) =>
        approachItems[i]?.photoId ?? ''
      );
      const bioId = layouts.about.bio?.photoId || '';

      const newApproach = approachIds.map((id) => (id === draggedId ? '' : id));
      if (bioId && bioId !== draggedId) {
        const emptyIdx = newApproach.findIndex((id) => !id);
        if (emptyIdx >= 0) newApproach[emptyIdx] = bioId;
      }
      updatePagePhotoOrder([heroId, ...newApproach, draggedId], draggedId);
      setDraggedId(null);
      return;
    }

    const currentIds = [...pagePhotoIds];
    const from = currentIds.indexOf(draggedId);
    const to = currentIds.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...currentIds];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    updatePagePhotoOrder(reordered);
    setDraggedId(null);
  }

  async function handleDropAtEnd(section: 'homeFeatures' | 'aboutApproach') {
    if (!draggedId) return;

    if (activeSlug === 'home' && layouts.home && section === 'homeFeatures') {
      const featureIds = (layouts.home.featurePhotoIds || []).filter((id) => photosById.has(id));
      if (!featureIds.includes(draggedId) || featureIds.length < 2) {
        setDraggedId(null);
        return;
      }
      const reordered = featureIds.filter((id) => id !== draggedId);
      reordered.push(draggedId);
      const heroId =
        layouts.home.heroPhotoId && photosById.has(layouts.home.heroPhotoId)
          ? layouts.home.heroPhotoId
          : '';
      await updatePagePhotoOrder([heroId, ...reordered]);
    } else if (activeSlug === 'about' && layouts.about && section === 'aboutApproach') {
      const heroId =
        layouts.about.heroPhotoId && photosById.has(layouts.about.heroPhotoId)
          ? layouts.about.heroPhotoId
          : '';
      const approachItems = layouts.about.approachItems || [];
      const approachIds = approachItems
        .map((item) => (item.photoId && photosById.has(item.photoId) ? item.photoId : ''))
        .filter((id) => id !== heroId);
      const bioId =
        layouts.about.bio?.photoId && photosById.has(layouts.about.bio.photoId)
          ? layouts.about.bio.photoId
          : '';
      if (!approachIds.includes(draggedId) || approachIds.filter(Boolean).length < 2) {
        setDraggedId(null);
        return;
      }
      const reordered = approachIds.filter((id) => id !== draggedId);
      reordered.push(draggedId);
      const filled = Array.from({ length: ABOUT_MAX_APPROACH_PHOTOS }, (_, i) => reordered[i] || '');
      const newIds = [heroId, ...filled, bioId].filter((id) => id !== undefined);
      await updatePagePhotoOrder(newIds);
    }
    setDraggedId(null);
  }

  async function handleDropOnSlot(target: DropTarget & { type: 'slot' }) {
    if (!draggedId || target.type !== 'slot') return;
    const photoId = draggedId;
    const fromLibrary = !pagePhotoIds.includes(photoId);

    if (fromLibrary) {
      setStatus('Adding photo...');
    }

    if (activeSlug === 'home' && layouts.home) {
      const heroId =
        layouts.home.heroPhotoId && photosById.has(layouts.home.heroPhotoId)
          ? layouts.home.heroPhotoId
          : '';
      const featureIds = (layouts.home.featurePhotoIds || []).filter((id) => photosById.has(id) && id !== heroId);
      if (target.section === 'hero') {
        const oldHero = heroId;
        const withoutPhoto = featureIds.filter((id) => id !== photoId);
        if (oldHero && oldHero !== photoId) withoutPhoto.unshift(oldHero);
        await updatePagePhotoOrder([photoId, ...withoutPhoto]);
      } else if (target.section === 'feature') {
        const withoutPhoto = featureIds.filter((id) => id !== photoId);
        if (heroId === photoId) {
          const newHero = withoutPhoto[0] || '';
          await updatePagePhotoOrder([newHero, ...withoutPhoto.slice(1), photoId]);
        } else {
          withoutPhoto.push(photoId);
          await updatePagePhotoOrder([heroId, ...withoutPhoto]);
        }
      }
    } else if (activeSlug === 'about' && layouts.about) {
      const heroId =
        layouts.about.heroPhotoId && photosById.has(layouts.about.heroPhotoId)
          ? layouts.about.heroPhotoId
          : '';
      const approachItems = layouts.about.approachItems || [];
      const approachIds = Array.from({ length: ABOUT_MAX_APPROACH_PHOTOS }, (_, i) =>
        (approachItems[i]?.photoId && photosById.has(approachItems[i]?.photoId) ? approachItems[i]!.photoId : '')
      );
      const bioId =
        layouts.about.bio?.photoId && photosById.has(layouts.about.bio.photoId)
          ? layouts.about.bio.photoId
          : '';

      if (target.section === 'hero') {
        const withoutPhoto = approachIds.filter((id) => id && id !== photoId);
        if (heroId && heroId !== photoId && withoutPhoto.length < ABOUT_MAX_APPROACH_PHOTOS) {
          withoutPhoto.unshift(heroId);
        }
        await updatePagePhotoOrder([photoId, ...withoutPhoto, bioId].filter((id) => id !== undefined));
      } else if (target.section === 'approach') {
        const slotIndex = target.index ?? approachIds.findIndex((id) => !id);
        if (slotIndex < 0 || slotIndex >= ABOUT_MAX_APPROACH_PHOTOS) return;
        const withoutPhoto = approachIds.filter((id) => id && id !== photoId);
        const filled: string[] = [];
        for (let i = 0; i < ABOUT_MAX_APPROACH_PHOTOS; i++) {
          if (i === slotIndex) {
            filled.push(photoId);
          } else if (withoutPhoto.length > 0) {
            filled.push(withoutPhoto.shift()!);
          }
        }
        await updatePagePhotoOrder([heroId, ...filled, bioId].filter((id) => id !== undefined));
      } else if (target.section === 'bio') {
        const newApproach = approachIds.map((id) => (id === photoId ? '' : id));
        if (bioId && bioId !== photoId) {
          const emptyIdx = newApproach.findIndex((id) => !id);
          if (emptyIdx >= 0) newApproach[emptyIdx] = bioId;
        }
        await updatePagePhotoOrder([heroId, ...newApproach, photoId], photoId);
      }
    } else if (activeSlug === 'contact' && layouts.contact) {
      if (target.section === 'hero') {
        await updatePagePhotoOrder([photoId]);
      }
    }
    setDraggedId(null);
  }

  async function updatePagePhotoOrder(newIds: string[], bioPhotoIdOverride?: string) {
    setStatus('Updating order...');
    
    if (activeSlug === 'home' && layouts.home) {
      const heroPhotoId = newIds[0] && photosById.has(newIds[0]) ? newIds[0] : '';
      const featurePhotoIds = Array.from(
        new Set(
          newIds
            .slice(1)
            .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
            .filter((id) => id !== heroPhotoId && photosById.has(id))
        )
      );
      const updated = { ...layouts.home, heroPhotoId, featurePhotoIds };
      setLayouts((prev) => ({ ...prev, home: updated }));
      saveDraftHomeLayout({ heroPhotoId, featurePhotoIds });
      setStatus('Order updated.');
      refreshPreview();
    } else if (activeSlug === 'about' && layouts.about) {
      const heroPhotoId = newIds[0] && photosById.has(newIds[0]) ? newIds[0] : '';
      const existingBioId =
        layouts.about.bio?.photoId && photosById.has(layouts.about.bio.photoId)
          ? layouts.about.bio.photoId
          : '';
      const bioIdStillInList = existingBioId && newIds.includes(existingBioId);
      let bioPhotoId =
        bioPhotoIdOverride ??
        (bioIdStillInList ? existingBioId : '');

      if (bioPhotoId && !photosById.has(bioPhotoId)) {
        bioPhotoId = '';
      }

      const rawApproachIds = bioPhotoId
        ? newIds.slice(1, newIds.length - 1)
        : newIds.slice(1);
      const approachSlotIds = Array.from(
        { length: ABOUT_MAX_APPROACH_PHOTOS },
        (_, i) => (rawApproachIds[i] && rawApproachIds[i] !== heroPhotoId && rawApproachIds[i] !== bioPhotoId
          ? (photosById.has(rawApproachIds[i]) ? rawApproachIds[i] : '')
          : '')
      );

      const existingByPhotoId = new Map(
        (layouts.about.approachItems || []).map((item) => [item.photoId, item])
      );
      const existingByIndex = (layouts.about.approachItems || []);

      const createApproachItem = (photoId: string) => {
        const uuid =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        return {
          id: `approach-${uuid}`,
          title: '',
          description: '',
          photoId
        };
      };

      const updatedApproachItems = approachSlotIds.map((photoId, i) => {
        const existing =
          photoId
            ? (existingByPhotoId.get(photoId) ?? existingByIndex[i])
            : existingByIndex[i];
        return existing
          ? { ...existing, photoId: photoId || '' }
          : createApproachItem(photoId || '');
      });

      const updatedBio = layouts.about.bio
        ? { ...layouts.about.bio, photoId: bioPhotoId }
        : { name: '', photoId: bioPhotoId, paragraphs: [] as string[] };
      
      const updated = {
        ...layouts.about,
        heroPhotoId,
        approachItems: updatedApproachItems,
        bio: updatedBio
      };
      setLayouts((prev) => ({ ...prev, about: updated }));
      const existingDraft = loadDraftAboutContent();
      saveDraftAboutContent({
        ...existingDraft,
        approachItems: updatedApproachItems.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description
        }))
      });
      setStatus('Order updated.');
      refreshPreview();
    } else if (activeSlug === 'contact' && layouts.contact) {
      const heroPhotoId = newIds[0] && photosById.has(newIds[0]) ? newIds[0] : '';
      const updated = { ...layouts.contact, heroPhotoId };
      setLayouts((prev) => ({ ...prev, contact: updated }));
      saveDraftContactContent({ heroPhotoId });
      setStatus('Order updated.');
      refreshPreview();
    } else {
      setStatus('Reordering not available for this page.');
    }
  }

  async function removeFromGallery(
    photoId: string,
    slot?: { section: 'hero' | 'approach' | 'bio' | 'feature'; index?: number }
  ) {
    if (activeSlug === 'about' && layouts.about && slot) {
      await removeFromAboutSlot(photoId, slot);
      return;
    }
    if (activeSlug === 'home' && layouts.home && slot?.section === 'hero') {
      const featureIds = (layouts.home.featurePhotoIds || []).filter(Boolean);
      await updatePagePhotoOrder(['', ...featureIds]);
      return;
    }
    if (activeSlug === 'contact' && layouts.contact && slot?.section === 'hero') {
      await updatePagePhotoOrder(['']);
      return;
    }
    const newIds = pagePhotoIds.filter((id) => id !== photoId);
    await updatePagePhotoOrder(newIds);
  }

  async function removeFromAboutSlot(
    photoId: string,
    slot: { section: 'hero' | 'approach' | 'bio' | 'feature'; index?: number }
  ) {
    setStatus('Updating...');
    const layout = layouts.about!;
    let heroPhotoId = layout.heroPhotoId || '';
    let approachItems = [...(layout.approachItems || [])];
    let bioPhotoId = layout.bio?.photoId || '';

    if (slot.section === 'hero' && photoId === heroPhotoId) {
      heroPhotoId = '';
    } else if (slot.section === 'bio' && photoId === bioPhotoId) {
      bioPhotoId = '';
    } else if (slot.section === 'approach' && slot.index != null) {
      const idx = slot.index;
      while (approachItems.length <= idx) {
        approachItems.push({
          id: `approach-slot-${approachItems.length}`,
          title: '',
          description: '',
          photoId: ''
        });
      }
      if (approachItems[idx]?.photoId === photoId) {
        approachItems = approachItems.map((item, i) =>
          i === idx ? { ...item, photoId: '' } : item
        );
      }
    }

    const updated = {
      ...layout,
      heroPhotoId,
      approachItems,
      bio: layout.bio
        ? { ...layout.bio, photoId: bioPhotoId }
        : { name: '', photoId: bioPhotoId, paragraphs: [] as string[] }
    };
    setLayouts((prev) => ({ ...prev, about: updated }));
    const existingDraft = loadDraftAboutContent();
    saveDraftAboutContent({
      ...existingDraft,
      approachItems: approachItems.map((i) => ({ id: i.id, title: i.title, description: i.description }))
    });
    setStatus('Order updated.');
    refreshPreview();
  }

  async function addToGallery(photoId: string, slotHint?: 'hero' | 'approach' | 'bio'): Promise<boolean> {
    if (isPageFull) {
      setStatus(PAGE_FULL_MESSAGE);
      return false;
    }
    if (activeSlug === 'about' && layouts.about) {
      const currentIds = [...pagePhotoIds];
      const heroId = currentIds[0] || layouts.about.heroPhotoId;
      const existingBioId = layouts.about.bio?.photoId || '';
      const hasBio = Boolean(existingBioId);

      const approachIds = (hasBio ? currentIds.slice(1, currentIds.length - 1) : currentIds.slice(1)).filter(
        (id) => id && id !== photoId
      );

      if (approachIds.includes(photoId) || photoId === heroId || (hasBio && photoId === existingBioId)) {
        return false;
      }

      const approachSlots = Array.from({ length: ABOUT_MAX_APPROACH_PHOTOS }, (_, i) =>
        (layouts.about?.approachItems || [])[i]?.photoId ?? ''
      );
      const approachFull = approachSlots.every((id) => !!id);
      const addToBio = heroId && approachFull && (slotHint === 'bio' || !hasBio);

      if (addToBio) {
        const nextIds = [heroId, ...approachIds, photoId].filter(Boolean);
        await updatePagePhotoOrder(nextIds, photoId);
        return true;
      }

      if (approachIds.length >= ABOUT_MAX_APPROACH_PHOTOS) {
        setStatus(`Approach & Results supports up to ${ABOUT_MAX_APPROACH_PHOTOS} photos. Remove one before adding another.`);
        return false;
      }

      const nextIds = hasBio
        ? [heroId, ...approachIds, photoId, existingBioId]
        : [heroId, ...approachIds, photoId];

      await updatePagePhotoOrder(nextIds.filter(Boolean));
      return true;
    }

    const newIds = [...pagePhotoIds, photoId];
    await updatePagePhotoOrder(newIds);
    return true;
  }

  function handleAddToGalleryClick(photoId: string) {
    const photo = photosById.get(photoId);
    if (!photo) return;

    if (isPageFull) {
      setAddConfirm({ message: PAGE_FULL_MESSAGE, blocking: true });
      setOpenMenuId(null);
      return;
    }

    const hasBio = Boolean(layouts.about?.bio?.photoId);
    const slot = getSlotForAdd(activeSlug, pagePhotoIds, hasBio);
    const warning = getMismatchWarning(photo, slot, activeSlug);

    if (warning) {
      setAddConfirm({ photoId, message: warning });
      setOpenMenuId(null);
    } else {
      addToGallery(photoId);
      setOpenMenuId(null);
    }
  }

  async function confirmAddToGallery() {
    if (!addConfirm) return;
    const { photoId, blocking } = addConfirm;
    setAddConfirm(null);
    if (blocking) return;
    if (photoId) await addToGallery(photoId);
  }

  async function handleFileSelect(file: File | null) {
    if (!file) {
      setUploadFile(null);
      return;
    }

    setUploadFile(file);
    setIsAnalyzingUpload(true);
    setStatus('Analyzing photo with AI...');

    // Clear previous metadata
    setUploadAlt('');
    setUploadMetaTitle('');
    setUploadMetaDescription('');
    setUploadMetaKeywords('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/ai/analyze-photo', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || 'Failed to analyze photo';
        setStatus(`AI analysis failed: ${errorMsg}. You can fill in metadata manually.`);
        setIsAnalyzingUpload(false);
        return;
      }

      const result = await response.json();
      
      // Pre-fill the metadata fields
      setUploadAlt(result.alt || '');
      setUploadMetaTitle(result.metaTitle || '');
      setUploadMetaDescription(result.metaDescription || '');
      setUploadMetaKeywords(result.metaKeywords || '');
      
      setStatus('AI analysis complete. Review and upload.');
    } catch (error) {
      console.error('AI analysis error:', error);
      setStatus('AI analysis failed. You can fill in metadata manually.');
    } finally {
      setIsAnalyzingUpload(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) {
      setStatus('Choose a file to upload.');
      return;
    }

    setStatus('Uploading...');
    const form = new FormData();
    form.append('file', uploadFile);
    form.append('alt', uploadAlt);
    form.append('metaTitle', uploadMetaTitle);
    form.append('metaDescription', uploadMetaDescription);
    form.append('metaKeywords', uploadMetaKeywords);

    const response = await fetch('/api/admin/photos', { method: 'POST', body: form });
    if (!response.ok) {
      setStatus('Upload failed. Please try again.');
      return;
    }

    const photo = (await response.json()) as PhotoAsset;
    setPhotos((prev) => [...prev, photo]);
    setSavedPhotos((prev) => [...prev, photo]);
    
    // Add to current page
    const added = await addToGallery(photo.id);
    const hasBio = Boolean(layouts.about?.bio?.photoId);
    const slot = getSlotForAdd(activeSlug, pagePhotoIds, hasBio);
    const mismatchWarning = getMismatchWarning(photo, slot, activeSlug);

    setUploadAlt('');
    setUploadMetaTitle('');
    setUploadMetaDescription('');
    setUploadMetaKeywords('');
    setUploadFile(null);
    if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
    if (!added && isPageFull) {
      setStatus('Upload complete. ' + PAGE_FULL_MESSAGE);
    } else {
      setStatus(mismatchWarning ? 'Upload complete. ' + mismatchWarning : 'Upload complete and added to page.');
    }
    refreshPreview();
  }

  // === BULK UPLOAD FUNCTIONS ===
  function handleBulkFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files).slice(0, MAX_BULK_PHOTOS - bulkItems.length);
    
    if (files.length + bulkItems.length > MAX_BULK_PHOTOS) {
      setStatus(`Maximum ${MAX_BULK_PHOTOS} photos allowed. Some photos were not added.`);
    }
    
    const newItems: BulkUploadItem[] = fileArray.map((file, index) => ({
      id: `bulk-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      alt: '',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: ''
    }));
    
    setBulkItems(prev => [...prev, ...newItems]);
    
    // Load dimensions for each new item
    newItems.forEach((item) => {
      getImageDimensions(item.file)
        .then(({ width, height }) => {
          setBulkItems(prev =>
            prev.map((p) => (p.id === item.id ? { ...p, width, height } : p))
          );
        })
        .catch(() => {
          // Ignore - dimensions will stay undefined
        });
    });
  }

  async function processBulkWithAi() {
    const pendingItems = bulkItems.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) return;
    
    setIsBulkProcessing(true);
    setStatus(`Processing ${pendingItems.length} photos with AI. This may take several minutes...`);
    
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      
      setBulkItems(prev => prev.map(p => 
        p.id === item.id ? { ...p, status: 'analyzing' } : p
      ));
      
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        
        const response = await fetch('/api/admin/ai/analyze-photo', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          setBulkItems(prev => prev.map(p => 
            p.id === item.id ? {
              ...p,
              status: 'ready',
              alt: result.alt || '',
              metaTitle: result.metaTitle || '',
              metaDescription: result.metaDescription || '',
              metaKeywords: result.metaKeywords || ''
            } : p
          ));
        } else {
          setBulkItems(prev => prev.map(p => 
            p.id === item.id ? { ...p, status: 'error', error: 'AI analysis failed' } : p
          ));
        }
      } catch {
        setBulkItems(prev => prev.map(p => 
          p.id === item.id ? { ...p, status: 'error', error: 'AI analysis failed' } : p
        ));
      }
      
      setStatus(`Processed ${i + 1} of ${pendingItems.length} photos...`);
    }
    
    setIsBulkProcessing(false);
    setBulkAccordionOpen(true);
    setStatus('AI analysis complete! Review the photos below and upload when ready.');
  }

  async function uploadBulkItems() {
    const readyItems = bulkItems.filter(item => item.status === 'ready');
    if (readyItems.length === 0) {
      setStatus('No photos ready to upload. Run AI analysis first.');
      return;
    }
    
    setIsBulkProcessing(true);
    setStatus(`Uploading ${readyItems.length} photos...`);
    
    const uploadedPhotoIds: string[] = [];
    
    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      
      setBulkItems(prev => prev.map(p => 
        p.id === item.id ? { ...p, status: 'uploading' } : p
      ));
      
      try {
        const form = new FormData();
        form.append('file', item.file);
        form.append('alt', item.alt);
        form.append('metaTitle', item.metaTitle);
        form.append('metaDescription', item.metaDescription);
        form.append('metaKeywords', item.metaKeywords);
        
        const response = await fetch('/api/admin/photos', { method: 'POST', body: form });
        
        if (response.ok) {
          const photo = await response.json() as PhotoAsset;
          setPhotos(prev => [...prev, photo]);
          setSavedPhotos(prev => [...prev, photo]);
          uploadedPhotoIds.push(photo.id);
          
          // Clean up preview URL
          URL.revokeObjectURL(item.preview);
          
          setBulkItems(prev => prev.map(p => 
            p.id === item.id ? { ...p, status: 'done' } : p
          ));
        } else {
          setBulkItems(prev => prev.map(p => 
            p.id === item.id ? { ...p, status: 'error', error: 'Upload failed' } : p
          ));
        }
      } catch {
        setBulkItems(prev => prev.map(p => 
          p.id === item.id ? { ...p, status: 'error', error: 'Upload failed' } : p
        ));
      }
      
      setStatus(`Uploaded ${i + 1} of ${readyItems.length} photos...`);
    }
    
    // Add to page if checkbox is checked (skip when About/Contact is full)
    let pageFullBlocked = false;
    if (bulkApplyToPage && uploadedPhotoIds.length > 0 && !isPageFull) {
      const newIds = [...pagePhotoIds, ...uploadedPhotoIds];
      await updatePagePhotoOrder(newIds);
    } else if (bulkApplyToPage && uploadedPhotoIds.length > 0 && isPageFull) {
      pageFullBlocked = true;
    }

    // Remove completed items
    setBulkItems(prev => prev.filter(item => item.status !== 'done'));

    setIsBulkProcessing(false);
    setStatus(
      pageFullBlocked
        ? `Successfully uploaded ${uploadedPhotoIds.length} photos. ${PAGE_FULL_MESSAGE}`
        : `Successfully uploaded ${uploadedPhotoIds.length} photos!`
    );
    refreshPreview();
  }

  function removeBulkItem(id: string) {
    setBulkItems(prev => {
      const item = prev.find(p => p.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(p => p.id !== id);
    });
  }

  function clearAllBulkItems() {
    bulkItems.forEach(item => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
    setBulkItems([]);
    setBulkAccordionOpen(false);
  }

  function updateBulkItemField(id: string, field: keyof BulkUploadItem, value: string) {
    setBulkItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  }

  async function handleDelete(photoId: string) {
    const response = await fetch(`/api/admin/photos/${photoId}`, { method: 'DELETE' });
    if (!response.ok) {
      setStatus('Delete failed. Please try again.');
      return;
    }
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    setSavedPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    await removeFromGallery(photoId);
    refreshPreview();
  }

  // Get label for photo position
  function getPhotoLabel(photoId: string, index: number): string {
    if (activeSlug === 'home') {
      if (index === 0) return 'Hero';
      return `Feature ${index}`;
    }
    if (activeSlug === 'about' && layouts.about) {
      // Check if this is the hero photo (and it's at index 0)
      if (index === 0 && photoId === layouts.about.heroPhotoId) return 'Hero';
      
      // Check approach items
      const approachItem = layouts.about.approachItems?.find(i => i.photoId === photoId);
      if (approachItem) {
        return `Approach: ${approachItem.title}`;
      }
      
      // Check bio photo
      if (photoId === layouts.about.bio?.photoId) return 'Bio Photo';
      
      // If it's index 0 but a different photo
      if (index === 0) return 'Hero';
    }
    if (activeSlug === 'contact') {
      return 'Hero';
    }
    return `Photo ${index + 1}`;
  }

  if (isLoading) {
    return <p className={styles.statusMessage}>Loading admin content...</p>;
  }

  // Enable reordering for pages with photos
  const canReorder = activeSlug === 'home' || activeSlug === 'about' || activeSlug === 'contact';

  const homeHeroPhoto = activeSlug === 'home' && homeSections.hero[0] ? photosById.get(homeSections.hero[0]) ?? null : null;
  const aboutHeroPhoto = activeSlug === 'about' && aboutSections.hero[0] ? photosById.get(aboutSections.hero[0]) ?? null : null;
  const aboutBioPhoto = activeSlug === 'about' && aboutSections.bio[0] ? photosById.get(aboutSections.bio[0]) ?? null : null;
  const contactHeroPhoto = activeSlug === 'contact' && contactSections.hero[0] ? photosById.get(contactSections.hero[0]) ?? null : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Photos</h1>
          <p className={styles.cardDescription}>
            Manage photos for each page. {canReorder ? 'Drag to reorder.' : ''}
          </p>
        </div>
      </div>

      <div className={styles.tabBar}>
        {photoPageOrder.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setActiveSlug(slug)}
            className={`${styles.tabButton} ${
              activeSlug === slug ? styles.tabButtonActive : styles.tabButtonInactive
            }`}
          >
            {pageLabels[slug]}
          </button>
        ))}
      </div>

      {pageGuidelines.length > 0 && (
        <section className={guidelineStyles.guidanceCard}>
          <div className={guidelineStyles.guidanceTitle}>Photo size guidance</div>
          <div className={guidelineStyles.guidanceList}>
            {pageGuidelines.map((guideline) => (
              <PhotoGuidelineRow key={guideline.label} guideline={guideline} align="left" />
            ))}
          </div>
        </section>
      )}

      {status && <p className={styles.statusMessage}>{status}</p>}
      {aiStatus && <p className={styles.statusMessage}>{aiStatus}</p>}

      {/* Upload Section */}
      <section className={`${styles.section} ${styles.sectionStack6}`}>
        <div>
          <h2 className={styles.cardTitle}>Upload Photos</h2>
          {/* Upload Mode Tabs */}
          <div className={styles.uploadTabs}>
            <button
              type="button"
              onClick={() => setUploadMode('single')}
              className={`${styles.modeButton} ${
                uploadMode === 'single' ? styles.modeButtonActive : styles.modeButtonInactive
              }`}
            >
              Single Photo
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('bulk')}
              className={`${styles.modeButton} ${
                uploadMode === 'bulk' ? styles.modeButtonActive : styles.modeButtonInactive
              }`}
            >
              Bulk Upload
            </button>
          </div>
        </div>

        {/* Single Photo Upload */}
        {uploadMode === 'single' && (
          <>
            <p className={styles.statusMessage}>
              Upload a single photo. AI will automatically generate metadata.
            </p>
            {isAnalyzingUpload && (
              <div className={styles.warningBox}>
                <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>AI is analyzing the photo and generating metadata...</span>
              </div>
            )}
            <form onSubmit={handleUpload} className={styles.formGridAuto}>
              <div className={styles.formGridTwo}>
                <label className={styles.labelSpan2}>
                  <span className={styles.labelTiny}>
                    Select Photo
                    <FieldInfoTooltip label="Select Photo" lines={photoFieldHelp.selectPhoto} />
                  </span>
                  <input
                    ref={uploadFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
                    className={styles.fileInput}
                    disabled={isAnalyzingUpload}
                  />
                </label>
                <label className={styles.block}>
                  <span className={styles.labelTiny}>
                    Alt Text (Accessibility)
                    <FieldInfoTooltip label="Alt Text" lines={photoFieldHelp.altText} />
                  </span>
                  <input
                    type="text"
                    placeholder="Describe the image for screen readers"
                    value={uploadAlt}
                    onChange={(event) => setUploadAlt(event.target.value)}
                    className={styles.input}
                    disabled={isAnalyzingUpload}
                  />
                </label>
                <label className={styles.block}>
                  <span className={styles.labelTiny}>
                    SEO Title
                    <FieldInfoTooltip label="SEO Title" lines={photoFieldHelp.seoTitle} />
                  </span>
                  <input
                    type="text"
                    placeholder="Page title for search engines"
                    value={uploadMetaTitle}
                    onChange={(event) => setUploadMetaTitle(event.target.value)}
                    className={styles.input}
                    disabled={isAnalyzingUpload}
                  />
                </label>
                <label className={styles.block}>
                  <span className={styles.labelTiny}>
                    SEO Keywords
                    <FieldInfoTooltip label="SEO Keywords" lines={photoFieldHelp.seoKeywords} />
                  </span>
                  <input
                    type="text"
                    placeholder="Comma-separated keywords"
                    value={uploadMetaKeywords}
                    onChange={(event) => setUploadMetaKeywords(event.target.value)}
                    className={styles.input}
                    disabled={isAnalyzingUpload}
                  />
                </label>
                <label className={styles.labelSpan2}>
                  <span className={styles.labelTiny}>
                    SEO Description
                    <FieldInfoTooltip label="SEO Description" lines={photoFieldHelp.seoDescription} />
                  </span>
                  <textarea
                    placeholder="Brief description for search results"
                    value={uploadMetaDescription}
                    onChange={(event) => setUploadMetaDescription(event.target.value)}
                    className={styles.textarea}
                    disabled={isAnalyzingUpload}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isAnalyzingUpload || !uploadFile}
                className={styles.primaryButtonOutline}
              >
                {isAnalyzingUpload ? 'Analyzing...' : 'Upload'}
              </button>
            </form>
          </>
        )}

        {/* Bulk Upload */}
        {uploadMode === 'bulk' && (
          <div className={styles.sectionStack4}>
            {/* Info Banner */}
            <div className={styles.infoBox}>
              <p className={styles.fontMedium}>Bulk Photo Upload (Max {MAX_BULK_PHOTOS} photos)</p>
              <p className={styles.marginTop1}>
                Select multiple photos and AI will automatically generate metadata for each one. 
                This process may take <strong>several minutes</strong> depending on the number of photos.
              </p>
            </div>

            {/* File Select */}
            <label className={styles.block}>
              <span className={styles.labelTiny}>
                Select Photos ({bulkItems.length}/{MAX_BULK_PHOTOS})
                <FieldInfoTooltip label="Select Photos" lines={photoFieldHelp.selectPhotos} />
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleBulkFileSelect(event.target.files)}
                className={styles.fileInput}
                disabled={isBulkProcessing || bulkItems.length >= MAX_BULK_PHOTOS}
              />
            </label>

            {/* Apply to Page Checkbox */}
            {bulkItems.length > 0 && (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={bulkApplyToPage}
                  onChange={(e) => setBulkApplyToPage(e.target.checked)}
                  disabled={isPageFull}
                  className={styles.checkbox}
                />
                <span className={styles.cardDescriptionSoft}>
                  Apply photos to current page ({pageLabels[activeSlug]})
                  {isPageFull && ' — Page full, remove a photo first'}
                  <FieldInfoTooltip label="Apply to Page" lines={photoFieldHelp.applyToPage} />
                </span>
              </label>
            )}

            {/* Action Buttons */}
            {bulkItems.length > 0 && (
              <div className={styles.buttonRowWrap}>
                {bulkItems.some(item => item.status === 'pending') && (
                  <button
                    type="button"
                    onClick={processBulkWithAi}
                    disabled={isBulkProcessing}
                    className={styles.primaryButton}
                  >
                    {isBulkProcessing ? 'Processing...' : `Analyze ${bulkItems.filter(i => i.status === 'pending').length} Photos with AI`}
                  </button>
                )}
                {bulkItems.some(item => item.status === 'ready') && (
                  <button
                    type="button"
                    onClick={uploadBulkItems}
                    disabled={isBulkProcessing}
                    className={styles.successButton}
                  >
                    Upload {bulkItems.filter(i => i.status === 'ready').length} Ready Photos
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAllBulkItems}
                  disabled={isBulkProcessing}
                  className={styles.outlineButton}
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Processing Status */}
            {isBulkProcessing && (
              <div className={styles.warningBox}>
                <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>Processing photos... Please wait.</span>
              </div>
            )}

            {/* Bulk Items Accordion */}
            {bulkItems.length > 0 && (
              <div className={styles.bulkPanel}>
                <button
                  type="button"
                  onClick={() => setBulkAccordionOpen(!bulkAccordionOpen)}
                  className={styles.accordionHeader}
                >
                  <span className={styles.textSmMedium}>
                    Queued Photos ({bulkItems.length})
                    {bulkItems.some(i => i.status === 'ready') && (
                      <span className={styles.inlineSuccess}>
                        • {bulkItems.filter(i => i.status === 'ready').length} ready
                      </span>
                    )}
                    {bulkItems.some(i => i.status === 'error') && (
                      <span className={styles.inlineError}>
                        • {bulkItems.filter(i => i.status === 'error').length} failed
                      </span>
                    )}
                  </span>
                  <svg
                    className={`${styles.accordionIcon} ${
                      bulkAccordionOpen ? styles.accordionIconOpen : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {bulkAccordionOpen && (
                  <div className={styles.bulkGrid}>
                    {bulkItems.map((item) => (
                      <div
                        key={item.id}
                        className={styles.bulkItem}
                      >
                        <div className={styles.photoPreview}>
                          <Image
                            src={item.preview}
                            alt={item.alt || 'Pending upload'}
                            fill
                            className={styles.photoImage}
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          {/* Status Badge */}
                          <div className={`${styles.bulkStatus} ${
                            item.status === 'pending' ? styles.bulkStatusPending :
                            item.status === 'analyzing' ? styles.bulkStatusAnalyzing :
                            item.status === 'ready' ? styles.bulkStatusReady :
                            item.status === 'uploading' ? styles.bulkStatusUploading :
                            item.status === 'done' ? styles.bulkStatusDone :
                            styles.bulkStatusError
                          }`}>
                            {item.status === 'analyzing' && (
                              <svg className={styles.spinnerInline} viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            )}
                            {item.status}
                          </div>
                        </div>

                        <div className={styles.bulkItemRow}>
                          <div className={styles.bulkItemLeft}>
                            <span className={styles.truncateMuted}>{item.file.name}</span>
                            {(item.width != null && item.height != null) && (() => {
                              const labels = getPhotoSuitabilityLabels({
                                width: item.width,
                                height: item.height
                              } as PhotoAsset);
                              const ratio = getAspectRatioLabel(item.width, item.height);
                              return (
                                <div className={styles.bulkItemDims}>
                                  <span className={styles.libraryDims}>
                                    {item.width}×{item.height}
                                  </span>
                                  {ratio && <span className={styles.bulkRatio}>{ratio}</span>}
                                  {labels.length > 0 && (
                                    <span className={styles.bulkSuitability}>
                                      {labels.join(', ')}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div className={styles.rowGap2}>
                            <button
                              type="button"
                              onClick={() => setBulkExpandedId(bulkExpandedId === item.id ? null : item.id)}
                              className={styles.textButtonSmall}
                            >
                              {bulkExpandedId === item.id ? 'Close' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBulkItem(item.id)}
                              className={styles.textButtonDanger}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {item.error && (
                          <p className={styles.bulkError}>{item.error}</p>
                        )}

                        {/* Expanded Edit View */}
                        {bulkExpandedId === item.id && (
                          <div className={styles.bulkExpanded}>
                            <label className={styles.block}>
                              <span className={styles.labelSmall}>
                                Alt Text
                                <FieldInfoTooltip label="Alt Text" lines={photoFieldHelp.altText} />
                              </span>
                              <input
                                type="text"
                                value={item.alt}
                                onChange={(e) => updateBulkItemField(item.id, 'alt', e.target.value)}
                                className={styles.inputSmall}
                                placeholder="Describe the image"
                              />
                            </label>
                            <label className={styles.block}>
                              <span className={styles.labelSmall}>
                                SEO Title
                                <FieldInfoTooltip label="SEO Title" lines={photoFieldHelp.seoTitle} />
                              </span>
                              <input
                                type="text"
                                value={item.metaTitle}
                                onChange={(e) => updateBulkItemField(item.id, 'metaTitle', e.target.value)}
                                className={styles.inputSmall}
                                placeholder="SEO title"
                              />
                            </label>
                            <label className={styles.block}>
                              <span className={styles.labelSmall}>
                                SEO Keywords
                                <FieldInfoTooltip label="SEO Keywords" lines={photoFieldHelp.seoKeywords} />
                              </span>
                              <input
                                type="text"
                                value={item.metaKeywords}
                                onChange={(e) => updateBulkItemField(item.id, 'metaKeywords', e.target.value)}
                                className={styles.inputSmall}
                                placeholder="keyword1, keyword2"
                              />
                            </label>
                            <label className={styles.block}>
                              <span className={styles.labelSmall}>
                                SEO Description
                                <FieldInfoTooltip label="SEO Description" lines={photoFieldHelp.seoDescription} />
                              </span>
                              <textarea
                                value={item.metaDescription}
                                onChange={(e) => updateBulkItemField(item.id, 'metaDescription', e.target.value)}
                                className={styles.textareaSmall}
                                placeholder="Brief description"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Page Photos */}
      <section className={`${styles.section} ${styles.sectionStack4}`}>
        <div>
          <h2 className={styles.cardTitle}>Page Photos</h2>
          <p className={styles.cardDescription}>
            {canReorder
              ? 'Drag photos into sections. Drop on a section to assign. You can reorder within sections.'
              : 'Photos assigned to this page.'}
          </p>
          {pageGuidelines.length > 0 && (
            <div className={styles.guidanceRow}>
              <span className={styles.guidanceLabel}>Recommended sizes</span>
              {pageGuidelines.map((guideline) => (
                <PhotoGuidelineRow key={guideline.label} guideline={guideline} align="left" />
              ))}
            </div>
          )}
        </div>

        {activeSlug === 'home' && canReorder && (
          <div className={styles.photoSections}>
            <div className={styles.photoSection}>
              <h3 className={styles.sectionLabel}>Hero (1 photo)</h3>
              <div className={styles.sectionSlots}>
                {homeHeroPhoto ? (
                  <PagePhotoCard
                    photo={homeHeroPhoto}
                    label="Hero"
                    slotSection="hero"
                    canReorder={canReorder}
                    draggedId={draggedId}
                    dragOverTarget={dragOverTarget}
                    onDragStart={handleDragStart}
                    onDragOver={(t) => setDragOverTarget(t)}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDropOnPhoto={handleDropOnPhoto}
                    onDropOnSlot={handleDropOnSlot}
                    togglePhotoDetails={togglePhotoDetails}
                    removeFromGallery={removeFromGallery}
                    expandedPhotoId={expandedPhotoId}
                    updatePhotoField={updatePhotoField}
                    getAiFixRowClass={getAiFixRowClass}
                    handleAiFixPhoto={handleAiFixPhoto}
                    aiLoadingKey={aiLoadingKey}
                    photoFieldHelp={photoFieldHelp}
                    styles={styles}
                  />
                ) : (
                  <SlotPlaceholder
                    label={homeSections.hero.length > 0 ? 'Hero (missing photo)' : 'Hero'}
                    slotTarget={{ type: 'slot', section: 'hero' }}
                    dragOverTarget={dragOverTarget}
                    onDragOver={setDragOverTarget}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={handleDropOnSlot}
                    styles={styles}
                  />
                )}
              </div>
            </div>
            <div className={styles.photoSection}>
              <h3 className={styles.sectionLabel}>Feature Photos</h3>
              <div className={styles.sectionSlots}>
                {homeSections.feature.map((id, idx) => {
                  const photo = photosById.get(id);
                  if (!photo) {
                    return (
                      <SlotPlaceholder
                        key={`home-feature-missing-${idx}`}
                        label={`Feature ${idx + 1} (missing photo)`}
                        slotTarget={{ type: 'slot', section: 'feature', index: idx }}
                        dragOverTarget={dragOverTarget}
                        onDragOver={setDragOverTarget}
                        onDragLeave={() => setDragOverTarget(null)}
                        onDrop={handleDropOnSlot}
                        styles={styles}
                      />
                    );
                  }
                  return (
                    <PagePhotoCard
                      key={photo.id}
                      photo={photo}
                      label={`Feature ${idx + 1}`}
                      canReorder={canReorder}
                      draggedId={draggedId}
                      dragOverTarget={dragOverTarget}
                      onDragStart={handleDragStart}
                      onDragOver={(t) => setDragOverTarget(t)}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDropOnPhoto={handleDropOnPhoto}
                      onDropOnSlot={handleDropOnSlot}
                      togglePhotoDetails={togglePhotoDetails}
                      removeFromGallery={removeFromGallery}
                      expandedPhotoId={expandedPhotoId}
                      updatePhotoField={updatePhotoField}
                      getAiFixRowClass={getAiFixRowClass}
                      handleAiFixPhoto={handleAiFixPhoto}
                      aiLoadingKey={aiLoadingKey}
                      photoFieldHelp={photoFieldHelp}
                      styles={styles}
                    />
                  );
                })}
                {homeSections.feature.length >= 2 && (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropAtEnd('homeFeatures');
                    }}
                    className={styles.slotPlaceholder}
                    style={{ opacity: 0.6 }}
                  >
                    <span className={styles.slotPlaceholderHint}>Drop here to move to end</span>
                  </div>
                )}
                <SlotPlaceholder
                  label="Add feature"
                  slotTarget={{ type: 'slot', section: 'feature' }}
                  dragOverTarget={dragOverTarget}
                  onDragOver={setDragOverTarget}
                  onDragLeave={() => setDragOverTarget(null)}
                  onDrop={handleDropOnSlot}
                  styles={styles}
                />
              </div>
            </div>
          </div>
        )}

        {activeSlug === 'about' && canReorder && (
          <div className={styles.photoSections}>
            <div className={styles.photoSection}>
              <h3 className={styles.sectionLabel}>Hero (1 photo)</h3>
              <div className={styles.sectionSlots}>
                {aboutHeroPhoto ? (
                  <PagePhotoCard
                    photo={aboutHeroPhoto}
                    label="Hero"
                    slotSection="hero"
                    canReorder={canReorder}
                    draggedId={draggedId}
                    dragOverTarget={dragOverTarget}
                    onDragStart={handleDragStart}
                    onDragOver={(t) => setDragOverTarget(t)}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDropOnPhoto={handleDropOnPhoto}
                    onDropOnSlot={handleDropOnSlot}
                    togglePhotoDetails={togglePhotoDetails}
                    removeFromGallery={removeFromGallery}
                    expandedPhotoId={expandedPhotoId}
                    updatePhotoField={updatePhotoField}
                    getAiFixRowClass={getAiFixRowClass}
                    handleAiFixPhoto={handleAiFixPhoto}
                    aiLoadingKey={aiLoadingKey}
                    photoFieldHelp={photoFieldHelp}
                    styles={styles}
                  />
                ) : (
                  <SlotPlaceholder
                    label={aboutSections.hero.length > 0 ? 'Hero (missing photo)' : 'Hero'}
                    slotTarget={{ type: 'slot', section: 'hero' }}
                    dragOverTarget={dragOverTarget}
                    onDragOver={setDragOverTarget}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={handleDropOnSlot}
                    styles={styles}
                  />
                )}
              </div>
            </div>
            <div className={styles.photoSection}>
              <h3 className={styles.sectionLabel}>Approach & Results (4 photos)</h3>
              <div className={styles.sectionSlots}>
                {[0, 1, 2, 3].map((slotIndex) => {
                  const photoId = aboutSections.approach[slotIndex];
                  if (photoId) {
                    const photo = photosById.get(photoId);
                    if (!photo) {
                      return (
                        <SlotPlaceholder
                          key={`approach-${slotIndex}`}
                          label={`Slot ${slotIndex + 1} (missing photo)`}
                          slotTarget={{ type: 'slot', section: 'approach', index: slotIndex }}
                          dragOverTarget={dragOverTarget}
                          onDragOver={setDragOverTarget}
                          onDragLeave={() => setDragOverTarget(null)}
                          onDrop={handleDropOnSlot}
                          styles={styles}
                        />
                      );
                    }
                    return (
                    <PagePhotoCard
                      key={`approach-${slotIndex}-${photo.id}`}
                      photo={photo}
                      label={`Approach ${slotIndex + 1}`}
                      slotSection="approach"
                      slotIndex={slotIndex}
                      canReorder={canReorder}
                        draggedId={draggedId}
                        dragOverTarget={dragOverTarget}
                        onDragStart={handleDragStart}
                        onDragOver={(t) => setDragOverTarget(t)}
                        onDragLeave={() => setDragOverTarget(null)}
                        onDropOnPhoto={handleDropOnPhoto}
                        onDropOnSlot={handleDropOnSlot}
                        togglePhotoDetails={togglePhotoDetails}
                        removeFromGallery={removeFromGallery}
                        expandedPhotoId={expandedPhotoId}
                        updatePhotoField={updatePhotoField}
                        getAiFixRowClass={getAiFixRowClass}
                        handleAiFixPhoto={handleAiFixPhoto}
                        aiLoadingKey={aiLoadingKey}
                        photoFieldHelp={photoFieldHelp}
                        styles={styles}
                      />
                    );
                  }
                  return (
                    <SlotPlaceholder
                      key={`approach-${slotIndex}`}
                      label={`Slot ${slotIndex + 1}`}
                      slotTarget={{ type: 'slot', section: 'approach', index: slotIndex }}
                      dragOverTarget={dragOverTarget}
                      onDragOver={setDragOverTarget}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={handleDropOnSlot}
                      styles={styles}
                    />
                  );
                })}
                {aboutSections.approach.filter(Boolean).length >= 2 && (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropAtEnd('aboutApproach');
                    }}
                    className={styles.slotPlaceholder}
                    style={{ opacity: 0.6 }}
                  >
                    <span className={styles.slotPlaceholderHint}>Drop here to move to end</span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.photoSection}>
              <h3 className={styles.sectionLabel}>Bio (1 photo)</h3>
              <div className={styles.sectionSlots}>
                {aboutBioPhoto ? (
                  <PagePhotoCard
                    photo={aboutBioPhoto}
                    label="Bio"
                    slotSection="bio"
                    canReorder={canReorder}
                    draggedId={draggedId}
                    dragOverTarget={dragOverTarget}
                    onDragStart={handleDragStart}
                    onDragOver={(t) => setDragOverTarget(t)}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDropOnPhoto={handleDropOnPhoto}
                    onDropOnSlot={handleDropOnSlot}
                    togglePhotoDetails={togglePhotoDetails}
                    removeFromGallery={removeFromGallery}
                    expandedPhotoId={expandedPhotoId}
                    updatePhotoField={updatePhotoField}
                    getAiFixRowClass={getAiFixRowClass}
                    handleAiFixPhoto={handleAiFixPhoto}
                    aiLoadingKey={aiLoadingKey}
                    photoFieldHelp={photoFieldHelp}
                    styles={styles}
                  />
                ) : (
                  <SlotPlaceholder
                    label={aboutSections.bio.length > 0 ? 'Bio (missing photo)' : 'Bio'}
                    slotTarget={{ type: 'slot', section: 'bio' }}
                    dragOverTarget={dragOverTarget}
                    onDragOver={setDragOverTarget}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={handleDropOnSlot}
                    styles={styles}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeSlug === 'contact' && canReorder && (
          <div className={styles.photoSections}>
            <div className={styles.photoSection}>
              <h3 className={styles.sectionLabel}>Hero (1 photo)</h3>
              <div className={styles.sectionSlots}>
                {contactHeroPhoto ? (
                  <PagePhotoCard
                    photo={contactHeroPhoto}
                    label="Hero"
                    slotSection="hero"
                    canReorder={canReorder}
                    draggedId={draggedId}
                    dragOverTarget={dragOverTarget}
                    onDragStart={handleDragStart}
                    onDragOver={(t) => setDragOverTarget(t)}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDropOnPhoto={handleDropOnPhoto}
                    onDropOnSlot={handleDropOnSlot}
                    togglePhotoDetails={togglePhotoDetails}
                    removeFromGallery={removeFromGallery}
                    expandedPhotoId={expandedPhotoId}
                    updatePhotoField={updatePhotoField}
                    getAiFixRowClass={getAiFixRowClass}
                    handleAiFixPhoto={handleAiFixPhoto}
                    aiLoadingKey={aiLoadingKey}
                    photoFieldHelp={photoFieldHelp}
                    styles={styles}
                  />
                ) : (
                  <SlotPlaceholder
                    label={contactSections.hero.length > 0 ? 'Hero (missing photo)' : 'Hero'}
                    slotTarget={{ type: 'slot', section: 'hero' }}
                    dragOverTarget={dragOverTarget}
                    onDragOver={setDragOverTarget}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={handleDropOnSlot}
                    styles={styles}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Photo Library */}
      <section className={`${styles.section} ${styles.sectionStack4}`}>
        <div>
          <h2 className={styles.cardTitle}>Photo Library</h2>
          <p className={styles.cardDescription}>
            Add photos from the library to this page. Grouped by recommended use.
          </p>
        </div>
        {addConfirm && (
          <div className={styles.warningCard} role="alert">
            <p className={styles.warningText}>{addConfirm.message}</p>
            <div className={styles.warningActions}>
              {addConfirm.blocking ? (
                <button
                  type="button"
                  onClick={() => setAddConfirm(null)}
                  className={styles.libraryActionButtonPrimary}
                >
                  OK
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAddConfirm(null)}
                    className={styles.libraryActionButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmAddToGallery}
                    className={styles.libraryActionButtonPrimary}
                  >
                    Add anyway
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        <div className={styles.libraryGroups}>
          {availablePhotos.length === 0 ? (
            <p className={styles.emptyTextInline}>All photos are already on this page.</p>
          ) : (
            <>
            {availablePhotosGrouped.map(({ key, photos: groupPhotos }) => (
              <div key={key} className={styles.libraryGroup}>
                <h3 className={styles.libraryGroupTitle}>{LIBRARY_GROUP_LABELS[key]}</h3>
                <div className={styles.gridThreeTight}>
                  {groupPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`${styles.libraryCard} ${canReorder ? styles.libraryCardDraggable : ''}`}
                      draggable={canReorder}
                      onDragStart={() => handleDragStart(photo.id)}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverTarget(null);
                      }}
                    >
                      <div className={styles.libraryRow}>
                        <div className={styles.libraryInfo}>
                          <div className={styles.photoPreviewSmall}>
                            <Image
                              src={photo.src}
                              alt={photo.alt}
                              fill
                              className={styles.photoImage}
                              sizes="64px"
                            />
                          </div>
                          <div className={styles.libraryMeta}>
                            <span className={styles.libraryTitle}>{photo.alt || 'Untitled'}</span>
                            {photo.width > 0 && photo.height > 0 && (
                              <span className={styles.libraryDims}>{photo.width}×{photo.height}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Desktop buttons - hidden on medium and smaller screens */}
                        <div className={styles.libraryActions}>
                          <button
                            type="button"
                            onClick={() => togglePhotoDetails(photo.id)}
                            className={styles.libraryActionButton}
                          >
                            {expandedPhotoId === photo.id ? 'Close' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddToGalleryClick(photo.id)}
                            className={styles.libraryActionButtonPrimary}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(photo.id)}
                            className={styles.libraryActionButtonDanger}
                          >
                            Delete
                          </button>
                        </div>

                        {/* Mobile/tablet dropdown - visible on medium and smaller screens */}
                        <div ref={openMenuId === photo.id ? menuRef : undefined} className={styles.menuWrapper}>
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === photo.id ? null : photo.id)}
                            className={styles.menuButton}
                            aria-label="Actions"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="8" cy="3" r="1.5" />
                              <circle cx="8" cy="8" r="1.5" />
                              <circle cx="8" cy="13" r="1.5" />
                            </svg>
                          </button>
                          {openMenuId === photo.id && (
                            <div className={styles.menu}>
                              <button
                                type="button"
                                onClick={() => {
                                  togglePhotoDetails(photo.id);
                                  setOpenMenuId(null);
                                }}
                                className={styles.menuItem}
                              >
                                {expandedPhotoId === photo.id ? 'Close' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddToGalleryClick(photo.id);
                                }}
                                className={styles.menuItem}
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDelete(photo.id);
                                  setOpenMenuId(null);
                                }}
                                className={styles.menuItemDanger}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {expandedPhotoId === photo.id && (
                <div className={styles.detailsPanel}>
                  <label className={`${styles.block} ${getAiFixRowClass(`photo-${photo.id}-alt`)}`}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Alt Text
                        <FieldInfoTooltip label="Alt Text" lines={photoFieldHelp.altText} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'alt', 'text')}
                        loading={aiLoadingKey === `photo-${photo.id}-alt`}
                      />
                    </div>
                    <input
                      value={photo.alt || ''}
                      onChange={(event) => updatePhotoField(photo.id, 'alt', event.target.value)}
                      className={styles.inputTiny}
                    />
                  </label>
                  <label className={`${styles.block} ${getAiFixRowClass(`photo-${photo.id}-metaTitle`)}`}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Title
                        <FieldInfoTooltip label="Meta Title" lines={photoFieldHelp.metaTitle} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaTitle', 'seo')}
                        loading={aiLoadingKey === `photo-${photo.id}-metaTitle`}
                      />
                    </div>
                    <input
                      value={photo.metaTitle || ''}
                      onChange={(event) =>
                        updatePhotoField(photo.id, 'metaTitle', event.target.value)
                      }
                      className={styles.inputTiny}
                    />
                  </label>
                  <label className={`${styles.block} ${getAiFixRowClass(`photo-${photo.id}-metaDescription`)}`}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Description
                        <FieldInfoTooltip label="Meta Description" lines={photoFieldHelp.metaDescription} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaDescription', 'seo')}
                        loading={aiLoadingKey === `photo-${photo.id}-metaDescription`}
                      />
                    </div>
                    <textarea
                      value={photo.metaDescription || ''}
                      onChange={(event) =>
                        updatePhotoField(photo.id, 'metaDescription', event.target.value)
                      }
                      className={styles.textareaMedium}
                    />
                  </label>
                  <label className={`${styles.block} ${getAiFixRowClass(`photo-${photo.id}-metaKeywords`)}`}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Keywords
                        <FieldInfoTooltip label="Meta Keywords" lines={photoFieldHelp.metaKeywords} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaKeywords', 'seo')}
                        loading={aiLoadingKey === `photo-${photo.id}-metaKeywords`}
                      />
                    </div>
                    <textarea
                      value={photo.metaKeywords || ''}
                      onChange={(event) =>
                        updatePhotoField(photo.id, 'metaKeywords', event.target.value)
                      }
                      className={styles.textareaShort}
                    />
                  </label>
                </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
