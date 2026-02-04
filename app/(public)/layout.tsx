import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import layoutStyles from '@/styles/public/layout.module.css';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={layoutStyles.page}>
      <SiteHeader />
      <main id="main-content" className={`${layoutStyles.container} ${layoutStyles.main}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
