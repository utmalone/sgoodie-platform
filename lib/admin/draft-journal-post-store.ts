'use client';

import type { JournalPost, ProjectCredit } from '@/types';

export type DraftJournalPostContent = Partial<
  Pick<JournalPost, 'title' | 'category' | 'excerpt' | 'body' | 'credits' | 'heroPhotoId' | 'galleryPhotoIds'>
>;

type DraftPayload = {
  post: DraftJournalPostContent;
  updatedAt: string;
};

const DRAFT_JOURNAL_KEY_PREFIX = 'sgoodie.admin.draft.journal.';

function getKey(postId: string) {
  return `${DRAFT_JOURNAL_KEY_PREFIX}${postId}`;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return result;
}

function normalizeCredits(value: unknown): ProjectCredit[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const credits = value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const credit = raw as Partial<ProjectCredit> & Record<string, unknown>;
      const label = typeof credit.label === 'string' ? credit.label : '';
      const val = typeof credit.value === 'string' ? credit.value : '';
      if (!label.trim() && !val.trim()) return null;
      return { label, value: val };
    })
    .filter(Boolean) as ProjectCredit[];
  return credits;
}

function normalizeDraftPost(raw: unknown): DraftJournalPostContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as DraftJournalPostContent & Record<string, unknown>;

  return {
    title: typeof data.title === 'string' ? data.title : undefined,
    category: typeof data.category === 'string' ? data.category : undefined,
    excerpt: typeof data.excerpt === 'string' ? data.excerpt : undefined,
    body: typeof data.body === 'string' ? data.body : undefined,
    credits: normalizeCredits(data.credits),
    heroPhotoId: typeof data.heroPhotoId === 'string' ? data.heroPhotoId : undefined,
    galleryPhotoIds: normalizeStringArray(data.galleryPhotoIds)
  };
}

export function loadDraftJournalPost(postId: string): DraftJournalPostContent | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getKey(postId));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    return normalizeDraftPost(data.post);
  } catch {
    return null;
  }
}

export function saveDraftJournalPost(postId: string, post: DraftJournalPostContent) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { post, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(getKey(postId), JSON.stringify(payload));
}

export function clearDraftJournalPost(postId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getKey(postId));
}
