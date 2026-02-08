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
import guidelineStyles from '@/styles/admin/PhotoGuidelines.module.css';
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
  error?: string;
};

const MAX_BULK_PHOTOS = 50;
const ABOUT_MAX_APPROACH_PHOTOS = 4;

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
  const [activeSlug, setActiveSlug] = useState<PageSlug>('home');
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiBusy, setIsAiBusy] = useState(false);
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
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pageGuidelines = useMemo(
    () => pagePhotoGuidelinesBySlug[activeSlug] || [],
    [activeSlug]
  );

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

  const availablePhotos = useMemo(() => {
    const current = new Set(pagePhotoIds);
    return photos.filter((photo) => !current.has(photo.id));
  }, [photos, pagePhotoIds]);

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
      const aboutData = aboutRes.ok ? (await aboutRes.json()) as AboutPageContent : null;
      const contactData = contactRes.ok ? (await contactRes.json()) as ContactPageContent : null;

      setPages(pagesData);
      setPhotos(photosData);
      setSavedPhotos(photosData);
      setLayouts({ home: homeData, about: aboutData, contact: contactData });
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
    if (isAiBusy) return;
    const photo = photosById.get(photoId);
    if (!photo) return;

    setIsAiBusy(true);
    setAiStatus('Optimizing with AI...');

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
      setIsAiBusy(false);
      return;
    }

    const data = (await response.json()) as { output?: string };
    if (data.output) {
      updatePhotoField(photoId, field, data.output);
      setAiStatus('AI update complete.');
    } else {
      setAiStatus('AI did not return a result.');
    }

    setIsAiBusy(false);
  }

  function handleDragStart(photoId: string) {
    setDraggedId(photoId);
  }

  async function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    
    const currentIds = [...pagePhotoIds];
    const from = currentIds.indexOf(draggedId);
    const to = currentIds.indexOf(targetId);
    if (from < 0 || to < 0) return;
    
    currentIds.splice(from, 1);
    currentIds.splice(to, 0, draggedId);
    
    await updatePagePhotoOrder(currentIds);
    setDraggedId(null);
  }

  async function updatePagePhotoOrder(newIds: string[]) {
    setStatus('Updating order...');
    
    if (activeSlug === 'home' && layouts.home) {
      // First ID is hero, rest are features
      const heroPhotoId = newIds[0] || '';
      const featurePhotoIds = newIds.slice(1);
      
      const response = await fetch('/api/admin/layouts/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroPhotoId, featurePhotoIds })
      });
      
      if (response.ok) {
        const updated = await response.json();
        setLayouts(prev => ({ ...prev, home: updated }));
        setStatus('Order updated.');
        refreshPreview();
      } else {
        setStatus('Failed to update order.');
      }
    } else if (activeSlug === 'about' && layouts.about) {
      const heroPhotoId = newIds[0] || layouts.about.heroPhotoId;
      const existingBioId = layouts.about.bio?.photoId || '';
      const hasBio = Boolean(existingBioId);
      const bioCandidate = hasBio && newIds.length >= 2 ? newIds[newIds.length - 1] : '';
      const bioPhotoId = bioCandidate || existingBioId;

      const rawApproachIds = hasBio ? newIds.slice(1, newIds.length - 1) : newIds.slice(1);
      const approachPhotoIds: string[] = [];
      for (const id of rawApproachIds) {
        if (!id) continue;
        if (id === heroPhotoId) continue;
        if (hasBio && id === bioPhotoId) continue;
        if (approachPhotoIds.includes(id)) continue;
        approachPhotoIds.push(id);
        if (approachPhotoIds.length >= ABOUT_MAX_APPROACH_PHOTOS) break;
      }

      const existingByPhotoId = new Map(
        (layouts.about.approachItems || []).map((item) => [item.photoId, item])
      );

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

      const updatedApproachItems = approachPhotoIds.map(
        (photoId) => existingByPhotoId.get(photoId) ?? createApproachItem(photoId)
      );

      const updatedBio = layouts.about.bio
        ? {
            ...layouts.about.bio,
            photoId: bioPhotoId
          }
        : undefined;
      
      const response = await fetch('/api/admin/layouts/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...layouts.about,
          heroPhotoId,
          approachItems: updatedApproachItems,
          bio: updatedBio
        })
      });
      
      if (response.ok) {
        const updated = await response.json();
        setLayouts(prev => ({ ...prev, about: updated }));
        setStatus('Order updated.');
        refreshPreview();
      } else {
        setStatus('Failed to update order.');
      }
    } else if (activeSlug === 'contact' && layouts.contact) {
      // For Contact: Just update the hero photo ID
      const heroPhotoId = newIds[0] || '';
      
      const response = await fetch('/api/admin/layouts/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroPhotoId })
      });
      
      if (response.ok) {
        const updated = await response.json();
        setLayouts(prev => ({ ...prev, contact: updated }));
        setStatus('Order updated.');
        refreshPreview();
      } else {
        setStatus('Failed to update order.');
      }
    } else {
      setStatus('Reordering not available for this page.');
    }
  }

  async function removeFromGallery(photoId: string) {
    const newIds = pagePhotoIds.filter(id => id !== photoId);
    await updatePagePhotoOrder(newIds);
  }

  async function addToGallery(photoId: string) {
    if (activeSlug === 'about' && layouts.about) {
      const currentIds = [...pagePhotoIds];
      const heroId = currentIds[0] || layouts.about.heroPhotoId;
      const existingBioId = layouts.about.bio?.photoId || '';
      const hasBio = Boolean(existingBioId);

      const approachIds = (hasBio ? currentIds.slice(1, currentIds.length - 1) : currentIds.slice(1)).filter(
        (id) => id && id !== photoId
      );

      if (approachIds.includes(photoId) || photoId === heroId || (hasBio && photoId === existingBioId)) {
        return;
      }

      if (approachIds.length >= ABOUT_MAX_APPROACH_PHOTOS) {
        setStatus(`Approach & Results supports up to ${ABOUT_MAX_APPROACH_PHOTOS} photos. Remove one before adding another.`);
        return;
      }

      const nextIds = hasBio
        ? [heroId, ...approachIds, photoId, existingBioId]
        : [heroId, ...approachIds, photoId];

      await updatePagePhotoOrder(nextIds.filter(Boolean));
      return;
    }

    const newIds = [...pagePhotoIds, photoId];
    await updatePagePhotoOrder(newIds);
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
    await addToGallery(photo.id);
    
    setUploadAlt('');
    setUploadMetaTitle('');
    setUploadMetaDescription('');
    setUploadMetaKeywords('');
    setUploadFile(null);
    setStatus('Upload complete and added to page.');
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
    
    // Add to page if checkbox is checked
    if (bulkApplyToPage && uploadedPhotoIds.length > 0) {
      const newIds = [...pagePhotoIds, ...uploadedPhotoIds];
      await updatePagePhotoOrder(newIds);
    }
    
    // Remove completed items
    setBulkItems(prev => prev.filter(item => item.status !== 'done'));
    
    setIsBulkProcessing(false);
    setStatus(`Successfully uploaded ${uploadedPhotoIds.length} photos!`);
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
                  className={styles.checkbox}
                />
                <span className={styles.cardDescriptionSoft}>
                  Apply photos to current page ({pageLabels[activeSlug]})
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
                          <span className={styles.truncateMuted}>{item.file.name}</span>
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
              ? 'Drag and drop to reorder. The first photo (index 0) automatically becomes the hero.' 
              : 'Photos assigned to this page.'}
          </p>
          {pageGuidelines.length > 0 && (
            <div className={styles.guidanceRow}>
              <span className={styles.guidanceLabel}>
                Recommended sizes
              </span>
              {pageGuidelines.map((guideline) => (
                <PhotoGuidelineRow key={guideline.label} guideline={guideline} align="left" />
              ))}
            </div>
          )}
          {canReorder && galleryPhotos.length > 1 && (
            <p className={styles.tip}>
              💡 Tip: Drag any photo to the first position to make it the hero
            </p>
          )}
        </div>
        <div className={styles.formGridThree}>
          {galleryPhotos.length === 0 && (
            <p className={styles.emptyTextInline}>No photos assigned to this page yet.</p>
          )}
          {galleryPhotos.map((photo, index) => (
            <div
              key={photo.id}
              draggable={canReorder}
              onDragStart={() => handleDragStart(photo.id)}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragOverId !== photo.id) {
                  setDragOverId(photo.id);
                }
              }}
              onDragLeave={() => {
                setDragOverId(null);
              }}
              onDrop={() => {
                setDragOverId(null);
                handleDrop(photo.id);
              }}
              className={`${styles.photoCard} ${
                canReorder ? styles.photoCardDraggable : ''
              } ${
                draggedId === photo.id ? styles.photoCardDragging : ''
              } ${
                dragOverId === photo.id && draggedId !== photo.id ? styles.photoCardDropTarget : ''
              }`}
            >
              <div className={styles.photoPreviewLarge}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className={styles.photoImage}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className={styles.photoBadge}>
                  {getPhotoLabel(photo.id, index)}
                </div>
              </div>
              <div className={styles.photoCardMeta}>
                <span className={styles.truncate}>{photo.alt || 'Untitled photo'}</span>
                <div className={styles.bulkItemMeta}>
                  <button
                    type="button"
                    onClick={() => togglePhotoDetails(photo.id)}
                    className={styles.textButton}
                  >
                    {expandedPhotoId === photo.id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromGallery(photo.id)}
                    className={styles.textButton}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {expandedPhotoId === photo.id && (
                <div className={styles.detailsPanel}>
                  <label className={styles.block}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Alt Text
                        <FieldInfoTooltip label="Alt Text" lines={photoFieldHelp.altText} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'alt', 'text')}
                        disabled={isAiBusy}
                      />
                    </div>
                    <input
                      value={photo.alt || ''}
                      onChange={(event) => updatePhotoField(photo.id, 'alt', event.target.value)}
                      className={styles.inputTiny}
                    />
                  </label>
                  <label className={styles.block}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Title
                        <FieldInfoTooltip label="Meta Title" lines={photoFieldHelp.metaTitle} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaTitle', 'seo')}
                        disabled={isAiBusy}
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
                  <label className={styles.block}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Description
                        <FieldInfoTooltip label="Meta Description" lines={photoFieldHelp.metaDescription} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaDescription', 'seo')}
                        disabled={isAiBusy}
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
                  <label className={styles.block}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Keywords
                        <FieldInfoTooltip label="Meta Keywords" lines={photoFieldHelp.metaKeywords} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaKeywords', 'seo')}
                        disabled={isAiBusy}
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
      </section>

      {/* Photo Library */}
      <section className={`${styles.section} ${styles.sectionStack4}`}>
        <div>
          <h2 className={styles.cardTitle}>Photo Library</h2>
          <p className={styles.cardDescription}>
            Add photos from the library to this page.
          </p>
        </div>
        <div className={styles.gridThreeTight}>
          {availablePhotos.length === 0 && (
            <p className={styles.emptyTextInline}>All photos are already on this page.</p>
          )}
          {availablePhotos.map((photo) => (
            <div
              key={photo.id}
              className={styles.libraryCard}
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
                  <span className={styles.libraryTitle}>{photo.alt || 'Untitled'}</span>
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
                    onClick={() => addToGallery(photo.id)}
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
                          addToGallery(photo.id);
                          setOpenMenuId(null);
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
                  <label className={styles.block}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Alt Text
                        <FieldInfoTooltip label="Alt Text" lines={photoFieldHelp.altText} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'alt', 'text')}
                        disabled={isAiBusy}
                      />
                    </div>
                    <input
                      value={photo.alt || ''}
                      onChange={(event) => updatePhotoField(photo.id, 'alt', event.target.value)}
                      className={styles.inputTiny}
                    />
                  </label>
                  <label className={styles.block}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Title
                        <FieldInfoTooltip label="Meta Title" lines={photoFieldHelp.metaTitle} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaTitle', 'seo')}
                        disabled={isAiBusy}
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
                  <label className={styles.block}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Description
                        <FieldInfoTooltip label="Meta Description" lines={photoFieldHelp.metaDescription} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaDescription', 'seo')}
                        disabled={isAiBusy}
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
                  <label className={styles.block}>
                    <div className={styles.buttonRow}>
                      <span className={styles.inlineLabel}>
                        Meta Keywords
                        <FieldInfoTooltip label="Meta Keywords" lines={photoFieldHelp.metaKeywords} />
                      </span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'metaKeywords', 'seo')}
                        disabled={isAiBusy}
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
      </section>
    </div>
  );
}
