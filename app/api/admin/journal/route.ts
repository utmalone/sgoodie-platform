import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getAllJournalPosts, createJournalPost } from '@/lib/data/journal';
import { revalidateJournalPages } from '@/lib/admin/revalidate';
import type { JournalPost } from '@/types';

export const runtime = 'nodejs';

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const posts = await getAllJournalPosts();
    return Response.json(posts);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load journal posts.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as Partial<JournalPost>;

    if (!payload.title || !payload.slug || !payload.heroPhotoId) {
      return Response.json(
        { error: 'Missing required fields: title, slug, heroPhotoId' },
        { status: 400 }
      );
    }

    const post = await createJournalPost({
      title: payload.title,
      slug: payload.slug,
      category: payload.category || 'Project Feature',
      author: payload.author || 'S.Goodie Studio',
      date: payload.date || new Date().toISOString().split('T')[0],
      excerpt: payload.excerpt || '',
      body: payload.body || '',
      heroPhotoId: payload.heroPhotoId,
      galleryPhotoIds: payload.galleryPhotoIds || [],
      credits: payload.credits || []
    });
    
    // Revalidate journal pages
    revalidateJournalPages(post.slug);

    return Response.json(post, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to create journal post.' },
      { status: 500 }
    );
  }
}
