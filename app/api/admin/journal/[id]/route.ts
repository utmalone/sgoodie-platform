import { requireAdminApi } from '@/lib/auth/require-admin-api';
import {
  getJournalPostById,
  updateJournalPost,
  deleteJournalPost
} from '@/lib/data/journal';
import { revalidateJournalPages } from '@/lib/admin/revalidate';
import type { JournalPost } from '@/types';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const post = await getJournalPostById(id);
    if (!post) {
      return Response.json({ error: 'Journal post not found' }, { status: 404 });
    }
    return Response.json(post);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load journal post.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<JournalPost>;
    const post = await updateJournalPost(id, payload);
    
    // Revalidate journal pages
    revalidateJournalPages(post.slug);
    
    return Response.json(post);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update journal post.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = await getJournalPostById(id);
    await deleteJournalPost(id);
    
    // Revalidate journal pages
    revalidateJournalPages(existing?.slug);
    
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to delete journal post.' },
      { status: 500 }
    );
  }
}
