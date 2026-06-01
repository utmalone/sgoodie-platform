import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getAllPages, updatePage } from '@/lib/data/pages';
import type { PageContent } from '@/types';
import { revalidatePage } from '@/lib/admin/revalidate';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pages = await getAllPages();
    return Response.json(pages);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load pages.' },
      { status: 501 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json()) as Partial<PageContent> | null;
  if (!payload?.slug) {
    return Response.json({ error: 'Missing page slug.' }, { status: 400 });
  }

  try {
    const updated: PageContent = {
      slug: payload.slug,
      title: payload.title ?? '',
      intro: payload.intro ?? '',
      body: typeof payload.body === 'string' ? payload.body : '',
      gallery: Array.isArray(payload.gallery) ? payload.gallery : [],
      ...(typeof payload.heroTitleColor === 'string' ? { heroTitleColor: payload.heroTitleColor } : {}),
      ...(typeof payload.heroSubtitleColor === 'string'
        ? { heroSubtitleColor: payload.heroSubtitleColor }
        : {}),
      metaTitle: payload.metaTitle ?? '',
      metaDescription: payload.metaDescription ?? '',
      metaKeywords: payload.metaKeywords ?? ''
    };

    const page = await updatePage(updated);
    revalidatePage(updated.slug);
    return Response.json(page);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update page.' },
      { status: 501 }
    );
  }
}
