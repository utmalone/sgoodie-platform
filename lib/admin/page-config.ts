import type { PageSlug } from '@/types';

// All pages for admin Pages section (text/SEO editing)
export const pageOrder: PageSlug[] = [
  'home',
  'about',
  'portfolio',
  'journal',
  'contact'
];

// Pages that have page-level photo galleries (for Photos section)
// Portfolio and Journal are excluded because they manage photos per-project/per-post
export const photoPageOrder: PageSlug[] = [
  'home',
  'about',
  'contact'
];

export const pageLabels: Record<PageSlug, string> = {
  home: 'Home',
  about: 'About',
  portfolio: 'Portfolio',
  journal: 'Journal',
  contact: 'Contact'
};
