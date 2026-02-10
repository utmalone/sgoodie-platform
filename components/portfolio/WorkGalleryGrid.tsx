import Image from 'next/image';
import Link from 'next/link';
import type { PhotoAsset, Project, ProjectCategory } from '@/types';
import styles from '@/styles/public/WorkGalleryGrid.module.css';

type WorkGalleryItem = {
  project: Project;
  photo: PhotoAsset;
};

type WorkGalleryGridProps = {
  items: WorkGalleryItem[];
  isPreview?: boolean;
  category?: ProjectCategory;
};

export function WorkGalleryGrid({ items, isPreview = false, category }: WorkGalleryGridProps) {
  if (items.length === 0) return null;

  return (
    <div className={styles.grid}>
      {items.map(({ project, photo }) => {
        const label = project.hoverTitle || project.title;
        const isDraft = project.status === 'draft';
        // Use category from prop or from project
        const projectCategory = category || project.category;

        const card = (
          <div className={styles.card}>
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
              className={styles.image}
            />
            <div className={styles.overlay}>
              <span className={styles.overlayText}>{label}</span>
              {isDraft && !isPreview && <span className={styles.status}>Coming Soon</span>}
              {isDraft && isPreview && <span className={styles.statusDraft}>Draft</span>}
            </div>
          </div>
        );

        // In preview mode, drafts are clickable
        if (isDraft && !isPreview) {
          return (
            <div key={project.id} className={styles.itemStatic} aria-disabled="true">
              {card}
            </div>
          );
        }

        // Build the href - add preview param if in preview mode
        const basePath = projectCategory 
          ? `/portfolio/${projectCategory}/${project.slug}`
          : `/portfolio/hotels/${project.slug}`;
        const href = isPreview ? `${basePath}?preview=draft` : basePath;

        return (
          <Link
            key={project.id}
            href={href}
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
