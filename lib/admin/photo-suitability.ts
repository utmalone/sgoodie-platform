import type { PageSlug, PhotoAsset } from '@/types';

export type PhotoSlot = 'hero' | 'feature' | 'approach' | 'bio';

export type SuitabilityLabel = 'Hero' | 'Feature' | 'Approach' | 'Bio' | 'Editorial';

/** Guidelines for each slot type */
const SLOT_GUIDELINES: Record<PhotoSlot, { minW: number; minH: number; aspect: string; description: string }> = {
  hero: { minW: 3200, minH: 1800, aspect: '16:9 or 3:2', description: 'Landscape 3200×1800+ (16:9 or 3:2)' },
  feature: { minW: 1600, minH: 2400, aspect: '2:3', description: 'Portrait 2:3, min 1600×2400' },
  approach: { minW: 1500, minH: 2000, aspect: '3:4', description: 'Portrait 3:4, min 1500×2000' },
  bio: { minW: 1500, minH: 2000, aspect: '3:4', description: 'Portrait 3:4, min 1500×2000' }
};

/** Determine which slots a photo is suitable for based on dimensions */
export function getPhotoSuitabilityLabels(photo: PhotoAsset): SuitabilityLabel[] {
  const w = photo.width || 0;
  const h = photo.height || 0;
  if (w <= 0 || h <= 0) return [];

  const labels: SuitabilityLabel[] = [];
  const aspect = w / h;

  // Hero: landscape 16:9 (1.78) or 3:2 (1.5), min 3200x1800
  if (w >= 3200 && h >= 1800) {
    const is169 = aspect >= 1.6 && aspect <= 2.0;
    const is32 = aspect >= 1.4 && aspect <= 1.7;
    if (is169 || is32) labels.push('Hero');
  }

  // Feature: portrait 2:3, min 1600x2400
  if (w >= 1600 && h >= 2400) {
    const is23 = aspect >= 0.6 && aspect <= 0.72;
    if (is23) labels.push('Feature');
  }

  // Approach/Bio: portrait 3:4, min 1500x2000
  if (w >= 1500 && h >= 2000) {
    const is34 = aspect >= 0.7 && aspect <= 0.8;
    if (is34) labels.push('Approach', 'Bio');
  }

  // Editorial: portrait 3:4 or landscape 4:3
  if (w >= 1800 && h >= 1800) {
    const is34 = aspect >= 0.7 && aspect <= 0.8;
    const is43 = aspect >= 1.2 && aspect <= 1.4;
    if (is34 || is43) labels.push('Editorial');
  }

  // Dedupe
  return [...new Set(labels)];
}

/** Check if photo matches the slot's requirements */
function photoMatchesSlot(photo: PhotoAsset, slot: PhotoSlot): boolean {
  const w = photo.width || 0;
  const h = photo.height || 0;
  if (w <= 0 || h <= 0) return true; // Unknown dimensions, don't warn

  const g = SLOT_GUIDELINES[slot];
  if (w >= g.minW && h >= g.minH) return true;

  const aspect = w / h;
  if (slot === 'hero') {
    const isLandscape = aspect > 1;
    const is169 = aspect >= 1.6 && aspect <= 2.0;
    const is32 = aspect >= 1.4 && aspect <= 1.7;
    if (isLandscape && (is169 || is32) && w * h >= 3200 * 1800) return true;
  }
  if (slot === 'feature') {
    const is23 = aspect >= 0.6 && aspect <= 0.72;
    if (is23 && w >= 1600 && h >= 2400) return true;
  }
  if (slot === 'approach' || slot === 'bio') {
    const is34 = aspect >= 0.7 && aspect <= 0.8;
    if (is34 && w >= 1500 && h >= 2000) return true;
  }

  return false;
}

/** Get a warning message if photo doesn't match the slot, or null if OK */
export function getMismatchWarning(
  photo: PhotoAsset,
  slot: PhotoSlot,
  _pageSlug?: PageSlug
): string | null {
  if (photoMatchesSlot(photo, slot)) return null;

  const w = photo.width || 0;
  const h = photo.height || 0;
  const dims = w > 0 && h > 0 ? `${w}×${h}` : 'unknown dimensions';
  const g = SLOT_GUIDELINES[slot];

  return `This photo is ${dims}. ${g.description} is recommended for ${slot} photos. It may not display well.`;
}

/** Determine which slot a photo will be added to when "Add" is clicked */
export function getSlotForAdd(
  pageSlug: PageSlug,
  pagePhotoIds: string[],
  hasBio: boolean
): PhotoSlot {
  if (pagePhotoIds.length === 0) return 'hero';

  if (pageSlug === 'home') return 'feature';
  if (pageSlug === 'contact') return 'hero';

  if (pageSlug === 'about') {
    if (pagePhotoIds.length === 1) return 'approach';
    if (hasBio) return 'approach';
    return 'approach'; // Adding to approach; last could become bio when they add bio
  }

  return 'hero';
}

/** Group key for library display - first matching suitability */
export type LibraryGroupKey = 'hero' | 'feature' | 'approach' | 'editorial' | 'other';

export function getPhotoLibraryGroup(photo: PhotoAsset): LibraryGroupKey {
  const labels = getPhotoSuitabilityLabels(photo);
  if (labels.includes('Hero')) return 'hero';
  if (labels.includes('Feature')) return 'feature';
  if (labels.includes('Approach') || labels.includes('Bio')) return 'approach';
  if (labels.includes('Editorial')) return 'editorial';
  return 'other';
}

export const LIBRARY_GROUP_LABELS: Record<LibraryGroupKey, string> = {
  hero: 'Good for Hero',
  feature: 'Good for Feature Grid',
  approach: 'Good for Approach / Bio',
  editorial: 'Good for Editorial',
  other: 'Other'
};

/** Page-specific order: groups relevant to the current page appear first */
const PAGE_GROUP_ORDER: Record<PageSlug, LibraryGroupKey[]> = {
  home: ['hero', 'feature', 'approach', 'editorial', 'other'],
  about: ['hero', 'approach', 'feature', 'editorial', 'other'],
  contact: ['hero', 'feature', 'approach', 'editorial', 'other'],
  journal: ['hero', 'approach', 'feature', 'editorial', 'other'],
  portfolio: ['editorial', 'hero', 'feature', 'approach', 'other']
};

/** Get the ordered group keys for the library based on current page */
export function getLibraryGroupOrderForPage(pageSlug: PageSlug): LibraryGroupKey[] {
  return PAGE_GROUP_ORDER[pageSlug] ?? PAGE_GROUP_ORDER.home;
}
