'use client';

export type DraftProfileContent = Partial<{
  name: string;
}>;

type DraftPayload = {
  profile: DraftProfileContent;
  updatedAt: string;
};

const DRAFT_PROFILE_KEY = 'sgoodie.admin.draft.profile';

function normalizeDraftProfile(raw: unknown): DraftProfileContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as DraftProfileContent & Record<string, unknown>;
  return {
    ...(typeof data.name === 'string' ? { name: data.name } : {})
  };
}

export function loadDraftProfile(): DraftProfileContent | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_PROFILE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    if (!data?.profile || typeof data.profile !== 'object') return null;
    return normalizeDraftProfile(data.profile);
  } catch {
    return null;
  }
}

export function saveDraftProfile(profile: DraftProfileContent) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { profile, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(DRAFT_PROFILE_KEY, JSON.stringify(payload));
}

export function clearDraftProfile() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_PROFILE_KEY);
}
