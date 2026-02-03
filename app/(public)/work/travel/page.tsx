import type { Metadata } from 'next';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ProjectGrid } from '@/components/portfolio/ProjectGrid';
import { PhotoGrid } from '@/components/portfolio/PhotoGrid';
import { getProjectsByCategory } from '@/lib/data/projects';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds } from '@/lib/data/photos';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('travel');
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.intro,
    keywords: page.metaKeywords || undefined
  };
}

export default async function TravelPage() {
  const projects = await getProjectsByCategory('travel');
  const page = await getPageBySlug('travel');
  const galleryPhotos = await getPhotosByIds(page.gallery);

  return (
    <section className="space-y-10">
      <SectionHeader title={page.title} subtitle={page.intro} />
      {page.body && <p className="max-w-2xl text-sm text-black/60">{page.body}</p>}
      <ProjectGrid projects={projects} />
      <PhotoGrid photos={galleryPhotos} />
    </section>
  );
}
