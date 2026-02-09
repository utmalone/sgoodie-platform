import { unstable_cache } from 'next/cache';
import type { PageContent } from '@/types';
import { CacheTags } from '@/lib/cache-tags';
import { readJson, writeJson } from './local-store';
import { isMockMode, getAllItems, putItem, getItem } from './db';

const PAGES_FILE = 'pages.json';
const TABLE_NAME = 'pages';

// Multiple page-like documents share the `pages` DynamoDB table. `getAllPages()` should only return
// true PageContent entries (not home/about/contact layouts, profile, work index, etc.).
const RESERVED_SLUGS = new Set(['home-page', 'about-page', 'contact-page', 'site-profile', 'work-index']);

/**
 * Create a default empty page for a given slug
 */
function createDefaultPage(slug: string): PageContent {
  const title = slug
    .replace(/^portfolio-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    slug,
    title,
    intro: '',
    gallery: [],
    metaTitle: '',
    metaDescription: '',
    metaKeywords: ''
  };
}

async function loadAllPages(): Promise<PageContent[]> {
  if (isMockMode()) {
    const pages = await readJson<PageContent[]>(PAGES_FILE);
    return pages
      .filter((page) => typeof page?.slug === 'string' && page.slug && !RESERVED_SLUGS.has(page.slug))
      .map((page) => ({
      slug: page.slug,
      title: page.title ?? '',
      intro: page.intro ?? '',
      gallery: Array.isArray(page.gallery) ? page.gallery : [],
      ...(page.heroTitleColor ? { heroTitleColor: page.heroTitleColor } : {}),
      ...(page.heroSubtitleColor ? { heroSubtitleColor: page.heroSubtitleColor } : {}),
      metaTitle: page.metaTitle ?? '',
      metaDescription: page.metaDescription ?? '',
      metaKeywords: page.metaKeywords ?? ''
    }));
  }

  // DynamoDB mode - return empty array if no data
  const pages = await getAllItems<PageContent>(TABLE_NAME);
  return pages
    .filter((page) => typeof page?.slug === 'string' && page.slug && !RESERVED_SLUGS.has(page.slug))
    .map((page) => ({
    slug: page.slug,
    title: page.title ?? '',
    intro: page.intro ?? '',
    gallery: Array.isArray(page.gallery) ? page.gallery : [],
    ...(page.heroTitleColor ? { heroTitleColor: page.heroTitleColor } : {}),
    ...(page.heroSubtitleColor ? { heroSubtitleColor: page.heroSubtitleColor } : {}),
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
    metaKeywords: page.metaKeywords ?? ''
  }));
}

const getAllPagesCached = unstable_cache(
  async (): Promise<PageContent[]> => {
    return loadAllPages();
  },
  ['pages'],
  { tags: [CacheTags.pages], revalidate: false }
);

export async function getAllPages(): Promise<PageContent[]> {
  return getAllPagesCached();
}

const getPageBySlugCached = unstable_cache(
  async (slug: string): Promise<PageContent> => {
    if (isMockMode()) {
      const pages = await loadAllPages();
      const page = pages.find((item) => item.slug === slug);
      return page || createDefaultPage(slug);
    }

    // DynamoDB mode
    const page = await getItem<PageContent>(TABLE_NAME, { slug });
    return page || createDefaultPage(slug);
  },
  ['page-by-slug'],
  { tags: [CacheTags.pages], revalidate: false }
);

/**
 * Get a page by slug. Returns a default empty page if not found.
 */
export async function getPageBySlug(slug: string): Promise<PageContent> {
  return getPageBySlugCached(slug);
}

export async function updatePage(updated: PageContent): Promise<PageContent> {
  if (isMockMode()) {
    const pages = await loadAllPages();
    const index = pages.findIndex((page) => page.slug === updated.slug);

    if (index >= 0) {
      pages[index] = updated;
    } else {
      pages.push(updated);
    }

    await writeJson(PAGES_FILE, pages);
    return updated;
  }

  // DynamoDB mode
  return putItem(TABLE_NAME, updated);
}

export async function removePhotoFromPages(photoId: string) {
  const pages = await loadAllPages();
  const nextPages = pages.map((page) => ({
    ...page,
    gallery: page.gallery.filter((id) => id !== photoId)
  }));

  if (isMockMode()) {
    await writeJson(PAGES_FILE, nextPages);
  } else {
    // Update each page in DynamoDB
    for (const page of nextPages) {
      await putItem(TABLE_NAME, page);
    }
  }
}
