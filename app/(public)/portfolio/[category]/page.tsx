import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { PhotoAsset, Project, ProjectCategory } from '@/types';
import {
  getProjectsByCategory,
  getPublishedProjectsByCategory
} from '@/lib/data/projects';
import { getPageBySlug } from '@/lib/data/pages';
import { getPhotosByIds } from '@/lib/data/photos';
import { getWorkIndex } from '@/lib/data/work';
import { WorkGalleryGrid } from '@/components/portfolio/WorkGalleryGrid';
import {
  portfolioCategories,
  portfolioCategoryLabels,
  type PortfolioCategory
} from '@/lib/admin/portfolio-config';
import styles from '@/styles/public/WorkPage.module.css';

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateStaticParams() {
  return portfolioCategories.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;

  if (!portfolioCategories.includes(category as PortfolioCategory)) {
    return {};
  }

  const page = await getPageBySlug(`portfolio-${category}`);
  const label = portfolioCategoryLabels[category as PortfolioCategory];

  return {
    title: page.metaTitle || `${label} Photography | S.Goodie`,
    description: page.metaDescription || `Explore our ${label.toLowerCase()} photography portfolio.`,
    keywords: page.metaKeywords || undefined
  };
}

export default async function PortfolioCategoryPage({ params, searchParams }: PageProps) {
  const [{ category }, { preview }] = await Promise.all([params, searchParams]);

  if (!portfolioCategories.includes(category as PortfolioCategory)) {
    notFound();
  }

  const projectCategory = category as ProjectCategory;
  const isPreview = preview === 'draft';
  const categoryLabel = portfolioCategoryLabels[category as PortfolioCategory];

  const [projects, workIndex] = await Promise.all([
    isPreview
      ? getProjectsByCategory(projectCategory)
      : getPublishedProjectsByCategory(projectCategory),
    getWorkIndex()
  ]);

  // Order projects according to work index
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const orderedProjects = workIndex.projectIds
    .map((id) => projectMap.get(id))
    .filter(Boolean);
  const remainingProjects = projects.filter((p) => !workIndex.projectIds.includes(p.id));
  const list = [...orderedProjects, ...remainingProjects];

  // Get hero photos for each project
  const heroPhotoIds = list.map((p) => p?.heroPhotoId).filter((id): id is string => Boolean(id));
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
    <main id="main-content" className={styles.wrapper}>
      {/* Page Title */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{categoryLabel}</h1>
      </header>

      {/* Projects Grid */}
      <WorkGalleryGrid items={items} isPreview={isPreview} category={projectCategory} />

      {/* Empty State */}
      {items.length === 0 && (
        <p className={styles.emptyState}>
          No {categoryLabel.toLowerCase()} projects yet. Check back soon!
        </p>
      )}
    </main>
  );
}
