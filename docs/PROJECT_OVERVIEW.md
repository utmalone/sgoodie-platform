# S.Goodie Photography Platform - Project Overview

**Repository:** `sgoodie-platform`
**Created:** 2025-01-16
**Status:** Active development (local prototype with mock data)
**Last Updated:** 2026-02-03

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

### Public Site
- Next.js App Router with server components for public pages
- Pages: Home, About, Work, and category pages (Interiors, Travel, Brand Marketing)
- Project grids and detail layouts driven by local JSON data
- Page metadata support via `generateMetadata`

### Admin (Authenticated)
- NextAuth credentials login (single admin)
- Admin dashboard with real analytics (local mock DB)
- Pages editor: text only (no photo upload here)
- Photos editor: upload, assign to pages, drag to reorder, edit metadata
- Preview mode: admin-only preview that mirrors the public UI

### AI Features
- AI Fix buttons on page text and metadata fields
- AI Fix buttons on photo metadata fields
- Dashboard batch AI optimize:
  - SEO metadata for pages and photos
  - Text copy for pages
- AI model dropdown with curated top models
- OpenAI integration via the Responses API

### Analytics (Real, Stored Locally)
- Client-side tracking of page views and time on page
- Events stored in `data/local/analytics.json`
- Dashboard filters: daily, monthly, quarterly, yearly
- Top pages table uses friendly labels for non-technical admins

---

## 3. UX and Design Direction

The visual direction is based on a clean, editorial photography portfolio style.
Use `docs/JENN_VERRIER_UX_REFERENCE.md` for a detailed UI and UX breakdown of the reference site.

---

## 4. Technical Architecture Summary (Current)

- Framework: Next.js 14 (App Router)
- Language: TypeScript 5
- Styling: Tailwind CSS
- Auth: NextAuth (Credentials)
- Data: Local JSON store under `data/local` seeded from `data/seed`
- API: Next.js Route Handlers in `app/api`
- Analytics: Client provider + API storage
- AI: OpenAI Responses API via server routes

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

The Next.js dev server hosts both frontend and backend on a single port.

### Admin Login (Local)
- Credentials are controlled by `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`
- Hash is a SHA-256 hex string of the password
- The example config uses:
  - Email: `admin@example.com`
  - Password: `admin123`

---

## 6. Data and Storage (Current vs Planned)

### Current (Local Prototype)
- Data is stored in JSON files under `data/local`
- Seeds live in `data/seed`
- All CRUD operations read and write JSON files

### Planned (AWS)
- S3 for photo storage
- DynamoDB for structured content
- CloudFront for image delivery
- Terraform modules for infrastructure
- LocalStack for local AWS emulation

---

## 7. Risks and Constraints

- Local JSON storage is for prototyping only
- AI features require a valid `OPENAI_API_KEY`
- Analytics are mocked locally and must migrate to a real database later

---

## 8. Next Steps

1. Confirm UX details from `docs/JENN_VERRIER_UX_REFERENCE.md`
2. Implement the new public layout to match the reference
3. Replace local JSON storage with DynamoDB and S3
4. Add image optimization pipeline and CDN configuration
5. Wire real analytics persistence and reporting

---

**Document Version:** 2.0
**Last Updated:** 2026-02-03
