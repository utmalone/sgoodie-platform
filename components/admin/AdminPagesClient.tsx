'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { PageContent, PageSlug, PhotoAsset, HomeLayout, AboutPageContent, ContactPageContent } from '@/types';
import { pageLabels, pageOrder } from '@/lib/admin/page-config';
import { loadDraftPages, saveDraftPages } from '@/lib/admin/draft-store';
import { loadDraftHomeLayout, saveDraftHomeLayout } from '@/lib/admin/draft-home-layout-store';
import { loadDraftAboutContent, saveDraftAboutContent } from '@/lib/admin/draft-about-store';
import { loadDraftContactContent, saveDraftContactContent } from '@/lib/admin/draft-contact-store';
import { loadAiModel } from '@/lib/admin/ai-model';
import { getApiErrorMessage } from '@/lib/admin/api-error';
import { AiFixButton } from '@/components/admin/AiFixButton';
import { FieldInfoTooltip } from '@/components/admin/FieldInfoTooltip';
import { useSave } from '@/lib/admin/save-context';
import { usePreview } from '@/lib/admin/preview-context';
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
  gallery: [],
  metaTitle: '',
  metaDescription: '',
  metaKeywords: ''
};

const emptyHomeLayout: HomeLayout = {
  heroPhotoId: '',
  featurePhotoIds: [],
  introText: ''
};

const pageFieldHelp = {
  title: [
    'Main headline for this page.',
    'Example: About S.Goodie Studio.'
  ],
  intro: [
    'Short opening paragraph near the top of the page.',
    'Example: We craft visual stories for boutique hotels.'
  ],
  metaTitle: [
    'SEO title shown in search results. Keep around 50-60 characters.',
    'Example: About S.Goodie Studio | Hotel Photography.'
  ],
  metaDescription: [
    'SEO summary shown in search results. Aim for 140-160 characters.',
    'Example: Meet S.Goodie Studio, a boutique hotel photography team based in DC.'
  ],
  metaKeywords: [
    'Comma-separated keywords (optional).',
    'Example: hotel photography, boutique hotels, hospitality branding.'
  ]
};

const homeLayoutFieldHelp = {
  introText: [
    'Short statement shown on the home page above the gallery grid.',
    'Example: Creating photographs that not only document spaces...'
  ]
};

const aboutFieldHelp = {
  heroTitle: ['Large headline shown on the About page hero.'],
  heroSubtitle: ['Short subtitle shown under the About hero title.'],
  introParagraphs: ['Intro paragraphs shown under the hero photo (one paragraph per block).'],
  approachTitle: ['Heading for the approach/results section.'],
  approachItems: ['Cards displayed in the approach section (title + description).', 'Add your photos in the photo section first.'],
  featuredTitle: ['Heading for the publications list.'],
  featuredPublications: ['List of publications (one per line).'],
  bioName: ['Name used in the bio section heading (e.g., \"S.Goodie\").'],
  bioParagraphs: ['Bio paragraphs shown next to the bio photo (one paragraph per block).']
};

const aboutSectionHelp = {
  hero: [
    'This is the large photo at the top of the About page.',
    'Your Hero Title + Hero Subtitle appear centered on the image.'
  ],
  intro: [
    'These paragraphs sit directly under the hero image.',
    'Tip: the 2nd paragraph is visually emphasized on the site.'
  ],
  approach: [
    'A 3-card grid (each card has a photo, title, and description).',
    'Use short titles and keep descriptions concise.'
  ],
  featured: [
    'Two-column list of publications under the “Featured In” heading.',
    'Add one publication per line.'
  ],
  bio: [
    'Photo + bio text near the bottom of the About page.',
    'The “Name” field is used in the “About {Name}” heading.'
  ]
};

const contactFieldHelp = {
  heroTitle: ['Large headline shown on the Contact page hero.'],
  heroSubtitle: ['Short subtitle shown under the Contact hero title.'],
  sectionTitle: ['Heading above the contact form/details.'],
  introParagraph: ['Intro paragraph shown above the contact details.'],
  companyName: ['Company/studio name shown above email/phone.'],
  email: ['Email address shown on the contact page (mailto link).'],
  phone: ['Phone number shown on the contact page.'],
  instagramHandle: ['Handle used for the Instagram feed component.'],
  instagramUrl: ['Instagram profile URL.'],
  linkedinUrl: ['LinkedIn profile URL.']
};

const contactSectionHelp = {
  hero: [
    'This is the large photo at the top of the Contact page.',
    'Your Hero Title + Hero Subtitle appear centered on the image.'
  ],
  getInTouch: [
    'This block appears next to the contact form.',
    'It includes a section title, intro paragraph, contact details, and social icons.'
  ]
};

type ExtendedSlug = PageSlug | `portfolio-${PortfolioCategory}`;

function getPage(pages: PageContent[], slug: string) {
  return pages.find((page) => page.slug === slug) ?? { ...emptyPage, slug };
}

function isEqualPage(a: PageContent, b: PageContent) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pickAboutText(content: AboutPageContent) {
  return {
    heroTitle: content.heroTitle,
    heroSubtitle: content.heroSubtitle,
    introParagraphs: content.introParagraphs,
    approachTitle: content.approachTitle,
    approachItems: (content.approachItems || []).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description
    })),
    featuredTitle: content.featuredTitle,
    featuredPublications: content.featuredPublications,
    bio: {
      name: content.bio?.name,
      paragraphs: content.bio?.paragraphs
    }
  };
}

function pickContactText(content: ContactPageContent) {
  return {
    heroTitle: content.heroTitle,
    heroSubtitle: content.heroSubtitle,
    sectionTitle: content.sectionTitle,
    introParagraph: content.introParagraph,
    companyName: content.companyName,
    email: content.email,
    phone: content.phone,
    instagramUrl: content.instagramUrl,
    linkedinUrl: content.linkedinUrl,
    instagramHandle: content.instagramHandle
  };
}

