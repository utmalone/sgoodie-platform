import type { AboutPageContent } from '@/types';
import { readJson, writeJson } from './local-store';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';

/**
 * Fetch the structured About page content.
 * Returns data from local JSON when USE_MOCK_DATA is true,
 * otherwise would fetch from backend API.
 */
export async function getAboutContent(): Promise<AboutPageContent> {
  if (USE_MOCK_DATA) {
    return readJson<AboutPageContent>('about.json');
  }

  // TODO: Fetch from real backend API
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/about`);
  if (!res.ok) {
    throw new Error('Failed to fetch about content');
  }
  return res.json();
}

/**
 * Update the About page content.
 */
export async function updateAboutContent(updates: Partial<AboutPageContent>): Promise<AboutPageContent> {
  const current = await readJson<AboutPageContent>('about.json');
  const updated = { ...current, ...updates };
  await writeJson('about.json', updated);
  return updated;
}
