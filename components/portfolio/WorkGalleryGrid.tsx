import Image from 'next/image';
import Link from 'next/link';
import type { PhotoAsset, Project } from '@/types';
import styles from '@/styles/public/WorkGalleryGrid.module.css';

type WorkGalleryItem = {
  project: Project;
  photo: PhotoAsset;
};

type WorkGalleryGridProps = {
  items: WorkGalleryItem[];
};

export function WorkGalleryGrid({ items }: WorkGalleryGridProps) {
  if (items.length === 0) return null;

  return (
    <div className={styles.grid}>
      {items.map(({ project, photo }) => {
        const label = project.hoverTitle || project.title;
        const isDraft = project.status === 'draft';

        const card = (
          <div className={styles.card}>
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={styles.image}
            />
            <div className={styles.overlay}>
              <span className={styles.overlayText}>{label}</span>
              {isDraft && <span className={styles.status}>Coming Soon</span>}
            </div>
          </div>
        );

        if (isDraft) {
          return (
            <div key={project.id} className={styles.itemStatic} aria-disabled="true">
              {card}
            </div>
          );
        }

        return (
          <Link
            key={project.id}
            href={`/work/${project.slug}`}
            className={styles.itemLink}
            aria-label={`View ${label}`}
          >
            {card}
          </Link>
        );
      })}
    </div>
  );
}
