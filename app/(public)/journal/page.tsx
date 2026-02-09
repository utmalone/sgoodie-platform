import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { JournalGrid } from '@/components/portfolio/JournalGrid';
import { DraftPageText } from '@/components/preview/DraftPageText';
import { DraftJournalGridSection } from '@/components/preview/DraftJournalGridSection';
import { DraftHeroColors } from '@/components/preview/DraftHeroColors';
import { getAllJournalPosts } from '@/lib/data/journal';
import { getJournalIndex } from '@/lib/data/journal-index';
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
  searchParams: Promise<{ page?: string; preview?: string }>;
};

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const isPreview = params.preview === 'draft';
  
  const page = await getPageBySlug('journal');
  const [rawPosts, journalIndex] = await Promise.all([
    getAllJournalPosts(),
    getJournalIndex()
  ]);

  const dateSorted = rawPosts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const allPosts =
    journalIndex.postIds.length > 0
      ? (() => {
          const byId = new Map(dateSorted.map((p) => [p.id, p]));
          const ordered = journalIndex.postIds
            .map((id) => byId.get(id))
            .filter(Boolean) as typeof dateSorted;
          const remaining = dateSorted.filter((p) => !journalIndex.postIds.includes(p.id));
          return [...ordered, ...remaining];
        })()
      : dateSorted;

  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const posts = allPosts.slice(startIndex, endIndex);

  const hasOlderPosts = currentPage < totalPages;
  const hasNewerPosts = currentPage > 1;

  // Get hero photo from page gallery
  const heroPhoto = page.gallery[0] ? await getPhotoById(page.gallery[0]) : null;

  // Get hero photos for journal posts (all posts when preview for draft order)
  const heroPhotoIds = isPreview
    ? allPosts.map((p) => p.heroPhotoId).filter(Boolean)
    : posts.map((post) => post.heroPhotoId);
  const heroPhotos = await getPhotosByIds(heroPhotoIds);
  const photosById = new Map(heroPhotos.map((photo) => [photo.id, photo]));

  const buildHref = (pageNumber: number) => {
    const base = pageNumber <= 1 ? '/journal' : `/journal?page=${pageNumber}`;
    if (!isPreview) return base;
    return `${base}${base.includes('?') ? '&' : '?'}preview=draft`;
  };

  return (
    <div className={styles.wrapper}>
      {/* Hero Section */}
      {heroPhoto && isPreview ? (
        <DraftHeroColors
          store="pages"
          slug="journal"
          savedTitleColor={page.heroTitleColor}
          savedSubtitleColor={page.heroSubtitleColor}
        >
          <section className={styles.heroSection} data-hero="true">
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
                <h1 className={styles.heroTitle}>
                  <DraftPageText slug="journal" field="title" fallback={page.title} enabled />
                </h1>
                <p className={styles.heroSubtitle}>
                  <DraftPageText slug="journal" field="intro" fallback={page.intro} enabled />
                </p>
              </div>
            </div>
          </section>
        </DraftHeroColors>
      ) : heroPhoto ? (
        <section
          className={styles.heroSection}
          data-hero="true"
          style={{
            ...(page.heroTitleColor ? { '--hero-title-color': page.heroTitleColor } : {}),
            ...(page.heroSubtitleColor ? { '--hero-subtitle-color': page.heroSubtitleColor } : {})
          } as React.CSSProperties}
        >
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
              <h1 className={styles.heroTitle}>{page.title}</h1>
              <p className={styles.heroSubtitle}>{page.intro}</p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Journal Posts Grid */}
      <section className={styles.gridSection}>
        {isPreview ? (
          <DraftJournalGridSection
            isPreview
            allPosts={allPosts}
            photosById={photosById}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        ) : (
          <JournalGrid posts={posts} photosById={photosById} isPreview={false} />
        )}

        {/* Pagination */}
        {(hasNewerPosts || hasOlderPosts) && (
          <nav className={styles.pagination}>
            {hasNewerPosts && (
              <Link
                href={buildHref(currentPage - 1)}
                className={styles.paginationLink}
              >
                <span className={styles.paginationArrow}>‹</span>
                Newer Posts
              </Link>
            )}
            {hasOlderPosts && (
              <Link
                href={buildHref(currentPage + 1)}
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
