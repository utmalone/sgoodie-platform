'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PhotoAsset } from '@/types';
import styles from '@/styles/admin/AdminPhotoSelector.module.css';

type AdminPhotoSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (photoIds: string[]) => void;
  selectedIds?: string[];
  multiple?: boolean;
  title?: string;
};

export function AdminPhotoSelector({
  isOpen,
  onClose,
  onSelect,
  selectedIds = [],
  multiple = false,
  title = 'Select Photo'
}: AdminPhotoSelectorProps) {
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(selectedIds));
      loadPhotos();
    }
  }, [isOpen, selectedIds]);

  async function loadPhotos() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/photos');
      if (res.ok) {
        const data = (await res.json()) as PhotoAsset[];
        setPhotos(data);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return photos;
    const lower = search.toLowerCase();
    return photos.filter(
      (photo) =>
        photo.alt?.toLowerCase().includes(lower) ||
        photo.src.toLowerCase().includes(lower)
    );
  }, [photos, search]);

  function handleToggle(photoId: string) {
    if (multiple) {
      const next = new Set(selected);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      setSelected(next);
    } else {
      onSelect([photoId]);
      onClose();
    }
  }

  function handleConfirm() {
    onSelect(Array.from(selected));
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancel}
          >
            Cancel
          </button>
        </div>

        {/* Search */}
        <div className={styles.search}>
          <input
            type="text"
            placeholder="Search by alt text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Photo Grid */}
        <div className={styles.body}>
          {isLoading ? (
            <p className={styles.statusText}>Loading photos...</p>
          ) : filtered.length === 0 ? (
            <p className={styles.statusText}>No photos found.</p>
          ) : (
            <div className={styles.grid}>
              {filtered.map((photo) => {
                const isSelected = selected.has(photo.id);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleToggle(photo.id)}
                    className={`${styles.gridItem} ${
                      isSelected ? styles.gridItemSelected : styles.gridItemIdle
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className={styles.image}
                    />
                    {isSelected && (
                      <div className={styles.selectedOverlay}>
                        <span className={styles.selectedBadge}>
                          ✓
                        </span>
                      </div>
                    )}
                    <div className={styles.hoverLabel}>
                      <p className={styles.hoverText}>
                        {photo.alt || 'Untitled'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {multiple && (
          <div className={styles.footer}>
            <p className={styles.footerText}>
              {selected.size} photo{selected.size !== 1 ? 's' : ''} selected
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              className={styles.confirm}
            >
              Confirm Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
