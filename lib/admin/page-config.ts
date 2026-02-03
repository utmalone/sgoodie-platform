import type { PageSlug } from '@/types';

export const pageOrder: PageSlug[] = [
  'home',
  'about',
  'work',
  'interiors',
  'travel',
  'brand-marketing'
];

export const pageLabels: Record<PageSlug, string> = {
  home: 'Home',
  about: 'About',
  work: 'Work',
  interiors: 'Interiors',
  travel: 'Travel',
  'brand-marketing': 'Brand Marketing'
};
