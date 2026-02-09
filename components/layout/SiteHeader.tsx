'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { loadDraftProfile } from '@/lib/admin/draft-profile-store';
import layoutStyles from '@/styles/public/layout.module.css';
import styles from '@/styles/public/SiteHeader.module.css';
import {
  portfolioCategories,
  portfolioCategoryLabels,
} from '@/lib/admin/portfolio-config';

const portfolioItems = portfolioCategories.map((cat) => ({
  href: `/portfolio/${cat}`,
  label: portfolioCategoryLabels[cat]
}));

const navLinks = [
  { href: '/about', label: 'About' },
  { href: '/journal', label: 'Journal' },
  { href: '/contact', label: 'Contact' }
];

interface SocialLinks {
  instagram: string;
  linkedin: string;
  twitter: string;
  facebook: string;
}

interface SiteHeaderProps {
  siteName?: string;
  socialLinks?: SocialLinks;
}

function useHeroPresence(enabled: boolean) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!enabled || typeof document === 'undefined') {
        return () => {};
      }

      const observer = new MutationObserver(() => onStoreChange());
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-hero']
      });

      return () => observer.disconnect();
    },
    () => {
      if (!enabled || typeof document === 'undefined') return false;
      return Boolean(document.querySelector('[data-hero="true"]'));
    },
    () => false
  );
}

function useScrollY(enabled: boolean) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!enabled || typeof window === 'undefined') {
        return () => {};
      }

      const handleScroll = () => onStoreChange();
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    },
    () => {
      if (!enabled || typeof window === 'undefined') return 0;
      return window.scrollY;
    },
    () => 0
  );
}

const DRAFT_PROFILE_KEY = 'sgoodie.admin.draft.profile';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

