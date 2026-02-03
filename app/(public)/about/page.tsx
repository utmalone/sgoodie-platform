import type { Metadata } from 'next';
import Image from 'next/image';
import { PhotoGrid } from '@/components/portfolio/PhotoGrid';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds } from '@/lib/data/photos';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('about');
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.intro,
    keywords: page.metaKeywords || undefined
  };
}

export default async function AboutPage() {
  const page = await getPageBySlug('about');
  const galleryPhotos = await getPhotosByIds(page.gallery);
  const heroPhoto = galleryPhotos[0];

  return (
    <div className="space-y-12">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-black/50">About</p>
          <h1 className="mt-4 text-4xl font-semibold">{page.title}</h1>
          <p className="mt-4 text-base text-black/70">{page.intro}</p>
          {page.body && <p className="mt-4 text-base text-black/70">{page.body}</p>}
          {page.ctaLabel && page.ctaUrl && (
            <a
              href={page.ctaUrl}
              className="mt-6 inline-flex rounded-full border border-black/20 px-6 py-2 text-xs uppercase tracking-[0.35em] text-black/70 hover:text-black"
            >
              {page.ctaLabel}
            </a>
          )}
        </div>
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <Image
            src={heroPhoto?.src || '/placeholder.svg'}
            alt={heroPhoto?.alt || 'Studio portrait'}
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
            priority
          />
        </div>
      </div>

      <PhotoGrid photos={galleryPhotos.slice(1)} />
    </div>
  );
}
