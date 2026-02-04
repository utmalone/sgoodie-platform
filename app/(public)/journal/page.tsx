import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { JournalGrid } from '@/components/portfolio/JournalGrid';
import { getAllJournalPosts } from '@/lib/data/journal';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds, getPhotoById } from '@/lib/data/photos';
import styles from '@/styles/public/JournalPage.module.css';

const POSTS_PER_PAGE = 21; // 7 rows × 3 columns

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('journal');
  return {
    title: page.metaTitle || 'Journal',
    description: page.metaDescription || page.intro,
    keywords: page.metaKeywords || undefined
  };
}

type JournalPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  
  const page = await getPageBySlug('journal');
  const allPosts = (await getAllJournalPosts()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate pagination
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const posts = allPosts.slice(startIndex, endIndex);

  const hasOlderPosts = currentPage < totalPages;
  const hasNewerPosts = currentPage > 1;

  // Get hero photo from page gallery
  const heroPhoto = page.gallery[0] ? await getPhotoById(page.gallery[0]) : null;

  // Get all hero photos for current page of journal posts
  const heroPhotoIds = posts.map((post) => post.heroPhotoId);
  const heroPhotos = await getPhotosByIds(heroPhotoIds);
  const photosById = new Map(heroPhotos.map((photo) => [photo.id, photo]));

  return (
    <div className={styles.wrapper}>
      {/* Hero Section */}
      {heroPhoto && (
        <section className={styles.heroSection}>
          <div className={styles.heroImage}>
            <Image
              src={heroPhoto.src}
              alt={heroPhoto.alt}
              fill
              priority
              sizes="100vw"
              className={styles.heroImg}
            />
            <div className={styles.heroOverlay} />
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Journal</h1>
              <p className={styles.heroSubtitle}>{page.title}</p>
            </div>
          </div>
        </section>
      )}

      {/* Journal Posts Grid */}
      <section className={styles.gridSection}>
        <JournalGrid posts={posts} photosById={photosById} />

        {/* Pagination */}
        {(hasNewerPosts || hasOlderPosts) && (
          <nav className={styles.pagination}>
            {hasNewerPosts && (
              <Link
                href={currentPage === 2 ? '/journal' : `/journal?page=${currentPage - 1}`}
                className={styles.paginationLink}
              >
                <span className={styles.paginationArrow}>‹</span>
                Newer Posts
              </Link>
            )}
            {hasOlderPosts && (
              <Link
                href={`/journal?page=${currentPage + 1}`}
                className={`${styles.paginationLink} ${styles.paginationLinkRight}`}
              >
                Older Posts
                <span className={styles.paginationArrow}>›</span>
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
