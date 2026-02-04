'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { PhotoAsset, EditorialRow, EditorialRowCaption } from '@/types';
import { GalleryLightbox } from './GalleryLightbox';
import styles from '@/styles/public/EditorialGallery.module.css';

type EditorialGalleryProps = {
  photos: PhotoAsset[];
  rows?: EditorialRow[];
  /** Optional captions keyed by double-row index (0 = first double row, 1 = second double row, etc.) */
  captions?: EditorialRowCaption[];
};

type ComputedRow =
  | { type: 'single'; photo: PhotoAsset }
  | {
      type: 'double';
      left: PhotoAsset;
      right: PhotoAsset;
      /** Which side is offset down */
      offsetSide: 'left' | 'right';
      /** Caption only appears on rows with captions */
      caption?: EditorialRowCaption;
    };

/**
 * Build rows from a flat photo array using alternating double-single pattern.
 * Pattern: double → single → double → single → ...
 * Captions appear on every other double row (first double, third double, fifth double, etc.)
 */
function buildRowsFromPhotos(
  photos: PhotoAsset[],
  captions?: EditorialRowCaption[]
): ComputedRow[] {
  const result: ComputedRow[] = [];
  let photoIndex = 0;
  let doubleRowCount = 0;

  while (photoIndex < photos.length) {
    const remainingPhotos = photos.length - photoIndex;

    if (remainingPhotos >= 2) {
      const left = photos[photoIndex];
      const right = photos[photoIndex + 1];
      // Alternate which side is offset down
      const offsetSide: 'left' | 'right' = doubleRowCount % 2 === 0 ? 'left' : 'right';
      // Caption on every other double row (0, 2, 4, ...)
      const caption = doubleRowCount % 2 === 0 ? captions?.[Math.floor(doubleRowCount / 2)] : undefined;

      result.push({
        type: 'double',
        left,
        right,
        offsetSide,
        caption
      });

      photoIndex += 2;
      doubleRowCount += 1;

      // Now try to create a single row if we have at least 1 photo left
      if (photoIndex < photos.length) {
        result.push({ type: 'single', photo: photos[photoIndex] });
        photoIndex += 1;
      }
    } else if (remainingPhotos === 1) {
      const lastRow = result[result.length - 1];
      if (!lastRow || lastRow.type === 'double') {
        result.push({ type: 'single', photo: photos[photoIndex] });
      }
      photoIndex += 1;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Build rows from explicit configuration (admin-defined layout).
 */
function buildRowsFromConfig(
  rows: EditorialRow[],
  photosById: Map<string, PhotoAsset>
): ComputedRow[] {
  const result: ComputedRow[] = [];
  let doubleRowCount = 0;

  for (const row of rows) {
    if (row.type === 'single') {
      const photo = photosById.get(row.photoId);
      if (photo) {
        result.push({ type: 'single', photo });
      }
    } else {
      const left = photosById.get(row.leftPhotoId);
      const right = photosById.get(row.rightPhotoId);
      if (left && right) {
        const offsetSide: 'left' | 'right' = row.leftOffset === 'down' ? 'left' : 'right';
        result.push({
          type: 'double',
          left,
          right,
          offsetSide,
          caption: row.caption
        });
        doubleRowCount += 1;
      }
    }
  }

  return result;
}

/**
 * Editorial gallery component with alternating double/single row layout.
 * - Double rows WITH caption: short landscape photo + caption, tall portrait photo (offset)
 * - Double rows WITHOUT caption: two tall portrait photos (offset, one at top, one at bottom)
 * - Single rows: 1 large centered photo
 */
export function EditorialGallery({ photos, rows, captions }: EditorialGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const photosById = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo])),
    [photos]
  );

  const computedRows = useMemo(() => {
    if (rows && rows.length > 0) {
      return buildRowsFromConfig(rows, photosById);
    }
    return buildRowsFromPhotos(photos, captions);
  }, [photos, rows, captions, photosById]);

  const allPhotosFlat = useMemo(() => {
    const list: PhotoAsset[] = [];
    for (const row of computedRows) {
      if (row.type === 'single') {
        list.push(row.photo);
      } else {
        list.push(row.left, row.right);
      }
    }
    return list;
  }, [computedRows]);

  const getPhotoIndex = (photo: PhotoAsset) => allPhotosFlat.findIndex((p) => p.id === photo.id);

  const handlePrev = () => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current - 1 + allPhotosFlat.length) % allPhotosFlat.length;
    });
  };

  const handleNext = () => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return (current + 1) % allPhotosFlat.length;
    });
  };

  if (computedRows.length === 0) return null;

  return (
    <>
      <div className={styles.wrapper}>
        {computedRows.map((row, rowIdx) => {
          if (row.type === 'single') {
            return (
              <div key={`row-${rowIdx}`} className={styles.singleRow}>
                <button
                  type="button"
                  className={styles.imageButton}
                  onClick={() => setActiveIndex(getPhotoIndex(row.photo))}
                  aria-label={`View ${row.photo.alt}`}
                >
                  <div className={styles.singleImage}>
                    <Image
                      src={row.photo.src}
                      alt={row.photo.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 70vw"
                      className={styles.image}
                    />
                  </div>
                </button>
              </div>
            );
          }

          const hasCaption = Boolean(row.caption);
          const leftIsOffset = row.offsetSide === 'left';

          // Row class for caption vs no-caption styling
          const rowClass = hasCaption ? styles.doubleRowWithCaption : styles.doubleRowNoCaption;

          return (
            <div key={`row-${rowIdx}`} className={`${styles.doubleRow} ${rowClass}`}>
              {/* Left photo */}
              <div className={leftIsOffset ? styles.offsetSide : styles.flushSide}>
                <button
                  type="button"
                  className={styles.imageButton}
                  onClick={() => setActiveIndex(getPhotoIndex(row.left))}
                  aria-label={`View ${row.left.alt}`}
                >
                  <div className={hasCaption && leftIsOffset ? styles.shortImage : styles.tallImage}>
                    <Image
                      src={row.left.src}
                      alt={row.left.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className={styles.image}
                    />
                  </div>
                </button>
                {hasCaption && leftIsOffset && row.caption && (
                  <div className={styles.caption}>
                    <p className={styles.captionTitle}>{row.caption.title}</p>
                    <p className={styles.captionBody}>{row.caption.body}</p>
                  </div>
                )}
              </div>

              {/* Right photo */}
              <div className={!leftIsOffset ? styles.offsetSide : styles.flushSide}>
                <button
                  type="button"
                  className={styles.imageButton}
                  onClick={() => setActiveIndex(getPhotoIndex(row.right))}
                  aria-label={`View ${row.right.alt}`}
                >
                  <div className={hasCaption && !leftIsOffset ? styles.shortImage : styles.tallImage}>
                    <Image
                      src={row.right.src}
                      alt={row.right.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className={styles.image}
                    />
                  </div>
                </button>
                {hasCaption && !leftIsOffset && row.caption && (
                  <div className={styles.caption}>
                    <p className={styles.captionTitle}>{row.caption.title}</p>
                    <p className={styles.captionBody}>{row.caption.body}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <GalleryLightbox
        photos={allPhotosFlat}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </>
  );
}
