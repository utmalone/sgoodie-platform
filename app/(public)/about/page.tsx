import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { DraftAboutText } from '@/components/preview/DraftAboutText';
import { DraftAboutIntroParagraphs } from '@/components/preview/DraftAboutIntroParagraphs';
import { DraftAboutApproachText } from '@/components/preview/DraftAboutApproachText';
import { DraftAboutFeaturedPublications } from '@/components/preview/DraftAboutFeaturedPublications';
import { DraftAboutBioParagraphs } from '@/components/preview/DraftAboutBioParagraphs';
import { getAboutContent } from '@/lib/data/about';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds, getPhotoById } from '@/lib/data/photos';
import styles from '@/styles/public/AboutPage.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('about');
  return {
    title: page.metaTitle || 'About',
    description: page.metaDescription || page.intro,
    keywords: page.metaKeywords || undefined
  };
}

type AboutPageProps = {
  searchParams: Promise<{ preview?: string }>;
};

export default async function AboutPage({ searchParams }: AboutPageProps) {
  const { preview } = await searchParams;
  const isPreview = preview === 'draft';

  const content = await getAboutContent();
  const heroPhoto = await getPhotoById(content.heroPhotoId);
  const approachPhotoIds = content.approachItems.map((item) => item.photoId);
  const approachPhotos = await getPhotosByIds(approachPhotoIds);
  const approachPhotoMap = new Map(approachPhotos.map((photo) => [photo.id, photo]));
  const bioPhoto = await getPhotoById(content.bio.photoId);

  return (
    <div className={styles.wrapper}>
      {/* Hero Section */}
      {heroPhoto && (
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
                {isPreview ? (
                  <DraftAboutText field="heroTitle" fallback={content.heroTitle} enabled />
                ) : (
                  content.heroTitle
                )}
              </h1>
              <p className={styles.heroSubtitle}>
                {isPreview ? (
                  <DraftAboutText field="heroSubtitle" fallback={content.heroSubtitle} enabled />
                ) : (
                  content.heroSubtitle
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Intro Section */}
      <section className={styles.introSection}>
        <div className={styles.introContent}>
          {isPreview ? (
            <DraftAboutIntroParagraphs
              fallback={content.introParagraphs}
              normalClassName={styles.introText}
              boldClassName={styles.introBold}
              enabled
            />
          ) : (
            content.introParagraphs.map((paragraph, idx) => (
              <p
                key={idx}
                className={idx === 1 ? styles.introBold : styles.introText}
              >
                {paragraph}
              </p>
            ))
          )}
        </div>
      </section>

      {/* Approach Section */}
      <section className={styles.approachSection}>
        <h2 className={styles.sectionTitle}>
          {isPreview ? (
            <DraftAboutText field="approachTitle" fallback={content.approachTitle} enabled />
          ) : (
            content.approachTitle
          )}
        </h2>
        <div className={styles.approachGrid}>
          {content.approachItems.map((item) => {
            const photo = approachPhotoMap.get(item.photoId);
            if (!photo) return null;
            return (
              <div key={item.id} className={styles.approachCard}>
                <div className={styles.approachImage}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className={styles.approachImg}
                  />
                </div>
                <h3 className={styles.approachTitle}>
                  {isPreview ? (
                    <DraftAboutApproachText itemId={item.id} field="title" fallback={item.title} enabled />
                  ) : (
                    item.title
                  )}
                </h3>
                <p className={styles.approachDescription}>
                  {isPreview ? (
                    <DraftAboutApproachText
                      itemId={item.id}
                      field="description"
                      fallback={item.description}
                      enabled
                    />
                  ) : (
                    item.description
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured In Section */}
      <section className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>
          {isPreview ? (
            <DraftAboutText field="featuredTitle" fallback={content.featuredTitle} enabled />
          ) : (
            content.featuredTitle
          )}
        </h2>
        <div className={styles.featuredGrid}>
          {isPreview ? (
            <DraftAboutFeaturedPublications
              fallback={content.featuredPublications}
              itemClassName={styles.featuredItem}
              enabled
            />
          ) : (
            content.featuredPublications.map((pub, idx) => (
              <p key={idx} className={styles.featuredItem}>
                {pub}
              </p>
            ))
          )}
        </div>
      </section>

      {/* Bio Section */}
      <section className={styles.bioSection}>
        <div className={styles.bioImageWrap}>
          {bioPhoto && (
            <Image
              src={bioPhoto.src}
              alt={bioPhoto.alt}
              fill
              sizes="(max-width: 768px) 100vw, 30vw"
              className={styles.bioImg}
            />
          )}
        </div>
        <div className={styles.bioContent}>
          <h2 className={styles.bioTitle}>
            About{' '}
            {isPreview ? (
              <DraftAboutText field="bioName" fallback={content.bio.name} enabled />
            ) : (
              content.bio.name
            )}
          </h2>
          {isPreview ? (
            <DraftAboutBioParagraphs
              fallback={content.bio.paragraphs}
              paragraphClassName={styles.bioText}
              enabled
            />
          ) : (
            content.bio.paragraphs.map((paragraph, idx) => (
              <p key={idx} className={styles.bioText}>
                {paragraph}
              </p>
            ))
          )}
          <Link href="/contact" className={styles.bioLink}>
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
