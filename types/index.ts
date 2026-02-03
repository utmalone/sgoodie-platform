export type ProjectCategory = 'interiors' | 'travel' | 'brand-marketing';

export type PageSlug =
  | 'home'
  | 'about'
  | 'work'
  | 'interiors'
  | 'travel'
  | 'brand-marketing';

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
  slug: PageSlug;
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

export type Project = {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  order: number;
  coverPhoto: Photo;
  featured?: boolean;
};
