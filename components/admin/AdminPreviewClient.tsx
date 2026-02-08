'use client';

import { useCallback, useEffect, useMemo, useState, useEffectEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  HomeLayout,
  JournalPost,
  PageContent,
  PhotoAsset,
  Project,
  WorkIndex,
  SiteProfile
} from '@/types';
import { loadDraftPages } from '@/lib/admin/draft-store';
import { FullBleedHero } from '@/components/portfolio/FullBleedHero';
import { HeroImage } from '@/components/portfolio/HeroImage';
import { HomeGalleryGrid } from '@/components/portfolio/HomeGalleryGrid';
import { PhotoGrid } from '@/components/portfolio/PhotoGrid';
import { ProjectHero } from '@/components/portfolio/ProjectHero';

type NavLink = {
  label: string;
  path: string;
};

const navLinks: NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'Work', path: '/work' },
  { label: 'About', path: '/about' },
  { label: 'Journal', path: '/journal' },
  { label: 'Contact', path: '/contact' }
];

const EMPTY_PAGES: PageContent[] = [];
const EMPTY_PHOTOS: PhotoAsset[] = [];
const EMPTY_PROJECTS: Project[] = [];
const EMPTY_JOURNAL: JournalPost[] = [];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return (await response.json()) as T;
}

function mapPathToSlug(path: string) {
  if (path === '/about') return 'about';
  if (path === '/work') return 'work';
  if (path === '/journal') return 'journal';
  if (path === '/contact') return 'contact';
  return 'home';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function AdminPreviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [draftPages, setDraftPages] = useState<PageContent[] | null>(() => loadDraftPages());

  const pagesQuery = useQuery({
    queryKey: ['admin', 'pages'],
    queryFn: () => fetchJson<PageContent[]>('/api/admin/pages')
  });
  const photosQuery = useQuery({
    queryKey: ['admin', 'photos'],
    queryFn: () => fetchJson<PhotoAsset[]>('/api/admin/photos')
  });
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchJson<Project[]>('/api/projects')
  });
  const homeQuery = useQuery({
    queryKey: ['admin', 'layout', 'home'],
    queryFn: () => fetchJson<HomeLayout>('/api/admin/layout/home')
  });
  const workQuery = useQuery({
    queryKey: ['admin', 'layout', 'work'],
    queryFn: () => fetchJson<WorkIndex>('/api/admin/layout/work')
  });
  const journalQuery = useQuery({
    queryKey: ['journal'],
    queryFn: () => fetchJson<JournalPost[]>('/api/journal')
  });
  const profileQuery = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => fetchJson<SiteProfile>('/api/admin/profile')
  });

  const refreshPreviewData = useEffectEvent(() => {
    setDraftPages(loadDraftPages());
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['journal'] });
  });

  const handleStorage = useEffectEvent((event: StorageEvent) => {
    if (event.key === 'admin-preview-refresh') {
      refreshPreviewData();
    }
  });

  useEffect(() => {
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const pages = draftPages ?? pagesQuery.data ?? EMPTY_PAGES;
  const photos = photosQuery.data ?? EMPTY_PHOTOS;
  const projects = projectsQuery.data ?? EMPTY_PROJECTS;
  const homeLayout = homeQuery.data ?? null;
  const workIndex = workQuery.data ?? null;
  const journalPosts = journalQuery.data ?? EMPTY_JOURNAL;
  const profile = profileQuery.data ?? null;
  const hasDraftPreview = Boolean(draftPages);

  const isLoading =
    pagesQuery.isLoading ||
    photosQuery.isLoading ||
    projectsQuery.isLoading ||
    homeQuery.isLoading ||
    workQuery.isLoading ||
    journalQuery.isLoading ||
    profileQuery.isLoading;

  const hasError =
    pagesQuery.isError ||
    photosQuery.isError ||
    projectsQuery.isError ||
    homeQuery.isError ||
    workQuery.isError ||
    journalQuery.isError ||
    profileQuery.isError;

  const status = isLoading
    ? 'Loading preview...'
    : hasError
      ? 'Unable to load preview data.'
      : '';

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  function getGallery(slug: string) {
    const page = pages.find((item) => item.slug === slug);
    if (!page) return [];
    return page.gallery
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }

  const handleNav = useCallback((path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('path', path);
    router.replace(`/admin/preview?${params.toString()}`);
  }, [router, searchParams]);

  const activePath = searchParams.get('path') || '/';
  const slug = mapPathToSlug(activePath);
  const currentPage = pages.find((page) => page.slug === slug);

  const projectSlug = activePath.startsWith('/work/') ? activePath.split('/')[2] : null;
  const activeProject = projectSlug
    ? projects.find((project) => project.slug === projectSlug)
    : null;

  const journalSlug = activePath.startsWith('/journal/') ? activePath.split('/')[2] : null;
  const activeJournalPost = journalSlug
    ? journalPosts.find((post) => post.slug === journalSlug)
    : null;

  const orderedProjects = (() => {
    if (!workIndex) return projects;
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const ordered = workIndex.projectIds
      .map((id) => projectMap.get(id))
      .filter(Boolean) as Project[];
    const remaining = projects.filter((project) => !workIndex.projectIds.includes(project.id));
    return [...ordered, ...remaining];
  })();

  if (status) {
    return <p className="text-sm text-ink/60">{status}</p>;
  }

  const previewEmail = profile?.email || 'hello@sgoodie.com';
  const previewPhone = profile?.phone || '(202) 555-0194';
  const previewInstagram = profile?.social?.instagram?.handle || '@sgoodiephoto';
  const previewLinkedIn = profile?.social?.linkedin?.name || 'S.Goodie Studio';
  const previewRegions =
    profile?.availability?.regions?.length
      ? profile.availability.regions.join(', ')
      : 'DC, MD, VA, PA, NY';
  const previewNote =
    profile?.availability?.note || 'Available for travel and select commissions.';

  return (
    <div className="min-h-screen bg-paper">
      <div className="border-b border-line bg-white/80">
        <div className="container-page flex items-center justify-between gap-4 py-3 text-xs uppercase tracking-[0.3em] text-ink/50">
          <span>{hasDraftPreview ? 'Preview Mode (Draft)' : 'Preview Mode (Live)'}</span>
          <span className="rounded-full border border-ink/20 px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-ink/70">
            {hasDraftPreview ? 'Draft Preview' : 'Live Preview'}
          </span>
        </div>
      </div>

      <header className="border-b border-line bg-paper">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-8">
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="text-sm font-semibold uppercase tracking-[0.35em]"
          >
            S.Goodie
          </button>
          <nav className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-[0.35em]">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => handleNav(link.path)}
                className={`transition hover:text-ink/60 ${
                  activePath === link.path ? 'text-ink/70' : 'text-ink/40'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container-page py-12">
        {activePath === '/' && (
          <div className="space-y-24">
            {homeLayout?.heroPhotoId && photosById.get(homeLayout.heroPhotoId) && (
              <FullBleedHero photo={photosById.get(homeLayout.heroPhotoId)!} minHeight="screen">
                <div className="space-y-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.5em] text-white/80">
                    S.Goodie Photography
                  </p>
                  <h1 className="text-4xl font-semibold tracking-[0.15em] md:text-5xl">
                    {currentPage?.title}
                  </h1>
                  <p className="text-[12px] uppercase tracking-[0.35em] text-white/80">
                    {currentPage?.intro}
                  </p>
                </div>
              </FullBleedHero>
            )}

            {homeLayout && (
              <section className="space-y-16 pt-6 pb-10">
                <div className="mx-auto max-w-3xl space-y-6 text-center">
                  <div className="mx-auto w-10 text-ink/60">
                    <svg viewBox="0 0 48 24" className="h-auto w-full" aria-hidden="true">
                      <path
                        d="M8 16 L24 6 L24 18 L40 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.4em] text-ink/60">
                    {homeLayout.introText}
                  </p>
                </div>
                <HomeGalleryGrid
                  photos={homeLayout.featurePhotoIds
                    .map((id) => photosById.get(id))
                    .filter(Boolean) as PhotoAsset[]}
                />
              </section>
            )}
          </div>
        )}

        {activePath === '/work' && (
          <div className="space-y-12">
            <div className="max-w-2xl space-y-4">
              <p className="eyebrow">Work</p>
              <h1 className="text-4xl font-semibold md:text-5xl">{currentPage?.title}</h1>
              <p className="text-base text-ink/70">{currentPage?.intro}</p>
            </div>
            <div className="divide-y divide-line">
              {orderedProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleNav(`/work/${project.slug}`)}
                  className="flex w-full flex-wrap items-center justify-between gap-4 py-6 text-left text-2xl font-semibold transition hover:opacity-60"
                >
                  <span>{project.title}</span>
                  <span className="text-[11px] uppercase tracking-[0.35em] text-ink/50">
                    {project.status === 'draft' ? 'Coming Soon' : 'View'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeProject && (
          <div className="space-y-14">
            {photosById.get(activeProject.heroPhotoId) && (
              <ProjectHero
                title={activeProject.title}
                subtitle={activeProject.subtitle}
                intro={activeProject.intro}
                photo={photosById.get(activeProject.heroPhotoId)!}
              />
            )}

            {activeProject.sections && activeProject.sections.length > 0 && (
              <section className="space-y-12">
                {activeProject.sections.map((section, index) => {
                  if (section.type === 'text') {
                    return (
                      <div key={`${section.heading}-${index}`} className="max-w-2xl space-y-3">
                        <h2 className="text-2xl font-semibold">{section.heading}</h2>
                        <p className="text-base text-ink/70">{section.body}</p>
                      </div>
                    );
                  }

                  const photo = photosById.get(section.photoId);
                  if (!photo) return null;
                  return <HeroImage key={`${section.photoId}-${index}`} photo={photo} />;
                })}
              </section>
            )}

            {activeProject.galleryPhotoIds.length > 0 && (
              <PhotoGrid
                photos={activeProject.galleryPhotoIds
                  .map((id) => photosById.get(id))
                  .filter(Boolean) as PhotoAsset[]}
              />
            )}
          </div>
        )}

        {activePath === '/about' && (
          <div className="space-y-16">
            <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <p className="eyebrow">About</p>
                <h1 className="text-4xl font-semibold md:text-5xl">{currentPage?.title}</h1>
                <p className="text-base text-ink/70">{currentPage?.intro}</p>
              </div>
              {getGallery('about')[0] && (
                <FullBleedHero photo={getGallery('about')[0]} minHeight="screen" overlay="light" />
              )}
            </section>
            {getGallery('about').length > 1 && <PhotoGrid photos={getGallery('about').slice(1)} />}
          </div>
        )}

        {activePath === '/journal' && !activeJournalPost && (
          <div className="space-y-12">
            <div className="max-w-2xl space-y-4">
              <p className="eyebrow">Journal</p>
              <h1 className="text-4xl font-semibold md:text-5xl">{currentPage?.title}</h1>
              <p className="text-base text-ink/70">{currentPage?.intro}</p>
            </div>
            <div className="space-y-10">
              {journalPosts
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => handleNav(`/journal/${post.slug}`)}
                    className="block w-full border-b border-line pb-8 text-left transition hover:opacity-70"
                  >
                    <p className="text-[11px] uppercase tracking-[0.35em] text-ink/50">
                      {post.category} · {post.author} · {formatDate(post.date)}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold">{post.title}</h2>
                    <p className="mt-3 max-w-2xl text-sm text-ink/60">{post.excerpt}</p>
                  </button>
                ))}
            </div>
          </div>
        )}

        {activeJournalPost && (
          <div className="space-y-12">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <h1 className="text-4xl font-semibold md:text-5xl">{activeJournalPost.title}</h1>
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink/50">
                {activeJournalPost.category}
              </p>
            </div>

            {/* Photo Grid */}
            {(activeJournalPost.heroPhotoId || activeJournalPost.galleryPhotoIds.length > 0) && (
              <div className="grid gap-4 md:grid-cols-3">
                {[activeJournalPost.heroPhotoId, ...activeJournalPost.galleryPhotoIds]
                  .filter(Boolean)
                  .map((id) => photosById.get(id))
                  .filter(Boolean)
                  .map((photo) => (
                    <div key={photo!.id} className="relative aspect-[4/3] overflow-hidden bg-fog">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo!.src} alt={photo!.alt} className="h-full w-full object-cover" />
                    </div>
                  ))}
              </div>
            )}

            {/* Body */}
            <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                {activeJournalPost.body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-base text-ink/70">{paragraph}</p>
                ))}
              </div>

              {/* Credits */}
              {activeJournalPost.credits && activeJournalPost.credits.length > 0 && (
                <aside className="space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-ink/50">Credits</p>
                  <div className="border-t border-line pt-4 space-y-2">
                    {activeJournalPost.credits.map((credit) => (
                      <div key={`${credit.label}-${credit.value}`} className="text-sm">
                        <span className="text-ink/50">{credit.label}:</span>{' '}
                        <span className="text-ink">{credit.value}</span>
                      </div>
                    ))}
                  </div>
                </aside>
              )}
            </div>

            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleNav('/journal')}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ← Back to Journal
              </button>
            </div>
          </div>
        )}

        {activePath === '/contact' && (
          <div className="space-y-16">
            <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <p className="eyebrow">Contact</p>
                <h1 className="text-4xl font-semibold md:text-5xl">{currentPage?.title}</h1>
                <p className="text-base text-ink/70">{currentPage?.intro}</p>
                <div className="space-y-2 text-sm text-ink/70">
                  <p>{profile?.name || 'S.Goodie Photography'}</p>
                  <p>{previewEmail}</p>
                  <p>{previewPhone}</p>
                </div>
              </div>
              {photosById.get('contact-hero') && (
                <FullBleedHero photo={photosById.get('contact-hero')!} minHeight="screen" overlay="light" />
              )}
            </section>
            {getGallery('contact').length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {getGallery('contact').map((photo) => (
                  <div key={photo.id} className="relative aspect-[4/3] overflow-hidden bg-fog">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-line bg-paper">
        <div className="container-page grid gap-8 py-12 text-sm md:grid-cols-3">
          <div className="space-y-3">
            <p className="eyebrow">Contact</p>
            <p className="text-ink">{previewEmail}</p>
            <p className="text-ink">{previewPhone}</p>
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Social</p>
            <p className="text-ink">Instagram: {previewInstagram}</p>
            <p className="text-ink">LinkedIn: {previewLinkedIn}</p>
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Availability</p>
            <p className="text-ink">{previewRegions}</p>
            <p className="text-ink/60">{previewNote}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
