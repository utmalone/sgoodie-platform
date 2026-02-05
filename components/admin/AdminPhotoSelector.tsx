'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PhotoAsset } from '@/types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-[min(900px,95vw)] flex-col rounded-3xl border border-black/10 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 p-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-[0.3em] text-black/40 hover:text-black/70"
          >
            Cancel
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-black/10 p-4">
          <input
            type="text"
            placeholder="Search by alt text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-black/20 px-4 py-2 text-sm"
          />
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-center text-sm text-black/60">Loading photos...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-black/60">No photos found.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {filtered.map((photo) => {
                const isSelected = selected.has(photo.id);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleToggle(photo.id)}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                      isSelected
                        ? 'border-black ring-2 ring-black/20'
                        : 'border-transparent hover:border-black/30'
                    }`}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold">
                          ✓
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <p className="truncate text-xs text-white">
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
          <div className="flex items-center justify-between border-t border-black/10 p-4">
            <p className="text-sm text-black/60">
              {selected.size} photo{selected.size !== 1 ? 's' : ''} selected
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-full bg-black px-5 py-2 text-xs uppercase tracking-[0.35em] text-white"
            >
              Confirm Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
