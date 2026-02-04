import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JournalPhotoGrid } from '@/components/portfolio/JournalPhotoGrid';
import { getAllJournalPosts, getJournalPostBySlug } from '@/lib/data/journal';
import { getPhotosByIds } from '@/lib/data/photos';
import styles from '@/styles/public/JournalPostPage.module.css';

type JournalPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getAllJournalPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: JournalPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Journal`,
    description: post.excerpt
  };
}

export default async function JournalPostPage({ params }: JournalPostPageProps) {
  const { slug } = await params;
  const post = await getJournalPostBySlug(slug);
  if (!post) notFound();

  // Get hero photo and gallery photos
  const allPhotoIds = [post.heroPhotoId, ...post.galleryPhotoIds];
  const photos = await getPhotosByIds(allPhotoIds);
  const photosById = new Map(photos.map((photo) => [photo.id, photo]));
  
  // Combine hero and gallery photos for the grid
  const gridPhotos = allPhotoIds
    .map((id) => photosById.get(id))
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.category}>{post.category}</p>
      </header>

      {/* Photo Grid */}
      {gridPhotos.length > 0 && (
        <section className={styles.gridSection}>
          <JournalPhotoGrid photos={gridPhotos} />
        </section>
      )}

      {/* Content Section - Body and Credits */}
      <section className={styles.contentSection}>
        <div className={styles.contentGrid}>
          {/* Body Text */}
          <div className={styles.bodyColumn}>
            {post.body.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className={styles.bodyParagraph}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Credits */}
          {post.credits && post.credits.length > 0 && (
            <aside className={styles.creditsColumn}>
              <p className={styles.creditsLabel}>Credits</p>
              <div className={styles.creditsDivider} />
              <div className={styles.creditsList}>
                {post.credits.map((credit) => (
                  <div key={`${credit.label}-${credit.value}`} className={styles.creditItem}>
                    <span className={styles.creditLabel}>{credit.label}:</span>
                    <span className={styles.creditValue}>{credit.value}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* Back Link */}
      <div className={styles.backSection}>
        <Link href="/journal" className={styles.backLink}>
          ← Back to Journal
        </Link>
      </div>
    </div>
  );
}
