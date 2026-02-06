import type { PageSlug } from '@/types';

export type PhotoGuideline = {
  label: string;
  lines: string[];
};

export const heroFullBleedGuideline: PhotoGuideline = {
  label: 'Hero',
  lines: [
    'Full-bleed: 3200x1800+ (16:9 or 3:2).',
    'Keep subject centered for safe cropping.'
  ]
};

export const homeFeatureGuideline: PhotoGuideline = {
  label: 'Feature grid',
  lines: [
    'Portrait 2:3. Target 2000x3000 (min 1600x2400).',
    'Crops from center in the grid.'
  ]
};

export const aboutApproachGuideline: PhotoGuideline = {
  label: 'Approach',
  lines: ['Portrait 3:4. Target 1800x2400 (min 1500x2000).']
};

export const aboutBioGuideline: PhotoGuideline = {
  label: 'Bio',
  lines: ['Portrait 3:4. Target 1800x2400 (min 1500x2000).']
};

export const editorialGalleryGuideline: PhotoGuideline = {
  label: 'Editorial gallery',
  lines: [
    'Mix 3:4 portrait and 4:3 landscape.',
    'Portrait 2400x3200 or landscape 2400x1800.'
  ]
};

export const journalPhotoGuideline: PhotoGuideline = {
  label: 'Journal photos',
  lines: [
    'Portrait 3:4 or 4:5 recommended.',
    'Target 1800x2400 or 1600x2000.'
  ]
};

export const pagePhotoGuidelinesBySlug: Record<PageSlug, PhotoGuideline[]> = {
  home: [heroFullBleedGuideline, homeFeatureGuideline],
  about: [heroFullBleedGuideline, aboutApproachGuideline, aboutBioGuideline],
  contact: [heroFullBleedGuideline],
  journal: [heroFullBleedGuideline],
  portfolio: []
};
