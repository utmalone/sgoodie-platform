import { NextRequest } from 'next/server';
import { getProjectsByCategory, getAllProjects } from '@/lib/data/projects';
import type { ProjectCategory } from '@/types';

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');

  if (category) {
    if (!['interiors', 'travel', 'brand-marketing', 'architecture'].includes(category)) {
      return Response.json({ error: 'Invalid category' }, { status: 400 });
    }

    const projects = await getProjectsByCategory(category as ProjectCategory);
    return Response.json(projects);
  }

  const projects = await getAllProjects();
  return Response.json(projects);
}

export async function POST() {
  return Response.json(
    { error: 'Project creation not implemented yet.' },
    { status: 501 }
  );
}
