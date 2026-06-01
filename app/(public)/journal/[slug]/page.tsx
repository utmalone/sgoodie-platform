import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JournalArticle } from '@/components/portfolio/JournalArticle';
import { JournalPostDraftClient } from '@/components/preview/JournalPostDraftClient';
import { getAllJournalPosts, getJournalPostBySlug } from '@/lib/data/journal';
import { getPhotosByIds } from '@/lib/data/photos';
import styles from '@/styles/public/JournalPostPage.module.css';

type JournalPostPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const posts = await getAllJournalPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: JournalPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPostBySlug(slug);
  if (!post) return {};

  const title = (post.metaTitle?.trim() || `${post.title} | Journal`).trim();
  const description = (post.metaDescription?.trim() || post.excerpt || '').trim();

  let heroSrc: string | undefined;
  if (post.heroPhotoId) {
    const [hero] = await getPhotosByIds([post.heroPhotoId]);
    heroSrc = hero?.src;
  }

  return {
    title,
    description,
    keywords: post.metaKeywords?.trim() ? post.metaKeywords.trim() : undefined,
    openGraph: {
      title,
      description,
      type: 'article',
      ...(heroSrc ? { images: [{ url: heroSrc, alt: post.title }] } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(heroSrc ? { images: [heroSrc] } : {})
    }
  };
}

export default async function JournalPostPage({ params, searchParams }: JournalPostPageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === 'draft';

  const post = await getJournalPostBySlug(slug);
  if (!post) notFound();

  const heroIds = post.heroPhotoId ? [post.heroPhotoId] : [];
  const galleryIds = post.galleryPhotoIds || [];
  const allIds = [...new Set([...heroIds, ...galleryIds].filter(Boolean))];
  const photos = await getPhotosByIds(allIds);
  const photosById = new Map(photos.map((photo) => [photo.id, photo]));

  const heroPhoto = post.heroPhotoId ? photosById.get(post.heroPhotoId) : undefined;
  const gridPhotos = galleryIds
    .map((id) => photosById.get(id))
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));

  /** For preview client: same combined list as before for photo fetching */
  const previewGridPhotos = allIds.map((id) => photosById.get(id)).filter(Boolean) as typeof photos;

  const dateLabel = post.date
    ? new Date(post.date + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  return (
    <div className={styles.wrapper}>
      {isPreview ? (
        <JournalPostDraftClient fallbackPost={post} gridPhotos={previewGridPhotos} enabled />
      ) : (
        <>
          {heroPhoto ? (
            <section className={styles.heroSection}>
              <div className={styles.heroImageWrap}>
                <Image
                  src={heroPhoto.src}
                  alt={heroPhoto.alt || post.title}
                  fill
                  priority
                  sizes="100vw"
                  className={styles.heroImg}
                />
              </div>
            </section>
          ) : null}

          <header className={styles.header}>
            <h1 className={styles.title}>{post.title}</h1>
            <p className={styles.category}>{post.category}</p>
            {dateLabel ? (
              <p className={styles.metaRow}>
                {post.author} · {dateLabel}
              </p>
            ) : (
              <p className={styles.metaRow}>{post.author}</p>
            )}
          </header>

          <section className={styles.contentSection}>
            <JournalArticle body={post.body || ''} photos={gridPhotos} />
          </section>
        </>
      )}

      <div className={styles.backSection}>
        <Link href={isPreview ? '/journal?preview=draft' : '/journal'} className={styles.backLink}>
          {'<- Back to Journal'}
        </Link>
      </div>
    </div>
  );
}
