import Image from 'next/image';
import type { PhotoAsset } from '@/types';
import styles from '@/styles/public/ProjectHero.module.css';

type ProjectHeroProps = {
  title: string;
  subtitle?: string;
  intro?: string;
  photo: PhotoAsset;
  heroTitleColor?: string;
  heroSubtitleColor?: string;
};

/**
 * Full-bleed hero with title/subtitle/intro overlaid centered on the image.
 * Used on portfolio detail pages.
 */
export function ProjectHero({ title, subtitle, intro, photo, heroTitleColor, heroSubtitleColor }: ProjectHeroProps) {
  const heroStyle = {
    ...(heroTitleColor ? { '--hero-title-color': heroTitleColor } : {}),
    ...(heroSubtitleColor ? { '--hero-subtitle-color': heroSubtitleColor } : {})
  } as React.CSSProperties;

  return (
    <section className={styles.wrapper} data-hero="true" style={heroStyle}>
      <div className={styles.imageContainer}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          priority
          sizes="100vw"
          className={styles.image}
        />
        <div className={styles.overlay} />
        <div className={styles.textBlock}>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          <h1 className={styles.title}>{title}</h1>
          {/* {intro && <p className={styles.intro}>{intro}</p>} */}
        </div>
      </div>
    </section>
  );
}
