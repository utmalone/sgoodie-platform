import { getAllProjects } from '@/lib/data/projects';
import { getAllJournalPosts } from '@/lib/data/journal';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const projects = await getAllProjects();
  const journalPosts = await getAllJournalPosts();

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
      url: `${baseUrl}/work`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/journal`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date()
    },
    ...projects.map((project) => ({
      url: `${baseUrl}/work/${project.slug}`,
      lastModified: new Date()
    })),
    ...journalPosts.map((post) => ({
      url: `${baseUrl}/journal/${post.slug}`,
      lastModified: new Date()
    }))
  ];
}
