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
  featurePhotoIds: []
};

async function loadHomeLayout(): Promise<HomeLayout> {
  if (isMockMode()) {
    try {
      return await readJson<HomeLayout>(HOME_FILE);
    } catch {
      return defaultHomeLayout;
    }
  }

  // DynamoDB mode - return default if not found
  const layout = await getItem<HomeLayout & { slug: string }>(TABLE_NAME, { slug: HOME_SLUG });
  return layout || defaultHomeLayout;
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
  const updated = { ...current, ...updates };

  if (isMockMode()) {
    await writeJson(HOME_FILE, updated);
    return updated;
  }

  // DynamoDB mode
  await putItem(TABLE_NAME, { ...updated, slug: HOME_SLUG });
  return updated;
}
