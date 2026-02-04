'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import layoutStyles from '@/styles/public/layout.module.css';
import styles from '@/styles/public/SiteHeader.module.css';

const navLinks = [
  { href: '/work', label: 'Work' },
  { href: '/about', label: 'About' },
  { href: '/journal', label: 'Journal' },
  { href: '/contact', label: 'Contact' }
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isHeroPage = useMemo(() => {
    if (pathname === '/') return true;
    if (pathname.startsWith('/work/')) return true;
    if (pathname === '/journal') return true; // Only the main journal page has a hero
    if (pathname === '/about' || pathname === '/contact') return true;
    return false;
  }, [pathname]);

  const [isScrolled, setIsScrolled] = useState(!isHeroPage);

  useEffect(() => {
    if (!isHeroPage) {
      setIsScrolled(true);
      return;
    }

    function handleScroll() {
      setIsScrolled(window.scrollY > 12);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHeroPage]);

  const headerClass = isScrolled ? styles.headerScrolled : styles.headerHero;
  const linkClass = isScrolled ? styles.navLinkScrolled : styles.navLinkHero;
  const iconClass = isScrolled ? styles.iconLinkScrolled : styles.iconLinkHero;
  const menuButtonClass = isScrolled ? styles.menuButtonScrolled : styles.menuButtonHero;

  return (
    <header className={`${styles.header} ${headerClass}`}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to Content
      </a>
      <div className={`${layoutStyles.container} ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          S.Goodie
        </Link>
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`${styles.navLink} ${linkClass}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.iconRow}>
          <a
            href="https://instagram.com"
            aria-label="Instagram"
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
          <a
            href="https://linkedin.com"
            aria-label="LinkedIn"
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.mobileLink}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className={styles.mobileSocial}>
              <a
                href="https://instagram.com"
                aria-label="Instagram"
                className={styles.mobileSocialLink}
              >
                Instagram
              </a>
              <a
                href="https://linkedin.com"
                aria-label="LinkedIn"
                className={styles.mobileSocialLink}
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
