# Technical Architecture - S.Goodie Photography Platform

**Last Updated:** 2026-02-03
**Version:** 2.0

---

## 1. Architecture Overview (Current Implementation)

This project runs as a single Next.js application that contains the public site, the admin UI, and all API routes.

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
- Local JSON storage for all content while prototyping
- Authenticated admin routes with NextAuth
- Real analytics data recorded locally
- AI-assisted copy and metadata optimization

---

## 2. Technology Stack (Current)

- Framework: Next.js 14 (App Router)
- Language: TypeScript 5
- UI: React 18
- Styling: Tailwind CSS
- Auth: NextAuth Credentials
- Data: JSON files under `data/local` (seeded from `data/seed`)
- State: React Query provider available for admin dashboards
- Analytics: Custom client provider and server route
- AI: OpenAI Responses API via server route handlers

---

## 3. Project Structure (Current)

```
app/
  (public)/
  (admin)/admin/
  api/
components/
  admin/
  analytics/
  layout/
  portfolio/
lib/
  admin/
  ai/
  analytics/
  auth/
  data/
  utils/
types/
data/
  seed/
  local/
```

---

## 4. Public Site Architecture

- Pages use server components and read content from `lib/data/*`.
- Metadata is generated via `generateMetadata` using stored `metaTitle`, `metaDescription`, and `metaKeywords`.
- Public pages are ready for SSG or ISR when we move to production.

---

## 5. Admin Architecture

### Authentication
- NextAuth Credentials provider
- Session stored as JWT
- Guard helpers: `requireAdmin` and `requireAdminApi`

### Admin Pages
- `/admin/dashboard` shows analytics and AI batch actions
- `/admin/pages` edits page text and page metadata only
- `/admin/photos` uploads images and manages photo ordering + metadata
- `/admin/preview` renders public layout with draft data

### Draft Preview
- Draft content is stored in browser localStorage
- Preview reads from draft first, falls back to saved data

---

## 6. Data Storage (Local Prototype)

### Local JSON Store
All CRUD operations read and write files under `data/local`.
Seed content is copied from `data/seed` if a local file is missing.

### Current Files
- `data/local/pages.json`
- `data/local/photos.json`
- `data/local/projects.json`
- `data/local/analytics.json`

### Mock Mode
- `USE_MOCK_DATA=true` is required for local editing routes
- APIs throw an error if mock mode is not enabled

---

## 7. Analytics Architecture

### Client
- `AnalyticsProvider` records page views and time spent
- Excludes admin and API routes
- Stores visitor and session IDs in localStorage

### Server
- `POST /api/analytics/events` appends events to `analytics.json`
- `GET /api/admin/stats` aggregates stats for dashboard

### Dashboard Metrics
- Views by period (daily, monthly, quarterly, yearly)
- Time on page
- Top pages table using friendly labels

---

## 8. AI Architecture

### Endpoints
- `GET /api/admin/ai/models` returns a curated list of 4 models
- `POST /api/admin/ai/optimize` optimizes a single field
- `POST /api/admin/ai/batch` runs bulk SEO or text updates

### Prompts
- Text prompt focuses on professional tone and clarity
- SEO prompt focuses on concise metadata and keyword balance

### Model Selection
- Default model controlled by `OPENAI_DEFAULT_MODEL`
- Admin can override using a dashboard dropdown
- Model selection is stored in localStorage

---

## 9. Environment Variables (Current)

Required for local development:
- `USE_MOCK_DATA=true`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH` (SHA-256 hex)
- `NEXTAUTH_SECRET`

Optional:
- `OPENAI_API_KEY` (enables AI features)
- `OPENAI_DEFAULT_MODEL` (default model selection)
- `NEXT_PUBLIC_SITE_URL`
- `REVALIDATE_TOKEN` (for future ISR hooks)

AWS placeholders (future migration):
- `USE_LOCALSTACK`
- `AWS_REGION`
- `S3_BUCKET_*`
- `DYNAMODB_TABLE_*`

---

## 10. Planned AWS Architecture (Next Phase)

- S3 for photos and image variants
- DynamoDB for pages, photos, projects, analytics
- CloudFront for delivery
- LocalStack for local AWS emulation
- Terraform for infrastructure provisioning

---

**Document Version:** 2.0
**Last Updated:** 2026-02-03
