import { revalidatePath, revalidateTag } from 'next/cache';

type RevalidatePayload = {
  paths?: string[];
  tags?: string[];
  token?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RevalidatePayload;
  const token = body.token || '';
  const secret = process.env.REVALIDATE_TOKEN || '';

  if (!secret || token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  (body.paths || []).forEach((path) => revalidatePath(path));
  (body.tags || []).forEach((tag) => revalidateTag(tag));

  return Response.json({ revalidated: true });
}
