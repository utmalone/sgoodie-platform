import { revalidatePath } from 'next/cache';
import { portfolioCategories } from './portfolio-config';

/**
 * Revalidate paths related to portfolio/projects.
 * Call this after creating, updating, or deleting a project.
 */
export function revalidatePortfolioPages(projectSlug?: string, category?: string) {
  // Revalidate all portfolio category pages
  portfolioCategories.forEach((cat) => {
    revalidatePath(`/portfolio/${cat}`);
  });
  
  // Revalidate the home page (may show featured projects)
  revalidatePath('/');
  
  // Revalidate the specific project page if slug and category provided
  if (projectSlug && category) {
    revalidatePath(`/portfolio/${category}/${projectSlug}`);
  }
}

/**
 * @deprecated Use revalidatePortfolioPages instead
 */
export function revalidateWorkPages(projectSlug?: string) {
  revalidatePortfolioPages(projectSlug);
}

/**
 * Revalidate paths related to journal posts.
 * Call this after creating, updating, or deleting a post.
 */
export function revalidateJournalPages(postSlug?: string) {
  // Revalidate the journal index page
  revalidatePath('/journal');
  
  // Revalidate the specific post page if slug provided
  if (postSlug) {
    revalidatePath(`/journal/${postSlug}`);
  }
}

/**
 * Revalidate a specific page by slug.
 */
export function revalidatePage(slug: string) {
  const pathMap: Record<string, string> = {
    home: '/',
    about: '/about',
    portfolio: '/portfolio',
    journal: '/journal',
    contact: '/contact'
  };
  
  const path = pathMap[slug];
  if (path) {
    revalidatePath(path);
  }
}

/**
 * Revalidate all public pages.
 * Use sparingly - only when making broad changes.
 */
export function revalidateAllPages() {
  revalidatePath('/');
  revalidatePath('/about');
  portfolioCategories.forEach((cat) => {
    revalidatePath(`/portfolio/${cat}`);
  });
  revalidatePath('/journal');
  revalidatePath('/contact');
}
