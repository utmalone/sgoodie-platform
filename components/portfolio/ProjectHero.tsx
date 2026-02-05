import Image from 'next/image';
import type { PhotoAsset } from '@/types';
import styles from '@/styles/public/ProjectHero.module.css';

type ProjectHeroProps = {
  title: string;
  subtitle?: string;
  intro?: string;
  photo: PhotoAsset;
};

/**
 * Full-bleed hero with title/subtitle/intro overlaid centered on the image.
 * Used on portfolio detail pages.
 */
export function ProjectHero({ title, subtitle, intro, photo }: ProjectHeroProps) {
  return (
    <section className={styles.wrapper} data-hero="true">
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
