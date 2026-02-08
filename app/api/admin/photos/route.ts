import path from 'path';
import { promises as fs } from 'fs';
import imageSize from 'image-size';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { createPhoto, getAllPhotos } from '@/lib/data/photos';
import { revalidateAllPages } from '@/lib/admin/revalidate';
import { s3 } from '@/lib/aws/s3';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const S3_BUCKET = process.env.S3_PHOTOS_BUCKET;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

function useS3Upload(): boolean {
  return Boolean(S3_BUCKET && CLOUDFRONT_URL);
}

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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = path.extname(file.name) || '.jpg';
  const baseName = path.basename(file.name, ext);
  const safeBase = baseName.replace(/[^a-zA-Z0-9.-]/g, '') || 'upload';
  const fileName = `${Date.now()}-${safeBase}${ext}`;
  const s3Key = `uploads/${fileName}`;

  if (useS3Upload()) {
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET!,
          Key: s3Key,
          Body: buffer,
          ContentType: file.type || 'image/jpeg'
        })
      );
    } catch (err) {
      console.error('S3 upload failed:', err);
      return Response.json(
        { error: err instanceof Error ? err.message : 'Upload to storage failed.' },
        { status: 500 }
      );
    }
  } else {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.writeFile(filePath, buffer);
  }

  const src = useS3Upload()
    ? `https://${CLOUDFRONT_URL!.replace(/^https?:\/\//, '')}/${s3Key}`
    : `/uploads/${fileName}`;

  let width = 1600;
  let height = 1200;
  try {
    const dimensions = imageSize(buffer);
    if (dimensions.width && dimensions.height) {
      width = dimensions.width;
      height = dimensions.height;
    }
  } catch {
    // Use defaults if dimension detection fails
  }

  try {
    const photo = await createPhoto({
      src,
      alt,
      metaTitle,
      metaDescription,
      metaKeywords,
      width,
      height
    });

    revalidateAllPages();
    return Response.json(photo);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to create photo.' },
      { status: 501 }
    );
  }
}