export function SiteHeader({ siteName = 'S.Goodie', socialLinks }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [mobilePortfolioOpen, setMobilePortfolioOpen] = useState(false);
  const [draftSiteName, setDraftSiteName] = useState<string | null>(null);
  const portfolioRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDraftPreview = searchParams.get('preview') === 'draft';

  useEffect(() => {
    if (!isDraftPreview) return;
    const load = () => {
      const draft = loadDraftProfile();
      setDraftSiteName(draft?.name ?? null);
    };
    load();
    const pollId = window.setInterval(load, 500);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DRAFT_PROFILE_KEY || event.key === PREVIEW_REFRESH_KEY) load();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(pollId);
    };
  }, [isDraftPreview]);

  const buildHref = useMemo(() => {
    if (!isDraftPreview) return (href: string) => href;
    return (href: string) => `${href}${href.includes('?') ? '&' : '?'}preview=draft`;
  }, [isDraftPreview]);

  const isHeroPage = useMemo(() => {
    if (pathname === '/') return true;
    // Only individual project pages have heroes, not category listings
    // e.g., /portfolio/hotels/project-slug (3 segments) has a hero
    // but /portfolio/hotels (2 segments) is just a grid listing
    const portfolioSegments = pathname.match(/^\/portfolio\/[^/]+\/[^/]+/);
    if (portfolioSegments) return true;
    if (pathname === '/journal') return true;
    if (pathname === '/about' || pathname === '/contact') return true;
    return false;
  }, [pathname]);

  const hasHeroMedia = useHeroPresence(isHeroPage);
  const heroMode = isHeroPage && hasHeroMedia;
  const scrollY = useScrollY(heroMode);
  const isScrolled = !heroMode || scrollY > 12;

  // Close portfolio dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (portfolioRef.current && !portfolioRef.current.contains(event.target as Node)) {
        setPortfolioOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const headerClass = isScrolled ? styles.headerScrolled : styles.headerHero;
  const linkClass = isScrolled ? styles.navLinkScrolled : styles.navLinkHero;
  const iconClass = isScrolled ? styles.iconLinkScrolled : styles.iconLinkHero;
  const menuButtonClass = isScrolled ? styles.menuButtonScrolled : styles.menuButtonHero;
  const dropdownClass = isScrolled ? styles.dropdownScrolled : styles.dropdownHero;

  return (
    <header
      className={`${styles.header} ${headerClass}`}
      style={isDraftPreview ? { top: 'var(--preview-banner-height, 2rem)' } : undefined}
    >
      <a href="#main-content" className={styles.skipLink}>
        Skip to Content
      </a>
      <div className={`${layoutStyles.container} ${styles.inner}`}>
        <Link href={buildHref('/')} className={styles.logo}>
          {isDraftPreview && draftSiteName !== null ? draftSiteName : siteName}
        </Link>
        <nav className={styles.nav}>
          {/* Portfolio dropdown */}
          <div className={styles.dropdownWrapper} ref={portfolioRef}>
            <button
              type="button"
              className={`${styles.navLink} ${linkClass} ${styles.dropdownTrigger}`}
              onClick={() => setPortfolioOpen(!portfolioOpen)}
              onMouseEnter={() => setPortfolioOpen(true)}
              aria-expanded={portfolioOpen}
              aria-haspopup="true"
            >
              Portfolio
              <svg
                className={`${styles.dropdownArrow} ${portfolioOpen ? styles.dropdownArrowOpen : ''}`}
                width="10"
                height="6"
                viewBox="0 0 10 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M1 1l4 4 4-4" />
              </svg>
            </button>
            {portfolioOpen && (
              <div
                className={`${styles.dropdown} ${dropdownClass}`}
                onMouseLeave={() => setPortfolioOpen(false)}
              >
                {portfolioItems.map((item) => (
                  <Link
                    key={item.href}
                    href={buildHref(item.href)}
                    className={styles.dropdownLink}
                    onClick={() => setPortfolioOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {navLinks.map((link) => (
            <Link key={link.href} href={buildHref(link.href)} className={`${styles.navLink} ${linkClass}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.iconRow}>
          {socialLinks?.instagram && (
            <a
              href={socialLinks.instagram}
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.iconLink} ${iconClass}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={styles.icon}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17" cy="7" r="1" />
              </svg>
            </a>
          )}
          {socialLinks?.linkedin && (
            <a
              href={socialLinks.linkedin}
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.iconLink} ${iconClass}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={styles.icon}
                fill="currentColor"
              >
                <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 8.98h3.96V21H3zM9.45 8.98h3.8v1.64h.05c.53-.95 1.83-1.96 3.77-1.96 4.03 0 4.78 2.65 4.78 6.1V21h-3.96v-5.3c0-1.26-.02-2.88-1.75-2.88-1.75 0-2.02 1.37-2.02 2.79V21H9.45z" />
              </svg>
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`${styles.menuButton} ${menuButtonClass}`}
        >
          {menuOpen ? 'Close Menu' : 'Open Menu'}
        </button>
      </div>
      {menuOpen && (
        <div className={styles.mobilePanel}>
          <div className={`${layoutStyles.container} ${styles.mobilePanelInner}`}>
            {/* Mobile Portfolio accordion */}
            <div className={styles.mobileAccordion}>
              <button
                type="button"
                className={styles.mobileAccordionTrigger}
                onClick={() => setMobilePortfolioOpen(!mobilePortfolioOpen)}
              >
                Portfolio
                <svg
                  className={`${styles.mobileAccordionArrow} ${mobilePortfolioOpen ? styles.mobileAccordionArrowOpen : ''}`}
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M1 1l4 4 4-4" />
                </svg>
              </button>
              {mobilePortfolioOpen && (
                <div className={styles.mobileAccordionContent}>
                  {portfolioItems.map((item) => (
                    <Link
                      key={item.href}
                      href={buildHref(item.href)}
                      className={styles.mobileSubLink}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={buildHref(link.href)}
                className={styles.mobileLink}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className={styles.mobileSocial}>
              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mobileSocialLink}
                >
                  Instagram
                </a>
              )}
              {socialLinks?.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  aria-label="LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mobileSocialLink}
                >
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
