import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-parchment">
      <div className="container-page flex flex-col gap-4 py-8 text-sm">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <p className="text-black/70">
            S.Goodie Photography - Interiors, Travel, Brand Marketing
          </p>
          <Link
            href="/admin/login"
            className="text-[10px] uppercase tracking-[0.35em] text-black/30 transition hover:text-black/60"
            aria-label="Admin login"
          >
            Studio
          </Link>
        </div>
        <p className="text-black/50">Based in Seattle. Available worldwide.</p>
      </div>
    </footer>
  );
}
