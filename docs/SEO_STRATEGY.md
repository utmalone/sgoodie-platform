# SEO Strategy and Implementation

**Last Updated:** 2026-02-04  
**Version:** 3.0  

---

## 1. SEO Approach

The public site is built with Next.js App Router using server components. All public pages are SSG/ISR-ready, ensuring search engines receive fully rendered HTML and metadata.

Admin pages are client-side, protected, and not indexed.

---

## 2. Current SEO Implementation

### Page Metadata
- Each page stores `metaTitle`, `metaDescription`, and `metaKeywords`
- Public pages use `generateMetadata` to emit these values
- Metadata is editable in `/admin/pages`

### Photo Metadata
- Each photo stores `alt`, `metaTitle`, `metaDescription`, and `metaKeywords`
- Photo metadata is editable in `/admin/photos`

### Sitemap
- `app/sitemap.ts` generates dynamic sitemap with all public routes
- Includes all work portfolio pages
- Includes all journal posts

### Robots
- `app/robots.ts` provides robots.txt configuration
- Excludes admin routes from indexing

---

## 3. SEO-Friendly Page Structure

### Public Pages
| Page | URL Pattern | SEO Features |
|------|-------------|--------------|
| Home | `/` | Full metadata, hero imagery |
| Work | `/work` | Project listing with metadata |
| Work Detail | `/work/[slug]` | Project-specific metadata |
| About | `/about` | Bio and expertise metadata |
| Journal | `/journal` | Blog listing with pagination |
| Journal Detail | `/journal/[slug]` | Post-specific metadata |
| Contact | `/contact` | Contact page metadata |

### Image Optimization
- All images use Next.js `Image` component
- Automatic lazy loading
- Responsive sizing with `sizes` attribute
- Alt text stored in photo metadata

---

## 4. AI-Assisted SEO

### AI Fix (Single Field)
- Available on page text and metadata fields
- Available on photo metadata fields

### AI Batch Optimization
- Dashboard batch action for SEO metadata
- Processes pages and photos in bulk

### AI Context Rules
- Page metadata AI receives page text and gallery photo metadata
- Photo metadata AI receives page context and sibling photo metadata
- Ensures keyword consistency without stuffing

---

## 5. Technical Implementation

### Server Components
All public pages use server components:
```typescript
// SSG-friendly pattern
export default async function Page() {
  const data = await getData(); // Build time
  return <Content data={data} />;
}
```

### Metadata Generation
```typescript
export async function generateMetadata({ params }) {
  const data = await getData(params.slug);
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.metaKeywords,
  };
}
```

---

## 6. Planned Enhancements

- [ ] Open Graph metadata for social previews
- [ ] Twitter card metadata
- [ ] JSON-LD structured data for photography portfolio
- [ ] Image optimization pipeline (WebP, AVIF variants)
- [ ] CDN integration for faster image delivery

---

**Document Version:** 3.0  
**Last Updated:** 2026-02-04
