import type { Metadata } from 'next';
import type { PhotoAsset, Project } from '@/types';
import { getAllProjects, getPublishedProjects } from '@/lib/data/projects';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds } from '@/lib/data/photos';
import { getWorkIndex } from '@/lib/data/work';
import { WorkGalleryGrid } from '@/components/portfolio/WorkGalleryGrid';
import styles from '@/styles/public/WorkPage.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('work');
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.intro,
    keywords: page.metaKeywords || undefined
  };
}

type WorkPageProps = {
  searchParams: Promise<{ preview?: string }>;
};

export default async function WorkPage({ searchParams }: WorkPageProps) {
  const params = await searchParams;
  const isPreview = params.preview === 'draft';
  
  // In preview mode, show all projects including drafts
  const [projects, workIndex] = await Promise.all([
    isPreview ? getAllProjects() : getPublishedProjects(),
    getWorkIndex()
  ]);
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  const orderedProjects = workIndex.projectIds
    .map((id) => projectMap.get(id))
    .filter(Boolean);
  const remainingProjects = projects.filter((project) => !workIndex.projectIds.includes(project.id));
  const list = [...orderedProjects, ...remainingProjects];

  const heroPhotoIds = list
    .map((project) => project?.heroPhotoId)
    .filter((id): id is string => Boolean(id));
  const photos = await getPhotosByIds(heroPhotoIds);
  const photosById = new Map(photos.map((photo) => [photo.id, photo]));
  const items = list.reduce<Array<{ project: Project; photo: PhotoAsset }>>((acc, project) => {
    if (!project) return acc;
    const photo = photosById.get(project.heroPhotoId);
    if (!photo) return acc;
    acc.push({ project, photo });
    return acc;
  }, []);

  return (
    <div className={styles.wrapper}>
      <WorkGalleryGrid items={items} isPreview={isPreview} />
    </div>
  );
}
