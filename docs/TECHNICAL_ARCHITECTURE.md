# Technical Architecture - S.Goodie Photography Platform

**Last Updated:** 2026-02-05  
**Version:** 4.0  

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
                                    |-- OpenAI Vision API (photo analysis)
```

### Key Principles
- Single deployable app with route groups for public and admin
- All content comes from backend (mock JSON now, API later)
- Frontend components are reusable templates
- Authenticated admin routes with NextAuth and session timeout
- Real analytics data recorded locally
- AI-assisted copy and metadata optimization (including vision AI for photos)

---

## 2. Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| UI | React 18 |
| Styling | CSS Modules (`styles/public/*.module.css`, `styles/admin/*.module.css`) |
| Auth | NextAuth Credentials with JWT sessions |
| Data | JSON files under `data/local/` |
| Analytics | Custom client provider and server route |
| AI | OpenAI Responses API + Vision API |

---

## 3. Project Structure

```
app/
  (public)/              # Public pages
    about/
    contact/
    journal/
      [slug]/
    portfolio/           # Portfolio category pages
      [category]/
        [slug]/          # Individual project pages
  (admin)/admin/         # Admin pages
    dashboard/
    pages/
    photos/
    portfolio/           # Portfolio management
      new/
      [id]/
    journal/             # Journal management
      new/
      [id]/
    profile/             # NEW - Admin profile management
  api/                   # API routes
    admin/
      ai/
        analyze-photo/   # NEW - Vision AI photo analysis
        batch-stream/    # NEW - SSE batch optimization
      layouts/           # Home, About, Contact layouts
      profile/           # NEW - Profile CRUD
      password/          # NEW - Password change
    analytics/
    auth/
    instagram/

components/
  admin/                 # Admin UI components
    AdminDashboardClient.tsx
    AdminNav.tsx
    AdminPagesClient.tsx
    AdminPhotosClient.tsx
    AdminPortfolioClient.tsx
    AdminPortfolioEditorClient.tsx
    AdminJournalClient.tsx
    AdminJournalEditorClient.tsx
    AdminProfileClient.tsx    # NEW
    AdminPreviewModal.tsx
    AdminShell.tsx
  analytics/             # Analytics provider
  layout/                # Header, footer
    SiteHeader.tsx       # Dynamic social links
    SiteFooter.tsx       # Dynamic profile data
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
    draft-store.ts
    page-config.ts
    portfolio-config.ts  # Portfolio categories
    save-context.tsx     # NEW - Master save state
    preview-context.tsx  # NEW - Preview modal state
  ai/                    # AI integration
    openai.ts            # Vision AI support
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
    profile.ts           # NEW - Profile data
    projects.ts

styles/
  public/                # CSS Modules for public UI
  admin/                 # CSS Modules for admin UI
    AdminShared.module.css
    AdminProfile.module.css

data/
  seed/                  # Seed data (source of truth)
  local/                 # Working copy (gitignored)
    profile.json         # NEW - Profile data

types/
  index.ts               # TypeScript type definitions (includes SiteProfile)
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

### Dynamic Header/Footer
- `SiteHeader` receives `socialLinks` prop from layout
- `SiteFooter` reads profile data directly for contact info and social links
- Social icons only display if URLs are configured in admin profile

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
| `SiteHeader` | Navigation with transparent/solid state, dynamic social icons |
| `SiteFooter` | Footer with dynamic profile data (contact, social, availability) |
| `FullBleedHero` | Full-viewport image with overlay |
| `ProjectHero` | Hero with title/subtitle overlay |

### Gallery Components

| Component | Purpose |
|-----------|---------|
| `EditorialGallery` | Alternating double/single rows with offsets and captions |
| `WorkGalleryGrid` | Hover-to-reveal grid for portfolio index |
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
  category?: PortfolioCategory;  // hotels, restaurants, travel, home-garden, brand
  heroPhotoId: string;
  galleryPhotoIds: string[];
  editorialCaptions?: EditorialRowCaption[];
  // ...
};

type PortfolioCategory = 'hotels' | 'restaurants' | 'travel' | 'home-garden' | 'brand';

type SiteProfile = {
  name: string;
  title: string;
  photoId: string;
  email: string;
  phone: string;
  address: { street: string; city: string; state: string };
  availability: { regions: string[]; note: string };
  social: {
    instagram: { url: string; handle?: string };
    linkedin: { url: string; name?: string };
    twitter: { url: string; handle?: string };
    facebook: { url: string; name?: string };
  };
};

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
- Session stored as JWT with expiration
- Inactivity timeout (configurable)
- Guard helpers: `requireAdmin` and `requireAdminApi`
- Logout functionality

### Admin Pages
| Route | Purpose |
|-------|---------|
| `/admin/profile` | **NEW** - Manage profile, contact info, social links, change password |
| `/admin/dashboard` | Analytics and AI batch actions |
| `/admin/pages` | Edit page text and metadata (includes portfolio category pages) |
| `/admin/portfolio` | Manage portfolio projects with full CRUD |
| `/admin/portfolio/[id]` | Edit individual project |
| `/admin/journal` | Manage journal posts with full CRUD |
| `/admin/journal/[id]` | Edit individual post |
| `/admin/photos` | Upload and manage photos with AI analysis |

### Preview System
- Full-screen modal preview (`AdminPreviewModal`)
- Context-aware: opens to relevant public page based on current admin section
- Yellow header bar with "Close Preview" button
- Loads actual public site in iframe

### Master Save System
- `SaveContext` tracks pending changes across all sections
- "Save All" button in sidebar saves all changes atomically
- Visual indicators: pending (amber), saving (spinner), success (green), error (red)
- Disabled until changes are detected

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
| `POST /api/admin/ai/batch-stream` | **NEW** - SSE streaming batch optimization |
| `POST /api/admin/ai/analyze-photo` | **NEW** - Vision AI photo analysis |

### Vision AI (Photo Analysis)
- Uses GPT-4o Vision to analyze uploaded photos
- Generates: alt text, SEO title, description, keywords
- Triggered automatically on photo upload (optional)
- System message provides photography context

### Batch Optimization
- Real-time progress via Server-Sent Events (SSE)
- Processes pages, photos, portfolio projects, and journal posts
- Checkboxes to include/exclude content types
- Progress percentage and milestone indicators

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

**Document Version:** 4.0  
**Last Updated:** 2026-02-05