type PageLayouts = {
  home: HomeLayout | null;
  about: AboutPageContent | null;
  contact: ContactPageContent | null;
};

export function AdminPagesClient() {
  const { registerChange, unregisterChange } = useSave();
  const { refreshPreview, openPreview } = usePreview();
  const [savedPages, setSavedPages] = useState<PageContent[]>([]);
  const [draftPages, setDraftPages] = useState<PageContent[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [layouts, setLayouts] = useState<PageLayouts>({ home: null, about: null, contact: null });
  const [savedHomeLayout, setSavedHomeLayout] = useState<HomeLayout | null>(null);
  const [savedAboutLayout, setSavedAboutLayout] = useState<AboutPageContent | null>(null);
  const [savedContactLayout, setSavedContactLayout] = useState<ContactPageContent | null>(null);
  const [activeMainSlug, setActiveMainSlug] = useState<PageSlug>('home');
  const [activePortfolioCategory, setActivePortfolioCategory] = useState<PortfolioCategory>('hotels');
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);
  const [aiResultKey, setAiResultKey] = useState<string | null>(null);
  const [aiResultSuccess, setAiResultSuccess] = useState(false);
  const aiResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const isHomeIntroTextDirty = useMemo(() => {
    const current = layouts.home?.introText ?? '';
    const saved = savedHomeLayout?.introText ?? '';
    return current !== saved;
  }, [layouts.home?.introText, savedHomeLayout?.introText]);

  const isAboutTextDirty = useMemo(() => {
    if (!layouts.about || !savedAboutLayout) return false;
    return JSON.stringify(pickAboutText(layouts.about)) !== JSON.stringify(pickAboutText(savedAboutLayout));
  }, [layouts.about, savedAboutLayout]);

  const isContactTextDirty = useMemo(() => {
    if (!layouts.contact || !savedContactLayout) return false;
    return JSON.stringify(pickContactText(layouts.contact)) !== JSON.stringify(pickContactText(savedContactLayout));
  }, [layouts.contact, savedContactLayout]);

  const hasUnsavedChanges = isDirty || isHomeIntroTextDirty || isAboutTextDirty || isContactTextDirty;

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
      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [activePage, refreshPreview]);

  const saveHomeLayout = useCallback(async (): Promise<boolean> => {
    const introText = layouts.home?.introText ?? '';

    try {
      const response = await fetch('/api/admin/layouts/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ introText })
      });

      if (!response.ok) return false;
      const updated = (await response.json()) as HomeLayout;

      setSavedHomeLayout(updated);
      setLayouts((prev) => ({ ...prev, home: updated }));
      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [layouts.home?.introText, refreshPreview]);

  const saveAboutLayout = useCallback(async (): Promise<boolean> => {
    if (!layouts.about) return true;

    try {
      // Fetch latest so we don't stomp photo IDs/ordering coming from the Photos tab.
      const latestRes = await fetch('/api/admin/layouts/about');
      if (!latestRes.ok) return false;
      const latest = (await latestRes.json()) as AboutPageContent;

      const currentText = pickAboutText(layouts.about);
      const currentApproachById = new Map(
        (currentText.approachItems || []).map((item) => [item.id, item])
      );

      const merged: AboutPageContent = {
        ...latest,
        heroTitle: currentText.heroTitle,
        heroSubtitle: currentText.heroSubtitle,
        introParagraphs: currentText.introParagraphs ?? [],
        approachTitle: currentText.approachTitle,
        approachItems: (latest.approachItems || []).map((item) => {
          const match = currentApproachById.get(item.id);
          if (!match) return item;
          return {
            ...item,
            title: match.title,
            description: match.description
          };
        }),
        featuredTitle: currentText.featuredTitle,
        featuredPublications: currentText.featuredPublications ?? [],
        bio: {
          ...latest.bio,
          name: currentText.bio?.name || latest.bio?.name || '',
          paragraphs: currentText.bio?.paragraphs ?? latest.bio?.paragraphs ?? []
        }
      };

      const response = await fetch('/api/admin/layouts/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });

      if (!response.ok) return false;
      const updated = (await response.json()) as AboutPageContent;

      setSavedAboutLayout(updated);
      setLayouts((prev) => ({ ...prev, about: updated }));
      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [layouts.about, refreshPreview]);

  const saveContactLayout = useCallback(async (): Promise<boolean> => {
    if (!layouts.contact) return true;

    try {
      const latestRes = await fetch('/api/admin/layouts/contact');
      if (!latestRes.ok) return false;
      const latest = (await latestRes.json()) as ContactPageContent;

      const merged: ContactPageContent = {
        ...latest,
        ...pickContactText(layouts.contact),
        heroPhotoId: latest.heroPhotoId
      };

      const response = await fetch('/api/admin/layouts/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });

      if (!response.ok) return false;
      const updated = (await response.json()) as ContactPageContent;

      setSavedContactLayout(updated);
      setLayouts((prev) => ({ ...prev, contact: updated }));
      refreshPreview();
      return true;
    } catch {
      return false;
    }
  }, [layouts.contact, refreshPreview]);

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

  useEffect(() => {
    const changeId = 'layout-home';
    if (isHomeIntroTextDirty && !isLoading) {
      registerChange({
        id: changeId,
        type: 'layout',
        save: saveHomeLayout
      });
    } else {
      unregisterChange(changeId);
    }

    return () => {
      unregisterChange(changeId);
    };
  }, [isHomeIntroTextDirty, isLoading, registerChange, unregisterChange, saveHomeLayout]);

  useEffect(() => {
    const changeId = 'layout-about';
    if (isAboutTextDirty && !isLoading) {
      registerChange({
        id: changeId,
        type: 'layout',
        save: saveAboutLayout
      });
    } else {
      unregisterChange(changeId);
    }

    return () => {
      unregisterChange(changeId);
    };
  }, [isAboutTextDirty, isLoading, registerChange, unregisterChange, saveAboutLayout]);

  useEffect(() => {
    const changeId = 'layout-contact';
    if (isContactTextDirty && !isLoading) {
      registerChange({
        id: changeId,
        type: 'layout',
        save: saveContactLayout
      });
    } else {
      unregisterChange(changeId);
    }

    return () => {
      unregisterChange(changeId);
    };
  }, [isContactTextDirty, isLoading, registerChange, unregisterChange, saveContactLayout]);

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
      setSavedHomeLayout(homeData);
      setSavedAboutLayout(aboutData);
      setSavedContactLayout(contactData);

      const draftHomeLayout = loadDraftHomeLayout();
      const initialHomeLayout = homeData
        ? { ...homeData, ...draftHomeLayout }
        : draftHomeLayout
          ? { ...emptyHomeLayout, ...draftHomeLayout }
          : null;

      const draftAbout = loadDraftAboutContent();
      const initialAboutLayout =
        aboutData && draftAbout
          ? {
              ...aboutData,
              ...(draftAbout.heroTitle ? { heroTitle: draftAbout.heroTitle } : null),
              ...(draftAbout.heroSubtitle ? { heroSubtitle: draftAbout.heroSubtitle } : null),
              ...(draftAbout.introParagraphs ? { introParagraphs: draftAbout.introParagraphs } : null),
              ...(draftAbout.approachTitle ? { approachTitle: draftAbout.approachTitle } : null),
              ...(draftAbout.featuredTitle ? { featuredTitle: draftAbout.featuredTitle } : null),
              ...(draftAbout.featuredPublications
                ? { featuredPublications: draftAbout.featuredPublications }
                : null),
              ...(draftAbout.bio
                ? {
                    bio: {
                      ...aboutData.bio,
                      ...(draftAbout.bio.name ? { name: draftAbout.bio.name } : null),
                      ...(draftAbout.bio.paragraphs ? { paragraphs: draftAbout.bio.paragraphs } : null)
                    }
                  }
                : null),
              ...(draftAbout.approachItems
                ? {
                    approachItems: aboutData.approachItems.map((item) => {
                      const match = draftAbout.approachItems?.find(
                        (draftItem) => draftItem.id === item.id
                      );
                      if (!match) return item;
                      return {
                        ...item,
                        title: match.title,
                        description: match.description
                      };
                    })
                  }
                : null)
            }
          : aboutData;

      const draftContact = loadDraftContactContent();
      const initialContactLayout =
        contactData && draftContact ? { ...contactData, ...draftContact } : contactData;

      setLayouts({
        home: initialHomeLayout,
        about: initialAboutLayout,
        contact: initialContactLayout
      });

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

  const homeIntroText = layouts.home?.introText;

  useEffect(() => {
    if (isLoading) return;
    if (typeof homeIntroText !== 'string') return;
    saveDraftHomeLayout({ introText: homeIntroText });
  }, [homeIntroText, isLoading]);

  const aboutDraftSnapshot = useMemo(() => {
    if (!layouts.about) return null;
    return {
      heroTitle: layouts.about.heroTitle,
      heroSubtitle: layouts.about.heroSubtitle,
      introParagraphs: layouts.about.introParagraphs,
      approachTitle: layouts.about.approachTitle,
      approachItems: (layouts.about.approachItems || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description
      })),
      featuredTitle: layouts.about.featuredTitle,
      featuredPublications: layouts.about.featuredPublications,
      bio: {
        name: layouts.about.bio?.name,
        paragraphs: layouts.about.bio?.paragraphs
      }
    };
  }, [layouts.about]);

  useEffect(() => {
    if (isLoading) return;
    if (!aboutDraftSnapshot) return;
    saveDraftAboutContent(aboutDraftSnapshot);
  }, [aboutDraftSnapshot, isLoading]);

  const contactDraftSnapshot = useMemo(() => {
    if (!layouts.contact) return null;
    return pickContactText(layouts.contact);
  }, [layouts.contact]);

  useEffect(() => {
    if (isLoading) return;
    if (!contactDraftSnapshot) return;
    saveDraftContactContent(contactDraftSnapshot);
  }, [contactDraftSnapshot, isLoading]);

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

  function updateHomeLayoutField<K extends keyof HomeLayout>(field: K, value: HomeLayout[K]) {
    setLayouts((prev) => {
      const home = prev.home ?? emptyHomeLayout;
      return {
        ...prev,
        home: {
          ...home,
          [field]: value
        } as HomeLayout
      };
    });
  }

  function updateAboutField<K extends keyof AboutPageContent>(field: K, value: AboutPageContent[K]) {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      return {
        ...prev,
        about: {
          ...prev.about,
          [field]: value
        } as AboutPageContent
      };
    });
  }

  function updateAboutIntroParagraph(index: number, value: string) {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      const next = [...(prev.about.introParagraphs || [])];
      next[index] = value;
      return { ...prev, about: { ...prev.about, introParagraphs: next } };
    });
  }

  function addAboutIntroParagraph() {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      return {
        ...prev,
        about: {
          ...prev.about,
          introParagraphs: [...(prev.about.introParagraphs || []), '']
        }
      };
    });
  }

  function removeAboutIntroParagraph(index: number) {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      const next = (prev.about.introParagraphs || []).filter((_, i) => i !== index);
      return { ...prev, about: { ...prev.about, introParagraphs: next } };
    });
  }

  function updateApproachItemText(itemId: string, field: 'title' | 'description', value: string) {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      const nextItems = (prev.about.approachItems || []).map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      );
      return { ...prev, about: { ...prev.about, approachItems: nextItems } };
    });
  }

  function updateFeaturedPublication(index: number, value: string) {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      const next = [...(prev.about.featuredPublications || [])];
      next[index] = value;
      return { ...prev, about: { ...prev.about, featuredPublications: next } };
    });
  }

  function addFeaturedPublication() {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      return {
        ...prev,
        about: {
          ...prev.about,
          featuredPublications: [...(prev.about.featuredPublications || []), '']
        }
      };
    });
  }

  function removeFeaturedPublication(index: number) {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      const next = (prev.about.featuredPublications || []).filter((_, i) => i !== index);
      return { ...prev, about: { ...prev.about, featuredPublications: next } };
    });
  }

  function updateBioParagraph(index: number, value: string) {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      const next = [...(prev.about.bio?.paragraphs || [])];
      next[index] = value;
      return {
        ...prev,
        about: {
          ...prev.about,
          bio: {
            ...prev.about.bio,
            paragraphs: next
          }
        }
      };
    });
  }

  function addBioParagraph() {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      return {
        ...prev,
        about: {
          ...prev.about,
          bio: {
            ...prev.about.bio,
            paragraphs: [...(prev.about.bio?.paragraphs || []), '']
          }
        }
      };
    });
  }

  function removeBioParagraph(index: number) {
    setLayouts((prev) => {
      if (!prev.about) return prev;
      const next = (prev.about.bio?.paragraphs || []).filter((_, i) => i !== index);
      return {
        ...prev,
        about: {
          ...prev.about,
          bio: {
            ...prev.about.bio,
            paragraphs: next
          }
        }
      };
    });
  }

  function updateContactField<K extends keyof ContactPageContent>(field: K, value: ContactPageContent[K]) {
    setLayouts((prev) => {
      if (!prev.contact) return prev;
      return {
        ...prev,
        contact: {
          ...prev.contact,
          [field]: value
        } as ContactPageContent
      };
    });
  }

  type AiMode = 'text' | 'seo';

  async function runAiFixRequest(args: {
    key: string;
    mode: AiMode;
    field: string;
    input: string;
    context: Record<string, unknown>;
    apply: (output: string) => void;
  }) {
    if (aiLoadingKey) return;
    setAiLoadingKey(args.key);
    setAiStatus('Optimizing with AI...');

    try {
      const model = loadAiModel();
      const response = await fetch('/api/admin/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: args.mode,
          target: 'page',
          field: args.field,
          input: args.input || '',
          model,
          context: args.context
        })
      });

      if (!response.ok) {
        const message = await getApiErrorMessage(response, 'AI request failed.');
        setAiStatus(message);
        setAiResult(args.key, false);
        return;
      }

      const data = (await response.json()) as { output?: string };
      if (data.output) {
        args.apply(data.output);
        setAiStatus('AI update complete.');
        setAiResult(args.key, true);
      } else {
        setAiStatus('AI did not return a result.');
        setAiResult(args.key, false);
      }
    } catch {
      setAiStatus('AI request failed.');
      setAiResult(args.key, false);
    } finally {
      setAiLoadingKey(null);
    }
  }

  function getAiPageContext() {
    return {
      page: activePage,
      photos: []
    } satisfies Record<string, unknown>;
  }

  async function handleAiFixPage(
    field: 'title' | 'intro' | 'metaTitle' | 'metaDescription' | 'metaKeywords',
    mode: AiMode
  ) {
    await runAiFixRequest({
      key: `page-${field}`,
      mode,
      field: `page.${field}`,
      input: String(activePage[field] || ''),
      context: getAiPageContext(),
      apply: (output) => updateField(field, output)
    });
  }

  async function handleAiFixHomeLayout(field: 'introText') {
    const value = layouts.home?.[field] ?? '';
    await runAiFixRequest({
      key: 'homeLayout-introText',
      mode: 'text',
      field: `homeLayout.${field}`,
      input: String(value || ''),
      context: {
        page: getPage(draftPages, 'home'),
        homeLayout: { ...layouts.home }
      },
      apply: (output) => updateHomeLayoutField(field, output)
    });
  }

  async function handleAiFixAboutText(field: 'heroTitle' | 'heroSubtitle' | 'approachTitle' | 'featuredTitle') {
    if (!layouts.about) return;
    await runAiFixRequest({
      key: `about-${field}`,
      mode: 'text',
      field: `about.${field}`,
      input: String((layouts.about as AboutPageContent)[field] || ''),
      context: {
        page: getPage(draftPages, 'about'),
        about: pickAboutText(layouts.about)
      },
      apply: (output) => updateAboutField(field, output as AboutPageContent[typeof field])
    });
  }

  async function handleAiFixAboutIntroParagraph(index: number) {
    if (!layouts.about) return;
    const input = layouts.about.introParagraphs?.[index] ?? '';
    await runAiFixRequest({
      key: `about-introParagraph-${index}`,
      mode: 'text',
      field: `about.introParagraphs[${index}]`,
      input: String(input || ''),
      context: {
        page: getPage(draftPages, 'about'),
        about: pickAboutText(layouts.about)
      },
      apply: (output) => updateAboutIntroParagraph(index, output)
    });
  }

  async function handleAiFixApproachItem(itemId: string, field: 'title' | 'description') {
    if (!layouts.about) return;
    const item = (layouts.about.approachItems || []).find((candidate) => candidate.id === itemId);
    if (!item) return;
    await runAiFixRequest({
      key: `about-approachItem-${itemId}-${field}`,
      mode: 'text',
      field: `about.approachItems.${itemId}.${field}`,
      input: String(item[field] || ''),
      context: {
        page: getPage(draftPages, 'about'),
        about: pickAboutText(layouts.about),
        approachItem: { id: item.id, title: item.title, description: item.description }
      },
      apply: (output) => updateApproachItemText(itemId, field, output)
    });
  }

  async function handleAiFixBioName() {
    if (!layouts.about) return;
    const input = layouts.about.bio?.name ?? '';
    await runAiFixRequest({
      key: 'about-bioName',
      mode: 'text',
      field: 'about.bio.name',
      input: String(input || ''),
      context: {
        page: getPage(draftPages, 'about'),
        about: pickAboutText(layouts.about)
      },
      apply: (output) =>
        updateAboutField('bio', {
          ...layouts.about!.bio,
          name: output
        })
    });
  }

  async function handleAiFixBioParagraph(index: number) {
    if (!layouts.about) return;
    const input = layouts.about.bio?.paragraphs?.[index] ?? '';
    await runAiFixRequest({
      key: `about-bioParagraph-${index}`,
      mode: 'text',
      field: `about.bio.paragraphs[${index}]`,
      input: String(input || ''),
      context: {
        page: getPage(draftPages, 'about'),
        about: pickAboutText(layouts.about)
      },
      apply: (output) => updateBioParagraph(index, output)
    });
  }

  async function handleAiFixContactText(field: 'heroTitle' | 'heroSubtitle' | 'sectionTitle' | 'introParagraph' | 'companyName') {
    if (!layouts.contact) return;
    await runAiFixRequest({
      key: `contact-${field}`,
      mode: 'text',
      field: `contact.${field}`,
      input: String((layouts.contact as ContactPageContent)[field] || ''),
      context: {
        page: getPage(draftPages, 'contact'),
        contact: pickContactText(layouts.contact)
      },
      apply: (output) => updateContactField(field, output as ContactPageContent[typeof field])
    });
  }

  const showHeroSection = ['home', 'about', 'contact', 'journal'].includes(activeMainSlug);
  const showFeatureSection = activeMainSlug === 'home';
  const isPortfolioSelected = activeMainSlug === 'portfolio';
  const selectedPreviewPath = useMemo(() => {
    if (activeMainSlug === 'home') return '/';
    if (activeMainSlug === 'about') return '/about';
    if (activeMainSlug === 'contact') return '/contact';
    if (activeMainSlug === 'journal') return '/journal';
    if (activeMainSlug === 'portfolio') return `/portfolio/${activePortfolioCategory}`;
    return '/';
  }, [activeMainSlug, activePortfolioCategory]);

  const previewTabUrl = useMemo(() => {
    const sep = selectedPreviewPath.includes('?') ? '&' : '?';
    return `${selectedPreviewPath}${sep}preview=draft`;
  }, [selectedPreviewPath]);

  if (isLoading) {
    return <p className={styles.statusMessage}>Loading admin content...</p>;
  }

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
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => openPreview(selectedPreviewPath)}
            className={styles.btnSecondary}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => window.open(previewTabUrl, '_blank', 'noopener,noreferrer')}
            className={styles.btnSecondary}
          >
            Preview Tab
          </button>
        </div>
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
      {hasUnsavedChanges && <p className={styles.unsavedIndicator}>Unsaved changes</p>}

      {/* Page Copy Section */}
      {!isPortfolioSelected && (activeMainSlug === 'home' || activeMainSlug === 'journal') && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Page Copy</h2>
          <p className={styles.cardDescription}>
            Editing: {pageLabels[activeMainSlug]} page
          </p>
          <div className={styles.formGrid}>
            {['home', 'journal'].includes(activeMainSlug) && (
              <label className={`${styles.label} ${getAiFixRowClass('page-title')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    {activeMainSlug === 'journal' ? 'Hero Title' : 'Title'}
                    <FieldInfoTooltip
                      label={activeMainSlug === 'journal' ? 'Hero Title' : 'Title'}
                      lines={pageFieldHelp.title}
                      align="right"
                    />
                  </span>
                  <AiFixButton onClick={() => handleAiFixPage('title', 'text')} loading={aiLoadingKey === 'page-title'} />
                </div>
                <input
                  value={activePage.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  className={styles.input}
                />
              </label>
            )}
            {activeMainSlug === 'journal' && (
              <label className={`${styles.label} ${getAiFixRowClass('page-intro')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    Hero Subtitle
                    <FieldInfoTooltip
                      label="Hero Subtitle"
                      lines={[
                        'Short subtitle shown under the Journal hero title.',
                        'Example: Latest shoot stories.'
                      ]}
                      align="right"
                    />
                  </span>
                  <AiFixButton onClick={() => handleAiFixPage('intro', 'text')} loading={aiLoadingKey === 'page-intro'} />
                </div>
                <input
                  value={activePage.intro}
                  onChange={(event) => updateField('intro', event.target.value)}
                  className={styles.input}
                />
              </label>
            )}
            {activeMainSlug === 'home' && (
              <label className={`${styles.label} ${getAiFixRowClass('page-intro')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    Intro
                    <FieldInfoTooltip label="Intro" lines={pageFieldHelp.intro} />
                  </span>
                  <AiFixButton onClick={() => handleAiFixPage('intro', 'text')} loading={aiLoadingKey === 'page-intro'} />
                </div>
                <textarea
                  value={activePage.intro}
                  onChange={(event) => updateField('intro', event.target.value)}
                  className={styles.textarea}
                />
              </label>
            )}
            {activeMainSlug === 'home' && (
              <label className={`${styles.label} ${getAiFixRowClass('homeLayout-introText')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    Home Intro Statement
                    <FieldInfoTooltip label="Home Intro Statement" lines={homeLayoutFieldHelp.introText} />
                  </span>
                  <AiFixButton onClick={() => handleAiFixHomeLayout('introText')} loading={aiLoadingKey === 'homeLayout-introText'} />
                </div>
                <textarea
                  value={layouts.home?.introText || ''}
                  onChange={(event) => updateHomeLayoutField('introText', event.target.value)}
                  className={styles.textarea}
                  placeholder="Short statement shown above the homepage gallery grid."
                />
              </label>
            )}
          </div>
        </section>
      )}

      {/* About Page Content */}
      {activeMainSlug === 'about' && layouts.about && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>About Page Content</h2>
          <p className={styles.cardDescription}>
            Editing: structured About page text (hero, intro, approach, featured list, bio).
          </p>

          <div className={styles.formGrid}>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeadingRow}>
                <p className={styles.sectionLabel}>Hero</p>
                <FieldInfoTooltip
                  label="About Hero"
                  lines={aboutSectionHelp.hero}
                  align="right"
                  example={{ src: '/admin/examples/about-hero.svg', alt: 'About hero example' }}
                />
              </div>
              <div className={styles.formRow}>
                <label className={`${styles.label} ${getAiFixRowClass('about-heroTitle')}`}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.labelText}>
                      Hero Title
                      <FieldInfoTooltip label="Hero Title" lines={aboutFieldHelp.heroTitle} align="right" />
                    </span>
                    <AiFixButton onClick={() => handleAiFixAboutText('heroTitle')} loading={aiLoadingKey === 'about-heroTitle'} />
                  </div>
                  <input
                    value={layouts.about.heroTitle}
                    onChange={(event) => updateAboutField('heroTitle', event.target.value)}
                    className={styles.input}
                  />
                </label>
                <label className={`${styles.label} ${getAiFixRowClass('about-heroSubtitle')}`}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.labelText}>
                      Hero Subtitle
                      <FieldInfoTooltip label="Hero Subtitle" lines={aboutFieldHelp.heroSubtitle} align="right" />
                    </span>
                    <AiFixButton onClick={() => handleAiFixAboutText('heroSubtitle')} loading={aiLoadingKey === 'about-heroSubtitle'} />
                  </div>
                  <input
                    value={layouts.about.heroSubtitle}
                    onChange={(event) => updateAboutField('heroSubtitle', event.target.value)}
                    className={styles.input}
                  />
                </label>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeadingRow}>
                <p className={styles.sectionLabel}>Intro Paragraphs</p>
                <FieldInfoTooltip
                  label="About Intro"
                  lines={aboutSectionHelp.intro}
                  align="right"
                  example={{ src: '/admin/examples/about-intro.svg', alt: 'About intro example' }}
                />
              </div>
              <p className={styles.cardDescription}>{aboutFieldHelp.introParagraphs[0]}</p>
              <div className={styles.formGrid}>
                {(layouts.about.introParagraphs || []).map((paragraph, idx) => (
                  <div key={idx} className={`${styles.label} ${getAiFixRowClass(`about-introParagraph-${idx}`)}`}>
                    <div className={styles.fieldHeader}>
                      <span className={styles.labelText}>Paragraph {idx + 1}</span>
                      <div className={styles.actionsRow}>
                        <AiFixButton
                          onClick={() => handleAiFixAboutIntroParagraph(idx)}
                        />
                        <button
                          type="button"
                          onClick={() => removeAboutIntroParagraph(idx)}
                          className={styles.btnDanger}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={paragraph}
                      onChange={(event) => updateAboutIntroParagraph(idx, event.target.value)}
                      className={styles.textarea}
                    />
                  </div>
                ))}
                <button type="button" onClick={addAboutIntroParagraph} className={styles.btnSecondary}>
                  Add Paragraph
                </button>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeadingRow}>
                <p className={styles.sectionLabel}>Approach Section</p>
                <FieldInfoTooltip
                  label="Approach Section"
                  lines={aboutSectionHelp.approach}
                  align="right"
                  example={{ src: '/admin/examples/about-approach.svg', alt: 'About approach section example' }}
                />
              </div>
              <label className={`${styles.label} ${getAiFixRowClass('about-approachTitle')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    Section Title
                    <FieldInfoTooltip label="Approach Title" lines={aboutFieldHelp.approachTitle} align="right" />
                  </span>
                  <AiFixButton onClick={() => handleAiFixAboutText('approachTitle')} loading={aiLoadingKey === 'about-approachTitle'} />
                </div>
                <input
                  value={layouts.about.approachTitle}
                  onChange={(event) => updateAboutField('approachTitle', event.target.value)}
                  className={styles.input}
                />
              </label>
              <p className={styles.cardDescription}>{aboutFieldHelp.approachItems[0]}</p>
              <div className={styles.formGrid}>
                {(layouts.about.approachItems || []).map((item) => (
                  <div key={item.id} className={styles.card} style={{ padding: '1rem' }}>
                    <div className={styles.sectionHeadingRow}>
                      <p className={styles.sectionLabel}>Card</p>
                    </div>
                    <div className={styles.formRow}>
                      <label className={`${styles.label} ${getAiFixRowClass(`about-approachItem-${item.id}-title`)}`}>
                        <div className={styles.fieldHeader}>
                          <span className={styles.labelText}>Title</span>
                          <AiFixButton onClick={() => handleAiFixApproachItem(item.id, 'title')} loading={aiLoadingKey === `about-approachItem-${item.id}-title`} />
                        </div>
                        <input
                          value={item.title}
                          onChange={(event) => updateApproachItemText(item.id, 'title', event.target.value)}
                          className={styles.input}
                        />
                      </label>
                      <label className={`${styles.label} ${getAiFixRowClass(`about-approachItem-${item.id}-description`)}`}>
                        <div className={styles.fieldHeader}>
                          <span className={styles.labelText}>Description</span>
                          <AiFixButton onClick={() => handleAiFixApproachItem(item.id, 'description')} loading={aiLoadingKey === `about-approachItem-${item.id}-description`} />
                        </div>
                        <textarea
                          value={item.description}
                          onChange={(event) =>
                            updateApproachItemText(item.id, 'description', event.target.value)
                          }
                          className={styles.textarea}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeadingRow}>
                <p className={styles.sectionLabel}>Featured In</p>
                <FieldInfoTooltip
                  label="Featured In"
                  lines={aboutSectionHelp.featured}
                  align="right"
                  example={{ src: '/admin/examples/about-featured-in.svg', alt: 'Featured in list example' }}
                />
              </div>
              <label className={`${styles.label} ${getAiFixRowClass('about-featuredTitle')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    Section Title
                    <FieldInfoTooltip label="Featured Title" lines={aboutFieldHelp.featuredTitle} align="right" />
                  </span>
                  <AiFixButton onClick={() => handleAiFixAboutText('featuredTitle')} loading={aiLoadingKey === 'about-featuredTitle'} />
                </div>
                <input
                  value={layouts.about.featuredTitle}
                  onChange={(event) => updateAboutField('featuredTitle', event.target.value)}
                  className={styles.input}
                />
              </label>
              <p className={styles.cardDescription}>{aboutFieldHelp.featuredPublications[0]}</p>
              <div className={styles.formGrid}>
                {(layouts.about.featuredPublications || []).map((pub, idx) => (
                  <div key={idx} className={styles.label}>
                    <div className={styles.fieldHeader}>
                      <span className={styles.labelText}>Publication {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeFeaturedPublication(idx)}
                        className={styles.btnDanger}
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      value={pub}
                      onChange={(event) => updateFeaturedPublication(idx, event.target.value)}
                      className={styles.input}
                    />
                  </div>
                ))}
                <button type="button" onClick={addFeaturedPublication} className={styles.btnSecondary}>
                  Add Publication
                </button>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeadingRow}>
                <p className={styles.sectionLabel}>Bio</p>
                <FieldInfoTooltip
                  label="Bio Section"
                  lines={aboutSectionHelp.bio}
                  align="right"
                  example={{ src: '/admin/examples/about-bio.svg', alt: 'Bio section example' }}
                />
              </div>
              <label className={`${styles.label} ${getAiFixRowClass('about-bioName')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    Name
                    <FieldInfoTooltip label="Bio Name" lines={aboutFieldHelp.bioName} align="right" />
                  </span>
                  <AiFixButton onClick={handleAiFixBioName} loading={aiLoadingKey === 'about-bioName'} />
                </div>
                <input
                  value={layouts.about.bio?.name || ''}
                  onChange={(event) =>
                    updateAboutField('bio', {
                      ...layouts.about!.bio,
                      name: event.target.value
                    })
                  }
                  className={styles.input}
                />
              </label>

              <p className={styles.cardDescription}>{aboutFieldHelp.bioParagraphs[0]}</p>
              <div className={styles.formGrid}>
                {(layouts.about.bio?.paragraphs || []).map((paragraph, idx) => (
                  <div key={idx} className={`${styles.label} ${getAiFixRowClass(`about-bioParagraph-${idx}`)}`}>
                    <div className={styles.fieldHeader}>
                      <span className={styles.labelText}>Paragraph {idx + 1}</span>
                      <div className={styles.actionsRow}>
                        <AiFixButton onClick={() => handleAiFixBioParagraph(idx)} loading={aiLoadingKey === `about-bioParagraph-${idx}`} />
                        <button
                          type="button"
                          onClick={() => removeBioParagraph(idx)}
                          className={styles.btnDanger}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={paragraph}
                      onChange={(event) => updateBioParagraph(idx, event.target.value)}
                      className={styles.textarea}
                    />
                  </div>
                ))}
                <button type="button" onClick={addBioParagraph} className={styles.btnSecondary}>
                  Add Bio Paragraph
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Page Content */}
      {activeMainSlug === 'contact' && layouts.contact && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Contact Page Content</h2>
          <p className={styles.cardDescription}>
            Editing: structured Contact page text (hero, section heading, intro, contact details, social links).
          </p>

          <div className={styles.formGrid}>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeadingRow}>
                <p className={styles.sectionLabel}>Hero</p>
                <FieldInfoTooltip
                  label="Contact Hero"
                  lines={contactSectionHelp.hero}
                  align="right"
                  example={{ src: '/admin/examples/contact-hero.svg', alt: 'Contact hero example' }}
                />
              </div>
              <div className={styles.formRow}>
                <label className={`${styles.label} ${getAiFixRowClass('contact-heroTitle')}`}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.labelText}>
                      Hero Title
                      <FieldInfoTooltip label="Hero Title" lines={contactFieldHelp.heroTitle} align="right" />
                    </span>
                    <AiFixButton onClick={() => handleAiFixContactText('heroTitle')} loading={aiLoadingKey === 'contact-heroTitle'} />
                  </div>
                  <input
                    value={layouts.contact.heroTitle}
                    onChange={(event) => updateContactField('heroTitle', event.target.value)}
                    className={styles.input}
                  />
                </label>
                <label className={`${styles.label} ${getAiFixRowClass('contact-heroSubtitle')}`}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.labelText}>
                      Hero Subtitle
                      <FieldInfoTooltip label="Hero Subtitle" lines={contactFieldHelp.heroSubtitle} align="right" />
                    </span>
                    <AiFixButton onClick={() => handleAiFixContactText('heroSubtitle')} loading={aiLoadingKey === 'contact-heroSubtitle'} />
                  </div>
                  <input
                    value={layouts.contact.heroSubtitle}
                    onChange={(event) => updateContactField('heroSubtitle', event.target.value)}
                    className={styles.input}
                  />
                </label>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeadingRow}>
                <p className={styles.sectionLabel}>Get In Touch Block</p>
                <FieldInfoTooltip
                  label="Get In Touch"
                  lines={contactSectionHelp.getInTouch}
                  align="right"
                  example={{ src: '/admin/examples/contact-get-in-touch.svg', alt: 'Contact get in touch example' }}
                />
              </div>

              <label className={`${styles.label} ${getAiFixRowClass('contact-sectionTitle')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    Section Title
                    <FieldInfoTooltip label="Section Title" lines={contactFieldHelp.sectionTitle} align="right" />
                  </span>
                  <AiFixButton onClick={() => handleAiFixContactText('sectionTitle')} loading={aiLoadingKey === 'contact-sectionTitle'} />
                </div>
                <input
                  value={layouts.contact.sectionTitle}
                  onChange={(event) => updateContactField('sectionTitle', event.target.value)}
                  className={styles.input}
                />
              </label>
              <label className={`${styles.label} ${getAiFixRowClass('contact-introParagraph')}`}>
                <div className={styles.fieldHeader}>
                  <span className={styles.labelText}>
                    Intro Paragraph
                    <FieldInfoTooltip label="Intro Paragraph" lines={contactFieldHelp.introParagraph} align="right" />
                  </span>
                  <AiFixButton onClick={() => handleAiFixContactText('introParagraph')} loading={aiLoadingKey === 'contact-introParagraph'} />
                </div>
                <textarea
                  value={layouts.contact.introParagraph}
                  onChange={(event) => updateContactField('introParagraph', event.target.value)}
                  className={styles.textarea}
                />
              </label>

              <div className={styles.formRow}>
                <label className={`${styles.label} ${getAiFixRowClass('contact-companyName')}`}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.labelText}>
                      Company Name
                      <FieldInfoTooltip label="Company Name" lines={contactFieldHelp.companyName} align="right" />
                    </span>
                    <AiFixButton onClick={() => handleAiFixContactText('companyName')} loading={aiLoadingKey === 'contact-companyName'} />
                  </div>
                  <input
                    value={layouts.contact.companyName}
                    onChange={(event) => updateContactField('companyName', event.target.value)}
                    className={styles.input}
                  />
                </label>
                <label className={styles.label}>
                  <span className={styles.labelText}>
                    Email
                    <FieldInfoTooltip label="Email" lines={contactFieldHelp.email} align="right" />
                  </span>
                  <input
                    value={layouts.contact.email}
                    onChange={(event) => updateContactField('email', event.target.value)}
                    className={styles.input}
                  />
                </label>
              </div>
              <div className={styles.formRow}>
                <label className={styles.label}>
                  <span className={styles.labelText}>
                    Phone
                    <FieldInfoTooltip label="Phone" lines={contactFieldHelp.phone} align="right" />
                  </span>
                  <input
                    value={layouts.contact.phone}
                    onChange={(event) => updateContactField('phone', event.target.value)}
                    className={styles.input}
                  />
                </label>
                <label className={styles.label}>
                  <span className={styles.labelText}>
                    Instagram Handle
                    <FieldInfoTooltip label="Instagram Handle" lines={contactFieldHelp.instagramHandle} align="right" />
                  </span>
                  <input
                    value={layouts.contact.instagramHandle}
                    onChange={(event) => updateContactField('instagramHandle', event.target.value)}
                    className={styles.input}
                  />
                </label>
              </div>

              <div className={styles.sectionHeadingRow} style={{ marginTop: '0.75rem' }}>
                <p className={styles.sectionLabel}>Social Links</p>
              </div>
              <div className={styles.formRow}>
                <label className={styles.label}>
                  <span className={styles.labelText}>
                    Instagram URL
                    <FieldInfoTooltip label="Instagram URL" lines={contactFieldHelp.instagramUrl} align="right" />
                  </span>
                  <input
                    value={layouts.contact.instagramUrl}
                    onChange={(event) => updateContactField('instagramUrl', event.target.value)}
                    className={styles.input}
                  />
                </label>
                <label className={styles.label}>
                  <span className={styles.labelText}>
                    LinkedIn URL
                    <FieldInfoTooltip label="LinkedIn URL" lines={contactFieldHelp.linkedinUrl} align="right" />
                  </span>
                  <input
                    value={layouts.contact.linkedinUrl}
                    onChange={(event) => updateContactField('linkedinUrl', event.target.value)}
                    className={styles.input}
                  />
                </label>
              </div>
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
            <label className={`${styles.label} ${getAiFixRowClass('page-title')}`}>
              <div className={styles.fieldHeader}>
                <span className={styles.labelText}>
                  Title
                  <FieldInfoTooltip label="Title" lines={pageFieldHelp.title} />
                </span>
                <AiFixButton onClick={() => handleAiFixPage('title', 'text')} loading={aiLoadingKey === 'page-title'} />
              </div>
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
          <label className={`${styles.label} ${getAiFixRowClass('page-metaTitle')}`}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>
                Meta Title
                <FieldInfoTooltip label="Meta Title" lines={pageFieldHelp.metaTitle} />
              </span>
              <AiFixButton onClick={() => handleAiFixPage('metaTitle', 'seo')} loading={aiLoadingKey === 'page-metaTitle'} />
            </div>
            <input
              value={activePage.metaTitle || ''}
              onChange={(event) => updateField('metaTitle', event.target.value)}
              className={styles.input}
            />
          </label>
          <label className={`${styles.label} ${getAiFixRowClass('page-metaDescription')}`}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>
                Meta Description
                <FieldInfoTooltip label="Meta Description" lines={pageFieldHelp.metaDescription} />
              </span>
              <AiFixButton onClick={() => handleAiFixPage('metaDescription', 'seo')} loading={aiLoadingKey === 'page-metaDescription'} />
            </div>
            <textarea
              value={activePage.metaDescription || ''}
              onChange={(event) => updateField('metaDescription', event.target.value)}
              className={styles.textarea}
            />
          </label>
          <label className={`${styles.label} ${getAiFixRowClass('page-metaKeywords')}`}>
            <div className={styles.fieldHeader}>
              <span className={styles.labelText}>
                Meta Keywords
                <FieldInfoTooltip label="Meta Keywords" lines={pageFieldHelp.metaKeywords} />
              </span>
              <AiFixButton onClick={() => handleAiFixPage('metaKeywords', 'seo')} loading={aiLoadingKey === 'page-metaKeywords'} />
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
