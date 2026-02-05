import { randomUUID } from 'crypto';
import type { JournalPost } from '@/types';
import { readJson, writeJson } from './local-store';

const JOURNAL_FILE = 'journal.json';

function assertMockMode() {
  if (process.env.USE_MOCK_DATA === 'true') return;
  throw new Error(
    'Journal management is only implemented for local mock data. Set USE_MOCK_DATA=true.'
  );
}

export async function getAllJournalPosts(): Promise<JournalPost[]> {
  return readJson<JournalPost[]>(JOURNAL_FILE);
}

export async function getJournalPostBySlug(slug: string): Promise<JournalPost | null> {
  const posts = await getAllJournalPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getJournalPostById(id: string): Promise<JournalPost | null> {
  const posts = await getAllJournalPosts();
  return posts.find((post) => post.id === id) || null;
}

export async function createJournalPost(
  input: Omit<JournalPost, 'id'>
): Promise<JournalPost> {
  assertMockMode();
  const posts = await getAllJournalPosts();

  // Ensure unique slug
  const existingSlug = posts.find((p) => p.slug === input.slug);
  if (existingSlug) {
    throw new Error(`Journal post with slug "${input.slug}" already exists`);
  }

  const post: JournalPost = {
    ...input,
    id: randomUUID()
  };

  posts.push(post);
  await writeJson(JOURNAL_FILE, posts);
  return post;
}

export async function updateJournalPost(
  id: string,
  updates: Partial<Omit<JournalPost, 'id'>>
): Promise<JournalPost> {
  assertMockMode();
  const posts = await getAllJournalPosts();
  const index = posts.findIndex((p) => p.id === id);

  if (index < 0) {
    throw new Error(`Journal post with id "${id}" not found`);
  }

  // Check slug uniqueness if changing
  if (updates.slug && updates.slug !== posts[index].slug) {
    const existingSlug = posts.find((p) => p.slug === updates.slug);
    if (existingSlug) {
      throw new Error(`Journal post with slug "${updates.slug}" already exists`);
    }
  }

  const updated: JournalPost = {
    ...posts[index],
    ...updates
  };

  posts[index] = updated;
  await writeJson(JOURNAL_FILE, posts);
  return updated;
}

export async function deleteJournalPost(id: string): Promise<void> {
  assertMockMode();
  const posts = await getAllJournalPosts();
  const filtered = posts.filter((p) => p.id !== id);

  if (filtered.length === posts.length) {
    throw new Error(`Journal post with id "${id}" not found`);
  }

  await writeJson(JOURNAL_FILE, filtered);
}
