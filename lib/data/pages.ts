import type { PageContent } from '@/types';
import { readJson, writeJson } from './local-store';

const PAGES_FILE = 'pages.json';

function assertMockMode() {
  if (process.env.USE_MOCK_DATA === 'true') return;
  throw new Error(
    'Page management is only implemented for local mock data right now. Set USE_MOCK_DATA=true.'
  );
}

export async function getAllPages(): Promise<PageContent[]> {
  assertMockMode();
  const pages = await readJson<PageContent[]>(PAGES_FILE);
  return pages.map((page) => ({
    ...page,
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
    metaKeywords: page.metaKeywords ?? ''
  }));
}

/**
 * Get a page by slug. Accepts any string slug to support dynamic portfolio category pages.
 */
export async function getPageBySlug(slug: string): Promise<PageContent> {
  const pages = await getAllPages();
  const page = pages.find((item) => item.slug === slug);

  if (!page) {
    // Create a friendly title from the slug
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
