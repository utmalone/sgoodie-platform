import { unstable_cache } from 'next/cache';
import type { AboutPageContent, Award } from '@/types';
import { CacheTags } from '@/lib/cache-tags';
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
  awardsTitle: 'Awards',
  awards: [],
  clientsTitle: 'Selected Clients',
  clients: [],
  bio: {
    name: 'S.Goodie',
    photoId: '',
    paragraphs: []
  }
};

function normalizeSavedAwards(raw: unknown): Award[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const a = item as Partial<Award> & Record<string, unknown>;
      if (typeof a.id !== 'string' || a.id.trim() === '') return null;
      return {
        id: a.id,
        name: typeof a.name === 'string' ? a.name : '',
        ...(typeof a.year === 'string' && a.year.trim() ? { year: a.year } : {}),
        ...(typeof a.photoId === 'string' && a.photoId.trim() ? { photoId: a.photoId } : {}),
        ...(typeof a.description === 'string' && a.description.trim() ? { description: a.description } : {})
      } satisfies Award;
    })
    .filter(Boolean) as Award[];
}

function normalizeAboutContent(raw: AboutPageContent): AboutPageContent {
  return {
    ...defaultAboutContent,
    ...raw,
    introParagraphs: raw.introParagraphs ?? [],
    approachItems: raw.approachItems ?? [],
    featuredPublications: raw.featuredPublications ?? [],
    awards: normalizeSavedAwards(raw.awards),
    clients: Array.isArray(raw.clients) ? raw.clients : [],
    awardsTitle: raw.awardsTitle ?? defaultAboutContent.awardsTitle,
    clientsTitle: raw.clientsTitle ?? defaultAboutContent.clientsTitle,
    bio: {
      ...defaultAboutContent.bio,
      ...raw.bio,
      paragraphs: raw.bio?.paragraphs ?? []
    }
  };
}

/**
 * Fetch the structured About page content.
 */
async function loadAboutContent(): Promise<AboutPageContent> {
  if (isMockMode()) {
    try {
      const raw = await readJson<AboutPageContent>('about.json');
      return normalizeAboutContent(raw);
    } catch {
      return defaultAboutContent;
    }
  }

  // DynamoDB mode - return default if not found
  const content = await getItem<AboutPageContent & { slug: string }>(TABLE_NAME, { slug: ABOUT_SLUG });
  return content ? normalizeAboutContent(content) : defaultAboutContent;
}

const getAboutContentCached = unstable_cache(
  async (): Promise<AboutPageContent> => {
    return loadAboutContent();
  },
  ['about-content'],
  { tags: [CacheTags.layoutAbout], revalidate: false }
);

export async function getAboutContent(): Promise<AboutPageContent> {
  return getAboutContentCached();
}

/**
 * Update the About page content.
 */
export async function updateAboutContent(updates: Partial<AboutPageContent>): Promise<AboutPageContent> {
  const current = await loadAboutContent();
  const updated = { ...current, ...updates };

  if (isMockMode()) {
    await writeJson('about.json', updated);
    return updated;
  }

  // DynamoDB mode
  await putItem(TABLE_NAME, { ...updated, slug: ABOUT_SLUG });
  return updated;
}
