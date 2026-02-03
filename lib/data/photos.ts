import { randomUUID } from 'crypto';
import type { PhotoAsset } from '@/types';
import { readJson, writeJson } from './local-store';
import { removePhotoFromPages } from './pages';

const PHOTOS_FILE = 'photos.json';

const fallbackPhotos: PhotoAsset[] = [];

function assertMockMode() {
  if (process.env.USE_MOCK_DATA === 'true') return;
  throw new Error(
    'Photo management is only implemented for local mock data right now. Set USE_MOCK_DATA=true.'
  );
}

export async function getAllPhotos(): Promise<PhotoAsset[]> {
  assertMockMode();
  const photos = await readJson<PhotoAsset[]>(PHOTOS_FILE, fallbackPhotos);
  return photos.map((photo) => ({
    ...photo,
    metaTitle: photo.metaTitle ?? '',
    metaDescription: photo.metaDescription ?? '',
    metaKeywords: photo.metaKeywords ?? ''
  }));
}

export async function getPhotosByIds(ids: string[]): Promise<PhotoAsset[]> {
  const photos = await getAllPhotos();
  const map = new Map(photos.map((photo) => [photo.id, photo]));
  return ids.map((id) => map.get(id)).filter(Boolean) as PhotoAsset[];
}

export async function createPhoto(input: Omit<PhotoAsset, 'id' | 'createdAt'>) {
  assertMockMode();
  const photos = await getAllPhotos();
  const photo: PhotoAsset = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    metaTitle: input.metaTitle ?? '',
    metaDescription: input.metaDescription ?? '',
    metaKeywords: input.metaKeywords ?? '',
    ...input
  };

  photos.push(photo);
  await writeJson(PHOTOS_FILE, photos);
  return photo;
}

export async function updatePhoto(updated: PhotoAsset) {
  assertMockMode();
  const photos = await getAllPhotos();
  const index = photos.findIndex((photo) => photo.id === updated.id);
  if (index >= 0) {
    photos[index] = updated;
  } else {
    photos.push(updated);
  }
  await writeJson(PHOTOS_FILE, photos);
  return updated;
}

export async function deletePhoto(photoId: string) {
  assertMockMode();
  const photos = await getAllPhotos();
  const nextPhotos = photos.filter((photo) => photo.id !== photoId);
  await writeJson(PHOTOS_FILE, nextPhotos);
  await removePhotoFromPages(photoId);
}
