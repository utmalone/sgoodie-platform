'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { PageContent, PageSlug, PhotoAsset, HomeLayout, AboutPageContent, ContactPageContent } from '@/types';
import { useSave } from '@/lib/admin/save-context';
import { pageLabels, photoPageOrder } from '@/lib/admin/page-config';
import { loadAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { AiFixButton } from '@/components/admin/AiFixButton';

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

export function AdminPhotosClient() {
  const { registerChange, unregisterChange } = useSave();
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
      return true;
    } catch {
      return false;
    }
  }, [photos, savedPhotos]);

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

  const savedPhotosById = useMemo(() => {
    return new Map(savedPhotos.map((photo) => [photo.id, photo]));
  }, [savedPhotos]);

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
      } else {
        setStatus('Failed to update order.');
      }
    } else if (activeSlug === 'about' && layouts.about) {
      // For About: First ID is hero, then approach items maintain their structure, last is bio
      // We need to map new photo IDs to the existing structure
      const heroPhotoId = newIds[0] || layouts.about.heroPhotoId;
      
      // Get the approach item photo IDs (indices 1 through length-2, since last is bio)
      const approachPhotoIds = newIds.slice(1, newIds.length - 1);
      const bioPhotoId = newIds[newIds.length - 1] || layouts.about.bio?.photoId;
      
      // Update approach items with new photo IDs while keeping their titles/descriptions
      const updatedApproachItems = layouts.about.approachItems?.map((item, idx) => ({
        ...item,
        photoId: approachPhotoIds[idx] || item.photoId
      })) || [];
      
      const updatedBio = layouts.about.bio ? {
        ...layouts.about.bio,
        photoId: bioPhotoId
      } : undefined;
      
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
    const newIds = [...pagePhotoIds, photoId];
    await updatePagePhotoOrder(newIds);
  }

  async function handleSavePhotos() {
    setStatus('Saving photo metadata...');

    const changedPhotos = photos.filter((photo) => {
      const saved = savedPhotosById.get(photo.id);
      if (!saved) return true;
      return (
        saved.alt !== photo.alt ||
        saved.metaTitle !== photo.metaTitle ||
        saved.metaDescription !== photo.metaDescription ||
        saved.metaKeywords !== photo.metaKeywords
      );
    });

    if (changedPhotos.length === 0) {
      setStatus('No changes to save.');
      return;
    }

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

    if (results.some((res) => !res.ok)) {
      setStatus('Some photo metadata updates failed.');
      return;
    }

    setSavedPhotos(photos);
    setStatus(`Saved ${changedPhotos.length} photo(s).`);
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
    return <p className="text-sm text-black/60">Loading admin content...</p>;
  }

  // Enable reordering for pages with photos
  const canReorder = activeSlug === 'home' || activeSlug === 'about' || activeSlug === 'contact';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Photos</h1>
          <p className="mt-2 text-sm text-black/60">
            Manage photos for each page. {canReorder ? 'Drag to reorder.' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSavePhotos}
          className="rounded-full border border-black/20 bg-black px-5 py-2 text-xs uppercase tracking-[0.35em] text-white"
        >
          Save Metadata
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white/60 p-3">
        {photoPageOrder.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setActiveSlug(slug)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.25em] ${
              activeSlug === slug
                ? 'bg-black text-white'
                : 'border border-black/10 text-black/60 hover:border-black/30'
            }`}
          >
            {pageLabels[slug]}
          </button>
        ))}
      </div>

      {status && <p className="text-sm text-black/60">{status}</p>}
      {aiStatus && <p className="text-sm text-black/60">{aiStatus}</p>}

      {/* Upload Section */}
      <section className="space-y-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Upload Photos</h2>
          {/* Upload Mode Tabs */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setUploadMode('single')}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition-all ${
                uploadMode === 'single'
                  ? 'bg-black text-white'
                  : 'border border-black/20 text-black/60 hover:border-black/40'
              }`}
            >
              Single Photo
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('bulk')}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition-all ${
                uploadMode === 'bulk'
                  ? 'bg-black text-white'
                  : 'border border-black/20 text-black/60 hover:border-black/40'
              }`}
            >
              Bulk Upload
            </button>
          </div>
        </div>

        {/* Single Photo Upload */}
        {uploadMode === 'single' && (
          <>
            <p className="text-sm text-black/60">
              Upload a single photo. AI will automatically generate metadata.
            </p>
            {isAnalyzingUpload && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>AI is analyzing the photo and generating metadata...</span>
              </div>
            )}
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">Select Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
                    className="mt-1 w-full rounded-2xl border border-black/20 px-4 py-2 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-black/5 file:px-4 file:py-1 file:text-sm file:font-medium"
                    disabled={isAnalyzingUpload}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">Alt Text (Accessibility)</span>
                  <input
                    type="text"
                    placeholder="Describe the image for screen readers"
                    value={uploadAlt}
                    onChange={(event) => setUploadAlt(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-black/20 px-4 py-2 text-sm disabled:bg-black/5 disabled:text-black/40"
                    disabled={isAnalyzingUpload}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">SEO Title</span>
                  <input
                    type="text"
                    placeholder="Page title for search engines"
                    value={uploadMetaTitle}
                    onChange={(event) => setUploadMetaTitle(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-black/20 px-4 py-2 text-sm disabled:bg-black/5 disabled:text-black/40"
                    disabled={isAnalyzingUpload}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">SEO Keywords</span>
                  <input
                    type="text"
                    placeholder="Comma-separated keywords"
                    value={uploadMetaKeywords}
                    onChange={(event) => setUploadMetaKeywords(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-black/20 px-4 py-2 text-sm disabled:bg-black/5 disabled:text-black/40"
                    disabled={isAnalyzingUpload}
                  />
                </label>
                <label className="md:col-span-2 block">
                  <span className="text-xs font-medium text-black/60 uppercase tracking-wide">SEO Description</span>
                  <textarea
                    placeholder="Brief description for search results"
                    value={uploadMetaDescription}
                    onChange={(event) => setUploadMetaDescription(event.target.value)}
                    className="mt-1 min-h-[80px] w-full rounded-2xl border border-black/20 px-4 py-2 text-sm disabled:bg-black/5 disabled:text-black/40"
                    disabled={isAnalyzingUpload}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isAnalyzingUpload || !uploadFile}
                className="rounded-full border border-black/20 bg-black px-5 py-2 text-xs uppercase tracking-[0.35em] text-white h-fit disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingUpload ? 'Analyzing...' : 'Upload'}
              </button>
            </form>
          </>
        )}

        {/* Bulk Upload */}
        {uploadMode === 'bulk' && (
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <p className="font-medium">Bulk Photo Upload (Max {MAX_BULK_PHOTOS} photos)</p>
              <p className="mt-1">
                Select multiple photos and AI will automatically generate metadata for each one. 
                This process may take <strong>several minutes</strong> depending on the number of photos.
              </p>
            </div>

            {/* File Select */}
            <label className="block">
              <span className="text-xs font-medium text-black/60 uppercase tracking-wide">
                Select Photos ({bulkItems.length}/{MAX_BULK_PHOTOS})
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleBulkFileSelect(event.target.files)}
                className="mt-1 w-full rounded-2xl border border-black/20 px-4 py-2 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-black/5 file:px-4 file:py-1 file:text-sm file:font-medium"
                disabled={isBulkProcessing || bulkItems.length >= MAX_BULK_PHOTOS}
              />
            </label>

            {/* Apply to Page Checkbox */}
            {bulkItems.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkApplyToPage}
                  onChange={(e) => setBulkApplyToPage(e.target.checked)}
                  className="h-4 w-4 rounded border-black/30 text-black focus:ring-black"
                />
                <span className="text-sm text-black/70">
                  Apply photos to current page ({pageLabels[activeSlug]})
                </span>
              </label>
            )}

            {/* Action Buttons */}
            {bulkItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bulkItems.some(item => item.status === 'pending') && (
                  <button
                    type="button"
                    onClick={processBulkWithAi}
                    disabled={isBulkProcessing}
                    className="rounded-full bg-black px-5 py-2 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-50"
                  >
                    {isBulkProcessing ? 'Processing...' : `Analyze ${bulkItems.filter(i => i.status === 'pending').length} Photos with AI`}
                  </button>
                )}
                {bulkItems.some(item => item.status === 'ready') && (
                  <button
                    type="button"
                    onClick={uploadBulkItems}
                    disabled={isBulkProcessing}
                    className="rounded-full bg-green-600 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-50"
                  >
                    Upload {bulkItems.filter(i => i.status === 'ready').length} Ready Photos
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAllBulkItems}
                  disabled={isBulkProcessing}
                  className="rounded-full border border-black/20 px-5 py-2 text-xs uppercase tracking-[0.2em] text-black/60 disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Processing Status */}
            {isBulkProcessing && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>Processing photos... Please wait.</span>
              </div>
            )}

            {/* Bulk Items Accordion */}
            {bulkItems.length > 0 && (
              <div className="rounded-2xl border border-black/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBulkAccordionOpen(!bulkAccordionOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-black/5 hover:bg-black/10 transition-colors"
                >
                  <span className="text-sm font-medium">
                    Queued Photos ({bulkItems.length})
                    {bulkItems.some(i => i.status === 'ready') && (
                      <span className="ml-2 text-green-600">
                        • {bulkItems.filter(i => i.status === 'ready').length} ready
                      </span>
                    )}
                    {bulkItems.some(i => i.status === 'error') && (
                      <span className="ml-2 text-red-600">
                        • {bulkItems.filter(i => i.status === 'error').length} failed
                      </span>
                    )}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${bulkAccordionOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {bulkAccordionOpen && (
                  <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {bulkItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/5">
                          <Image
                            src={item.preview}
                            alt={item.alt || 'Pending upload'}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          {/* Status Badge */}
                          <div className={`absolute top-2 right-2 rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${
                            item.status === 'pending' ? 'bg-gray-500 text-white' :
                            item.status === 'analyzing' ? 'bg-amber-500 text-white' :
                            item.status === 'ready' ? 'bg-green-500 text-white' :
                            item.status === 'uploading' ? 'bg-blue-500 text-white' :
                            item.status === 'done' ? 'bg-green-700 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {item.status === 'analyzing' && (
                              <svg className="inline-block h-3 w-3 mr-1 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            )}
                            {item.status}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-black/60">{item.file.name}</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setBulkExpandedId(bulkExpandedId === item.id ? null : item.id)}
                              className="text-[10px] uppercase tracking-[0.2em] text-black/40 hover:text-black/70"
                            >
                              {bulkExpandedId === item.id ? 'Close' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBulkItem(item.id)}
                              className="text-[10px] uppercase tracking-[0.2em] text-red-400 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {item.error && (
                          <p className="mt-2 text-xs text-red-500">{item.error}</p>
                        )}

                        {/* Expanded Edit View */}
                        {bulkExpandedId === item.id && (
                          <div className="mt-3 space-y-3 border-t border-black/10 pt-3">
                            <label className="block">
                              <span className="text-[10px] font-medium text-black/50 uppercase tracking-wide">Alt Text</span>
                              <input
                                type="text"
                                value={item.alt}
                                onChange={(e) => updateBulkItemField(item.id, 'alt', e.target.value)}
                                className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                                placeholder="Describe the image"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] font-medium text-black/50 uppercase tracking-wide">SEO Title</span>
                              <input
                                type="text"
                                value={item.metaTitle}
                                onChange={(e) => updateBulkItemField(item.id, 'metaTitle', e.target.value)}
                                className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                                placeholder="SEO title"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] font-medium text-black/50 uppercase tracking-wide">SEO Keywords</span>
                              <input
                                type="text"
                                value={item.metaKeywords}
                                onChange={(e) => updateBulkItemField(item.id, 'metaKeywords', e.target.value)}
                                className="mt-1 w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                                placeholder="keyword1, keyword2"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] font-medium text-black/50 uppercase tracking-wide">SEO Description</span>
                              <textarea
                                value={item.metaDescription}
                                onChange={(e) => updateBulkItemField(item.id, 'metaDescription', e.target.value)}
                                className="mt-1 min-h-[60px] w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
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
      <section className="space-y-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Page Photos</h2>
          <p className="mt-2 text-sm text-black/60">
            {canReorder 
              ? 'Drag and drop to reorder. The first photo (index 0) automatically becomes the hero.' 
              : 'Photos assigned to this page.'}
          </p>
          {canReorder && galleryPhotos.length > 1 && (
            <p className="mt-1 text-xs text-blue-600">
              💡 Tip: Drag any photo to the first position to make it the hero
            </p>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleryPhotos.length === 0 && (
            <p className="text-sm text-black/50">No photos assigned to this page yet.</p>
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
              className={`group rounded-2xl border bg-white p-3 shadow-sm transition-all ${
                canReorder ? 'cursor-grab active:cursor-grabbing' : ''
              } ${
                draggedId === photo.id ? 'opacity-50 scale-95 border-black/10' : 'border-black/10'
              } ${
                dragOverId === photo.id && draggedId !== photo.id ? 'ring-2 ring-blue-400' : ''
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wider text-white">
                  {getPhotoLabel(photo.id, index)}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-black/60">
                <span className="truncate">{photo.alt || 'Untitled photo'}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePhotoDetails(photo.id)}
                    className="text-[10px] uppercase tracking-[0.3em] text-black/40 hover:text-black/70"
                  >
                    {expandedPhotoId === photo.id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromGallery(photo.id)}
                    className="text-[10px] uppercase tracking-[0.3em] text-black/40 hover:text-black/70"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {expandedPhotoId === photo.id && (
                <div className="mt-4 space-y-3 text-xs text-black/60">
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span>Alt Text</span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'alt', 'text')}
                        disabled={isAiBusy}
                      />
                    </div>
                    <input
                      value={photo.alt || ''}
                      onChange={(event) => updatePhotoField(photo.id, 'alt', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span>Meta Title</span>
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
                      className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span>Meta Description</span>
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
                      className="mt-2 min-h-[80px] w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span>Meta Keywords</span>
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
                      className="mt-2 min-h-[60px] w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Photo Library */}
      <section className="space-y-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Photo Library</h2>
          <p className="mt-2 text-sm text-black/60">
            Add photos from the library to this page.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {availablePhotos.length === 0 && (
            <p className="text-sm text-black/50">All photos are already on this page.</p>
          )}
          {availablePhotos.map((photo) => (
            <div
              key={photo.id}
              className="rounded-2xl border border-black/10 bg-white/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-black/5">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <span className="text-sm text-black/60 truncate">{photo.alt || 'Untitled'}</span>
                </div>
                
                {/* Desktop buttons - hidden on medium and smaller screens */}
                <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePhotoDetails(photo.id)}
                    className="rounded-full border border-black/20 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-black/40 hover:text-black/70"
                  >
                    {expandedPhotoId === photo.id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addToGallery(photo.id)}
                    className="rounded-full border border-black/20 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-black/60 hover:text-black"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="rounded-full border border-black/20 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>

                {/* Mobile/tablet dropdown - visible on medium and smaller screens */}
                <div ref={openMenuId === photo.id ? menuRef : undefined} className="relative lg:hidden flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === photo.id ? null : photo.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-black/20 text-black/50 hover:text-black/80"
                    aria-label="Actions"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </button>
                  {openMenuId === photo.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-xl border border-black/10 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          togglePhotoDetails(photo.id);
                          setOpenMenuId(null);
                        }}
                        className="block w-full px-4 py-2 text-left text-xs uppercase tracking-wider text-black/60 hover:bg-black/5"
                      >
                        {expandedPhotoId === photo.id ? 'Close' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addToGallery(photo.id);
                          setOpenMenuId(null);
                        }}
                        className="block w-full px-4 py-2 text-left text-xs uppercase tracking-wider text-black/60 hover:bg-black/5"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(photo.id);
                          setOpenMenuId(null);
                        }}
                        className="block w-full px-4 py-2 text-left text-xs uppercase tracking-wider text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {expandedPhotoId === photo.id && (
                <div className="mt-4 space-y-3 text-xs text-black/60">
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span>Alt Text</span>
                      <AiFixButton
                        onClick={() => handleAiFixPhoto(photo.id, 'alt', 'text')}
                        disabled={isAiBusy}
                      />
                    </div>
                    <input
                      value={photo.alt || ''}
                      onChange={(event) => updatePhotoField(photo.id, 'alt', event.target.value)}
                      className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span>Meta Title</span>
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
                      className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span>Meta Description</span>
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
                      className="mt-2 min-h-[80px] w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span>Meta Keywords</span>
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
                      className="mt-2 min-h-[60px] w-full rounded-xl border border-black/20 px-3 py-2 text-xs"
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
