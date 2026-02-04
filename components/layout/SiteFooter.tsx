import layoutStyles from '@/styles/public/layout.module.css';
import styles from '@/styles/public/SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`${layoutStyles.container} ${styles.inner}`}>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Contact</p>
          <p className={styles.text}>hello@sgoodie.com</p>
          <p className={styles.text}>(202) 555-0194</p>
        </div>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Social</p>
          <p className={styles.text}>Instagram: @sgoodiephoto</p>
          <p className={styles.text}>LinkedIn: S.Goodie Studio</p>
        </div>
        <div className={styles.column}>
          <p className={styles.eyebrow}>Availability</p>
          <p className={styles.text}>DC, MD, VA, PA, NY</p>
          <p className={styles.muted}>Available for travel and select commissions.</p>
        </div>
        <div className={styles.bottom}>
          <div className={styles.bottomRow}>
            <span>Â© 2026 S.Goodie Photography</span>
            <span>Design inspired by editorial portfolio layouts</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
