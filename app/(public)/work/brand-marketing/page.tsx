import { SectionHeader } from '@/components/layout/SectionHeader';
import { ProjectGrid } from '@/components/portfolio/ProjectGrid';
import { getProjectsByCategory } from '@/lib/data/projects';

export default async function BrandMarketingPage() {
  const projects = await getProjectsByCategory('brand-marketing');

  return (
    <section>
      <SectionHeader
        title="Brand Marketing"
        subtitle="Confident brand imagery for personal, editorial, and commercial clients."
      />
      <ProjectGrid projects={projects} />
    </section>
  );
}
