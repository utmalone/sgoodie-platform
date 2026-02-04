# UX + Admin Architecture

**Last Updated:** 2026-02-04  
**Version:** 3.0  

---

## 1. Goals

The platform provides a high-end photography portfolio experience with a clean, non-technical admin workflow.

**Key goals:**
- All content comes from the backend (pages, photos, projects, journals)
- Frontend components are reusable templates
- Admin can manage content without typing URLs or code
- SEO metadata on both pages and photos with AI optimization

---

## 2. Public Site Architecture

### Routes

| Route | Page | Content Source |
|-------|------|----------------|
| `/` | Home | `home.json`, `pages.json` |
| `/work` | Work Index | `projects.json` |
| `/work/[slug]` | Work Detail | `projects.json` |
| `/about` | About | `about.json` |
| `/journal` | Journal Index | `journal.json` |
| `/journal/[slug]` | Journal Detail | `journal.json` |
| `/contact` | Contact | `contact.json` |

### Page Features

**Home**
- Full-screen hero with text overlay
- Gallery grid with lightbox

**Work Index**
- Photo grid with hover-to-reveal titles
- Click navigates to project detail

**Work Detail**
- Full-bleed hero with title overlay
- Editorial gallery (alternating double/single rows)
- Optional captions on double rows
- Lightbox support

**About**
- Hero with title
- Multi-paragraph intro
- 4-column approach grid
- Featured publications
- Bio section

**Journal Index**
- 3/4 height hero
- 3-column post grid
- Pagination (21 posts per page)

**Journal Detail**
- Centered title and category
- 3-column photo grid
- Body paragraphs with credits sidebar

**Contact**
- 3/4 height hero
- Two-column layout (info + form)
- Instagram feed section

---

## 3. Content Model

### Photos (`photos.json`)
```json
{
  "id": "string",
  "src": "string",
  "alt": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "metaKeywords": "string"
}
```

### Projects (`projects.json`)
```json
{
  "id": "string",
  "slug": "string",
  "title": "string",
  "subtitle": "string",
  "heroPhotoId": "string",
  "galleryPhotoIds": ["string"],
  "editorialCaptions": [{ "title": "string", "body": "string" }],
  "credits": [{ "label": "string", "value": "string" }],
  "status": "published | draft"
}
```

### Journal Posts (`journal.json`)
```json
{
  "slug": "string",
  "title": "string",
  "category": "string",
  "excerpt": "string",
  "body": "string",
  "heroPhotoId": "string",
  "galleryPhotoIds": ["string"],
  "credits": [{ "label": "string", "value": "string" }]
}
```

### About Page (`about.json`)
```json
{
  "heroPhotoId": "string",
  "heroTitle": "string",
  "introParagraphs": ["string"],
  "approachItems": [
    { "title": "string", "description": "string", "photoId": "string" }
  ],
  "featuredPublications": ["string"],
  "bio": {
    "photoId": "string",
    "paragraphs": ["string"],
    "ctaLabel": "string",
    "ctaUrl": "string"
  }
}
```

### Contact Page (`contact.json`)
```json
{
  "heroPhotoId": "string",
  "heroTitle": "string",
  "introParagraph": "string",
  "companyName": "string",
  "email": "string",
  "phone": "string",
  "instagramHandle": "string"
}
```

---

## 4. Admin Architecture

### Navigation
1. **Dashboard** - Analytics + AI batch actions
2. **Pages** - Edit page text and SEO metadata
3. **Photos** - Upload and manage photos
4. **Preview** - Preview with draft changes

### Admin Features
- NextAuth credentials authentication
- Real-time analytics tracking
- AI-assisted copy and SEO optimization
- Draft preview before publishing

---

## 5. Data Flow

### Current (Mock)
```
data/seed/ → data/local/ → lib/data/* → Page Components
```

### Planned (AWS)
```
S3 (images) → CloudFront
DynamoDB (content) → lib/data/* → Page Components
```

---

## 6. Component Architecture

### Template Components
All public page components are templates that receive data as props:

```typescript
// Example: Work detail page
export default async function WorkDetailPage({ params }) {
  const project = await getProjectBySlug(params.slug);
  const photos = await getPhotosByIds(project.galleryPhotoIds);
  
  return (
    <>
      <ProjectHero title={project.title} photo={heroPhoto} />
      <EditorialGallery photos={photos} captions={project.editorialCaptions} />
    </>
  );
}
```

### Reusable Components
- `EditorialGallery` - Used on work detail pages
- `JournalGrid` - Used on journal index
- `JournalPhotoGrid` - Used on journal detail
- `WorkGalleryGrid` - Used on work index
- `ContactForm` - Used on contact page
- `InstagramFeed` - Used on contact page

---

## 7. Open Items

1. Apply shared styling to admin pages
2. Migrate to AWS (S3 + DynamoDB)
3. Connect real Instagram API

---

**Document Version:** 3.0  
**Last Updated:** 2026-02-04
