'use client';

export type JournalIndex = {
  postIds: string[];
};

const DRAFT_KEY = 'sgoodie.admin.draft.journalIndex';

type DraftPayload = {
  journalIndex: JournalIndex;
  updatedAt: string;
};

export function loadDraftJournalIndex(): JournalIndex | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    if (!data?.journalIndex?.postIds || !Array.isArray(data.journalIndex.postIds)) return null;
    return { postIds: data.journalIndex.postIds };
  } catch {
    return null;
  }
}

export function saveDraftJournalIndex(journalIndex: JournalIndex) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { journalIndex, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

export function clearDraftJournalIndex() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_KEY);
}
