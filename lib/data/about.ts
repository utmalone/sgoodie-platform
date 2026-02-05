import type { AboutPageContent } from '@/types';
import { readJson, writeJson } from './local-store';
import { useMockData, getItem, putItem } from './db';

const TABLE_NAME = 'pages';
const ABOUT_SLUG = 'about-page';

const defaultAboutContent: AboutPageContent = {
  headline: 'S.Goodie Photography',
  intro: 'Welcome to S.Goodie Photography',
  body: '',
  photoIds: []
};

/**
 * Fetch the structured About page content.
 */
export async function getAboutContent(): Promise<AboutPageContent> {
  if (useMockData()) {
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

  if (useMockData()) {
    await writeJson('about.json', updated);
    return updated;
  }

  // DynamoDB mode
  await putItem(TABLE_NAME, { ...updated, slug: ABOUT_SLUG });
  return updated;
}
