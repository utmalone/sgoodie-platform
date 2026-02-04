import Image from 'next/image';
import Link from 'next/link';
import type { JournalPost, PhotoAsset } from '@/types';
import styles from '@/styles/public/JournalGrid.module.css';

type JournalGridProps = {
  posts: JournalPost[];
  photosById: Map<string, PhotoAsset>;
};

/**
 * Grid of journal post cards with hero photos, category labels,
 * titles, excerpts, and "Read More" links.
 */
export function JournalGrid({ posts, photosById }: JournalGridProps) {
  if (posts.length === 0) return null;

  return (
    <div className={styles.grid}>
      {posts.map((post) => {
        const photo = photosById.get(post.heroPhotoId);
        if (!photo) return null;

        return (
          <article key={post.id} className={styles.card}>
            <Link href={`/journal/${post.slug}`} className={styles.imageLink}>
              <div className={styles.imageWrap}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className={styles.image}
                />
              </div>
            </Link>
            <div className={styles.content}>
              <p className={styles.category}>{post.category}</p>
              <h3 className={styles.title}>
                <Link href={`/journal/${post.slug}`} className={styles.titleLink}>
                  {post.title}
                </Link>
              </h3>
              <p className={styles.excerpt}>{post.excerpt}</p>
              <Link href={`/journal/${post.slug}`} className={styles.readMore}>
                Read More
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
