# SEO Strategy and Implementation

**Last Updated:** 2026-02-03
**Version:** 2.0

---

## 1. SEO Approach

The public site is built with Next.js App Router and is ready for SSG or ISR in production. This ensures that search engines receive fully rendered HTML and metadata.

Admin-only pages are client-side and are not indexed.

---

## 2. Current SEO Implementation

### Page Metadata
- Each page stores `metaTitle`, `metaDescription`, and `metaKeywords`
- Public pages use `generateMetadata` to emit these values

### Photo Metadata
- Each photo stores `alt`, `metaTitle`, `metaDescription`, and `metaKeywords`
- Photo metadata is editable in the admin Photos area

### Admin Workflow
- Pages: edit copy and SEO metadata in `/admin/pages`
- Photos: upload, reorder, and edit metadata in `/admin/photos`

---

## 3. AI-Assisted SEO

### AI Fix (Single Field)
- AI Fix buttons are available on page text and metadata fields
- AI Fix buttons are available on photo metadata fields

### AI Context Rules (Implemented)
- Page metadata AI receives:
  - Page text (intro, body, CTA)
  - Photo metadata for the page gallery
- Photo metadata AI receives:
  - Page metadata and page text
  - Other photo metadata on the same page

This helps keep keywords consistent while avoiding repetition and stuffing.

---

## 4. Rendering and Indexing

- Public pages use server components and are SEO-friendly
- Admin pages are protected and excluded from analytics tracking

---

## 5. Planned SEO Enhancements

- Open Graph and Twitter metadata for social previews
- JSON-LD structured data
- Sitemap generation
- Image optimization pipeline (responsive sizes, WebP and AVIF)

---

## 6. Summary

- The site already supports editable metadata at the page and photo level
- AI Fix tooling provides SEO-friendly copy with consistent keywords
- The architecture is compatible with SSG and ISR for optimal indexing

---

**Document Version:** 2.0
**Last Updated:** 2026-02-03
