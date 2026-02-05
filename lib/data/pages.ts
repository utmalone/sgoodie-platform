import type { PageContent } from '@/types';
import { readJson, writeJson } from './local-store';
import { isMockMode, getAllItems, putItem, getItem } from './db';

const PAGES_FILE = 'pages.json';
const TABLE_NAME = 'pages';

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
    body: '',
    gallery: [],
    metaTitle: '',
    metaDescription: '',
    metaKeywords: ''
  };
}

export async function getAllPages(): Promise<PageContent[]> {
  if (isMockMode()) {
    const pages = await readJson<PageContent[]>(PAGES_FILE);
    return pages.map((page) => ({
      ...page,
      metaTitle: page.metaTitle ?? '',
      metaDescription: page.metaDescription ?? '',
      metaKeywords: page.metaKeywords ?? ''
    }));
  }

  // DynamoDB mode - return empty array if no data
  const pages = await getAllItems<PageContent>(TABLE_NAME);
  return pages.map((page) => ({
    ...page,
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
    metaKeywords: page.metaKeywords ?? ''
  }));
}

/**
 * Get a page by slug. Returns a default empty page if not found.
 */
export async function getPageBySlug(slug: string): Promise<PageContent> {
  if (isMockMode()) {
    const pages = await getAllPages();
    const page = pages.find((item) => item.slug === slug);
    return page || createDefaultPage(slug);
  }

  // DynamoDB mode
  const page = await getItem<PageContent>(TABLE_NAME, { slug });
  return page || createDefaultPage(slug);
}

export async function updatePage(updated: PageContent): Promise<PageContent> {
  if (isMockMode()) {
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

  // DynamoDB mode
  return putItem(TABLE_NAME, updated);
}

export async function removePhotoFromPages(photoId: string) {
  const pages = await getAllPages();
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
