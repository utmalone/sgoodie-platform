# S.Goodie Photography Platform - Project Overview

**Repository:** `sgoodie-platform`  
**Created:** 2025-01-16  
**Status:** Active development (local prototype with mock data)  
**Last Updated:** 2026-02-04  

---

## 1. Migration Purpose & Goals

### Current State
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
| Work | `/work` | Photo grid with hover effects, links to portfolio detail pages |
| Work Detail | `/work/[slug]` | Full-bleed hero with title overlay, editorial gallery (alternating double/single rows with captions), lightbox |
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
- Transparent over hero images on: Home, About, Work Detail, Journal, Contact
- Solid white on: Work index, Journal detail pages
- Transitions to solid on scroll

### Admin (Authenticated)
- NextAuth credentials login (single admin)
- Admin dashboard with real analytics (local mock DB)
- Pages editor: text only (no photo upload here)
- Photos editor: upload, assign to pages, drag to reorder, edit metadata
- Preview mode: admin-only preview that mirrors the public UI

### AI Features
- AI Fix buttons on page text and metadata fields
- AI Fix buttons on photo metadata fields
- Dashboard batch AI optimize for SEO metadata and text copy
- AI model dropdown with curated top models
- OpenAI integration via the Responses API

### Analytics (Real, Stored Locally)
- Client-side tracking of page views and time on page
- Events stored in `data/local/analytics.json`
- Dashboard filters: daily, monthly, quarterly, yearly
- Top pages table uses friendly labels for non-technical admins

---

## 3. Data Architecture

### Backend Data (Mock)
All content comes from JSON files in `data/local/` (seeded from `data/seed/`):

| File | Content |
|------|---------|
| `pages.json` | Basic page content (home, about, work, journal, contact) |
| `about.json` | Structured about page content (hero, intro, approach, publications, bio) |
| `contact.json` | Structured contact page content (hero, form fields, social links) |
| `photos.json` | All photo assets with metadata |
| `projects.json` | Portfolio projects with gallery configurations |
| `journal.json` | Journal posts with body text and credits |
| `home.json` | Home page layout configuration |
| `work.json` | Work page project ordering |

### Frontend Data Flow
1. Data fetching functions in `lib/data/` read from local JSON (or future API)
2. Page components call these functions at build/request time
3. Data is passed to presentational components as props
4. All content is dynamic - frontend is a template that renders backend data

---

## 4. Technical Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **Styling:** CSS Modules under `styles/public/`
- **Auth:** NextAuth (Credentials)
- **Data:** Local JSON store under `data/local/` seeded from `data/seed/`
- **API:** Next.js Route Handlers in `app/api/`
- **Analytics:** Client provider + API storage
- **AI:** OpenAI Responses API via server routes

---

## 5. Local Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup
1. Copy `.env.example` to `.env.local` and update values
2. Ensure `USE_MOCK_DATA=true` (local JSON storage)
3. Set admin credentials in `.env.local`
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

## 6. Future AWS Architecture (Planned)

- S3 for photo storage
- DynamoDB for structured content
- CloudFront for image delivery
- Terraform modules for infrastructure
- LocalStack for local AWS emulation

---

**Document Version:** 3.0  
**Last Updated:** 2026-02-04
