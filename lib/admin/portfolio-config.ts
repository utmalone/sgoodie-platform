/**
 * Portfolio category configuration
 */

export type PortfolioCategory = 'hotels' | 'restaurants' | 'travel' | 'home-garden' | 'brand';

export const portfolioCategories: PortfolioCategory[] = [
  'hotels',
  'restaurants', 
  'travel',
  'home-garden',
  'brand'
];

export const portfolioCategoryLabels: Record<PortfolioCategory, string> = {
  'hotels': 'Hotels',
  'restaurants': 'Restaurants',
  'travel': 'Travel',
  'home-garden': 'Home & Garden',
  'brand': 'Brand'
};

export const portfolioCategorySlugs: Record<PortfolioCategory, string> = {
  'hotels': 'hotels',
  'restaurants': 'restaurants',
  'travel': 'travel',
  'home-garden': 'home-garden',
  'brand': 'brand'
};

// Default category when clicking Portfolio directly
export const defaultPortfolioCategory: PortfolioCategory = 'hotels';
