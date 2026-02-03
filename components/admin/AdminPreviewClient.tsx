'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PageContent, PhotoAsset, Project } from '@/types';
import { loadDraftPages } from '@/lib/admin/draft-store';
import { PhotoGrid } from '@/components/portfolio/PhotoGrid';
import { ProjectGrid } from '@/components/portfolio/ProjectGrid';
import { SectionHeader } from '@/components/layout/SectionHeader';

type NavLink = {
  label: string;
  path: string;
};

const navLinks: NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'Interiors', path: '/work/interiors' },
  { label: 'Travel', path: '/work/travel' },
  { label: 'Brand Marketing', path: '/work/brand-marketing' },
  { label: 'About', path: '/about' }
];

const workCards = [
  {
    title: 'Interiors',
    description: 'Home, garden, hospitality, and architectural storytelling.'
  },
  {
    title: 'Travel',
    description: 'Places, textures, and light from around the world.'
  },
  {
    title: 'Brand Marketing',
    description: 'Visual identity for personal and commercial brands.'
  }
];

function getPage(pages: PageContent[], slug: string) {
  return pages.find((page) => page.slug === slug);
}

function mapPathToSlug(path: string) {
  if (path === '/about') return 'about';
  if (path === '/work') return 'work';
  if (path === '/work/interiors') return 'interiors';
  if (path === '/work/travel') return 'travel';
  if (path === '/work/brand-marketing') return 'brand-marketing';
  return 'home';
}

