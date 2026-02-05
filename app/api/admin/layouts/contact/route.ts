import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getContactContent, updateContactContent } from '@/lib/data/contact';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const content = await getContactContent();
  return Response.json(content);
}

export async function PUT(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();
    const updated = await updateContactContent(updates);
    revalidatePath('/contact');
    return Response.json(updated);
  } catch {
    return Response.json({ error: 'Failed to update contact content' }, { status: 500 });
  }
}
