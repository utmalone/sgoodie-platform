# Technical Architecture - S.Goodie Photography Platform

**Last Updated:** 2026-02-04  
**Version:** 3.0  

---

## 1. Architecture Overview

This project runs as a single Next.js application containing the public site, admin UI, and all API routes.

```
Browser
  |-- Public pages (SSR/SSG-ready) -> Next.js App Router
  |-- Admin UI (client components) -> Next.js App Router
  |-- Admin API calls             -> /app/api/**
                                    |-- Local JSON store (data/local)
                                    |-- Analytics store (data/local/analytics.json)
                                    |-- OpenAI Responses API (server-side fetch)
```

### Key Principles
- Single deployable app with route groups for public and admin
- All content comes from backend (mock JSON now, API later)
- Frontend components are reusable templates
- Authenticated admin routes with NextAuth
- Real analytics data recorded locally
- AI-assisted copy and metadata optimization

---

## 2. Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| UI | React 18 |
| Styling | CSS Modules (`styles/public/*.module.css`) |
| Auth | NextAuth Credentials |
| Data | JSON files under `data/local/` |
| Analytics | Custom client provider and server route |
| AI | OpenAI Responses API |

---

## 3. Project Structure

```
app/
  (public)/              # Public pages
    about/
    contact/
    journal/
      [slug]/
    work/
      [slug]/
  (admin)/admin/         # Admin pages
    dashboard/
    pages/
    photos/
    preview/
  api/                   # API routes
    admin/
    analytics/
    auth/
    instagram/

components/
  admin/                 # Admin UI components
  analytics/             # Analytics provider
  layout/                # Header, footer
  portfolio/             # Public UI components
    ContactForm.tsx
    EditorialGallery.tsx
    FullBleedHero.tsx
    GalleryLightbox.tsx
    HomeGalleryGrid.tsx
    InstagramFeed.tsx
    JournalGrid.tsx
    JournalPhotoGrid.tsx
    PhotoGrid.tsx
    ProjectHero.tsx
    WorkGalleryGrid.tsx

lib/
  admin/                 # Admin utilities
  ai/                    # AI integration
  analytics/             # Analytics helpers
  auth/                  # Auth utilities
  data/                  # Data fetching
    about.ts
    contact.ts
    home.ts
    journal.ts
    local-store.ts
    pages.ts
    photos.ts
    projects.ts
    work.ts

styles/
  public/                # CSS Modules for public UI

data/
  seed/                  # Seed data (source of truth)
  local/                 # Working copy (gitignored)

types/
  index.ts               # TypeScript type definitions
```

---

## 4. Public Site Architecture

### Page Components
Pages use server components and read content from `lib/data/*` functions:

```typescript
// Example: About page
export default async function AboutPage() {
  const content = await getAboutContent();
  const heroPhoto = await getPhotoById(content.heroPhotoId);
  // ... render with data
}
```

### Data Flow
1. Seed data in `data/seed/` is the source of truth
2. `local-store.ts` copies seed to `data/local/` if missing
3. Page components call data functions at build/request time
4. Data is passed to presentational components as props

### Metadata
Generated via `generateMetadata` using stored fields:
- `metaTitle`
- `metaDescription`
- `metaKeywords`

---

## 5. Component Architecture

### Layout Components

| Component | Purpose |
|-----------|---------|
| `SiteHeader` | Navigation with transparent/solid state |
| `SiteFooter` | Footer with links |
| `FullBleedHero` | Full-viewport image with overlay |
| `ProjectHero` | Hero with title/subtitle overlay |

### Gallery Components

| Component | Purpose |
|-----------|---------|
| `EditorialGallery` | Alternating double/single rows with offsets and captions |
| `WorkGalleryGrid` | Hover-to-reveal grid for work index |
| `JournalGrid` | Post cards with excerpts for journal index |
| `JournalPhotoGrid` | 3-column grid with large padding for journal posts |
| `HomeGalleryGrid` | Gallery grid for home page |
| `PhotoGrid` | Simple grid for general use |
| `GalleryLightbox` | Full-screen image viewer |

### Form Components

| Component | Purpose |
|-----------|---------|
| `ContactForm` | Styled contact form with validation |
| `InstagramFeed` | 6-photo Instagram grid |

---

## 6. Data Types

### Core Types
```typescript
type Project = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  heroPhotoId: string;
  galleryPhotoIds: string[];
  editorialCaptions?: EditorialRowCaption[];
  // ...
};

type EditorialRow = 
  | { type: 'single'; photoId: string }
  | { type: 'double'; leftPhotoId: string; rightPhotoId: string; caption?: EditorialRowCaption };

type AboutPageContent = {
  heroPhotoId: string;
  heroTitle: string;
  introParagraphs: string[];
  approachItems: ApproachItem[];
  featuredPublications: string[];
  bio: BioSection;
};

type ContactPageContent = {
  heroPhotoId: string;
  heroTitle: string;
  introParagraph: string;
  companyName: string;
  email: string;
  phone: string;
  instagramHandle: string;
};
```

---

## 7. Admin Architecture

### Authentication
- NextAuth Credentials provider
- Session stored as JWT
- Guard helpers: `requireAdmin` and `requireAdminApi`

### Admin Pages
| Route | Purpose |
|-------|---------|
| `/admin/dashboard` | Analytics and AI batch actions |
| `/admin/pages` | Edit page text and metadata |
| `/admin/photos` | Upload and manage photos |
| `/admin/preview` | Preview with draft data |

### Draft Preview
- Draft content stored in browser localStorage
- Preview reads from draft first, falls back to saved data

---

## 8. Analytics Architecture

### Client
- `AnalyticsProvider` records page views and time spent
- Excludes admin and API routes
- Stores visitor and session IDs in localStorage

### Server
- `POST /api/analytics/events` appends events to `analytics.json`
- `GET /api/admin/stats` aggregates stats for dashboard

---

## 9. AI Architecture

### Endpoints
| Route | Purpose |
|-------|---------|
| `GET /api/admin/ai/models` | List available models |
| `POST /api/admin/ai/optimize` | Optimize single field |
| `POST /api/admin/ai/batch` | Bulk SEO/text updates |

---

## 10. Environment Variables

### Required
```
USE_MOCK_DATA=true
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=<sha256-hex>
NEXTAUTH_SECRET=<random-string>
```

### Optional
```
OPENAI_API_KEY=<your-key>
OPENAI_DEFAULT_MODEL=gpt-4
INSTAGRAM_ACCESS_TOKEN=<token>
```

---

## 11. Future AWS Architecture

- S3 for photos and image variants
- DynamoDB for structured content
- CloudFront for delivery
- LocalStack for local AWS emulation
- Terraform for infrastructure provisioning

---

**Document Version:** 3.0  
**Last Updated:** 2026-02-04
