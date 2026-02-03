'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PageContent, PageSlug, PhotoAsset } from '@/types';
import { pageLabels, pageOrder } from '@/lib/admin/page-config';
import { loadDraftPages, saveDraftPages } from '@/lib/admin/draft-store';
import { loadAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { AiFixButton } from '@/components/admin/AiFixButton';

const emptyPage: PageContent = {
  slug: 'home',
  title: '',
  intro: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
  gallery: [],
  metaTitle: '',
  metaDescription: '',
  metaKeywords: ''
};

function getPage(pages: PageContent[], slug: PageSlug) {
  return pages.find((page) => page.slug === slug) ?? { ...emptyPage, slug };
}

export function AdminPhotosClient() {
  const [draftPages, setDraftPages] = useState<PageContent[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [savedPhotos, setSavedPhotos] = useState<PhotoAsset[]>([]);
  const [activeSlug, setActiveSlug] = useState<PageSlug>('home');
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadMetaTitle, setUploadMetaTitle] = useState('');
  const [uploadMetaDescription, setUploadMetaDescription] = useState('');
  const [uploadMetaKeywords, setUploadMetaKeywords] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);

  const activePage = useMemo(
    () => getPage(draftPages, activeSlug),
    [draftPages, activeSlug]
  );

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const savedPhotosById = useMemo(() => {
    return new Map(savedPhotos.map((photo) => [photo.id, photo]));
  }, [savedPhotos]);

  const galleryPhotos = useMemo(() => {
    return activePage.gallery
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }, [activePage.gallery, photosById]);

  const availablePhotos = useMemo(() => {
    const current = new Set(activePage.gallery);
    return photos.filter((photo) => !current.has(photo.id));
  }, [photos, activePage.gallery]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setStatus('');
      const [pagesRes, photosRes] = await Promise.all([
        fetch('/api/admin/pages'),
        fetch('/api/admin/photos')
      ]);

      if (!pagesRes.ok || !photosRes.ok) {
        setStatus('Unable to load admin content. Please refresh and try again.');
        setIsLoading(false);
        return;
      }

      const pagesData = (await pagesRes.json()) as PageContent[];
      const photosData = (await photosRes.json()) as PhotoAsset[];

      setPhotos(photosData);
      setSavedPhotos(photosData);

      const draft = loadDraftPages();
      const initialPages = draft ?? pagesData;
      setDraftPages(initialPages);

      const initialPage =
        initialPages.find((page) => page.slug === activeSlug) ?? initialPages[0];
      if (initialPage) {
        setActiveSlug(initialPage.slug);
      }
      setIsLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveDraftPages(draftPages);
    }
  }, [draftPages, isLoading]);

  function updateGallery(nextGallery: string[]) {
    setDraftPages((prev) =>
      prev.map((page) => (page.slug === activeSlug ? { ...page, gallery: nextGallery } : page))
    );
  }

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
          page: activePage,
          pageMeta: {
            metaTitle: activePage.metaTitle || '',
            metaDescription: activePage.metaDescription || '',
            metaKeywords: activePage.metaKeywords || ''
          },
          pageText: {
            intro: activePage.intro,
            body: activePage.body
          },
          photo: {
            id: photo.id,
            src: photo.src,
            alt: photo.alt,
            metaTitle: photo.metaTitle || '',
            metaDescription: photo.metaDescription || '',
            metaKeywords: photo.metaKeywords || ''
          },
          pagePhotos: galleryPhotos.map((item) => ({
            id: item.id,
            alt: item.alt,
            metaTitle: item.metaTitle || '',
            metaDescription: item.metaDescription || '',
            metaKeywords: item.metaKeywords || ''
          }))
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

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const next = [...activePage.gallery];
    const from = next.indexOf(draggedId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    updateGallery(next);
  }

  function removeFromGallery(photoId: string) {
    updateGallery(activePage.gallery.filter((id) => id !== photoId));
  }

  function addToGallery(photoId: string) {
    updateGallery([...activePage.gallery, photoId]);
  }

  async function handleSave() {
    setStatus('Saving...');
    const pageResponse = await fetch('/api/admin/pages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activePage)
    });

    if (!pageResponse.ok) {
      setStatus('Save failed while updating page order.');
      return;
    }

    const updatedPage = (await pageResponse.json()) as PageContent;
    setDraftPages((prev) =>
      prev.map((page) => (page.slug === updatedPage.slug ? updatedPage : page))
    );

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

    if (changedPhotos.length > 0) {
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
    }

    setSavedPhotos(photos);
    setStatus('Saved.');
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
    updateGallery([...activePage.gallery, photo.id]);
    setUploadAlt('');
    setUploadMetaTitle('');
    setUploadMetaDescription('');
    setUploadMetaKeywords('');
    setUploadFile(null);
    setStatus('Upload complete.');
  }

  async function handleDelete(photoId: string) {
    const response = await fetch(`/api/admin/photos/${photoId}`, { method: 'DELETE' });
    if (!response.ok) {
      setStatus('Delete failed. Please try again.');
      return;
    }
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    setSavedPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    updateGallery(activePage.gallery.filter((id) => id !== photoId));
  }

  if (isLoading) {
    return <p className="text-sm text-black/60">Loading admin content...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Photos</h1>
          <p className="mt-2 text-sm text-black/60">
            Assign photos to each page and drag to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full border border-black/20 bg-black px-5 py-2 text-xs uppercase tracking-[0.35em] text-white"
        >
          Save
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white/60 p-3">
        {pageOrder.map((slug) => (
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

      <section className="space-y-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Uploads</h2>
          <p className="mt-2 text-sm text-black/60">
            Upload new photos and they will be added to this page.
          </p>
        </div>

        <form onSubmit={handleUpload} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
              className="w-full rounded-2xl border border-black/20 px-4 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Alt text"
              value={uploadAlt}
              onChange={(event) => setUploadAlt(event.target.value)}
              className="w-full rounded-2xl border border-black/20 px-4 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Meta title"
              value={uploadMetaTitle}
              onChange={(event) => setUploadMetaTitle(event.target.value)}
              className="w-full rounded-2xl border border-black/20 px-4 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Meta keywords"
              value={uploadMetaKeywords}
              onChange={(event) => setUploadMetaKeywords(event.target.value)}
              className="w-full rounded-2xl border border-black/20 px-4 py-2 text-sm"
            />
            <textarea
              placeholder="Meta description"
              value={uploadMetaDescription}
              onChange={(event) => setUploadMetaDescription(event.target.value)}
              className="md:col-span-2 min-h-[80px] w-full rounded-2xl border border-black/20 px-4 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-full border border-black/20 bg-black px-5 py-2 text-xs uppercase tracking-[0.35em] text-white"
          >
            Upload
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Gallery Order</h2>
          <p className="mt-2 text-sm text-black/60">Drag and drop to reorder.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleryPhotos.length === 0 && (
            <p className="text-sm text-black/50">No photos yet for this page.</p>
          )}
          {galleryPhotos.map((photo) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => handleDragStart(photo.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(photo.id)}
              className="group rounded-2xl border border-black/10 bg-white p-3 shadow-sm"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
                <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
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

      <section className="space-y-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Photo Library</h2>
          <p className="mt-2 text-sm text-black/60">
            Add existing photos to this page or remove them entirely.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {availablePhotos.length === 0 && (
            <p className="text-sm text-black/50">All photos are already on this page.</p>
          )}
          {availablePhotos.map((photo) => (
            <div
              key={photo.id}
              className="rounded-2xl border border-black/10 bg-white/60 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-16 overflow-hidden rounded-xl bg-black/5">
                    <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
                  </div>
                  <span className="text-sm text-black/60">{photo.alt || 'Untitled photo'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePhotoDetails(photo.id)}
                    className="rounded-full border border-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-black/40 hover:text-black/70"
                  >
                    {expandedPhotoId === photo.id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => addToGallery(photo.id)}
                    className="rounded-full border border-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-black/60 hover:text-black"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="rounded-full border border-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-black/40 hover:text-black/70"
                  >
                    Delete
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
    </div>
  );
}
