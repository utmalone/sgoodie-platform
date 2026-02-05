# Admin Refactorization Plan

**Created:** 2026-02-04  
**Completed:** 2026-02-05  
**Version:** 3.0  
**Status:** ✅ COMPLETED

---

## Executive Summary

The admin interface has been completely refactored to provide full content management capabilities for all content types. The refactorization included:

1. **Portfolio Management** - Full CRUD with category support (Hotels, Restaurants, Travel, Home & Garden, Brand)
2. **Journal Management** - Full CRUD for blog posts
3. **Photo Management** - Enhanced with AI vision analysis and drag-and-drop ordering
4. **Profile Management** - New section for admin profile, contact info, and social links
5. **Preview System** - Full-screen modal with context-aware navigation
6. **Save System** - Master "Save All" button with visual status indicators
7. **Authentication** - Session management with timeout and logout
8. **Responsive Design** - CSS Modules with mobile-first approach

---

## Completed Features

### ✅ Profile Management (NEW)
- Admin profile page at `/admin/profile`
- Edit name, title, profile photo
- Edit contact information (email, phone, address)
- Edit availability (regions, note)
- Edit social links (Instagram, LinkedIn, Twitter, Facebook)
- Change password functionality
- Responsive layout with CSS Modules
- Data stored in `profile.json`
- Header/footer dynamically display profile data

### ✅ Portfolio System (Renamed from Work)
- Changed "Work" to "Portfolio" throughout
- Five portfolio categories:
  - Hotels
  - Restaurants
  - Travel
  - Home & Garden
  - Brand
- Public dropdown menu in header
- Category pages at `/portfolio/[category]`
- Project pages at `/portfolio/[category]/[slug]`
- Admin category page editing (title, SEO only)
- Full project CRUD in admin

### ✅ Preview System
- Full-screen modal preview (`AdminPreviewModal`)
- Context-aware: opens to relevant public page
- Yellow header bar with "Close Preview" button
- Loads actual public site in iframe
- No double scrollbars

### ✅ Master Save System
- "Save All" button in sidebar
- Tracks pending changes across all sections
- Visual indicators:
  - Disabled (gray): no changes
  - Amber dot: unsaved changes pending
  - Spinner: saving in progress
  - Green checkmark: saved successfully
  - Red X: save failed with retry option
- Integrates with Portfolio and Journal editors

### ✅ Photo Management Enhancements
- AI vision analysis on upload (GPT-4o)
- Auto-generates alt, title, description, keywords
- Drag-and-drop photo ordering for:
  - Home page (hero + features)
  - About page (hero + approach + bio)
  - Contact page (hero)
- Photo labels (Hero, Feature 1, Feature 2, etc.)
- Responsive action menus (collapse to dropdown)

### ✅ AI Batch Optimization
- Real-time SSE streaming for progress
- Checkboxes for content types:
  - Pages
  - Photos
  - Portfolio projects
  - Journal posts
- Progress percentage and milestones
- Photo SEO uses vision AI

### ✅ Responsive Admin UI
- CSS Modules for all admin components
- No inline Tailwind classes
- Sticky sidebar on desktop
- Mobile-friendly forms and grids
- Responsive action menus

### ✅ Authentication & Session
- NextAuth credentials login
- Session timeout on inactivity
- Logout button in sidebar
- Protected API routes
- Profile API requires authentication

---

## File Changes Summary

### New Files Created

**API Routes:**
- `app/api/admin/profile/route.ts` - Profile CRUD
- `app/api/admin/password/route.ts` - Password change
- `app/api/admin/ai/analyze-photo/route.ts` - Vision AI
- `app/api/admin/ai/batch-stream/route.ts` - SSE streaming
- `app/api/admin/layouts/home/route.ts` - Home layout
- `app/api/admin/layouts/about/route.ts` - About layout
- `app/api/admin/layouts/contact/route.ts` - Contact layout

**Admin Pages:**
- `app/(admin)/admin/profile/page.tsx` - Profile management

