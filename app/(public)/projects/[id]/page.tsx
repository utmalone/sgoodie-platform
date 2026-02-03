import { notFound } from 'next/navigation';
import { ProjectHero } from '@/components/portfolio/ProjectHero';
import { getAllProjects, getProjectById } from '@/lib/data/projects';

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((project) => ({ id: project.id }));
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProjectById(params.id);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <ProjectHero project={project} />
      <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">Project Details</h2>
        <p className="mt-3 text-sm text-black/60">
          Image sequencing, narrative, and detail shots will live here once the CMS is
          connected.
        </p>
      </section>
    </div>
  );
}
