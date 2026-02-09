'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ApproachItem } from '@/types';
import type { PhotoAsset } from '@/types';
import { loadDraftAboutContent } from '@/lib/admin/draft-about-store';
import { DraftAboutApproachText } from '@/components/preview/DraftAboutApproachText';
import styles from '@/styles/public/AboutPage.module.css';

const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';
const DRAFT_ABOUT_KEY = 'sgoodie.admin.draft.about';

type DraftAboutApproachSectionProps = {
  isPreview: boolean;
  approachItems: ApproachItem[];
  approachPhotoMap: Map<string, PhotoAsset>;
};

/** Reorder API items by draft order. Draft order is the array order of ids. */
function applyDraftOrder(
  apiItems: ApproachItem[],
  draftIds: string[]
): ApproachItem[] {
  if (draftIds.length === 0) return apiItems;
  const byId = new Map(apiItems.map((i) => [i.id, i]));
  const ordered: ApproachItem[] = [];
  for (const id of draftIds) {
    const item = byId.get(id);
    if (item?.photoId) ordered.push(item);
  }
  const remaining = apiItems.filter((i) => !draftIds.includes(i.id) && i.photoId);
  return [...ordered, ...remaining];
}

export function DraftAboutApproachSection({
  isPreview,
  approachItems,
  approachPhotoMap
}: DraftAboutApproachSectionProps) {
  const [orderedItems, setOrderedItems] = useState(approachItems);

  useEffect(() => {
    if (!isPreview) {
      queueMicrotask(() => setOrderedItems(approachItems));
      return;
    }

    const load = () => {
      const draft = loadDraftAboutContent();
      const draftIds = draft?.approachItems?.map((i) => i.id).filter(Boolean) ?? [];
      setOrderedItems(applyDraftOrder(approachItems, draftIds));
    };

    load();

    const pollId = window.setInterval(load, 500);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DRAFT_ABOUT_KEY || event.key === PREVIEW_REFRESH_KEY) load();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isPreview, approachItems]);

  const items = isPreview ? orderedItems : approachItems;

  return (
    <div className={styles.approachGrid}>
      {items.map((item, index) => {
        const photo = approachPhotoMap.get(item.photoId);
        if (!photo) return null;
        return (
          <div key={`approach-${index}-${item.id}`} className={styles.approachCard}>
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
  );
}
