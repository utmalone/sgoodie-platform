# UX + Admin Architecture for the New Portfolio Experience

**Status:** Proposed (for review)  
**Date:** 2026-02-03  
**Audience:** Product, Admin UX, Engineering  

---

## 1. Goals

We are pivoting the public UX to match a high‑end photography portfolio experience while keeping the admin workflow clean and non‑technical.

**Key goals:**
- Preserve our existing admin separation of **Pages** (text) vs **Photos** (assets).
- Add a **Portfolio** layer that supports dynamic, shoot‑based pages.
- Let admins build the Work index and Home layout without typing URLs.
- Keep SEO metadata on both pages and photos, with AI Fix support.
- Support hero images, project galleries, hover titles, and “enlarge only” grids.

---

## 2. Information Architecture (Public)

### Primary public routes
- `/` Home  
  - Hero image  
  - Editorial text block  
  - Feature grid of photos (enlarge only, no navigation)
- `/work` Work Index  
  - Grid of project cards  
  - Hover shows project title  
  - Click goes to project page
- `/work/[projectSlug]` Project Detail  
  - Hero image  
  - Project intro + body  
  - Gallery images  
  - Optional credits block
- `/about`, `/contact`, `/journal` (static pages)

This mirrors the intended UX while keeping the public structure simple and SEO‑friendly.

---

## 3. Admin Navigation (Proposed)

We keep the current admin shell but add **Portfolio** and **Layout** sections:

1. **Dashboard**  
   - Analytics + AI batch actions
2. **Pages**  
   - Text + SEO for static pages (About, Contact, Journal, etc.)
3. **Portfolio**  
   - Create/manage project pages (dynamic)
4. **Photos**  
   - Upload + metadata + reusable photo library
5. **Layout**  
   - Home hero + Home feature grid  
   - Work index ordering (if not auto‑ordered)
6. **Preview**  
   - Public preview with current draft changes

This keeps editing clean and matches non‑technical expectations.

---

## 4. Content Model (Proposed)

We expand the content model while reusing our existing JSON/local‑DB pattern.

### 4.1 MediaAsset (Photos)
```
id
src
alt
metaTitle
metaDescription
metaKeywords
createdAt
```

### 4.2 PageContent (Static Pages)
```
slug (home, about, contact, journal)
title
intro
body
ctaLabel?
ctaUrl?
metaTitle
metaDescription
metaKeywords
```

### 4.3 PortfolioProject (Dynamic Project Page)
```
id
slug (auto from title, editable)
title
subtitle? / category?
intro
body
heroPhotoId
galleryPhotoIds[]
hoverTitle (optional override)
credits[] (label + value)
metaTitle
metaDescription
metaKeywords
status (draft | published)
sortOrder
createdAt
updatedAt
```

### 4.4 HomeLayout
```
heroPhotoId
featurePhotoIds[]    // enlarge-only grid on home
```

### 4.5 WorkIndex
```
projectIds[]         // manual order for work index
```

---

## 5. Admin Workflows (Non‑Technical)

### 5.1 Create a Project (Portfolio)
1. Admin goes to **Portfolio**
2. Clicks **New Project**
3. Sets title (slug auto‑generates)
4. Adds intro/body + SEO metadata (AI Fix available)
5. Picks hero image (dropdown or search in Photos library)
6. Adds gallery photos (multi‑select + drag to reorder)
7. Saves as draft or publishes

### 5.2 Connect Photos to Projects
- Photos stay in the **Photos** library
- Project editor references photo IDs by selection dropdowns
- No URLs or manual linking required

### 5.3 Manage Home Layout
1. Admin goes to **Layout**
2. Sets Home hero image
3. Chooses the Home feature grid photos (enlarge only)
4. Saves

### 5.4 Manage Work Index
Option A (Auto):  
Work index order = project `sortOrder` and filter `status=published`.

Option B (Manual):  
Admin can drag projects in **Layout → Work Index Order**.

---

## 6. SEO + AI Fix (Extended)

### Pages (static)
- Same as current (metaTitle, metaDescription, metaKeywords)
- AI Fix uses page text + linked images

### Portfolio projects
AI Fix uses:
- Project title + intro + body
- Hero image metadata
- Gallery image metadata

### Photos
AI Fix uses:
- Parent project metadata
- Sibling gallery metadata
- Prevents duplicate keyword stuffing

---

