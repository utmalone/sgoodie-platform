import type { SiteProfile } from '@/types';
import { readJson, writeJson } from './local-store';

const PROFILE_FILE = 'profile.json';

function assertMockMode() {
  if (process.env.USE_MOCK_DATA === 'true') return;
  throw new Error(
    'Profile management is only implemented for local mock data right now. Set USE_MOCK_DATA=true.'
  );
}

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
  try {
    const profile = await readJson<SiteProfile>(PROFILE_FILE);
    return { ...defaultProfile, ...profile };
  } catch {
    return defaultProfile;
  }
}

export async function updateProfile(updates: Partial<SiteProfile>): Promise<SiteProfile> {
  assertMockMode();
  const current = await getProfile();
  const updated = { ...current, ...updates };
  await writeJson(PROFILE_FILE, updated);
  return updated;
}
