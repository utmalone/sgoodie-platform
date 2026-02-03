import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment">
      <SiteHeader />
      <main className="container-page py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}
