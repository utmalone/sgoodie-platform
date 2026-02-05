# Technical Architecture - S.Goodie Photography Platform

**Last Updated:** 2026-02-05  
**Version:** 5.0  

---

## 1. Architecture Overview

This project runs as a single Next.js application containing the public site, admin UI, and all API routes. Production runs on AWS Amplify (SSR) with DynamoDB as the primary data store.

```
Browser
  |-- Public pages (SSR) -> Next.js App Router (Amplify SSR)
  |-- Admin UI (client)  -> Next.js App Router
  |-- Admin API routes   -> /app/api/**
                                |-- DynamoDB (content + analytics)
                                |-- S3 + CloudFront (images)
                                |-- OpenAI Responses API (text + vision)
```

### Key Principles
- Single deployable app with route groups for public and admin
- DynamoDB is source of truth in production
- Local mock data supported via `USE_MOCK_DATA=true`
- Authenticated admin routes with NextAuth and session timeout
- Admin changes trigger revalidation + preview refresh
- Public pages render on request for fresh data

---

## 2. Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router, SSR on Amplify) |
| Language | TypeScript 5 |
| UI | React 18 |
| Styling | CSS Modules (`styles/public/*.module.css`, `styles/admin/*.module.css`) |
| Auth | NextAuth Credentials with JWT sessions |
| Data | DynamoDB (prod) + JSON mock store (local) |
| Analytics | DynamoDB with TTL (90 days) |
| AI | OpenAI Responses API + Vision API |
| Infra | Terraform + AWS Amplify + S3 + CloudFront |

---

## 3. Project Structure

```
app/
  (public)/              # Public pages
    about/
    contact/
    journal/
      [slug]/
    portfolio/
      [category]/
        [slug]/
    work/                # Legacy index + detail routes (still used by preview)
  (admin)/admin/
    dashboard/
    pages/
    photos/
    portfolio/
      new/
      [id]/
    journal/
      new/
      [id]/
    profile/
  api/
    admin/
      ai/
        analyze-photo/
        batch-stream/
      layouts/
      profile/
      password/
    analytics/
    auth/
    instagram/

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
  aws/
    dynamodb.ts
  data/
    about.ts
    contact.ts
    home.ts
    journal.ts
    pages.ts
    photos.ts
    profile.ts
    projects.ts
    work.ts
    db.ts

styles/
  public/
  admin/

types/
  index.ts
```

---

## 4. Public Site Architecture

### Rendering
- Public layout is **force-dynamic** to ensure fresh data on refresh
- Pages fetch data from `lib/data/*` on request
- Admin saves trigger revalidation so CDN/stale data clears quickly

### Dynamic Header/Footer
- `SiteHeader` uses hero-aware styling: transparent only if a hero exists
- `SiteFooter` renders profile contact/social data (profile is fetched once in layout)

### Metadata
- `generateMetadata` pulls `metaTitle`, `metaDescription`, `metaKeywords` from storage
- Metadata always reflects latest saved data

---

## 5. Data Architecture

### DynamoDB Tables (Production)
| Table | Purpose |
|-------|---------|
| `pages` | Page copy + home/about/contact layouts + profile + work index |
| `photos` | Photo assets + SEO metadata |
| `projects` | Portfolio projects |
| `journal` | Journal posts |
| `analytics` | Event stream (TTL 90 days) |
| `admins` | Admin login record |

### Local Mock Mode
- Enabled with `USE_MOCK_DATA=true`
- Uses `data/local/*.json`
- Same API surface as DynamoDB

---

## 6. Admin Architecture

### Authentication
- NextAuth Credentials provider
- Admin record stored in `admins` table
- `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` seed DynamoDB on first run
- Admin email/password updates persist to DynamoDB

### Admin UX
- Master "Save All" collects pending changes
- Preview modal loads public site in iframe
- Preview auto-refreshes after successful saves
- Profile form includes phone auto-formatting and email validation

---

## 7. Analytics Architecture

### Client
- Captures page views and time on page
- Skips admin and API routes

### Server
- `POST /api/analytics/events` writes to DynamoDB
- TTL set to 90 days to control table size
- `GET /api/admin/stats` aggregates metrics

---

## 8. Environment Variables

### Required (Production)
```
NEXTAUTH_URL
NEXTAUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
DYNAMODB_TABLE_PREFIX
DYNAMODB_TABLE_ENV
DYNAMODB_REGION
S3_PHOTOS_BUCKET
S3_UPLOADS_BUCKET
CLOUDFRONT_URL
USE_MOCK_DATA=false
```

### Optional
```
OPENAI_API_KEY
INSTAGRAM_ACCESS_TOKEN
USE_LOCALSTACK=true
DYNAMODB_ACCESS_KEY_ID
DYNAMODB_SECRET_ACCESS_KEY
DYNAMODB_SESSION_TOKEN
REVALIDATE_TOKEN
```

Notes:
- Amplify build writes selected env vars to `.env.production` for SSR access
- `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are **seed values**, not the live auth store

---

**Document Version:** 5.0  
**Last Updated:** 2026-02-05
