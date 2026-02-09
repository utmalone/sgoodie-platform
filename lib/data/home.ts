import { unstable_cache } from 'next/cache';
import type { HomeLayout } from '@/types';
import { CacheTags } from '@/lib/cache-tags';
import { readJson, writeJson } from './local-store';
import { isMockMode, getItem, putItem } from './db';

const HOME_FILE = 'home.json';
const TABLE_NAME = 'pages';
const HOME_SLUG = 'home-page';

const defaultHomeLayout: HomeLayout = {
  heroPhotoId: '',
  featurePhotoIds: [],
  introText: 'Creating photographs that not only document spaces, but celebrate the artistry, vision, and craft behind them.'
};

function normalizeHomeLayout(layout: Partial<HomeLayout> | null | undefined): HomeLayout {
  return {
    heroPhotoId:
      typeof layout?.heroPhotoId === 'string' ? layout.heroPhotoId : defaultHomeLayout.heroPhotoId,
    featurePhotoIds: Array.isArray(layout?.featurePhotoIds)
      ? layout!.featurePhotoIds
      : defaultHomeLayout.featurePhotoIds,
    introText:
      typeof layout?.introText === 'string' ? layout.introText : defaultHomeLayout.introText,
    ...(typeof layout?.heroTitleColor === 'string' ? { heroTitleColor: layout.heroTitleColor } : {}),
    ...(typeof layout?.heroSubtitleColor === 'string' ? { heroSubtitleColor: layout.heroSubtitleColor } : {})
  };
}

async function loadHomeLayout(): Promise<HomeLayout> {
  if (isMockMode()) {
    try {
      const stored = await readJson<Partial<HomeLayout>>(HOME_FILE);
      return normalizeHomeLayout(stored);
    } catch {
      return defaultHomeLayout;
    }
  }

  // DynamoDB mode - return default if not found
  const item = await getItem<Partial<HomeLayout> & { slug: string }>(TABLE_NAME, { slug: HOME_SLUG });
  if (!item) return defaultHomeLayout;
  const { slug: _slug, ...rest } = item;
  return normalizeHomeLayout(rest);
}

const getHomeLayoutCached = unstable_cache(
  async (): Promise<HomeLayout> => {
    return loadHomeLayout();
  },
  ['home-layout'],
  { tags: [CacheTags.layoutHome], revalidate: false }
);

export async function getHomeLayout(): Promise<HomeLayout> {
  return getHomeLayoutCached();
}

export async function updateHomeLayout(updates: Partial<HomeLayout>): Promise<HomeLayout> {
  const current = await loadHomeLayout();
  const updated = normalizeHomeLayout({ ...current, ...updates });

  if (isMockMode()) {
    await writeJson(HOME_FILE, updated);
    return updated;
  }

  // DynamoDB mode
  await putItem(TABLE_NAME, { ...updated, slug: HOME_SLUG });
  return updated;
}
