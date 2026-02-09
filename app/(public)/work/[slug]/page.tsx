import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EditorialGallery } from '@/components/portfolio/EditorialGallery';
import { ProjectHero } from '@/components/portfolio/ProjectHero';
import { ProjectPageDraftClient } from '@/components/preview/ProjectPageDraftClient';
import { getAllProjects, getProjectBySlug, getPublishedProjects } from '@/lib/data/projects';
import { getPhotosByIds } from '@/lib/data/photos';
import { getWorkIndex } from '@/lib/data/work';
import styles from '@/styles/public/WorkDetailPage.module.css';

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.metaTitle || project.title,
    description: project.metaDescription || project.intro,
    keywords: project.metaKeywords || undefined
  };
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === 'draft';
  
  const project = await getProjectBySlug(slug);

  // In production, don't show draft projects
  if (!project || (!isPreview && project.status === 'draft')) {
    notFound();
  }

  const photos = await getPhotosByIds([
    project.heroPhotoId,
    ...project.galleryPhotoIds
  ]);
  const photosById = new Map(photos.map((photo) => [photo.id, photo]));

  const heroPhoto = photosById.get(project.heroPhotoId);
  const galleryPhotos = project.galleryPhotoIds
    .map((id) => photosById.get(id))
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));

  const workIndex = await getWorkIndex();
  // In preview mode, include all projects for navigation; otherwise only published
  const allProjects = isPreview ? await getAllProjects() : await getPublishedProjects();
  const projectMap = new Map(allProjects.map((item) => [item.id, item]));
  const orderedProjects = workIndex.projectIds
    .map((id) => projectMap.get(id))
    .filter(Boolean);
  const currentIndex = orderedProjects.findIndex((item) => item?.id === project.id);
  const previousProject = currentIndex > 0 ? orderedProjects[currentIndex - 1] : null;
  const nextProject =
    currentIndex >= 0 && currentIndex < orderedProjects.length - 1
      ? orderedProjects[currentIndex + 1]
      : null;

  if (!heroPhoto && !isPreview) {
    notFound();
  }

  // Build URLs - preserve preview param if in preview mode
  const buildUrl = (projectSlug: string) => 
    isPreview ? `/work/${projectSlug}?preview=draft` : `/work/${projectSlug}`;

  return (
    <div className={styles.wrapper}>
      {isPreview && project.status === 'draft' && (
        <div className={styles.draftBanner}>
          This project is currently a draft and not visible to the public.
        </div>
      )}
      
      {isPreview ? (
        <ProjectPageDraftClient
          fallbackProject={project}
          initialPhotos={[...(heroPhoto ? [heroPhoto] : []), ...galleryPhotos]}
          enabled
        />
      ) : (
        <>
          {heroPhoto && (
            <ProjectHero
              title={project.title}
              subtitle={project.subtitle}
              intro={project.intro}
              photo={heroPhoto}
            />
          )}

          {galleryPhotos.length > 0 && (
            <EditorialGallery
              photos={galleryPhotos}
              rows={project.editorialRows}
              captions={project.editorialCaptions}
            />
          )}

          {project.credits && project.credits.length > 0 && (
            <section className={styles.credits}>
              <p className={styles.eyebrow}>Credits</p>
              <div className={styles.creditsGrid}>
                {project.credits.map((credit) => (
                  <div key={`${credit.label}-${credit.value}`} className={styles.creditRow}>
                    <span className={styles.creditKey}>{credit.label}</span>
                    <span>{credit.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className={styles.pager}>
        {previousProject && previousProject.status !== 'draft' ? (
          <Link href={buildUrl(previousProject.slug)} className={styles.pagerLink}>
            Previous
          </Link>
        ) : (
          <span className={styles.pagerMuted}>Previous</span>
        )}
        {nextProject && nextProject.status !== 'draft' ? (
          <Link href={buildUrl(nextProject.slug)} className={styles.pagerLink}>
            Next
          </Link>
        ) : (
          <span className={styles.pagerMuted}>Next</span>
        )}
      </div>
    </div>
  );
}
