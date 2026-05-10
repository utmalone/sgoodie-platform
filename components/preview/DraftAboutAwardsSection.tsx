'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { Award, PhotoAsset } from '@/types';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { useMounted } from '@/lib/preview/use-mounted';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';
import styles from '@/styles/public/AboutPage.module.css';

const DRAFT_ABOUT_KEY = 'sgoodie.admin.draft.about';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

type DraftAboutAwardsSectionProps = {
  isPreview: boolean;
  awards: Award[];
  photoById: Map<string, PhotoAsset>;
};

export function DraftAboutAwardsSection({ isPreview, awards, photoById }: DraftAboutAwardsSectionProps) {
  const mounted = useMounted();
  const signal = usePreviewKeySignal([DRAFT_ABOUT_KEY, PREVIEW_REFRESH_KEY], isPreview);
  const [flippedId, setFlippedId] = useState<string | null>(null);

  const list = useMemo(() => {
    if (!isPreview) return awards;
    if (!mounted) return awards;
    void signal;
    const draft = loadDraftAboutContent();
    if (draft?.awards?.length) return draft.awards;
    return awards;
  }, [awards, isPreview, signal, mounted]);

  if (list.length === 0) return null;

  return (
    <div className={styles.awardsGrid}>
      {list.map((award) => {
        const photo = award.photoId ? photoById.get(award.photoId) : null;
        const desc = award.description?.trim();
        return (
          <button
            key={award.id}
            type="button"
            className={`${styles.awardCard} ${flippedId === award.id ? styles.awardCardFlipped : ''}`}
            aria-pressed={flippedId === award.id}
            aria-label={
              flippedId === award.id
                ? `Award: ${award.name || 'Award'}. Showing details. Click to show photo.`
                : `Award: ${award.name || 'Award'}. Click to read details.`
            }
            onClick={() =>
              setFlippedId((curr) => {
                if (curr === award.id) return null;
                return award.id;
              })
            }
          >
            <div className={styles.awardCardInner}>
              <div className={styles.awardCardFront}>
                {photo ? (
                  <div className={styles.awardImageWrap}>
                    <Image
                      src={photo.src}
                      alt={photo.alt || award.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className={styles.awardImg}
                    />
                    <div className={styles.awardCardOverlay}>
                      {award.name ? <p className={styles.awardNameOverlay}>{award.name}</p> : null}
                      {award.year ? <p className={styles.awardYearOverlay}>{award.year}</p> : null}
                    </div>
                  </div>
                ) : (
                  <div className={styles.awardImagePlaceholder} aria-hidden>
                    <div className={styles.awardCardOverlay}>
                      {award.name ? <p className={styles.awardNameOverlay}>{award.name}</p> : null}
                      {award.year ? <p className={styles.awardYearOverlay}>{award.year}</p> : null}
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.awardCardBack}>
                {desc ? (
                  <p className={styles.awardDescription}>{desc}</p>
                ) : (
                  <p className={styles.awardDescriptionEmpty}>No description yet.</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
