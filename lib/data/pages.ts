import type { PageContent, PageSlug } from '@/types';
import { readJson, writeJson } from './local-store';

const PAGES_FILE = 'pages.json';

const fallbackPages: PageContent[] = [
  {
    slug: 'home',
    title: 'S.Goodie Photography',
    intro: 'Modern photography for interiors, travel, and brand storytelling.',
    body: 'Curated visuals designed to highlight space, light, and identity.',
    ctaLabel: 'View Portfolio',
    ctaUrl: '/work',
    gallery: [],
    metaTitle: '',
    metaDescription: '',
    metaKeywords: ''
  }
];

function assertMockMode() {
  if (process.env.USE_MOCK_DATA === 'true') return;
  throw new Error(
    'Page management is only implemented for local mock data right now. Set USE_MOCK_DATA=true.'
  );
}

export async function getAllPages(): Promise<PageContent[]> {
  assertMockMode();
  const pages = await readJson<PageContent[]>(PAGES_FILE, fallbackPages);
  return pages.map((page) => ({
    ...page,
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
    metaKeywords: page.metaKeywords ?? ''
  }));
}

export async function getPageBySlug(slug: PageSlug): Promise<PageContent> {
  const pages = await getAllPages();
  const page = pages.find((item) => item.slug === slug);

  if (!page) {
    return {
      slug,
      title: slug.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      intro: '',
      body: '',
      gallery: [],
      metaTitle: '',
      metaDescription: '',
      metaKeywords: ''
    };
  }

  return page;
}

export async function updatePage(updated: PageContent): Promise<PageContent> {
  assertMockMode();
  const pages = await getAllPages();
  const index = pages.findIndex((page) => page.slug === updated.slug);

  if (index >= 0) {
    pages[index] = updated;
  } else {
    pages.push(updated);
  }

  await writeJson(PAGES_FILE, pages);
  return updated;
}

export async function removePhotoFromPages(photoId: string) {
  assertMockMode();
  const pages = await getAllPages();
  const nextPages = pages.map((page) => ({
    ...page,
    gallery: page.gallery.filter((id) => id !== photoId)
  }));
  await writeJson(PAGES_FILE, nextPages);
}
