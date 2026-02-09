import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getJournalIndex, updateJournalIndex } from '@/lib/data/journal-index';
import { revalidateJournalPages } from '@/lib/admin/revalidate';

export const runtime = 'nodejs';

export async function GET() {
  const index = await getJournalIndex();
  return Response.json(index);
}

export async function PUT(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { postIds?: string[] };

    if (!Array.isArray(payload.postIds)) {
      return Response.json({ error: 'Missing postIds array' }, { status: 400 });
    }

    const journalIndex = await updateJournalIndex(payload.postIds);
    revalidateJournalPages();

    return Response.json(journalIndex);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update journal index.' },
      { status: 500 }
    );
  }
}
