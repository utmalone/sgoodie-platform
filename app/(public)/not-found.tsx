import Link from 'next/link';
import styles from '@/styles/public/NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.body}>The page you are looking for does not exist or has moved.</p>
      <Link href="/" className={styles.link}>
        Back to home
      </Link>
    </div>
  );
}
