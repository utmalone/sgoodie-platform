import { ProjectGrid } from '@/components/portfolio/ProjectGrid';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { getFeaturedProjects } from '@/lib/data/projects';

export default async function HomePage() {
  const projects = await getFeaturedProjects();

  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-black/10 bg-white p-10 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-black/50">S.Goodie Photography</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">
          Modern photography for interiors, travel, and brand storytelling.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-black/70">
          Curated visuals designed to highlight space, light, and identity. Build your
          next project with imagery that feels intentional and elevated.
        </p>
      </section>

      <section>
        <SectionHeader
          title="Featured Work"
          subtitle="A short selection of recent interior, travel, and brand marketing projects."
        />
        <ProjectGrid projects={projects} />
      </section>
    </div>
  );
}
