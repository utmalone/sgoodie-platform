import type { HomeLayout } from '@/types';
import { readJson } from './local-store';

const HOME_FILE = 'home.json';

export async function getHomeLayout(): Promise<HomeLayout> {
  return readJson<HomeLayout>(HOME_FILE);
}
