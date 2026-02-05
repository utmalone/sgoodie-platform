import type { AboutPageContent } from '@/types';
import { readJson, writeJson } from './local-store';
import { isMockMode, getItem, putItem } from './db';

const TABLE_NAME = 'pages';
const ABOUT_SLUG = 'about-page';

const defaultAboutContent: AboutPageContent = {
  heroPhotoId: '',
  heroTitle: 'S.Goodie Photography',
  heroSubtitle: 'Architecture & Interiors',
  introParagraphs: [],
  approachTitle: 'Our Approach',
  approachItems: [],
  featuredTitle: 'Featured In',
  featuredPublications: [],
  bio: {
    name: 'S.Goodie',
    photoId: '',
    paragraphs: []
  }
};

/**
 * Fetch the structured About page content.
 */
export async function getAboutContent(): Promise<AboutPageContent> {
  if (isMockMode()) {
    try {
      return await readJson<AboutPageContent>('about.json');
    } catch {
      return defaultAboutContent;
    }
  }

  // DynamoDB mode - return default if not found
  const content = await getItem<AboutPageContent & { slug: string }>(TABLE_NAME, { slug: ABOUT_SLUG });
  return content || defaultAboutContent;
}

/**
 * Update the About page content.
 */
export async function updateAboutContent(updates: Partial<AboutPageContent>): Promise<AboutPageContent> {
  const current = await getAboutContent();
  const updated = { ...current, ...updates };

  if (isMockMode()) {
    await writeJson('about.json', updated);
    return updated;
  }

  // DynamoDB mode
  await putItem(TABLE_NAME, { ...updated, slug: ABOUT_SLUG });
  return updated;
}
