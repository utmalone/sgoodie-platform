import Link from 'next/link';
import type { SiteProfile } from '@/types';
import { getProfile } from '@/lib/data/profile';
import styles from '@/styles/public/SiteFooter.module.css';

type SiteFooterProps = {
  profile?: SiteProfile;
};

export async function SiteFooter({ profile }: SiteFooterProps = {}) {
  const resolvedProfile = profile ?? await getProfile();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Contact</p>
          <a href={`mailto:${resolvedProfile.email}`} className={styles.link}>
            {resolvedProfile.email}
          </a>
          <a href={`tel:${resolvedProfile.phone.replace(/[^+\d]/g, '')}`} className={styles.link}>
            {resolvedProfile.phone}
          </a>
        </div>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Social</p>
          {resolvedProfile.social.instagram.url && (
            <a 
              href={resolvedProfile.social.instagram.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              Instagram: {resolvedProfile.social.instagram.handle || '@sgoodiephoto'}
            </a>
          )}
          {resolvedProfile.social.linkedin.url && (
            <a 
              href={resolvedProfile.social.linkedin.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              LinkedIn: {resolvedProfile.social.linkedin.name || 'S.Goodie Studio'}
            </a>
          )}
          {resolvedProfile.social.twitter.url && (
            <a 
              href={resolvedProfile.social.twitter.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              Twitter: {resolvedProfile.social.twitter.handle}
            </a>
          )}
          {resolvedProfile.social.facebook.url && (
            <a 
              href={resolvedProfile.social.facebook.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              Facebook: {resolvedProfile.social.facebook.name}
            </a>
          )}
        </div>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Availability</p>
          <p className={styles.text}>{resolvedProfile.availability.regions.join(', ')}</p>
          <p className={styles.muted}>{resolvedProfile.availability.note}</p>
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={styles.bottomRow}>
          <span>© {new Date().getFullYear()} {resolvedProfile.name} Photography</span>
          <Link href="/admin/login" className={styles.adminLink}>
            Studio
          </Link>
          <span className={styles.credit}>
            Design inspired by editorial portfolio layouts
          </span>
        </div>
      </div>
    </footer>
  );
}
