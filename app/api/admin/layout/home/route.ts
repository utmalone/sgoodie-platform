import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getHomeLayout } from '@/lib/data/home';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const layout = await getHomeLayout();
  return Response.json(layout, { headers: { 'Cache-Control': 'no-store' } });
}
