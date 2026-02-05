import type { ContactPageContent } from '@/types';
import { readJson, writeJson } from './local-store';
import { useMockData, getItem, putItem } from './db';

const TABLE_NAME = 'pages';
const CONTACT_SLUG = 'contact-page';

const defaultContactContent: ContactPageContent = {
  headline: 'Get in Touch',
  intro: '',
  formFields: ['name', 'email', 'message'],
  successMessage: 'Thank you for your message. We will get back to you soon.'
};

/**
 * Fetch the structured Contact page content.
 */
export async function getContactContent(): Promise<ContactPageContent> {
  if (useMockData()) {
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

  if (useMockData()) {
    await writeJson('contact.json', updated);
    return updated;
  }

  // DynamoDB mode
  await putItem(TABLE_NAME, { ...updated, slug: CONTACT_SLUG });
  return updated;
}
