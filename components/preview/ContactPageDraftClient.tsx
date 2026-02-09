'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ContactForm } from '@/components/portfolio/ContactForm';
import { InstagramFeed } from '@/components/portfolio/InstagramFeed';
import type { ContactPageContent, PhotoAsset, SiteProfile } from '@/types';
import { loadDraftContactContent } from '@/lib/admin/draft-contact-store';
import styles from '@/styles/public/ContactPage.module.css';

type ContactPageDraftClientProps = {
  fallbackContent: ContactPageContent;
  profile: SiteProfile;
  heroPhoto: PhotoAsset | null;
};

const DRAFT_CONTACT_STORAGE_KEY = 'sgoodie.admin.draft.contact';
const PREVIEW_REFRESH_KEY = 'admin-preview-refresh';

async function fetchPhotoById(id: string): Promise<PhotoAsset | null> {
  const res = await fetch(`/api/photos?ids=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const photos: PhotoAsset[] = await res.json();
  return photos[0] ?? null;
}

export function ContactPageDraftClient({
  fallbackContent,
  profile,
  heroPhoto: initialHeroPhoto
}: ContactPageDraftClientProps) {
  const [draft, setDraft] = useState(() => loadDraftContactContent());
  const [heroPhoto, setHeroPhoto] = useState<PhotoAsset | null>(initialHeroPhoto);

  useEffect(() => {
    const load = () => setDraft(loadDraftContactContent());

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DRAFT_CONTACT_STORAGE_KEY && event.key !== PREVIEW_REFRESH_KEY) return;
      load();
    };

    const pollId = window.setInterval(load, 500);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearInterval(pollId);
    };
  }, []);

  const content = useMemo(() => ({ ...fallbackContent, ...(draft ?? {}) }), [fallbackContent, draft]);

  const email = content.email || profile.email;
  const phone = content.phone || profile.phone;

  useEffect(() => {
    const draftHeroId = draft?.heroPhotoId ?? fallbackContent.heroPhotoId;
    if (!draftHeroId) {
      setHeroPhoto(null);
      return;
    }
    if (initialHeroPhoto?.id === draftHeroId) {
      setHeroPhoto(initialHeroPhoto);
      return;
    }
    if (fallbackContent.heroPhotoId === draftHeroId && initialHeroPhoto) {
      setHeroPhoto(initialHeroPhoto);
      return;
    }
    fetchPhotoById(draftHeroId).then(setHeroPhoto);
  }, [draft?.heroPhotoId, fallbackContent.heroPhotoId, initialHeroPhoto]);

  return (
    <div className={styles.wrapper}>
      {/* Hero Section */}
      {heroPhoto && (
        <section
          className={styles.heroSection}
          data-hero="true"
          style={{
            ...(content.heroTitleColor ? { '--hero-title-color': content.heroTitleColor } : {}),
            ...(content.heroSubtitleColor ? { '--hero-subtitle-color': content.heroSubtitleColor } : {})
          } as React.CSSProperties}
        >
          <div className={styles.heroImage}>
            <Image
              src={heroPhoto.src}
              alt={heroPhoto.alt}
              fill
              priority
              sizes="100vw"
              className={styles.heroImg}
            />
            <div className={styles.heroOverlay} />
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>{content.heroTitle}</h1>
              <p className={styles.heroSubtitle}>{content.heroSubtitle}</p>
            </div>
          </div>
        </section>
      )}

      {/* Contact Section - Two Column Layout */}
      <section className={styles.contactSection}>
        <div className={styles.contactGrid}>
          {/* Left Column - Info */}
          <div className={styles.infoColumn}>
            <h2 className={styles.sectionTitle}>{content.sectionTitle}</h2>
            <p className={styles.introParagraph}>{content.introParagraph}</p>

            <div className={styles.contactDetails}>
              <p className={styles.companyName}>{content.companyName}</p>
              <a href={`mailto:${email}`} className={styles.contactLink}>
                {email}
              </a>
              <p className={styles.phone}>{phone}</p>
            </div>

            <div className={styles.socialIcons}>
              <a
                href={content.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={styles.socialIcon}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17" cy="7" r="1" fill="currentColor" />
                </svg>
              </a>
              <a
                href={content.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className={styles.socialIcon}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 8.98h3.96V21H3zM9.45 8.98h3.8v1.64h.05c.53-.95 1.83-1.96 3.77-1.96 4.03 0 4.78 2.65 4.78 6.1V21h-3.96v-5.3c0-1.26-.02-2.88-1.75-2.88-1.75 0-2.02 1.37-2.02 2.79V21H9.45z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className={styles.formColumn}>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <InstagramFeed handle={content.instagramHandle} instagramUrl={content.instagramUrl} />
    </div>
  );
}
