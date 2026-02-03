import Image from 'next/image';
import Link from 'next/link';
import type { Project } from '@/types';

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={project.coverPhoto.src}
          alt={project.coverPhoto.alt}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
          priority={project.featured}
        />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold">{project.title}</h3>
        <p className="text-sm text-black/60">{project.description}</p>
      </div>
    </Link>
  );
}
