'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { PageContent, PageSlug, PhotoAsset, HomeLayout, AboutPageContent, ContactPageContent } from '@/types';
import { pageLabels, pageOrder } from '@/lib/admin/page-config';
import { loadDraftPages, saveDraftPages } from '@/lib/admin/draft-store';
import { loadAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { AiFixButton } from '@/components/admin/AiFixButton';
import { useSave } from '@/lib/admin/save-context';
import {
  portfolioCategories,
  portfolioCategoryLabels,
  type PortfolioCategory
} from '@/lib/admin/portfolio-config';
import styles from '@/styles/admin/AdminShared.module.css';

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

type ExtendedSlug = PageSlug | `portfolio-${PortfolioCategory}`;

function getPage(pages: PageContent[], slug: string) {
  return pages.find((page) => page.slug === slug) ?? { ...emptyPage, slug };
}

function isEqualPage(a: PageContent, b: PageContent) {
  return JSON.stringify(a) === JSON.stringify(b);
}

type PageLayouts = {
  home: HomeLayout | null;
  about: AboutPageContent | null;
  contact: ContactPageContent | null;
};

export function AdminPagesClient() {
  const { registerChange, unregisterChange } = useSave();
  const [savedPages, setSavedPages] = useState<PageContent[]>([]);
  const [draftPages, setDraftPages] = useState<PageContent[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [layouts, setLayouts] = useState<PageLayouts>({ home: null, about: null, contact: null });
  const [activeMainSlug, setActiveMainSlug] = useState<PageSlug>('home');
  const [activePortfolioCategory, setActivePortfolioCategory] = useState<PortfolioCategory>('hotels');
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeSlug = useMemo<string>(() => {
    if (activeMainSlug === 'portfolio') {
      return `portfolio-${activePortfolioCategory}`;
    }
    return activeMainSlug;
  }, [activeMainSlug, activePortfolioCategory]);

  const activePage = useMemo(
    () => getPage(draftPages, activeSlug),
    [draftPages, activeSlug]
  );
  const savedPage = useMemo(
    () => getPage(savedPages, activeSlug),
    [savedPages, activeSlug]
  );
  const isDirty = useMemo(() => !isEqualPage(activePage, savedPage), [activePage, savedPage]);

  const savePage = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activePage)
      });
      if (!response.ok) return false;
      const updated = (await response.json()) as PageContent;
      
      setSavedPages((prev) => {
        const exists = prev.some((page) => page.slug === updated.slug);
        if (exists) {
          return prev.map((page) => (page.slug === updated.slug ? updated : page));
        }
        return [...prev, updated];
      });
      setDraftPages((prev) => {
        const exists = prev.some((page) => page.slug === updated.slug);
        if (exists) {
          return prev.map((page) => (page.slug === updated.slug ? updated : page));
        }
        return [...prev, updated];
      });
      return true;
    } catch {
      return false;
    }
  }, [activePage]);

  useEffect(() => {
    if (isDirty && !isLoading) {
      registerChange({
        id: `page-${activeSlug}`,
        type: 'page',
        save: savePage
      });
    } else {
      unregisterChange(`page-${activeSlug}`);
    }
  }, [isDirty, isLoading, activeSlug, registerChange, unregisterChange, savePage]);

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  const heroPhotoId = useMemo(() => {
    if (activeMainSlug === 'home') return layouts.home?.heroPhotoId || null;
    if (activeMainSlug === 'about') return layouts.about?.heroPhotoId || null;
    if (activeMainSlug === 'contact') return layouts.contact?.heroPhotoId || null;
    if (activeMainSlug === 'journal') return activePage.gallery[0] || null;
    return null;
  }, [activeMainSlug, layouts, activePage.gallery]);

  const heroPhoto = useMemo(() => {
    return heroPhotoId ? photosById.get(heroPhotoId) : null;
  }, [heroPhotoId, photosById]);

  const featurePhotos = useMemo(() => {
    if (activeMainSlug !== 'home' || !layouts.home?.featurePhotoIds) return [];
    return layouts.home.featurePhotoIds
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }, [activeMainSlug, layouts.home, photosById]);

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

      setSavedPages(pagesData);
      setPhotos(photosData);
      setLayouts({ home: homeData, about: aboutData, contact: contactData });

      const draft = loadDraftPages();
      let initialPages: PageContent[];
      
      if (draft) {
        const draftSlugs = new Set(draft.map((p) => p.slug));
        const newPages = pagesData.filter((p) => !draftSlugs.has(p.slug));
        initialPages = [...draft, ...newPages];
      } else {
        initialPages = pagesData;
      }
      
      setDraftPages(initialPages);
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
    
    setSavedPages((prev) => {
      const exists = prev.some((page) => page.slug === updated.slug);
      if (exists) {
        return prev.map((page) => (page.slug === updated.slug ? updated : page));
      }
      return [...prev, updated];
    });
    setDraftPages((prev) => {
      const exists = prev.some((page) => page.slug === updated.slug);
      if (exists) {
        return prev.map((page) => (page.slug === updated.slug ? updated : page));
      }
      return [...prev, updated];
    });
    setStatus('Saved.');
  }

  function updateField(field: keyof PageContent, value: string | string[]) {
    setDraftPages((prev) => {
      const exists = prev.some((page) => page.slug === activeSlug);
      if (exists) {
        return prev.map((page) =>
          page.slug === activeSlug ? { ...page, [field]: value } : page
        );
      }
      return [...prev, { ...emptyPage, slug: activeSlug, [field]: value }];
    });
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
          photos: []
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
    return <p className={styles.statusMessage}>Loading admin content...</p>;
  }

  const showHeroSection = ['home', 'about', 'contact', 'journal'].includes(activeMainSlug);
  const showFeatureSection = activeMainSlug === 'home';
  const isPortfolioSelected = activeMainSlug === 'portfolio';

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pages</h1>
          <p className={styles.pageDescription}>
            Edit page text and SEO metadata. Manage photos in the Photos tab.
          </p>
        </div>
        <button type="button" onClick={handleSave} className={styles.btnPrimary}>
          Save
        </button>
      </div>

      {/* Main Page Tabs */}
      <div className={styles.tabGroup}>
        {pageOrder.map((slug) => (
          <button
            key={slug}
            type="button"
            onClick={() => setActiveMainSlug(slug)}
            className={`${styles.tab} ${activeMainSlug === slug ? styles.tabActive : ''}`}
          >
            {pageLabels[slug]}
          </button>
        ))}
      </div>

      {/* Portfolio Category Tabs */}
      {isPortfolioSelected && (
        <div className={styles.subTabGroup}>
          {portfolioCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActivePortfolioCategory(category)}
              className={`${styles.subTab} ${activePortfolioCategory === category ? styles.subTabActive : ''}`}
            >
              {portfolioCategoryLabels[category]}
            </button>
          ))}
        </div>
      )}

      {status && <p className={styles.statusMessage}>{status}</p>}
      {aiStatus && <p className={styles.statusMessage}>{aiStatus}</p>}
      {isDirty && <p className={styles.unsavedIndicator}>Unsaved changes</p>}

      {/* Page Copy Section - Full version for non-portfolio pages */}
      {!isPortfolioSelected && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Page Copy</h2>
          <p className={styles.cardDescription}>
            Editing: {pageLabels[activeMainSlug]} page
          </p>
          <div className={styles.formGrid}>
            <label className={styles.label}>
              <span className={styles.labelText}>Title</span>
              <input
                value={activePage.title}
                onChange={(event) => updateField('title', event.target.value)}
                className={styles.input}
              />
            </label>
            <label className={styles.label}>
              <div className={styles.fieldHeader}>
                <span className={styles.labelText}>Intro</span>
                <AiFixButton onClick={() => handleAiFix('intro', 'text')} disabled={isAiBusy} />
              </div>
              <textarea
                value={activePage.intro}
                onChange={(event) => updateField('intro', event.target.value)}
                className={styles.textarea}
              />
            </label>
            <label className={styles.label}>
              <div className={styles.fieldHeader}>
                <span className={styles.labelText}>Body</span>
                <AiFixButton onClick={() => handleAiFix('body', 'text')} disabled={isAiBusy} />
              </div>
              <textarea
                value={activePage.body}
                onChange={(event) => updateField('body', event.target.value)}
                className={styles.textarea}
              />
            </label>
            <div className={styles.formRow}>
              <label className={styles.label}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>CTA Label</span>
                  <AiFixButton onClick={() => handleAiFix('ctaLabel', 'text')} disabled={isAiBusy} />
                </div>
                <input
                  value={activePage.ctaLabel || ''}
                  onChange={(event) => updateField('ctaLabel', event.target.value)}
                  className={styles.input}
                />
              </label>
              <label className={styles.label}>
                <span className={styles.labelText}>CTA URL</span>
                <input
                  value={activePage.ctaUrl || ''}
                  onChange={(event) => updateField('ctaUrl', event.target.value)}
                  className={styles.input}
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {/* Portfolio Title Section - Simplified for portfolio pages */}
      {isPortfolioSelected && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Page Title</h2>
          <p className={styles.cardDescription}>
            Title displayed on the {portfolioCategoryLabels[activePortfolioCategory]} category page.
          </p>
          <div className={styles.formGrid}>
            <label className={styles.label}>
              <span className={styles.labelText}>Title</span>
              <input
                value={activePage.title}
                onChange={(event) => updateField('title', event.target.value)}
                className={styles.input}
              />
            </label>
          </div>
        </section>
      )}

      {/* Portfolio Projects Quick Link */}
      {isPortfolioSelected && (
        <section className={styles.card}>
          <div className={styles.quickLinkCard}>
            <div>
              <h2 className={styles.cardTitle}>Portfolio Projects</h2>
              <p className={styles.cardDescription}>
                Add, edit, and reorder {portfolioCategoryLabels[activePortfolioCategory].toLowerCase()} projects.
              </p>
            </div>
            <Link href="/admin/portfolio" className={styles.btnSecondary}>
              Manage Projects
            </Link>
          </div>
        </section>
      )}

      {/* SEO Metadata Section */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>SEO Metadata</h2>
        <p className={styles.cardDescription}>
          Search metadata for this page. Use AI Fix to optimize with keywords.
        </p>
        <div className={styles.formGrid}>
          <label className={styles.label}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>Meta Title</span>
              <AiFixButton onClick={() => handleAiFix('metaTitle', 'seo')} disabled={isAiBusy} />
            </div>
            <input
              value={activePage.metaTitle || ''}
              onChange={(event) => updateField('metaTitle', event.target.value)}
              className={styles.input}
            />
          </label>
          <label className={styles.label}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>Meta Description</span>
              <AiFixButton onClick={() => handleAiFix('metaDescription', 'seo')} disabled={isAiBusy} />
            </div>
            <textarea
              value={activePage.metaDescription || ''}
              onChange={(event) => updateField('metaDescription', event.target.value)}
              className={styles.textarea}
            />
          </label>
          <label className={styles.label}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>Meta Keywords</span>
              <AiFixButton onClick={() => handleAiFix('metaKeywords', 'seo')} disabled={isAiBusy} />
            </div>
            <textarea
              value={activePage.metaKeywords || ''}
              onChange={(event) => updateField('metaKeywords', event.target.value)}
              className={styles.textarea}
            />
          </label>
        </div>
      </section>

      {/* Photo Preview Section */}
      {(showHeroSection || showFeatureSection) && !isPortfolioSelected && (
        <section className={styles.card}>
          <div className={styles.quickLinkCard}>
            <div>
              <h2 className={styles.cardTitle}>Page Photos</h2>
              <p className={styles.cardDescription}>
                Preview of photos on this page. Edit, reorder, and add photos in the Photos tab.
              </p>
            </div>
            <Link href="/admin/photos" className={styles.btnSecondary}>
              Manage Photos
            </Link>
          </div>
          
          {/* Hero Preview */}
          {showHeroSection && (
            <div className={styles.formGrid}>
              <p className={styles.sectionLabel}>Hero</p>
              {heroPhoto ? (
                <div className={styles.imagePreview}>
                  <Image
                    src={heroPhoto.src}
                    alt={heroPhoto.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
              ) : (
                <div className={styles.imagePreviewEmpty}>
                  <p className={styles.imagePreviewText}>No hero photo</p>
                </div>
              )}
            </div>
          )}

          {/* Feature Photos Preview (Home only) */}
          {showFeatureSection && featurePhotos.length > 0 && (
            <div className={styles.formGrid}>
              <p className={styles.sectionLabel}>Feature Photos</p>
              <div className={styles.featureGrid}>
                {featurePhotos.slice(0, 9).map((photo) => (
                  <div key={photo.id} className={styles.featureItem}>
                    <Image src={photo.src} alt={photo.alt} fill sizes="80px" />
                  </div>
                ))}
                {featurePhotos.length > 9 && (
                  <div className={styles.featureMore}>
                    <span className={styles.featureMoreText}>+{featurePhotos.length - 9}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
