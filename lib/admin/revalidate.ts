import { revalidateTag } from 'next/cache';
import { CacheTags } from '@/lib/cache-tags';

function revalidateTags(tags: string[]) {
  tags.forEach((tag) => revalidateTag(tag, 'max'));
}

/**
 * Revalidate cache tags related to portfolio/projects.
 * Call this after creating, updating, or deleting a project.
 */
export function revalidatePortfolioPages() {
  revalidateTags([CacheTags.projects, CacheTags.workIndex]);
}

/**
 * Revalidate paths related to journal posts.
 * Call this after creating, updating, or deleting a post.
 */
export function revalidateJournalPages() {
  revalidateTags([CacheTags.journal]);
}

/**
 * Revalidate a specific page by slug.
 */
export function revalidatePage(slug: string) {
  if (slug.startsWith('portfolio-')) {
    revalidateTags([CacheTags.pages]);
    return;
  }

  revalidateTags([CacheTags.pages]);
}

/**
 * Revalidate all public pages.
 * Use sparingly - only when making broad changes.
 */
export function revalidateAllPages() {
  revalidateTags([
    CacheTags.pages,
    CacheTags.photos,
    CacheTags.projects,
    CacheTags.journal,
    CacheTags.profile,
    CacheTags.layoutHome,
    CacheTags.layoutAbout,
    CacheTags.layoutContact,
    CacheTags.workIndex
  ]);
}