**Admin Components:**
- `components/admin/AdminProfileClient.tsx` - Profile editor
- `components/admin/AdminPreviewModal.tsx` - Preview modal

**Styles:**
- `styles/admin/AdminShared.module.css` - Shared admin styles
- `styles/admin/AdminProfile.module.css` - Profile page styles

**Data:**
- `data/seed/profile.json` - Profile seed data
- `data/local/profile.json` - Profile working data

**Library:**
- `lib/data/profile.ts` - Profile data functions
- `lib/admin/save-context.tsx` - Master save state
- `lib/admin/preview-context.tsx` - Preview modal state
- `lib/admin/portfolio-config.ts` - Portfolio categories

### Modified Files

**Types:**
- `types/index.ts` - Added `SiteProfile`, `PortfolioCategory`

**Components:**
- `components/layout/SiteHeader.tsx` - Dynamic social icons
- `components/layout/SiteFooter.tsx` - Dynamic profile data
- `components/admin/AdminNav.tsx` - Added Profile link
- `components/admin/AdminShell.tsx` - Save/preview integration
- `components/admin/AdminPhotosClient.tsx` - AI analysis, drag-drop
- `components/admin/AdminPagesClient.tsx` - Portfolio categories
- `components/admin/AdminPortfolioClient.tsx` - Categories support
- `components/admin/AdminPortfolioEditorClient.tsx` - Save integration
- `components/admin/AdminJournalEditorClient.tsx` - Save integration
- `components/admin/AdminDashboardClient.tsx` - SSE, checkboxes

**Pages:**
- `app/(public)/layout.tsx` - Pass social links to header
- `app/(public)/portfolio/[category]/page.tsx` - Category pages

**Data:**
- `data/seed/pages.json` - Portfolio category pages
- `data/seed/projects.json` - Category field

---

## Architecture Summary

### Admin Navigation Structure
```
Admin
├── Profile           - Personal info, contact, social, password
├── Dashboard         - Analytics + AI batch optimization
├── Pages             - Static pages + portfolio category SEO
├── Portfolio         - Project list with categories
│   ├── New           - Create project
│   └── [id]          - Edit project
├── Journal           - Post list
│   ├── New           - Create post
│   └── [id]          - Edit post
├── Photos            - Photo library with AI analysis
├── Preview Site      - Full-screen modal preview
├── Save All          - Master save button
└── Log out           - End session
```

### Data Flow
```
Profile Data:
  profile.json → getProfile() → SiteHeader (social icons)
                             → SiteFooter (contact, availability)
                             → AdminProfileClient (editing)

Portfolio Data:
  projects.json → by category → /portfolio/[category]
                → by slug     → /portfolio/[category]/[slug]
                → all         → /admin/portfolio

Save System:
  Component changes → SaveContext → "Save All" button
                                  → Individual save functions
                                  → API calls
                                  → JSON updates
```

---

## Testing Checklist

- [x] Profile can be edited and saved
- [x] Password can be changed
- [x] Social links appear in header/footer
- [x] Portfolio categories display correctly
- [x] Projects can be filtered by category
- [x] Preview opens to correct page
- [x] Save All tracks all changes
- [x] Save All shows correct status indicators
- [x] Photo AI analysis works on upload
- [x] Drag-and-drop works for Home, About, Contact
- [x] Session times out after inactivity
- [x] Logout works correctly
- [x] All admin pages are responsive

---

## Migration Notes

### From Previous Version
- `/work` routes renamed to `/portfolio/[category]`
- Work index replaced with portfolio category pages
- Projects now require `category` field
- Profile data centralized (was scattered across contact.json)

### For Future AWS Migration
- All CRUD operations use abstracted data functions
- Same API surface whether using local JSON or DynamoDB
- Photo uploads will switch to S3 presigned URLs
- Profile data moves to user record in Cognito/DynamoDB

---

**Document Version:** 3.0  
**Last Updated:** 2026-02-05
