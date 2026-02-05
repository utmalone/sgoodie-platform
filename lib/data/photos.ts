import { randomUUID } from 'crypto';
import type { PhotoAsset } from '@/types';
import { readJson, writeJson } from './local-store';
import { removePhotoFromPages } from './pages';
import { useMockData, getAllItems, getItem, putItem, deleteItem } from './db';

const PHOTOS_FILE = 'photos.json';
const TABLE_NAME = 'photos';

export async function getAllPhotos(): Promise<PhotoAsset[]> {
  if (useMockData()) {
    const photos = await readJson<PhotoAsset[]>(PHOTOS_FILE);
    return photos.map((photo) => ({
      ...photo,
      metaTitle: photo.metaTitle ?? '',
      metaDescription: photo.metaDescription ?? '',
      metaKeywords: photo.metaKeywords ?? ''
    }));
  }

  // DynamoDB mode - return empty array if no data
  const photos = await getAllItems<PhotoAsset>(TABLE_NAME);
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

export async function getPhotoById(id: string): Promise<PhotoAsset | null> {
  if (useMockData()) {
    const photos = await getAllPhotos();
    return photos.find((photo) => photo.id === id) ?? null;
  }

  // DynamoDB mode
  return getItem<PhotoAsset>(TABLE_NAME, { id });
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

  if (useMockData()) {
    const photos = await getAllPhotos();
    photos.push(photo);
    await writeJson(PHOTOS_FILE, photos);
    return photo;
  }

  // DynamoDB mode
  return putItem(TABLE_NAME, photo);
}

export async function updatePhoto(updated: PhotoAsset) {
  if (useMockData()) {
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

  // DynamoDB mode
  return putItem(TABLE_NAME, updated);
}

export async function deletePhoto(photoId: string) {
  if (useMockData()) {
    const photos = await getAllPhotos();
    const nextPhotos = photos.filter((photo) => photo.id !== photoId);
    await writeJson(PHOTOS_FILE, nextPhotos);
  } else {
    await deleteItem(TABLE_NAME, { id: photoId });
  }
  await removePhotoFromPages(photoId);
}
