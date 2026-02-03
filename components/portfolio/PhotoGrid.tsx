'use client';

import Image from 'next/image';
import type { PhotoAsset } from '@/types';

type PhotoGridProps = {
  photos: PhotoAsset[];
};

export function PhotoGrid({ photos }: PhotoGridProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