## 7. Data Storage and Retrieval (Local Prototype + Future DB)

### 7.1 Static Pages (Current)
- Static pages are stored in local JSON (mock DB).
- Source of truth lives in `data/local/pages.json`.
- Seeds live in `data/seed/pages.json` and are copied into `data/local` if missing.
- All reads and writes go through `lib/data/pages.ts`.
- This is gated by `USE_MOCK_DATA=true`.

### 7.2 Portfolio + Layout (Current)
For now we keep the JSON store, and add two new files:

```
data/local/pages.json
data/local/photos.json
data/local/projects.json      // PortfolioProject
data/local/home.json          // HomeLayout
data/local/work.json          // WorkIndex
```

This mirrors our existing local-first approach and is easy to migrate later.

### 7.3 Retrieval Architecture (Current)
- Public pages read data on the server from `lib/data/*`.
- Server components call helper functions like:
  - `getAllPages()` / `getPageBySlug()` for static pages
  - `getAllProjects()` / `getProjectBySlug()` for portfolio pages
  - `getHomeLayout()` for the home hero + feature grid
- When we move to AWS, the same functions switch to DynamoDB + S3 without changing page code.

### 7.4 Planned DB Storage (AWS)
- **DynamoDB tables**:
  - `pages` (static pages by slug)
  - `projects` (portfolio projects by id/slug)
  - `photos` (media assets)
  - `layouts` (home + work index ordering)
- **S3** stores original and variant images
- The admin APIs read/write DynamoDB and S3 instead of JSON
- Public pages use the same server helpers; only the data layer changes

---

## 8. Dashboard Analytics Architecture (Dynamic + Static Pages)

### 8.1 Tracking (Client)
We already track:
- page path
- time on page
- visitor/session IDs

For dynamic project pages, add:
- `pageType` = `project`
- `pageId` = project id
- `pageSlug` = project slug

This allows the dashboard to report stats for both static and dynamic pages without manual setup.

### 8.2 Storage (Current)
- Events are appended to `data/local/analytics.json`
- The event payload supports `pageType`, `pageId`, and `pageSlug`

### 8.3 Storage (Planned)
- Analytics events move to a DynamoDB table
- Each event includes:
  - `path`
  - `pageType`
  - `pageId`
  - `pageSlug`
  - `duration`
  - `visitorId`
  - `timestamp`

### 8.4 Dashboard Aggregation
The dashboard should:
- Group static pages by `path`
- Group dynamic pages by `pageId`
- Resolve display labels from the pages/projects tables
- Show the same metrics for all pages (views, avg time, change)

This ensures dynamic pages appear automatically as soon as an admin publishes them.

---

## 9. API Surface (Proposed)

### Admin APIs
- `GET/PUT /api/admin/pages`
- `GET/POST /api/admin/photos`
- `PATCH/DELETE /api/admin/photos/[id]`
- `GET/POST/PUT /api/admin/projects` (portfolio)
- `GET/PUT /api/admin/layout/home`
- `GET/PUT /api/admin/layout/work`

### Public APIs (server only)
- `getPages()`
- `getProjects()`  
- `getProjectBySlug(slug)`
- `getHomeLayout()`

---

## 10. UI Behaviors in the New UX

### Home
```
Hero image (selected by admin)
Text block (editable in Pages)
Feature grid (selected in Layout)
Image click = enlarge only (no navigation)
```

### Work Index
```
Grid of project cards
Hover title
Click -> /work/[slug]
```

### Project Page
```
Hero image
Intro + body text
Gallery (reorderable)
Credits block (optional)
```

---

## 11. Migration from Current Admin

We keep the current admin foundation and add:
- **Portfolio editor** for dynamic project pages
- **Layout manager** for Home + Work index ordering
- Minor upgrades to Photos to support hero + hover title usage

This preserves our existing “Pages vs Photos” split while supporting the new UX structure.

---

## 12. Open Questions (For Review)

1. Should Work index order be manual or auto by publish date?  
2. Do we need categories (Interiors / Travel / Brand) on projects?  
3. Should project pages support multiple text sections or just intro/body?  
4. Do we need drafts + scheduled publish?  

---

## 13. Summary

This architecture keeps the admin workflow familiar while introducing a clean **Portfolio** layer and a **Layout** layer to support the new UX.  
It avoids technical inputs (no URLs), keeps SEO intact, and ensures media and metadata remain reusable and scalable.
