import { randomUUID } from 'crypto';
import { unstable_cache } from 'next/cache';
import type { PhotoAsset } from '@/types';
import { CacheTags } from '@/lib/cache-tags';
import { readJson, writeJson } from './local-store';
import { removePhotoFromPages } from './pages';
import { isMockMode, getAllItems, getItem, putItem, deleteItem } from './db';

const PHOTOS_FILE = 'photos.json';
const TABLE_NAME = 'photos';

function normalizePhotoAsset(raw: unknown): PhotoAsset | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<PhotoAsset> & Record<string, unknown>;

  if (typeof data.id !== 'string' || data.id.trim() === '') return null;
  if (typeof data.src !== 'string' || data.src.trim() === '') return null;

  const width = typeof data.width === 'number' && Number.isFinite(data.width) ? data.width : 0;
  const height = typeof data.height === 'number' && Number.isFinite(data.height) ? data.height : 0;

  return {
    id: data.id,
    src: data.src,
    alt: typeof data.alt === 'string' ? data.alt : '',
    width,
    height,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString(),
    metaTitle: typeof data.metaTitle === 'string' ? data.metaTitle : '',
    metaDescription: typeof data.metaDescription === 'string' ? data.metaDescription : '',
    metaKeywords: typeof data.metaKeywords === 'string' ? data.metaKeywords : ''
  };
}

async function loadAllPhotos(): Promise<PhotoAsset[]> {
  if (isMockMode()) {
    const photos = await readJson<PhotoAsset[]>(PHOTOS_FILE);
    return photos
      .map((photo) => normalizePhotoAsset(photo))
      .filter(Boolean) as PhotoAsset[];
  }

  // DynamoDB mode - return empty array if no data
  const photos = await getAllItems<unknown>(TABLE_NAME);
  return photos
    .map((photo) => normalizePhotoAsset(photo))
    .filter(Boolean) as PhotoAsset[];
}

const getAllPhotosCached = unstable_cache(
  async (): Promise<PhotoAsset[]> => {
    return loadAllPhotos();
  },
  ['photos'],
  { tags: [CacheTags.photos], revalidate: false }
);

export async function getAllPhotos(): Promise<PhotoAsset[]> {
  return getAllPhotosCached();
}

const getPhotoByIdCached = unstable_cache(
  async (id: string): Promise<PhotoAsset | null> => {
    if (!id || id.trim() === '') {
      return null;
    }
    if (isMockMode()) {
      const photos = await loadAllPhotos();
      return photos.find((photo) => photo.id === id) ?? null;
    }

    // DynamoDB mode
    return getItem<PhotoAsset>(TABLE_NAME, { id });
  },
  ['photo-by-id'],
  { tags: [CacheTags.photos], revalidate: false }
);

export async function getPhotosByIds(ids: string[]): Promise<PhotoAsset[]> {
  const filteredIds = ids.filter((id) => typeof id === 'string' && id.trim() !== '');
  if (filteredIds.length === 0) {
    return [];
  }
  const photos = await getAllPhotos();
  const map = new Map(photos.map((photo) => [photo.id, photo]));
  return filteredIds.map((id) => map.get(id)).filter(Boolean) as PhotoAsset[];
}

export async function getPhotoById(id: string): Promise<PhotoAsset | null> {
  return getPhotoByIdCached(id);
}

export async function createPhoto(input: Omit<PhotoAsset, 'id' | 'createdAt'>) {
  const photo: PhotoAsset = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    metaTitle: input.metaTitle ?? '',
    metaDescription: input.metaDescription ?? '',
    metaKeywords: input.metaKeywords ?? '',
    ...input
  };

  if (isMockMode()) {
    const photos = await loadAllPhotos();
    photos.push(photo);
    await writeJson(PHOTOS_FILE, photos);
    return photo;
  }

  // DynamoDB mode
  return putItem(TABLE_NAME, photo);
}

export async function updatePhoto(updated: PhotoAsset) {
  if (isMockMode()) {
    const photos = await loadAllPhotos();
    const index = photos.findIndex((photo) => photo.id === updated.id);
    if (index >= 0) {
      photos[index] = updated;
    } else {
      photos.push(updated);
    }
    await writeJson(PHOTOS_FILE, photos);
    return updated;
  }

  // DynamoDB mode
  return putItem(TABLE_NAME, updated);
}

export async function deletePhoto(photoId: string) {
  if (isMockMode()) {
    const photos = await loadAllPhotos();
    const nextPhotos = photos.filter((photo) => photo.id !== photoId);
    await writeJson(PHOTOS_FILE, nextPhotos);
  } else {
    await deleteItem(TABLE_NAME, { id: photoId });
  }
  await removePhotoFromPages(photoId);
}
