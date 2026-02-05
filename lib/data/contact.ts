import type { ContactPageContent } from '@/types';
import { readJson, writeJson } from './local-store';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';

/**
 * Fetch the structured Contact page content.
 */
export async function getContactContent(): Promise<ContactPageContent> {
  if (USE_MOCK_DATA) {
    return readJson<ContactPageContent>('contact.json');
  }

  // TODO: Fetch from real backend API
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`);
  if (!res.ok) {
    throw new Error('Failed to fetch contact content');
  }
  return res.json();
}

/**
 * Update the Contact page content.
 */
export async function updateContactContent(updates: Partial<ContactPageContent>): Promise<ContactPageContent> {
  const current = await readJson<ContactPageContent>('contact.json');
  const updated = { ...current, ...updates };
  await writeJson('contact.json', updated);
  return updated;
}
