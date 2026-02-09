import type { HomeLayout } from '@/types';

/** Draft can include heroPhotoId and featurePhotoIds for preview (layout changes before Save All) */
type DraftPayload = {
  homeLayout: Partial<HomeLayout>;
  updatedAt: string;
};

const DRAFT_KEY = 'sgoodie.admin.draft.homeLayout';

export function loadDraftHomeLayout(): Partial<HomeLayout> | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    if (!data?.homeLayout || typeof data.homeLayout !== 'object') return null;
    return data.homeLayout;
  } catch {
    return null;
  }
}

export function saveDraftHomeLayout(homeLayout: Partial<HomeLayout>) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { homeLayout, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

export function clearDraftHomeLayout() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_KEY);
}

