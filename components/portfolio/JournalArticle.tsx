'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { PhotoAsset } from '@/types';
import { JournalMarkdown } from './JournalMarkdown';
import { GalleryLightbox } from './GalleryLightbox';
import styles from '@/styles/public/JournalPostPage.module.css';
import gridStyles from '@/styles/public/JournalPhotoGrid.module.css';

type JournalArticleProps = {
  body: string;
  /**
   * Gallery photos in order. They are paired with sections (alternating sides)
   * until the photos run out; any extras fall into the grid below.
   */
  photos: PhotoAsset[];
};

type ParsedSection = {
  heading: string;
  content: string;
};

type ParsedBody = {
  intro: string;
  sections: ParsedSection[];
};

/**
 * Split markdown into an intro (everything before the first `##` heading) and
 * a list of `##` sections. `###` and deeper headings stay inside their section.
 */
function parseBody(markdown: string): ParsedBody {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const introLines: string[] = [];
  const sections: ParsedSection[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^##(?!#)\s+(.+?)\s*$/);
    if (match) {
      if (current) {
        sections.push({ heading: current.heading, content: current.lines.join('\n').trim() });
      }
      current = { heading: match[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  if (current) {
    sections.push({ heading: current.heading, content: current.lines.join('\n').trim() });
  }

  return { intro: introLines.join('\n').trim(), sections };
}

function sectionMarkdown(section: ParsedSection): string {
  return `## ${section.heading}\n\n${section.content}`.trim();
}

export function JournalArticle({ body, photos }: JournalArticleProps) {
  const { intro, sections } = useMemo(() => parseBody(body || ''), [body]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Pair a photo with each section, alternating sides, until photos run out.
  const sideBySideCount = Math.min(sections.length, photos.length);
  const gridPhotos = photos.slice(sideBySideCount);

  const handlePrev = () => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current - 1 + photos.length) % photos.length;
    });
  };

  const handleNext = () => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current + 1) % photos.length;
    });
  };

  const lightbox =
    photos.length > 0 ? (
      <GalleryLightbox
        photos={photos}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    ) : null;

  if (!intro && sections.length === 0) {
    if (photos.length === 0) return null;
    return (
      <>
        <section className={styles.gridSection}>
          <div className={gridStyles.grid}>
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                className={gridStyles.item}
                onClick={() => setActiveIndex(idx)}
                aria-label={`View ${photo.alt}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
                  className={gridStyles.image}
                />
              </button>
            ))}
          </div>
        </section>
        {lightbox}
      </>
    );
  }

  return (
    <>
      <article className={styles.article}>
        {intro && (
          <div className={styles.articleIntro}>
            <JournalMarkdown markdown={intro} />
          </div>
        )}

        {sections.map((section, index) => {
          const hasPhoto = index < sideBySideCount;

          if (hasPhoto) {
            const photo = photos[index];
            const reverse = index % 2 === 1;
            const sizeClass = index % 2 === 0 ? styles.splitPhotoPortrait : styles.splitPhotoLandscape;
            return (
              <div
                key={`section-${index}`}
                className={`${styles.splitSection} ${reverse ? styles.splitSectionReverse : ''}`}
              >
                <div className={styles.splitText}>
                  <JournalMarkdown markdown={sectionMarkdown(section)} />
                </div>
                <figure className={`${styles.splitPhoto} ${sizeClass}`}>
                  <button
                    type="button"
                    className={styles.splitPhotoFrame}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`View ${photo.alt || section.heading}`}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt || section.heading}
                      fill
                      sizes="(max-width: 899px) 100vw, 45vw"
                      className={styles.splitPhotoImg}
                    />
                  </button>
                </figure>
              </div>
            );
          }

          return (
            <div key={`section-${index}`} className={styles.centeredSection}>
              <JournalMarkdown markdown={sectionMarkdown(section)} />
            </div>
          );
        })}
      </article>

      {gridPhotos.length > 0 && (
        <section className={styles.gridSection}>
          <div className={gridStyles.grid}>
            {gridPhotos.map((photo, idx) => {
              const fullIndex = sideBySideCount + idx;
              return (
                <button
                  key={photo.id}
                  type="button"
                  className={gridStyles.item}
                  onClick={() => setActiveIndex(fullIndex)}
                  aria-label={`View ${photo.alt}`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 33vw"
                    className={gridStyles.image}
                  />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {lightbox}
    </>
  );
}
