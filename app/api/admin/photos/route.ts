import path from 'path';
import { promises as fs } from 'fs';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { createPhoto, getAllPhotos } from '@/lib/data/photos';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const photos = await getAllPhotos();
    return Response.json(photos);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load photos.' },
      { status: 501 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const alt = (formData.get('alt') as string) || 'Uploaded photo';
  const metaTitle = (formData.get('metaTitle') as string) || '';
  const metaDescription = (formData.get('metaDescription') as string) || '';
  const metaKeywords = (formData.get('metaKeywords') as string) || '';

  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'Missing file upload.' }, { status: 400 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = path.extname(file.name) || '.jpg';
  const baseName = path.basename(file.name, ext);
  const safeBase = baseName.replace(/[^a-zA-Z0-9.-]/g, '') || 'upload';
  const fileName = `${Date.now()}-${safeBase}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  await fs.writeFile(filePath, buffer);

  try {
    const photo = await createPhoto({
      src: `/uploads/${fileName}`,
      alt,
      metaTitle,
      metaDescription,
      metaKeywords,
      width: 1600,
      height: 1200
    });

    return Response.json(photo);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to create photo.' },
      { status: 501 }
    );
  }
}
