import type { SiteProfile } from '@/types';
import { readJson, writeJson } from './local-store';
import { useMockData, getItem, putItem } from './db';

const PROFILE_FILE = 'profile.json';
const TABLE_NAME = 'pages'; // Store profile in pages table with slug 'profile'
const PROFILE_SLUG = 'site-profile';

const defaultProfile: SiteProfile = {
  name: 'S.Goodie',
  title: 'Architecture & Interiors Photographer',
  email: 'hello@sgoodie.com',
  phone: '(202) 555-0194',
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

export async function getProfile(): Promise<SiteProfile> {
  if (useMockData()) {
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

export async function updateProfile(updates: Partial<SiteProfile>): Promise<SiteProfile> {
  const current = await getProfile();
  const updated = { ...current, ...updates };

  if (useMockData()) {
    await writeJson(PROFILE_FILE, updated);
    return updated;
  }

  // DynamoDB mode - store with slug for key
  await putItem(TABLE_NAME, { ...updated, slug: PROFILE_SLUG });
  return updated;
}
