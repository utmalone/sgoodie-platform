import type { Metadata } from 'next';
import { FullBleedHero } from '@/components/portfolio/FullBleedHero';
import { HomeGalleryGrid } from '@/components/portfolio/HomeGalleryGrid';
import { DraftPageText } from '@/components/preview/DraftPageText';
import { DraftHomeLayoutText } from '@/components/preview/DraftHomeLayoutText';
import { DraftHomePhotosSection } from '@/components/preview/DraftHomePhotosSection';
import { getHomeLayout } from '@/lib/data/home';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds } from '@/lib/data/photos';
import styles from '@/styles/public/HomePage.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const [page, layout] = await Promise.all([
    getPageBySlug('home'),
    getHomeLayout()
  ]);
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || layout.introText || page.intro,
    keywords: page.metaKeywords || undefined
  };
}

type HomePageProps = {
  searchParams: Promise<{ preview?: string }>;
};

const introMark = (
  <div className={styles.introMark}>
    <svg viewBox="0 0 48 24" aria-hidden="true">
      <path
        d="M8 16 L24 6 L24 18 L40 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export default async function HomePage({ searchParams }: HomePageProps) {
  const { preview } = await searchParams;
  const isPreview = preview === 'draft';

  const page = await getPageBySlug('home');
  const layout = await getHomeLayout();
  const [heroPhoto] = await getPhotosByIds([layout.heroPhotoId]);
  const featurePhotos = await getPhotosByIds(layout.featurePhotoIds);

  const heroEyebrowText = layout.heroEyebrow ?? 'S.Goodie Photography';
  const heroContent = (
    <div className={styles.heroContent}>
      <p className={styles.heroEyebrow}>
        {isPreview ? (
          <DraftHomeLayoutText field="heroEyebrow" fallback={heroEyebrowText} enabled />
        ) : (
          heroEyebrowText
        )}
      </p>
      <h1 className={styles.heroTitle}>
        {isPreview ? (
          <DraftPageText slug="home" field="title" fallback={page.title} enabled />
        ) : (
          page.title
        )}
      </h1>
      <p className={styles.heroSubtitle}>
        {isPreview ? (
          <DraftPageText slug="home" field="intro" fallback={page.intro} enabled />
        ) : (
          page.intro
        )}
      </p>
    </div>
  );

  const introContent = (
    <>
      {introMark}
      <p className={styles.introText}>
        {isPreview ? (
          <DraftHomeLayoutText field="introText" fallback={layout.introText} enabled />
        ) : (
          layout.introText
        )}
      </p>
    </>
  );

  if (isPreview) {
    return (
      <div className={styles.wrapper}>
        <DraftHomePhotosSection
          isPreview
          initialLayout={layout}
          initialHeroPhoto={heroPhoto}
          initialFeaturePhotos={featurePhotos}
          heroContent={heroContent}
          introContent={introContent}
        />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {heroPhoto && (
        <FullBleedHero
          photo={heroPhoto}
          minHeight="screen"
          style={{
            ...(layout.heroEyebrowColor ? { '--hero-eyebrow-color': layout.heroEyebrowColor } : {}),
            ...(layout.heroTitleColor ? { '--hero-title-color': layout.heroTitleColor } : {}),
            ...(layout.heroSubtitleColor ? { '--hero-subtitle-color': layout.heroSubtitleColor } : {})
          } as React.CSSProperties}
        >
          {heroContent}
        </FullBleedHero>
      )}
      <section className={styles.introSection}>
        <div className={styles.introWrapper}>{introContent}</div>
        <HomeGalleryGrid photos={featurePhotos} />
      </section>
    </div>
  );
}