export function AdminPreviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPath = searchParams.get('path') || '/';

  const [activePath, setActivePath] = useState(initialPath);
  const [pages, setPages] = useState<PageContent[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState('Loading preview...');

  useEffect(() => {
    const path = searchParams.get('path') || '/';
    if (path !== activePath) {
      setActivePath(path);
    }
  }, [searchParams, activePath]);

  useEffect(() => {
    async function load() {
      const [pagesRes, photosRes, projectsRes] = await Promise.all([
        fetch('/api/admin/pages'),
        fetch('/api/admin/photos'),
        fetch('/api/projects')
      ]);

      if (!pagesRes.ok || !photosRes.ok || !projectsRes.ok) {
        setStatus('Unable to load preview data.');
        return;
      }

      const pagesData = (await pagesRes.json()) as PageContent[];
      const photosData = (await photosRes.json()) as PhotoAsset[];
      const projectsData = (await projectsRes.json()) as Project[];

      const draft = loadDraftPages();
      setPages(draft ?? pagesData);
      setPhotos(photosData);
      setProjects(projectsData);
      setStatus('');
    }

    load();
  }, []);

  const photosById = useMemo(() => {
    return new Map(photos.map((photo) => [photo.id, photo]));
  }, [photos]);

  function getGallery(slug: string) {
    const page = getPage(pages, slug);
    if (!page) return [];
    return page.gallery
      .map((id) => photosById.get(id))
      .filter(Boolean) as PhotoAsset[];
  }

  function handleNav(path: string) {
    setActivePath(path);
    const params = new URLSearchParams(searchParams.toString());
    params.set('path', path);
    router.replace(`/admin/preview?${params.toString()}`);
  }

  const featuredProjects = useMemo(
    () => projects.filter((project) => project.featured),
    [projects]
  );

  const slug = mapPathToSlug(activePath);
  const currentPage = getPage(pages, slug);

  if (status) {
    return <p className="text-sm text-black/60">{status}</p>;
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="border-b border-black/10 bg-white/70">
        <div className="container-page flex items-center justify-between py-3 text-xs uppercase tracking-[0.3em] text-black/50">
          <span>Preview Mode (Draft)</span>
        </div>
      </div>

      <header className="border-b border-black/10 bg-parchment">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-6">
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="text-lg font-semibold tracking-wide"
          >
            S.Goodie Photography
          </button>
          <nav className="flex flex-wrap items-center gap-6 text-sm uppercase tracking-[0.2em]">
            {navLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => handleNav(link.path)}
                className={`transition hover:text-brass ${
                  activePath === link.path ? 'text-brass' : 'text-black/80'
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
          <div className="space-y-12">
            <section className="rounded-3xl border border-black/10 bg-white p-10 shadow-sm">
              <p className="text-xs uppercase tracking-[0.4em] text-black/50">S.Goodie Photography</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight">{currentPage?.title}</h1>
              <p className="mt-4 max-w-2xl text-base text-black/70">{currentPage?.intro}</p>
              {currentPage?.body && (
                <p className="mt-4 max-w-2xl text-base text-black/70">{currentPage.body}</p>
              )}
              {currentPage?.ctaLabel && currentPage?.ctaUrl && (
                <a
                  href={currentPage.ctaUrl}
                  className="mt-6 inline-flex rounded-full border border-black/20 px-6 py-2 text-xs uppercase tracking-[0.35em] text-black/70 hover:text-black"
                >
                  {currentPage.ctaLabel}
                </a>
              )}
            </section>

            <PhotoGrid photos={getGallery('home')} />

            {featuredProjects.length > 0 && (
              <section>
                <SectionHeader
                  title="Featured Work"
                  subtitle="A short selection of recent interior, travel, and brand marketing projects."
                />
                <ProjectGrid projects={featuredProjects} />
              </section>
            )}
          </div>
        )}

        {activePath === '/about' && (
          <div className="space-y-12">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-black/50">About</p>
                <h1 className="mt-4 text-4xl font-semibold">{currentPage?.title}</h1>
                <p className="mt-4 text-base text-black/70">{currentPage?.intro}</p>
                {currentPage?.body && (
                  <p className="mt-4 text-base text-black/70">{currentPage.body}</p>
                )}
              </div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
                <img
                  src={getGallery('about')[0]?.src || '/placeholder.svg'}
                  alt={getGallery('about')[0]?.alt || 'About preview'}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <PhotoGrid photos={getGallery('about').slice(1)} />
          </div>
        )}

        {activePath === '/work' && (
          <div className="space-y-10">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-black/50">Work</p>
              <h1 className="mt-4 text-4xl font-semibold">{currentPage?.title}</h1>
              <p className="mt-4 max-w-2xl text-base text-black/70">{currentPage?.intro}</p>
              {currentPage?.body && (
                <p className="mt-4 max-w-2xl text-base text-black/70">{currentPage.body}</p>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
                >
                  <h2 className="text-2xl font-semibold">{card.title}</h2>
                  <p className="mt-3 text-sm text-black/60">{card.description}</p>
                </div>
              ))}
            </div>
            <PhotoGrid photos={getGallery('work')} />
          </div>
        )}

        {activePath === '/work/interiors' && (
          <section className="space-y-10">
            <SectionHeader title={currentPage?.title || 'Interiors'} subtitle={currentPage?.intro} />
            {currentPage?.body && (
              <p className="max-w-2xl text-sm text-black/60">{currentPage.body}</p>
            )}
            <ProjectGrid projects={projects.filter((project) => project.category === 'interiors')} />
            <PhotoGrid photos={getGallery('interiors')} />
          </section>
        )}

        {activePath === '/work/travel' && (
          <section className="space-y-10">
            <SectionHeader title={currentPage?.title || 'Travel'} subtitle={currentPage?.intro} />
            {currentPage?.body && (
              <p className="max-w-2xl text-sm text-black/60">{currentPage.body}</p>
            )}
            <ProjectGrid projects={projects.filter((project) => project.category === 'travel')} />
            <PhotoGrid photos={getGallery('travel')} />
          </section>
        )}

        {activePath === '/work/brand-marketing' && (
          <section className="space-y-10">
            <SectionHeader
              title={currentPage?.title || 'Brand Marketing'}
              subtitle={currentPage?.intro}
            />
            {currentPage?.body && (
              <p className="max-w-2xl text-sm text-black/60">{currentPage.body}</p>
            )}
            <ProjectGrid
              projects={projects.filter((project) => project.category === 'brand-marketing')}
            />
            <PhotoGrid photos={getGallery('brand-marketing')} />
          </section>
        )}
      </main>

      <footer className="border-t border-black/10 bg-parchment">
        <div className="container-page flex flex-col gap-4 py-8 text-sm">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="text-black/70">
              S.Goodie Photography - Interiors, Travel, Brand Marketing
            </p>
            <span className="text-[10px] uppercase tracking-[0.35em] text-black/30">Studio</span>
          </div>
          <p className="text-black/50">Based in Seattle. Available worldwide.</p>
        </div>
      </footer>
    </div>
  );
}
