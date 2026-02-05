import styles from '@/styles/admin/AdminLogin.module.css';

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.wrapper}>{children}</div>;
}
