import type { Metadata } from 'next';
import { FullBleedHero } from '@/components/portfolio/FullBleedHero';
import { HomeGalleryGrid } from '@/components/portfolio/HomeGalleryGrid';
import { getHomeLayout } from '@/lib/data/home';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds } from '@/lib/data/photos';
import styles from '@/styles/public/HomePage.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('home');
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.body,
    keywords: page.metaKeywords || undefined
  };
}

export default async function HomePage() {
  const page = await getPageBySlug('home');
  const layout = await getHomeLayout();
  const [heroPhoto] = await getPhotosByIds([layout.heroPhotoId]);
  const featurePhotos = await getPhotosByIds(layout.featurePhotoIds);

  return (
    <div className={styles.wrapper}>
      {heroPhoto && (
        <FullBleedHero photo={heroPhoto} minHeight="screen">
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>S.Goodie Photography</p>
            <h1 className={styles.heroTitle}>{page.title}</h1>
            <p className={styles.heroSubtitle}>{page.intro}</p>
            {/* {page.body && <p className={styles.heroBody}>{page.body}</p>} */}
          </div>
        </FullBleedHero>
      )}

      <section className={styles.introSection}>
        <div className={styles.introWrapper}>
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
          <p className={styles.introText}>
            Creating photographs that not only document spaces, but celebrate the artistry,
            vision, and craft behind them.
          </p>
        </div>
        <HomeGalleryGrid photos={featurePhotos} />
      </section>
    </div>
  );
}
