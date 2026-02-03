import type { Metadata } from 'next';
import Link from 'next/link';
import { PhotoGrid } from '@/components/portfolio/PhotoGrid';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds } from '@/lib/data/photos';

const categories = [
  {
    title: 'Interiors',
    description: 'Home, garden, hospitality, and architectural storytelling.',
    href: '/work/interiors'
  },
  {
    title: 'Travel',
    description: 'Places, textures, and light from around the world.',
    href: '/work/travel'
  },
  {
    title: 'Brand Marketing',
    description: 'Visual identity for personal and commercial brands.',
    href: '/work/brand-marketing'
  }
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('work');
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.intro,
    keywords: page.metaKeywords || undefined
  };
}

export default async function WorkPage() {
  const page = await getPageBySlug('work');
  const galleryPhotos = await getPhotosByIds(page.gallery);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-black/50">Work</p>
        <h1 className="mt-4 text-4xl font-semibold">{page.title}</h1>
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
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.title}
            href={category.href}
            className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h2 className="text-2xl font-semibold">{category.title}</h2>
            <p className="mt-3 text-sm text-black/60">{category.description}</p>
          </Link>
        ))}
      </div>

      <PhotoGrid photos={galleryPhotos} />
    </div>
  );
}
