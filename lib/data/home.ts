import type { HomeLayout } from '@/types';
import { readJson, writeJson } from './local-store';

const HOME_FILE = 'home.json';

export async function getHomeLayout(): Promise<HomeLayout> {
  return readJson<HomeLayout>(HOME_FILE);
}

export async function updateHomeLayout(updates: Partial<HomeLayout>): Promise<HomeLayout> {
  const current = await getHomeLayout();
  const updated = { ...current, ...updates };
  await writeJson(HOME_FILE, updated);
  return updated;
}
