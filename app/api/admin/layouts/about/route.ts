import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { revalidateLayoutsImmediate } from '@/lib/admin/revalidate';
import { getAboutContent, updateAboutContent } from '@/lib/data/about';

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const content = await getAboutContent();
  return Response.json(content);
}

export async function PUT(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();
    const updated = await updateAboutContent(updates);
    revalidateLayoutsImmediate();
    return Response.json(updated);
  } catch {
    return Response.json({ error: 'Failed to update about content' }, { status: 500 });
  }
}
