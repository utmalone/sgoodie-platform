import { getAllPhotos, getPhotosByIds } from '@/lib/data/photos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  const ids = idsParam
    ? idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const photos = ids.length > 0 ? await getPhotosByIds(ids) : await getAllPhotos();
  return Response.json(photos, {
    headers: {
      // Preview routes depend on this endpoint; ensure edits/uploads are reflected immediately.
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST() {
  return Response.json(
    { error: 'Photo upload endpoint pending. Presigned URLs will be generated here.' },
    { status: 501 }
  );
}
