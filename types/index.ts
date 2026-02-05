export type ProjectCategory = 'hotels' | 'restaurants' | 'travel' | 'home-garden' | 'brand';

export type PageSlug = 'home' | 'about' | 'portfolio' | 'journal' | 'contact';

export type PortfolioSequenceId = 'two-up' | 'one-up';

export type Photo = {
  id: string;
  alt: string;
  width: number;
  height: number;
  src: string;
};

export type PhotoAsset = Photo & {
  createdAt: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
};

export type PageContent = {
  slug: string; // Can be PageSlug or portfolio category slugs (e.g., 'portfolio-hotels')
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  gallery: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
};

export type ProjectCredit = {
  label: string;
  value: string;
};

export type ProjectSection =
  | {
      type: 'text';
      heading: string;
      body: string;
    }
  | {
      type: 'image';
      photoId: string;
      caption?: string;
    };

export type ProjectStatus = 'draft' | 'published';

export type EditorialRowCaption = {
  title: string;
  body: string;
};

export type EditorialRow =
  | {
      type: 'single';
      photoId: string;
    }
  | {
      type: 'double';
      leftPhotoId: string;
      rightPhotoId: string;
      leftOffset?: 'up' | 'down';
      caption?: EditorialRowCaption;
    };

export type Project = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  intro?: string;
  body?: string;
  category?: ProjectCategory;
  order?: number;
  sortOrder?: number;
  status?: ProjectStatus;
  featured?: boolean;
  hoverTitle?: string;
  heroPhotoId: string;
  galleryPhotoIds: string[];
  /** Optional explicit row configuration for editorial gallery */
  editorialRows?: EditorialRow[];
  /** Captions for auto-generated editorial rows (applied to every other double row) */
  editorialCaptions?: EditorialRowCaption[];
  sequenceId?: PortfolioSequenceId;
  sections?: ProjectSection[];
  credits?: ProjectCredit[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HomeLayout = {
  heroPhotoId: string;
  featurePhotoIds: string[];
};

export type WorkIndex = {
  projectIds: string[];
};

export type JournalPost = {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  date: string;
  excerpt: string;
  body: string;
  heroPhotoId: string;
  galleryPhotoIds: string[];
  credits?: ProjectCredit[];
};

/** Approach card for About page */
export type ApproachItem = {
  id: string;
  title: string;
  description: string;
  photoId: string;
};

/** Bio section for About page */
export type BioSection = {
  name: string;
  photoId: string;
  paragraphs: string[];
};

/** About page structured content */
export type AboutPageContent = {
  heroPhotoId: string;
  heroTitle: string;
  heroSubtitle: string;
  introParagraphs: string[];
  approachTitle: string;
  approachItems: ApproachItem[];
  featuredTitle: string;
  featuredPublications: string[];
  bio: BioSection;
};

/** Contact page structured content */
export type ContactPageContent = {
  heroPhotoId: string;
  heroTitle: string;
  heroSubtitle: string;
  sectionTitle: string;
  introParagraph: string;
  companyName: string;
  email: string;
  phone: string;
  instagramUrl: string;
  linkedinUrl: string;
  instagramHandle: string;
};

/** Social media link */
export type SocialLink = {
  handle?: string;
  name?: string;
  url: string;
};

/** Admin/Site profile for footer and contact info */
export type SiteProfile = {
  name: string;
  title: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  availability: {
    regions: string[];
    note: string;
  };
  social: {
    instagram: SocialLink;
    linkedin: SocialLink;
    twitter: SocialLink;
    facebook: SocialLink;
  };
  photoId: string;
};
