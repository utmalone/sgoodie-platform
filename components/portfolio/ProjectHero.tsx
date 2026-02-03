import Image from 'next/image';
import type { Project } from '@/types';

type ProjectHeroProps = {
  project: Project;
};

export function ProjectHero({ project }: ProjectHeroProps) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-white shadow-lg">
        <Image
          src={project.coverPhoto.src}
          alt={project.coverPhoto.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
          priority
        />
      </div>
      <div className="flex flex-col justify-center gap-4">
        <p className="text-xs uppercase tracking-[0.4em] text-black/50">{project.category}</p>
        <h1 className="text-4xl font-semibold">{project.title}</h1>
        <p className="text-base text-black/70">{project.description}</p>
      </div>
    </section>
  );
}
