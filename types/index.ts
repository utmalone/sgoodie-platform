export type ProjectCategory = 'interiors' | 'travel' | 'brand-marketing';

export type Photo = {
  id: string;
  alt: string;
  width: number;
  height: number;
  src: string;
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
