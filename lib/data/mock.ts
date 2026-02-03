import type { Project } from '@/types';

const placeholder = {
  src: '/placeholder.svg',
  width: 1200,
  height: 800
};

export const mockProjects: Project[] = [
  {
    id: 'interiors-1',
    title: 'Modern Loft',
    description: 'Warm light, clean lines, and layered textures.',
    category: 'interiors',
    order: 1,
    featured: true,
    coverPhoto: {
      id: 'interiors-1-cover',
      alt: 'Modern loft interior',
      ...placeholder
    }
  },
  {
    id: 'interiors-2',
    title: 'Garden Retreat',
    description: 'Airy spaces with natural tones and open flow.',
    category: 'interiors',
    order: 2,
    coverPhoto: {
      id: 'interiors-2-cover',
      alt: 'Garden retreat interior',
      ...placeholder
    }
  },
  {
    id: 'travel-1',
    title: 'Coastal Escape',
    description: 'Soft horizons and sea-swept textures.',
    category: 'travel',
    order: 1,
    featured: true,
    coverPhoto: {
      id: 'travel-1-cover',
      alt: 'Coastal travel photography',
      ...placeholder
    }
  },
  {
    id: 'brand-1',
    title: 'Studio Portraits',
    description: 'Confident brand imagery with crisp detail.',
    category: 'brand-marketing',
    order: 1,
    featured: true,
    coverPhoto: {
      id: 'brand-1-cover',
      alt: 'Brand marketing portraits',
      ...placeholder
    }
  }
];
