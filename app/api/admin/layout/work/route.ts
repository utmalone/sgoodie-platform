import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getWorkIndex, updateWorkIndex } from '@/lib/data/work';
import { revalidateWorkPages } from '@/lib/admin/revalidate';

export const runtime = 'nodejs';

export async function GET() {
  const layout = await getWorkIndex();
  return Response.json(layout);
}

export async function PUT(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { projectIds?: string[] };

    if (!Array.isArray(payload.projectIds)) {
      return Response.json({ error: 'Missing projectIds array' }, { status: 400 });
    }

    const workIndex = await updateWorkIndex(payload.projectIds);
    
    // Revalidate work page (order changed)
    revalidateWorkPages();
    
    return Response.json(workIndex);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update work index.' },
      { status: 500 }
    );
  }
}
