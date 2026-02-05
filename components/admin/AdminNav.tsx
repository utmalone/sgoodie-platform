'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/admin/AdminShared.module.css';

const links = [
  { href: '/admin/profile', label: 'Profile' },
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/pages', label: 'Pages' },
  { href: '/admin/portfolio', label: 'Portfolio' },
  { href: '/admin/journal', label: 'Journal' },
  { href: '/admin/photos', label: 'Photos' }
];

export function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname === '/admin';
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className={styles.nav}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ''}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
