import { SectionHeader } from '@/components/layout/SectionHeader';
import { ProjectGrid } from '@/components/portfolio/ProjectGrid';
import { getProjectsByCategory } from '@/lib/data/projects';

export default async function TravelPage() {
  const projects = await getProjectsByCategory('travel');

  return (
    <section>
      <SectionHeader
        title="Travel"
        subtitle="Light-driven, story-rich travel photography that captures place and atmosphere."
      />
      <ProjectGrid projects={projects} />
    </section>
  );
}
