'use client';

import type { EditorialRowCaption, Project, ProjectCredit } from '@/types';

export type DraftProjectContent = Partial<
  Pick<Project, 'title' | 'subtitle' | 'heroPhotoId' | 'galleryPhotoIds' | 'editorialCaptions' | 'credits' | 'heroTitleColor' | 'heroSubtitleColor'>
>;

type DraftPayload = {
  project: DraftProjectContent;
  updatedAt: string;
};

const DRAFT_PROJECT_KEY_PREFIX = 'sgoodie.admin.draft.project.';

function getKey(projectId: string) {
  return `${DRAFT_PROJECT_KEY_PREFIX}${projectId}`;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return result;
}

function normalizeCaptions(value: unknown): EditorialRowCaption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const captions = value
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const caption = raw as Partial<EditorialRowCaption> & Record<string, unknown>;
      return {
        title: typeof caption.title === 'string' ? caption.title : '',
        body: typeof caption.body === 'string' ? caption.body : ''
      };
    })
    .filter(Boolean) as EditorialRowCaption[];
  return captions;
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

function normalizeDraftProject(raw: unknown): DraftProjectContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as DraftProjectContent & Record<string, unknown>;

  return {
    title: typeof data.title === 'string' ? data.title : undefined,
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
    heroPhotoId: typeof data.heroPhotoId === 'string' ? data.heroPhotoId : undefined,
    galleryPhotoIds: normalizeStringArray(data.galleryPhotoIds),
    editorialCaptions: normalizeCaptions(data.editorialCaptions),
    credits: normalizeCredits(data.credits),
    heroTitleColor: typeof data.heroTitleColor === 'string' ? data.heroTitleColor : undefined,
    heroSubtitleColor: typeof data.heroSubtitleColor === 'string' ? data.heroSubtitleColor : undefined
  };
}

export function loadDraftProject(projectId: string): DraftProjectContent | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getKey(projectId));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    return normalizeDraftProject(data.project);
  } catch {
    return null;
  }
}

export function saveDraftProject(projectId: string, project: DraftProjectContent) {
  if (typeof window === 'undefined') return;
  const payload: DraftPayload = { project, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(getKey(projectId), JSON.stringify(payload));
}

export function clearDraftProject(projectId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getKey(projectId));
}
