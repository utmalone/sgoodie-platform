import { randomUUID } from 'crypto';
import { unstable_cache } from 'next/cache';
import type { JournalPost } from '@/types';
import { CacheTags } from '@/lib/cache-tags';
import { readJson, writeJson } from './local-store';
import { isMockMode, getAllItems, getItem, putItem, deleteItem } from './db';

const JOURNAL_FILE = 'journal.json';
const TABLE_NAME = 'journal';

async function loadAllJournalPosts(): Promise<JournalPost[]> {
  if (isMockMode()) {
    return readJson<JournalPost[]>(JOURNAL_FILE);
  }

  // DynamoDB mode - return empty array if no data
  return getAllItems<JournalPost>(TABLE_NAME);
}

const getAllJournalPostsCached = unstable_cache(
  async (): Promise<JournalPost[]> => {
    return loadAllJournalPosts();
  },
  ['journal'],
  { tags: [CacheTags.journal], revalidate: false }
);

export async function getAllJournalPosts(): Promise<JournalPost[]> {
  return getAllJournalPostsCached();
}

export async function getJournalPostBySlug(slug: string): Promise<JournalPost | null> {
  const posts = await getAllJournalPostsCached();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getJournalPostById(id: string): Promise<JournalPost | null> {
  if (isMockMode()) {
    const posts = await loadAllJournalPosts();
    return posts.find((post) => post.id === id) || null;
  }

  // DynamoDB mode
  return getItem<JournalPost>(TABLE_NAME, { id });
}

export async function createJournalPost(
  input: Omit<JournalPost, 'id'>
): Promise<JournalPost> {
  const posts = await loadAllJournalPosts();

  // Ensure unique slug
  const existingSlug = posts.find((p) => p.slug === input.slug);
  if (existingSlug) {
    throw new Error(`Journal post with slug "${input.slug}" already exists`);
  }

  const post: JournalPost = {
    ...input,
    id: randomUUID()
  };

  if (isMockMode()) {
    posts.push(post);
    await writeJson(JOURNAL_FILE, posts);
    return post;
  }

  // DynamoDB mode
  return putItem(TABLE_NAME, post);
}

export async function updateJournalPost(
  id: string,
  updates: Partial<Omit<JournalPost, 'id'>>
): Promise<JournalPost> {
  const posts = await loadAllJournalPosts();
  const existing = posts.find((p) => p.id === id);

  if (!existing) {
    throw new Error(`Journal post with id "${id}" not found`);
  }

  // Check slug uniqueness if changing
  if (updates.slug && updates.slug !== existing.slug) {
    const existingSlug = posts.find((p) => p.slug === updates.slug);
    if (existingSlug) {
      throw new Error(`Journal post with slug "${updates.slug}" already exists`);
    }
  }

  const updated: JournalPost = {
    ...existing,
    ...updates
  };

  if (isMockMode()) {
    const index = posts.findIndex((p) => p.id === id);
    posts[index] = updated;
    await writeJson(JOURNAL_FILE, posts);
    return updated;
  }

  // DynamoDB mode
  return putItem(TABLE_NAME, updated);
}

export async function deleteJournalPost(id: string): Promise<void> {
  if (isMockMode()) {
    const posts = await loadAllJournalPosts();
    const filtered = posts.filter((p) => p.id !== id);

    if (filtered.length === posts.length) {
      throw new Error(`Journal post with id "${id}" not found`);
    }

    await writeJson(JOURNAL_FILE, filtered);
    return;
  }

  // DynamoDB mode
  await deleteItem(TABLE_NAME, { id });
}
