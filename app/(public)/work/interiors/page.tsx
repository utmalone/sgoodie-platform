import { SectionHeader } from '@/components/layout/SectionHeader';
import { ProjectGrid } from '@/components/portfolio/ProjectGrid';
import { getProjectsByCategory } from '@/lib/data/projects';

export default async function InteriorsPage() {
  const projects = await getProjectsByCategory('interiors');

  return (
    <section>
      <SectionHeader
        title="Interiors"
        subtitle="Architectural and interior photography for homes, hospitality, and commercial spaces."
      />
      <ProjectGrid projects={projects} />
    </section>
  );
}
