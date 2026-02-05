import { getAllProjects } from '@/lib/data/projects';
import { getAllJournalPosts } from '@/lib/data/journal';
import { portfolioCategories } from '@/lib/admin/portfolio-config';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const projects = await getAllProjects();
  const journalPosts = await getAllJournalPosts();

  // Generate portfolio category pages
  const categoryPages = portfolioCategories.map((category) => ({
    url: `${baseUrl}/portfolio/${category}`,
    lastModified: new Date()
  }));

  // Generate project pages with category
  const projectPages = projects
    .filter((project) => project.category)
    .map((project) => ({
      url: `${baseUrl}/portfolio/${project.category}/${project.slug}`,
      lastModified: new Date()
    }));

  return [
    {
      url: baseUrl,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified: new Date()
    },
    ...categoryPages,
    {
      url: `${baseUrl}/journal`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date()
    },
    ...projectPages,
    ...journalPosts.map((post) => ({
      url: `${baseUrl}/journal/${post.slug}`,
      lastModified: new Date()
    }))
  ];
}
