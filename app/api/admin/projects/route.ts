import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getAllProjects, createProject } from '@/lib/data/projects';
import { addProjectToWorkIndex } from '@/lib/data/work';
import { revalidatePortfolioPages } from '@/lib/admin/revalidate';
import type { Project } from '@/types';

export const runtime = 'nodejs';

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projects = await getAllProjects();
    return Response.json(projects);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load projects.' },
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
    const payload = (await request.json()) as Partial<Project>;

    if (!payload.title || !payload.slug || !payload.heroPhotoId) {
      return Response.json(
        { error: 'Missing required fields: title, slug, heroPhotoId' },
        { status: 400 }
      );
    }

    const project = await createProject({
      title: payload.title,
      slug: payload.slug,
      subtitle: payload.subtitle || '',
      intro: payload.intro || '',
      body: payload.body || '',
      category: payload.category,
      status: payload.status || 'draft',
      featured: payload.featured || false,
      hoverTitle: payload.hoverTitle || payload.title,
      heroPhotoId: payload.heroPhotoId,
      galleryPhotoIds: payload.galleryPhotoIds || [],
      editorialRows: payload.editorialRows,
      editorialCaptions: payload.editorialCaptions || [],
      credits: payload.credits || [],
      metaTitle: payload.metaTitle || '',
      metaDescription: payload.metaDescription || '',
      metaKeywords: payload.metaKeywords || ''
    });

    // Add to work index
    await addProjectToWorkIndex(project.id);
    
    // Revalidate portfolio pages
    revalidatePortfolioPages();

    return Response.json(project, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to create project.' },
      { status: 500 }
    );
  }
}
