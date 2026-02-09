'use client';

import type { WorkIndex } from '@/types';

const DRAFT_KEY = 'sgoodie.admin.draft.workIndex';

type DraftPayload = {
  workIndex: WorkIndex;
  updatedAt: string;
};

export function loadDraftWorkIndex(): WorkIndex | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    if (!data?.workIndex?.projectIds || !Array.isArray(data.workIndex.projectIds)) return null;
    return { projectIds: data.workIndex.projectIds };
  } catch {
    return null;
  }
}

export function saveDraftWorkIndex(workIndex: WorkIndex) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { workIndex, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

export function clearDraftWorkIndex() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_KEY);
}
