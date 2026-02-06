import { requireAdminApi } from '@/lib/auth/require-admin-api';
import { getProjectById, updateProject, deleteProject } from '@/lib/data/projects';
import { removeProjectFromWorkIndex } from '@/lib/data/work';
import { revalidatePortfolioPages } from '@/lib/admin/revalidate';
import type { Project } from '@/types';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const session = await requireAdminApi();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const project = await getProjectById(id);
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    return Response.json(project);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load project.' },
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
    const payload = (await request.json()) as Partial<Project>;
    const project = await updateProject(id, payload);
    
    // Revalidate portfolio pages
    revalidatePortfolioPages();
    
    return Response.json(project);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update project.' },
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
    const existing = await getProjectById(id);
    await deleteProject(id);
    await removeProjectFromWorkIndex(id);
    
    // Revalidate portfolio pages
    revalidatePortfolioPages();
    
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to delete project.' },
      { status: 500 }
    );
  }
}
