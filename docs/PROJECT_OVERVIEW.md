# S.Goodie Photography Platform - Project Overview

**Repository:** `sgoodie-platform`  
**Created:** 2025-01-16  
**Status:** Production on AWS Amplify (SSR) with DynamoDB (local mock mode supported)  
**Last Updated:** 2026-02-05  

---

## 1. Migration Purpose & Goals

### Current State (Pre-Migration)
- Platform: WordPress website hosted on Bluehost
- Issues:
  - Slow page load times
  - High hosting costs
  - Limited customization and control
  - Poor performance for image-heavy portfolio site

### Migration Goals
1. Performance: Reduce page load times with modern web tech and optimized images
2. Cost reduction: Lower hosting costs using scalable cloud infrastructure
3. Modern architecture: Next.js based frontend and backend in one app
4. Scalability: Architecture that grows with the business
5. Control: Full control of design, functionality, and content management
6. Design refresh: Clean editorial layout inspired by leading photography portfolios

### Success Metrics
- Page load time under 2 seconds
- Hosting costs reduced by 50 percent or more
- Improved SEO and user experience
- Simple, safe content management for the site owner

---

## 2. Current Build Snapshot (What Is Implemented)

### Public Site Pages

| Page | Route | Features |
|------|-------|----------|
| Home | `/` | Full-screen hero with text overlay, editorial gallery grid with lightbox |
| Portfolio | `/portfolio/[category]` | Photo grid by category (Hotels, Restaurants, Travel, Home & Garden, Brand) |
| Portfolio Detail | `/portfolio/[category]/[slug]` | Full-bleed hero with title overlay, editorial gallery, lightbox |
| About | `/about` | Hero with title, multi-paragraph intro, 4-column approach grid, featured publications, bio section |
| Journal | `/journal` | 3/4 height hero, 3-column post grid with pagination (21 posts per page) |
| Journal Detail | `/journal/[slug]` | Centered title, 3-column photo grid, body paragraphs with credits sidebar |
| Contact | `/contact` | 3/4 height hero, two-column layout (info + form), Instagram feed section |

### Key UI Components

- **EditorialGallery**: Alternating double/single photo rows with vertical offsets and optional captions
- **WorkGalleryGrid**: Hover-to-reveal project titles, click to navigate
- **JournalGrid**: Photo cards with category, title, excerpt, and "Read More" link
- **JournalPhotoGrid**: 3-column grid with larger side padding for journal posts
- **ContactForm**: Styled form with first/last name, email, message fields
- **InstagramFeed**: 6-photo grid pulling from Instagram API (with placeholder fallback)
- **GalleryLightbox**: Full-screen image viewer with prev/next navigation

### Header Behavior
- Transparent over hero images **only when a hero exists**
- Falls back to solid header when hero content is missing (so menu is always visible)
- Transitions to solid on scroll
- Dynamic social icons linked to profile data

### Admin (Authenticated)
- NextAuth credentials login (single admin)
- **Admin credentials stored in DynamoDB** (seeded from env on first run)
- **Profile management**: personal info, contact details, social links
- **Password change** updates DynamoDB admin record
- **Pages editor**: text and SEO for all page types including portfolio categories
- **Photos editor**: upload, assign to pages, drag to reorder, edit metadata, AI analysis
- **Portfolio editor**: full CRUD for portfolio projects with categories
- **Journal editor**: full CRUD for journal posts
- **Full-screen preview modal** with auto-refresh on save
- **Master "Save All" button** saves all pending changes across sections
- **Session management**: inactivity timeout, logout functionality

### AI Features
- AI Fix buttons on page text and metadata fields
- AI Fix buttons on photo metadata fields
- **AI photo analysis** (Vision) generates metadata from images
- Dashboard batch AI optimize for SEO metadata and text copy
- **Real-time SSE streaming** progress updates during batch optimization
- OpenAI integration via the Responses API

### Analytics (Stored in DynamoDB)
- Client-side tracking of page views and time on page
- Events stored in `analytics` DynamoDB table (TTL: 90 days)
- Dashboard filters: daily, monthly, quarterly, yearly
- Top pages table uses friendly labels for non-technical admins

---

## 3. Data Architecture

### Runtime Modes
- **Production:** DynamoDB for all content + analytics
- **Local:** JSON files in `data/local/` when `USE_MOCK_DATA=true`

### DynamoDB Tables (Production)
- `pages` (page copy, home layout, about, contact, profile, work index)
- `photos`
- `projects`
- `journal`
- `analytics`
- `admins`

### Local JSON (Mock Mode)
- `pages.json`
- `about.json`
- `contact.json`
- `photos.json`
- `projects.json`
- `journal.json`
- `home.json`
- `work.json`
- `profile.json`

### Frontend Data Flow
1. `lib/data/*` reads from DynamoDB in production or local JSON in mock mode
2. Page components fetch data at request time (SSR)
3. Admin saves trigger revalidation and preview refresh
4. Public pages show updated data on refresh

---

## 4. Technical Stack

- **Framework:** Next.js 14 (App Router, SSR on Amplify)
- **Language:** TypeScript 5
- **Styling:** CSS Modules under `styles/public/` and `styles/admin/`
- **Auth:** NextAuth (Credentials) with session timeout
- **Data:** DynamoDB (prod), JSON mock store (local)
- **API:** Next.js Route Handlers in `app/api/`
- **Analytics:** DynamoDB-backed with TTL
- **AI:** OpenAI Responses API + Vision

---

## 5. Local Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup
1. Copy `.env.example` to `.env.local` and update values
2. Set `USE_MOCK_DATA=true` for local JSON storage
3. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` in `.env.local`
4. Add your OpenAI key if AI features are needed

### Commands
```bash
npm install
npm run dev
```

### Admin Login (Local)
- Email: `admin@example.com`
- Password: `admin123`

---

## 6. AWS Architecture (Current)

- **Amplify SSR (WEB_COMPUTE)** for Next.js hosting
- **Compute Role** grants runtime access to DynamoDB
- **Build spec writes env vars to `.env.production`** so SSR routes can read them
- **DynamoDB** for content + analytics
- **S3 + CloudFront** for image storage and delivery
- **Terraform** for infrastructure provisioning
- **GitHub Actions OIDC** for secure CI/CD authentication

---

**Document Version:** 5.0  
**Last Updated:** 2026-02-05
