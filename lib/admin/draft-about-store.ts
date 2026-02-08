'use client';

import type { ApproachItem } from '@/types';

export type DraftAboutContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  introParagraphs?: string[];
  approachTitle?: string;
  approachItems?: Array<Pick<ApproachItem, 'id' | 'title' | 'description'>>;
  featuredTitle?: string;
  featuredPublications?: string[];
  bio?: {
    name?: string;
    paragraphs?: string[];
  };
};

type DraftPayload = {
  about: DraftAboutContent;
  updatedAt: string;
};

const DRAFT_ABOUT_KEY = 'sgoodie.admin.draft.about';

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeApproachItems(value: unknown): DraftAboutContent['approachItems'] {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const item = raw as Partial<ApproachItem> & Record<string, unknown>;
      if (typeof item.id !== 'string' || item.id.trim() === '') return null;
      return {
        id: item.id,
        title: typeof item.title === 'string' ? item.title : '',
        description: typeof item.description === 'string' ? item.description : ''
      };
    })
    .filter(Boolean) as Array<Pick<ApproachItem, 'id' | 'title' | 'description'>>;
  return items.length ? items : undefined;
}

function normalizeDraftAboutContent(raw: unknown): DraftAboutContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const draft = raw as DraftAboutContent & Record<string, unknown>;

  const introParagraphs = normalizeStringArray(draft.introParagraphs);
  const featuredPublications = normalizeStringArray(draft.featuredPublications);
  const approachItems = normalizeApproachItems(draft.approachItems);

  const bioRaw = draft.bio;
  const bio =
    bioRaw && typeof bioRaw === 'object'
      ? {
          name: typeof (bioRaw as { name?: unknown }).name === 'string'
            ? String((bioRaw as { name?: unknown }).name)
            : undefined,
          paragraphs: normalizeStringArray((bioRaw as { paragraphs?: unknown }).paragraphs)
        }
      : undefined;

  return {
    heroTitle: typeof draft.heroTitle === 'string' ? draft.heroTitle : undefined,
    heroSubtitle: typeof draft.heroSubtitle === 'string' ? draft.heroSubtitle : undefined,
    introParagraphs,
    approachTitle: typeof draft.approachTitle === 'string' ? draft.approachTitle : undefined,
    approachItems,
    featuredTitle: typeof draft.featuredTitle === 'string' ? draft.featuredTitle : undefined,
    featuredPublications,
    bio
  };
}

export function loadDraftAboutContent(): DraftAboutContent | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_ABOUT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    return normalizeDraftAboutContent(data.about);
  } catch {
    return null;
  }
}

export function saveDraftAboutContent(about: DraftAboutContent) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { about, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(DRAFT_ABOUT_KEY, JSON.stringify(payload));
}

export function clearDraftAboutContent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_ABOUT_KEY);
}

