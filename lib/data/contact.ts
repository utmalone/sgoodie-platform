import type { ContactPageContent } from '@/types';
import { readJson, writeJson } from './local-store';
import { isMockMode, getItem, putItem } from './db';

const TABLE_NAME = 'pages';
const CONTACT_SLUG = 'contact-page';

const defaultContactContent: ContactPageContent = {
  heroPhotoId: '',
  heroTitle: 'Get in Touch',
  heroSubtitle: 'Let\'s work together',
  sectionTitle: 'Contact',
  introParagraph: '',
  companyName: 'S.Goodie Photography',
  email: 'hello@sgoodie.com',
  phone: '(202) 555-0194',
  instagramUrl: 'https://instagram.com/sgoodiephoto',
  linkedinUrl: 'https://linkedin.com/company/sgoodie-studio',
  instagramHandle: '@sgoodiephoto'
};

/**
 * Fetch the structured Contact page content.
 */
export async function getContactContent(): Promise<ContactPageContent> {
  if (isMockMode()) {
    try {
      return await readJson<ContactPageContent>('contact.json');
    } catch {
      return defaultContactContent;
    }
  }

  // DynamoDB mode - return default if not found
  const content = await getItem<ContactPageContent & { slug: string }>(TABLE_NAME, { slug: CONTACT_SLUG });
  return content || defaultContactContent;
}

/**
 * Update the Contact page content.
 */
export async function updateContactContent(updates: Partial<ContactPageContent>): Promise<ContactPageContent> {
  const current = await getContactContent();
  const updated = { ...current, ...updates };

  if (isMockMode()) {
    await writeJson('contact.json', updated);
    return updated;
  }

  // DynamoDB mode
  await putItem(TABLE_NAME, { ...updated, slug: CONTACT_SLUG });
  return updated;
}
