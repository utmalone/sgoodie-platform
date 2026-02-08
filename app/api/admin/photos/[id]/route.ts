import path from 'path';
import { promises as fs } from 'fs';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { deletePhoto, getAllPhotos, updatePhoto } from '@/lib/data/photos';
import type { PhotoAsset } from '@/types';
import { revalidateAllPages, revalidatePhotosImmediate } from '@/lib/admin/revalidate';
import { s3 } from '@/lib/aws/s3';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const S3_BUCKET = process.env.S3_PHOTOS_BUCKET;

function toUploadPath(src: string): string | null {
  if (!src.startsWith('/uploads/')) return null;
  return path.join(process.cwd(), 'public', src);
}

function toS3Key(src: string): string | null {
  const match = src.match(/\/uploads\/([^/]+)$/);
  return match ? `uploads/${match[1]}` : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<PhotoAsset> | null;
    if (!payload) {
      return Response.json({ error: 'Missing payload.' }, { status: 400 });
    }

    const photos = await getAllPhotos();
    const existing = photos.find((photo) => photo.id === id);
    if (!existing) {
      return Response.json({ error: 'Photo not found.' }, { status: 404 });
    }

    const updated: PhotoAsset = {
      ...existing,
      alt: payload.alt ?? existing.alt,
      metaTitle: payload.metaTitle ?? existing.metaTitle ?? '',
      metaDescription: payload.metaDescription ?? existing.metaDescription ?? '',
      metaKeywords: payload.metaKeywords ?? existing.metaKeywords ?? ''
    };

    await updatePhoto(updated);
    revalidateAllPages();
    revalidatePhotosImmediate();
    return Response.json(updated);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update photo.' },
      { status: 501 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const photos = await getAllPhotos();
    const existing = photos.find((photo) => photo.id === id);
    if (!existing) {
      return Response.json({ error: 'Photo not found.' }, { status: 404 });
    }

    const uploadPath = toUploadPath(existing.src);
    const s3Key = toS3Key(existing.src);

    if (S3_BUCKET && s3Key) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
      } catch {
        // Ignore missing object.
      }
    } else if (uploadPath) {
      try {
        await fs.unlink(uploadPath);
      } catch {
        // Ignore missing file.
      }
    }

    await deletePhoto(existing.id);
    revalidateAllPages();
    revalidatePhotosImmediate();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to delete photo.' },
      { status: 501 }
    );
  }
}
