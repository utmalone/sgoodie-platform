import type { Metadata } from 'next';
import { ProjectGrid } from '@/components/portfolio/ProjectGrid';
import { PhotoGrid } from '@/components/portfolio/PhotoGrid';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { getFeaturedProjects } from '@/lib/data/projects';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds } from '@/lib/data/photos';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('home');
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.intro,
    keywords: page.metaKeywords || undefined
  };
}

export default async function HomePage() {
  const projects = await getFeaturedProjects();
  const page = await getPageBySlug('home');
  const galleryPhotos = await getPhotosByIds(page.gallery);

  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-black/10 bg-white p-10 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-black/50">S.Goodie Photography</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">{page.title}</h1>
        <p className="mt-4 max-w-2xl text-base text-black/70">{page.intro}</p>
        {page.body && <p className="mt-4 max-w-2xl text-base text-black/70">{page.body}</p>}
        {page.ctaLabel && page.ctaUrl && (
          <a
            href={page.ctaUrl}
            className="mt-6 inline-flex rounded-full border border-black/20 px-6 py-2 text-xs uppercase tracking-[0.35em] text-black/70 hover:text-black"
          >
            {page.ctaLabel}
          </a>
        )}
      </section>

      {galleryPhotos.length > 0 && (
        <section>
          <SectionHeader title="Gallery" subtitle="Curated imagery selected for the home page." />
          <PhotoGrid photos={galleryPhotos} />
        </section>
      )}

      <section>
        <SectionHeader
          title="Featured Work"
          subtitle="A short selection of recent interior, travel, and brand marketing projects."
        />
        <ProjectGrid projects={projects} />
      </section>
    </div>
  );
}
