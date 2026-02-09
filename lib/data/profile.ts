import { unstable_cache } from 'next/cache';
import type { SiteProfile } from '@/types';
import { CacheTags } from '@/lib/cache-tags';
import { readJson, writeJson } from './local-store';
import { isMockMode, getItem, putItem } from './db';

const PROFILE_FILE = 'profile.json';
const TABLE_NAME = 'pages'; // Store profile in pages table with slug 'profile'
const PROFILE_SLUG = 'site-profile';

const defaultProfile: SiteProfile = {
  name: 'S.Goodie',
  title: 'Architecture & Interiors Photographer',
  email: 'hello@sgoodie.com',
  phone: '(202) 555-0194',
  heroTitleColor: '#ffffff',
  heroSubtitleColor: undefined, /* uses rgba(255,255,255,0.85) when unset */
  address: {
    street: '',
    city: 'Washington',
    state: 'DC',
    zip: ''
  },
  availability: {
    regions: ['DC', 'MD', 'VA', 'PA', 'NY'],
    note: 'Available for travel and select commissions.'
  },
  social: {
    instagram: { handle: '@sgoodiephoto', url: 'https://instagram.com/sgoodiephoto' },
    linkedin: { name: 'S.Goodie Studio', url: 'https://linkedin.com/company/sgoodie-studio' },
    twitter: { handle: '', url: '' },
    facebook: { name: '', url: '' }
  },
  photoId: 'about-bio'
};

async function loadProfile(): Promise<SiteProfile> {
  if (isMockMode()) {
    try {
      const profile = await readJson<SiteProfile>(PROFILE_FILE);
      return { ...defaultProfile, ...profile };
    } catch {
      return defaultProfile;
    }
  }

  // DynamoDB mode - return default if not found
  const profile = await getItem<SiteProfile & { slug: string }>(TABLE_NAME, { slug: PROFILE_SLUG });
  if (profile) {
    return { ...defaultProfile, ...profile };
  }
  return defaultProfile;
}

const getProfileCached = unstable_cache(
  async (): Promise<SiteProfile> => {
    return loadProfile();
  },
  ['profile'],
  { tags: [CacheTags.profile], revalidate: false }
);

export async function getProfile(): Promise<SiteProfile> {
  return getProfileCached();
}

export async function updateProfile(updates: Partial<SiteProfile>): Promise<SiteProfile> {
  const current = await loadProfile();
  const updated = { ...current, ...updates };

  if (isMockMode()) {
    await writeJson(PROFILE_FILE, updated);
    return updated;
  }

  // DynamoDB mode - store with slug for key
  await putItem(TABLE_NAME, { ...updated, slug: PROFILE_SLUG });
  return updated;
}
