import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PreviewBanner } from '@/components/layout/PreviewBanner';
import { getProfile } from '@/lib/data/profile';
import layoutStyles from '@/styles/public/layout.module.css';

export const dynamic = 'force-dynamic';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  
  const socialLinks = {
    instagram: profile.social.instagram.url || '',
    linkedin: profile.social.linkedin.url || '',
    twitter: profile.social.twitter.url || '',
    facebook: profile.social.facebook.url || '',
  };

  const heroTitleColor = profile.heroTitleColor || '#ffffff';
  const heroSubtitleColor = profile.heroSubtitleColor || 'rgba(255, 255, 255, 0.85)';

  return (
    <div className={layoutStyles.page}>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{--hero-title-color:${heroTitleColor};--hero-subtitle-color:${heroSubtitleColor}}`
        }}
      />
      <Suspense fallback={null}>
        <PreviewBanner />
      </Suspense>
      <SiteHeader siteName={profile.name} socialLinks={socialLinks} />
      <main id="main-content" className={`${layoutStyles.container} ${layoutStyles.main}`}>
        {children}
      </main>
      <SiteFooter profile={profile} />
    </div>
  );
}
