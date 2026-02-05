# SEO Strategy and Implementation

**Last Updated:** 2026-02-05  
**Version:** 5.0  

---

## 1. SEO Approach

The public site is rendered server-side on AWS Amplify (SSR). All public pages return fully rendered HTML and metadata on request, and admin saves trigger revalidation so changes appear immediately after refresh.

Admin pages are client-side, protected, and not indexed.

---

## 2. Current SEO Implementation

### Page Metadata
- Each page stores `metaTitle`, `metaDescription`, and `metaKeywords`
- Public pages use `generateMetadata` to emit these values
- Metadata is editable in `/admin/pages`
- Portfolio category pages have dedicated SEO fields

### Photo Metadata
- Each photo stores `alt`, `metaTitle`, `metaDescription`, and `metaKeywords`
- Photo metadata is editable in `/admin/photos`
- Vision AI auto-generates metadata on upload (GPT-4o)

### Project Metadata
- Each portfolio project has its own SEO fields
- Editable in `/admin/portfolio/[id]`
- AI Fix buttons for individual field optimization

### Journal Metadata
- Journal posts follow page-level metadata patterns
- Body content contributes to page SEO

### Sitemap
- `app/sitemap.ts` generates dynamic sitemap with all public routes
- Includes all portfolio category pages
- Includes all portfolio project pages
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
| Portfolio Category | `/portfolio/[category]` | Category-specific metadata |
| Portfolio Detail | `/portfolio/[category]/[slug]` | Project-specific metadata |
| About | `/about` | Bio and expertise metadata |
| Journal | `/journal` | Blog listing with pagination |
| Journal Detail | `/journal/[slug]` | Post-specific metadata |
| Contact | `/contact` | Contact page metadata |

### Portfolio Categories
| Category | URL | Slug |
|----------|-----|------|
| Hotels | `/portfolio/hotels` | `portfolio-hotels` |
| Restaurants | `/portfolio/restaurants` | `portfolio-restaurants` |
| Travel | `/portfolio/travel` | `portfolio-travel` |
| Home & Garden | `/portfolio/home-garden` | `portfolio-home-garden` |
| Brand | `/portfolio/brand` | `portfolio-brand` |

### Image Optimization
- All images use Next.js `Image` component
- Automatic lazy loading
- Responsive sizing with `sizes` attribute
- Alt text stored in photo metadata
- Vision AI generates descriptive alt text

---

## 4. AI-Assisted SEO

### AI Fix (Single Field)
- Available on page text and metadata fields
- Available on photo metadata fields
- Available on project and journal metadata

### AI Photo Analysis (Vision)
- Uses GPT-4o Vision to analyze photo content
- Automatically generates:
  - Alt text (accessibility and SEO)
  - SEO title (descriptive, keyword-rich)
  - SEO description (detailed, contextual)
  - SEO keywords (relevant terms)
- Triggered on photo upload
- Results can be edited manually

### AI Batch Optimization
- Dashboard batch action for SEO metadata
- Processes pages, photos, portfolio projects, and journal posts
- Real-time SSE streaming for progress updates
- Checkboxes to select content types to optimize
- Progress milestones displayed during processing

---

## 5. Technical Implementation

### Server Rendering
All public pages are server-rendered on request:
```typescript
export default async function Page() {
  const data = await getData();
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

### Vision AI Integration
```typescript
POST /api/admin/ai/analyze-photo
Content-Type: multipart/form-data
Body: { file: <image file> }

Response: {
  alt: "Descriptive alt text",
  metaTitle: "SEO-optimized title",
  metaDescription: "Detailed description",
  metaKeywords: "relevant, keywords"
}
```

---

## 6. Planned Enhancements

- [ ] Open Graph metadata for social previews
- [ ] Twitter card metadata
- [ ] JSON-LD structured data for photography portfolio
- [ ] Image optimization pipeline (WebP, AVIF variants)
- [ ] Canonical URLs for portfolio categories

---

**Document Version:** 5.0  
**Last Updated:** 2026-02-05
