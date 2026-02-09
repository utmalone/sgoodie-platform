'use client';

import type { ContactPageContent } from '@/types';

export type DraftContactContent = Partial<
  Pick<
    ContactPageContent,
    | 'heroTitle'
    | 'heroSubtitle'
    | 'heroTitleColor'
    | 'heroSubtitleColor'
    | 'sectionTitle'
    | 'introParagraph'
    | 'companyName'
    | 'email'
    | 'phone'
    | 'instagramUrl'
    | 'linkedinUrl'
    | 'instagramHandle'
  >
>;

type DraftPayload = {
  contact: DraftContactContent;
  updatedAt: string;
};

const DRAFT_CONTACT_KEY = 'sgoodie.admin.draft.contact';

function normalizeDraftContact(raw: unknown): DraftContactContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as DraftContactContent & Record<string, unknown>;
  const pick = <K extends keyof DraftContactContent>(key: K) =>
    typeof data[key] === 'string' ? String(data[key]) : undefined;

  return {
    heroTitle: pick('heroTitle'),
    heroSubtitle: pick('heroSubtitle'),
    heroTitleColor: pick('heroTitleColor'),
    heroSubtitleColor: pick('heroSubtitleColor'),
    sectionTitle: pick('sectionTitle'),
    introParagraph: pick('introParagraph'),
    companyName: pick('companyName'),
    email: pick('email'),
    phone: pick('phone'),
    instagramUrl: pick('instagramUrl'),
    linkedinUrl: pick('linkedinUrl'),
    instagramHandle: pick('instagramHandle')
  };
}

export function loadDraftContactContent(): DraftContactContent | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_CONTACT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    return normalizeDraftContact(data.contact);
  } catch {
    return null;
  }
}

export function saveDraftContactContent(contact: DraftContactContent) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { contact, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(DRAFT_CONTACT_KEY, JSON.stringify(payload));
}

export function clearDraftContactContent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAFT_CONTACT_KEY);
}

