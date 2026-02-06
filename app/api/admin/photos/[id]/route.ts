import path from 'path';
import { promises as fs } from 'fs';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { deletePhoto, getAllPhotos, updatePhoto } from '@/lib/data/photos';
import type { PhotoAsset } from '@/types';
import { revalidateAllPages } from '@/lib/admin/revalidate';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

function toUploadPath(src: string) {
  if (!src.startsWith('/uploads/')) return null;
  return path.join(process.cwd(), 'public', src);
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
    if (uploadPath) {
      try {
        await fs.unlink(uploadPath);
      } catch {
        // Ignore missing file.
      }
    }

    await deletePhoto(existing.id);
    revalidateAllPages();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to delete photo.' },
      { status: 501 }
    );
  }
}
