# UX + Admin Architecture

**Last Updated:** 2026-02-05  
**Version:** 5.0  

---

## 1. Goals

The platform provides a high-end photography portfolio experience with a clean, non-technical admin workflow.

**Key goals:**
- All content comes from the backend (pages, photos, projects, journals, profile)
- Frontend components are reusable templates
- Admin can manage content without typing URLs or code
- SEO metadata on both pages and photos with AI optimization
- Social links and contact info managed centrally in profile
- Public site updates are visible on refresh

---

## 2. Public Site Architecture

### Routes

| Route | Page | Content Source |
|-------|------|----------------|
| `/` | Home | `pages` table (home layout + page copy) |
| `/portfolio/[category]` | Portfolio Category | `pages` + `projects` |
| `/portfolio/[category]/[slug]` | Portfolio Detail | `projects` |
| `/about` | About | `pages` table (about content) |
| `/journal` | Journal Index | `journal` + `pages` |
| `/journal/[slug]` | Journal Detail | `journal` |
| `/contact` | Contact | `pages` table (contact content + profile) |

### Portfolio Categories
- Hotels (`/portfolio/hotels`)
- Restaurants (`/portfolio/restaurants`)
- Travel (`/portfolio/travel`)
- Home & Garden (`/portfolio/home-garden`)
- Brand (`/portfolio/brand`)

### Page Features

**Home**
- Full-screen hero with text overlay
- Gallery grid with lightbox

**Portfolio Category Pages**
- Centered category title
- Photo grid with hover-to-reveal titles
- Click navigates to project detail

**Portfolio Detail**
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

### Dynamic Header/Footer
- Header social icons linked to profile URLs
- Header is transparent over heroes only if hero exists
- Footer displays profile contact info, availability, and social links
- All social and contact data managed in admin Profile page

---

## 3. Content Model

### Profile (stored in `pages` table, slug `site-profile`)
```json
{
  "name": "string",
  "title": "string",
  "photoId": "string",
  "email": "string",
  "phone": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string"
  },
  "availability": {
    "regions": ["string"],
    "note": "string"
  },
  "social": {
    "instagram": { "url": "string", "handle": "string" },
    "linkedin": { "url": "string", "name": "string" },
    "twitter": { "url": "string", "handle": "string" },
    "facebook": { "url": "string", "name": "string" }
  }
}
```

### Photos (`photos` table)
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

### Projects (`projects` table)
```json
{
  "id": "string",
  "slug": "string",
  "title": "string",
  "subtitle": "string",
  "category": "hotels | restaurants | travel | home-garden | brand",
  "heroPhotoId": "string",
  "galleryPhotoIds": ["string"],
  "editorialCaptions": [{ "title": "string", "body": "string" }],
  "credits": [{ "label": "string", "value": "string" }],
  "status": "published | draft"
}
```

### Journal Posts (`journal` table)
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

---

## 4. Admin Architecture

### Navigation
1. **Profile** - Manage personal info, contact, social links, password
2. **Dashboard** - Analytics + AI batch actions
3. **Pages** - Edit page text and SEO metadata (including portfolio categories)
4. **Portfolio** - Manage portfolio projects (full CRUD)
5. **Journal** - Manage journal posts (full CRUD)
6. **Photos** - Upload and manage photos with AI analysis
7. **Preview Site** - Full-screen modal preview
8. **Save All** - Master save button for all pending changes
9. **Log out** - End session

### Admin Features
- NextAuth credentials authentication with session timeout
- Admin credentials stored in DynamoDB (seeded from env)
- Real-time analytics tracking (DynamoDB)
- AI-assisted copy and SEO optimization
- Vision AI for automatic photo metadata
- Draft preview before publishing
- Master save with visual status indicators
- Preview auto-refresh after saves
- Profile form validation (email includes `@`, phone auto-format)

---

## 5. Data Flow

### Production
```
DynamoDB (content + analytics) -> lib/data/* -> Page Components
                                 |-> Admin API routes
S3 (images) -> CloudFront -> Public UI
```

### Local Mock Mode
```
data/seed -> data/local -> lib/data/* -> Page Components
```

---

## 6. Component Architecture

### Layout with Profile Data
```typescript
// Public layout fetches profile for header + footer
export default async function PublicLayout({ children }) {
  const profile = await getProfile();
  const socialLinks = {
    instagram: profile.social.instagram.url,
    linkedin: profile.social.linkedin.url,
  };

  return (
    <>
      <SiteHeader socialLinks={socialLinks} />
      <main>{children}</main>
      <SiteFooter profile={profile} />
    </>
  );
}
```

### Reusable Components
- `EditorialGallery` - Used on portfolio detail pages
- `JournalGrid` - Used on journal index
- `JournalPhotoGrid` - Used on journal detail
- `WorkGalleryGrid` - Used on portfolio category pages
- `ContactForm` - Used on contact page
- `InstagramFeed` - Used on contact page

---

## 7. Admin Styling

### CSS Modules
- `styles/admin/AdminShared.module.css` - Shared admin styles
- `styles/admin/AdminProfile.module.css` - Profile page styles

### Responsive Design
- Sticky sidebar on desktop (fixed position)
- Collapsible sidebar on mobile
- Responsive form grids (single column on mobile, multi-column on desktop)
- Action menus collapse to dropdown on small screens

---

## 8. Open Items

1. Connect real Instagram API
2. Add Open Graph and Twitter card metadata
3. JSON-LD structured data

---

**Document Version:** 5.0  
**Last Updated:** 2026-02-05
