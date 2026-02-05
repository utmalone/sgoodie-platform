import Link from 'next/link';
import { getProfile } from '@/lib/data/profile';
import styles from '@/styles/public/SiteFooter.module.css';

export async function SiteFooter() {
  const profile = await getProfile();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Contact</p>
          <a href={`mailto:${profile.email}`} className={styles.link}>
            {profile.email}
          </a>
          <a href={`tel:${profile.phone.replace(/[^+\d]/g, '')}`} className={styles.link}>
            {profile.phone}
          </a>
        </div>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Social</p>
          {profile.social.instagram.url && (
            <a 
              href={profile.social.instagram.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              Instagram: {profile.social.instagram.handle || '@sgoodiephoto'}
            </a>
          )}
          {profile.social.linkedin.url && (
            <a 
              href={profile.social.linkedin.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              LinkedIn: {profile.social.linkedin.name || 'S.Goodie Studio'}
            </a>
          )}
          {profile.social.twitter.url && (
            <a 
              href={profile.social.twitter.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              Twitter: {profile.social.twitter.handle}
            </a>
          )}
          {profile.social.facebook.url && (
            <a 
              href={profile.social.facebook.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              Facebook: {profile.social.facebook.name}
            </a>
          )}
        </div>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Availability</p>
          <p className={styles.text}>{profile.availability.regions.join(', ')}</p>
          <p className={styles.muted}>{profile.availability.note}</p>
        </div>
      </div>
      <div className={styles.bottom}>
        <div className={styles.bottomRow}>
          <span>© {new Date().getFullYear()} {profile.name} Photography</span>
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
