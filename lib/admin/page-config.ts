import type { PageSlug } from '@/types';

export const pageOrder: PageSlug[] = [
  'home',
  'about',
  'work',
  'journal',
  'contact'
];

export const pageLabels: Record<PageSlug, string> = {
  home: 'Home',
  about: 'About',
  work: 'Work',
  journal: 'Journal',
  contact: 'Contact'
};
