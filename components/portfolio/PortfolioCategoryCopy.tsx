'use client';

import { useMemo } from 'react';
import type { PortfolioCategory } from '@/lib/admin/portfolio-config';
import { loadDraftPages } from '@/lib/admin/draft-store';
import { useMounted } from '@/lib/preview/use-mounted';
import { usePreviewKeySignal } from '@/lib/preview/use-preview-signal';
import styles from '@/styles/public/WorkPage.module.css';

const DRAFT_PAGES_STORAGE_KEY = 'sgoodie.admin.draft';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

function splitParagraphs(text: string): string[] {
  return text
    .split('\n\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function useMergedPageText(
  slug: string,
  field: 'intro' | 'body',
  fallback: string,
  isPreview: boolean
): string {
  const mounted = useMounted();
  const signal = usePreviewKeySignal(
    [DRAFT_PAGES_STORAGE_KEY, PREVIEW_REFRESH_KEY],
    isPreview
  );

  return useMemo(() => {
    if (!isPreview || !mounted) return fallback;
    void signal;
    const pages = loadDraftPages();
    const page = pages?.find((item) => item.slug === slug);
    const value = page?.[field];
    return typeof value === 'string' ? value : fallback;
  }, [isPreview, field, slug, signal, fallback, mounted]);
}

type BlocksProps = {
  intro: string;
  body: string;
  category: PortfolioCategory;
};

function IntroBodyBlocks({ intro, body, category }: BlocksProps) {
  const introParts = splitParagraphs(intro);
  const bodyParts = splitParagraphs(body);
  if (introParts.length === 0 && bodyParts.length === 0) return null;

  const showBrandHeading = category === 'brand' && introParts.length > 0;
  const introRest = showBrandHeading ? introParts.slice(1) : introParts;
  const headingText = showBrandHeading ? introParts[0] : '';

  return (
    <div className={styles.copyBlock}>
      {(introParts.length > 0 || bodyParts.length > 0) && (
        <div className={styles.copyInner}>
          {introParts.length > 0 && (
            <div className={styles.intro}>
              {showBrandHeading && headingText ? (
                <h2 className={styles.copyHeading}>{headingText}</h2>
              ) : null}
              {introRest.map((p, i) => (
                <p key={`intro-${i}`} className={styles.introText}>
                  {p}
                </p>
              ))}
            </div>
          )}
          {bodyParts.length > 0 && (
            <div className={styles.body}>
              {bodyParts.map((p, i) => (
                <p key={`body-${i}`} className={styles.copyParagraph}>
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type PortfolioCategoryCopyProps = {
  slug: string;
  category: PortfolioCategory;
  liveIntro: string;
  liveBody: string;
  isPreview: boolean;
};

export function PortfolioCategoryCopy({
  slug,
  category,
  liveIntro,
  liveBody,
  isPreview
}: PortfolioCategoryCopyProps) {
  const intro = useMergedPageText(slug, 'intro', liveIntro, isPreview);
  const body = useMergedPageText(slug, 'body', liveBody, isPreview);

  return <IntroBodyBlocks intro={intro} body={body} category={category} />;
}
