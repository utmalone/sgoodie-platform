import type { JournalPost } from '@/types';
import { readJson } from './local-store';

const JOURNAL_FILE = 'journal.json';

export async function getAllJournalPosts(): Promise<JournalPost[]> {
  return readJson<JournalPost[]>(JOURNAL_FILE);
}

export async function getJournalPostBySlug(slug: string): Promise<JournalPost | null> {
  const posts = await getAllJournalPosts();
  return posts.find((post) => post.slug === slug) || null;
}
