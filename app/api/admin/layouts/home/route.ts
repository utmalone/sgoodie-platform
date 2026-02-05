import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getHomeLayout, updateHomeLayout } from '@/lib/data/home';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const layout = await getHomeLayout();
  return Response.json(layout);
}

export async function PUT(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();
    const updated = await updateHomeLayout(updates);
    revalidatePath('/');
    return Response.json(updated);
  } catch {
    return Response.json({ error: 'Failed to update home layout' }, { status: 500 });
  }
}
