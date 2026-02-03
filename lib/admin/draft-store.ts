import type { PageContent } from '@/types';

type DraftPayload = {
  pages: PageContent[];
  updatedAt: string;
};

const DRAFT_KEY = 'sgoodie.admin.draft';

export function loadDraftPages(): PageContent[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    return Array.isArray(data.pages) ? data.pages : null;
  } catch {
    return null;
  }
}

export function saveDraftPages(pages: PageContent[]) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { pages, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

export function clearDraftPages() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_KEY);
}
