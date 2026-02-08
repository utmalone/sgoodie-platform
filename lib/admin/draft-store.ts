import type { PageContent } from '@/types';

type DraftPayload = {
  pages: PageContent[];
  updatedAt: string;
};

const DRAFT_KEY = 'sgoodie.admin.draft';
const HOME_LAYOUT_DRAFT_KEY = 'sgoodie.admin.draft.homeLayout';
const ABOUT_DRAFT_KEY = 'sgoodie.admin.draft.about';
const CONTACT_DRAFT_KEY = 'sgoodie.admin.draft.contact';

function normalizeDraftPage(raw: unknown): PageContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const page = raw as Partial<PageContent> & Record<string, unknown>;
  if (typeof page.slug !== 'string' || page.slug.trim() === '') return null;

  const gallery = Array.isArray(page.gallery)
    ? page.gallery.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    : [];

  return {
    slug: page.slug,
    title: typeof page.title === 'string' ? page.title : '',
    intro: typeof page.intro === 'string' ? page.intro : '',
    gallery,
    metaTitle: typeof page.metaTitle === 'string' ? page.metaTitle : '',
    metaDescription: typeof page.metaDescription === 'string' ? page.metaDescription : '',
    metaKeywords: typeof page.metaKeywords === 'string' ? page.metaKeywords : ''
  };
}

export function loadDraftPages(): PageContent[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DraftPayload;
    if (!Array.isArray(data.pages)) return null;
    const pages = data.pages
      .map((page) => normalizeDraftPage(page))
      .filter(Boolean) as PageContent[];
    return pages.length > 0 ? pages : null;
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
  window.localStorage.removeItem(HOME_LAYOUT_DRAFT_KEY);
  window.localStorage.removeItem(ABOUT_DRAFT_KEY);
  window.localStorage.removeItem(CONTACT_DRAFT_KEY);
}
