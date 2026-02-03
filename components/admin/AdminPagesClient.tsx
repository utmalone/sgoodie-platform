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

function isEqualPage(a: PageContent, b: PageContent) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function AdminPagesClient() {
  const [savedPages, setSavedPages] = useState<PageContent[]>([]);
  const [draftPages, setDraftPages] = useState<PageContent[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [activeSlug, setActiveSlug] = useState<PageSlug>('home');
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activePage = useMemo(
    () => getPage(draftPages, activeSlug),
    [draftPages, activeSlug]
  );
  const savedPage = useMemo(
    () => getPage(savedPages, activeSlug),
    [savedPages, activeSlug]
  );
  const isDirty = useMemo(() => !isEqualPage(activePage, savedPage), [activePage, savedPage]);

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const galleryPhotos = useMemo(() => {
    return activePage.gallery
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }, [activePage.gallery, photosById]);

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

      setSavedPages(pagesData);
      setPhotos(photosData);

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

  async function handleSave() {
    setStatus('Saving...');
    const response = await fetch('/api/admin/pages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activePage)
    });

    if (!response.ok) {
      setStatus('Save failed. Please try again.');
      return;
    }

    const updated = (await response.json()) as PageContent;
    setSavedPages((prev) => prev.map((page) => (page.slug === updated.slug ? updated : page)));
    setDraftPages((prev) => prev.map((page) => (page.slug === updated.slug ? updated : page)));
    setStatus('Saved.');
  }

  function updateField(field: keyof PageContent, value: string) {
    setDraftPages((prev) =>
      prev.map((page) =>
        page.slug === activeSlug ? { ...page, [field]: value } : page
      )
    );
  }

  async function handleAiFix(
    field: 'intro' | 'body' | 'ctaLabel' | 'metaTitle' | 'metaDescription' | 'metaKeywords',
    mode: 'text' | 'seo'
  ) {
    if (isAiBusy) return;
    setIsAiBusy(true);
    setAiStatus('Optimizing with AI...');

    const model = loadAiModel();
    const response = await fetch('/api/admin/ai/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        target: 'page',
        field,
        input: (activePage[field] || '') as string,
        model,
        context: {
          page: activePage,
          pageText: [activePage.intro, activePage.body, activePage.ctaLabel].filter(Boolean).join('\n'),
          photos: galleryPhotos.map((photo) => ({
            id: photo.id,
            alt: photo.alt,
            src: photo.src,
            metaTitle: photo.metaTitle || '',
            metaDescription: photo.metaDescription || '',
            metaKeywords: photo.metaKeywords || ''
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
      updateField(field, data.output);
      setAiStatus('AI update complete.');
    } else {
      setAiStatus('AI did not return a result.');
    }

    setIsAiBusy(false);
  }

  if (isLoading) {
    return <p className="text-sm text-black/60">Loading admin content...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Pages</h1>
          <p className="mt-2 text-sm text-black/60">
            Edit text content only. Photo order is managed in Photos.
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
      {isDirty && <p className="text-xs uppercase tracking-[0.3em] text-black/40">Unsaved changes</p>}

      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Page Copy</h2>
        <div className="mt-4 grid gap-4">
          <label className="text-sm">
            <span className="text-black/60">Title</span>
            <input
              value={activePage.title}
              onChange={(event) => updateField('title', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Intro</span>
              <AiFixButton
                onClick={() => handleAiFix('intro', 'text')}
                disabled={isAiBusy}
              />
            </div>
            <textarea
              value={activePage.intro}
              onChange={(event) => updateField('intro', event.target.value)}
              className="mt-2 min-h-[80px] w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Body</span>
              <AiFixButton
                onClick={() => handleAiFix('body', 'text')}
                disabled={isAiBusy}
              />
            </div>
            <textarea
              value={activePage.body}
              onChange={(event) => updateField('body', event.target.value)}
              className="mt-2 min-h-[140px] w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-black/60">CTA Label</span>
                <AiFixButton
                  onClick={() => handleAiFix('ctaLabel', 'text')}
                  disabled={isAiBusy}
                />
              </div>
              <input
                value={activePage.ctaLabel || ''}
                onChange={(event) => updateField('ctaLabel', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-black/60">CTA URL</span>
              <input
                value={activePage.ctaUrl || ''}
                onChange={(event) => updateField('ctaUrl', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">SEO Metadata</h2>
          <p className="mt-2 text-sm text-black/60">
            Search metadata for this page. Use AI Fix to optimize with keywords.
          </p>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Meta Title</span>
              <AiFixButton
                onClick={() => handleAiFix('metaTitle', 'seo')}
                disabled={isAiBusy}
              />
            </div>
            <input
              value={activePage.metaTitle || ''}
              onChange={(event) => updateField('metaTitle', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Meta Description</span>
              <AiFixButton
                onClick={() => handleAiFix('metaDescription', 'seo')}
                disabled={isAiBusy}
              />
            </div>
            <textarea
              value={activePage.metaDescription || ''}
              onChange={(event) => updateField('metaDescription', event.target.value)}
              className="mt-2 min-h-[100px] w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-black/60">Meta Keywords</span>
              <AiFixButton
                onClick={() => handleAiFix('metaKeywords', 'seo')}
                disabled={isAiBusy}
              />
            </div>
            <textarea
              value={activePage.metaKeywords || ''}
              onChange={(event) => updateField('metaKeywords', event.target.value)}
              className="mt-2 min-h-[80px] w-full rounded-2xl border border-black/20 px-4 py-2"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Gallery Preview</h2>
          <p className="mt-2 text-sm text-black/60">
            Photo order is set in Photos. This is a read-only preview.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {galleryPhotos.length === 0 && (
            <p className="text-sm text-black/50">No photos assigned to this page yet.</p>
          )}
          {galleryPhotos.map((photo) => (
            <div key={photo.id} className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
                <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
              </div>
              <p className="mt-2 text-xs text-black/60">{photo.alt || 'Untitled photo'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
