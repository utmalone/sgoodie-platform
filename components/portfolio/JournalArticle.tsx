'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { PhotoAsset } from '@/types';
import { JournalMarkdown } from './JournalMarkdown';
import { JournalPhotoGrid } from './JournalPhotoGrid';
import styles from '@/styles/public/JournalPostPage.module.css';

type JournalArticleProps = {
  body: string;
  /** Gallery photos in order. The first few are placed beside sections; the rest fall into the grid. */
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

/** Number of leading sections that get an alternating side-by-side photo. */
const MAX_SIDE_BY_SIDE = 2;

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

  const sideBySideCount = Math.min(MAX_SIDE_BY_SIDE, sections.length, photos.length);
  const sectionPhotos = photos.slice(0, sideBySideCount);
  const gridPhotos = photos.slice(sideBySideCount);

  if (!intro && sections.length === 0) {
    return gridPhotos.length > 0 ? (
      <section className={styles.gridSection}>
        <JournalPhotoGrid photos={photos} />
      </section>
    ) : null;
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
          const photo = index < sideBySideCount ? sectionPhotos[index] : undefined;

          if (photo) {
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
                  <div className={styles.splitPhotoFrame}>
                    <Image
                      src={photo.src}
                      alt={photo.alt || section.heading}
                      fill
                      sizes="(max-width: 899px) 100vw, 45vw"
                      className={styles.splitPhotoImg}
                    />
                  </div>
                </figure>
              </div>
            );
          }

          return (
            <div key={`section-${index}`} className={styles.fullSection}>
              <JournalMarkdown markdown={sectionMarkdown(section)} />
            </div>
          );
        })}
      </article>

      {gridPhotos.length > 0 && (
        <section className={styles.gridSection}>
          <JournalPhotoGrid photos={gridPhotos} />
        </section>
      )}
    </>
  );
}
