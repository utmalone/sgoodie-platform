# Admin Refactorization Plan

**Created:** 2026-02-04  
**Completed:** 2026-02-05  
**Version:** 4.0  
**Status:** COMPLETED

---

## Executive Summary

The admin interface has been completely refactored to provide full content management capabilities for all content types. The refactorization included:

1. **Portfolio Management** - Full CRUD with category support (Hotels, Restaurants, Travel, Home & Garden, Brand)
2. **Journal Management** - Full CRUD for blog posts
3. **Photo Management** - Enhanced with AI vision analysis and drag-and-drop ordering
4. **Profile Management** - Admin profile, contact info, and social links
5. **Preview System** - Full-screen modal with context-aware navigation
6. **Save System** - Master "Save All" button with visual status indicators
7. **Authentication** - Session management with timeout and logout
8. **Responsive Design** - CSS Modules with mobile-first approach

---

## Completed Features

### Profile Management
- Admin profile page at `/admin/profile`
- Edit name, title, profile photo
- Edit contact information (email, phone, address)
- Edit availability (regions, note)
- Edit social links (Instagram, LinkedIn, Twitter, Facebook)
- Change password functionality
- Email validation (must include `@`)
- Phone auto-formatting
- Data stored in DynamoDB `pages` table (slug `site-profile`)
- Header/footer dynamically display profile data

### Portfolio System
- Portfolio is primary (categories: Hotels, Restaurants, Travel, Home & Garden, Brand)
- Public category pages at `/portfolio/[category]`
- Project pages at `/portfolio/[category]/[slug]`
- Legacy `/work` routes remain for preview/back-compat
- Admin category page editing (title, SEO only)
- Full project CRUD in admin

### Preview System
- Full-screen modal preview (`AdminPreviewModal`)
- Context-aware: opens to relevant public page
- Yellow header bar with "Close Preview" button
- Loads actual public site in iframe
- Auto-refreshes after successful saves

### Master Save System
- "Save All" button in sidebar
- Tracks pending changes across all sections
- Visual indicators:
  - Disabled: no changes
  - Saving: spinner
  - Success: confirmation
  - Error: save failed with retry
- Integrates with Portfolio and Journal editors

### Photo Management Enhancements
- AI vision analysis on upload (GPT-4o)
- Auto-generates alt, title, description, keywords
- Drag-and-drop photo ordering for Home, About, Contact
- Photo labels (Hero, Feature 1, Feature 2, etc.)
- Responsive action menus

### AI Batch Optimization
- Real-time SSE streaming for progress
- Checkboxes for content types:
  - Pages
  - Photos
  - Portfolio projects
  - Journal posts
- Progress percentage and milestones
- Photo SEO uses vision AI

### Authentication & Session
- NextAuth credentials login
- Admin record stored in DynamoDB (`admins` table)
- `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` seed the admin record on first run
- Session timeout on inactivity
- Logout button in sidebar
- Protected API routes

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

**Library:**
- `lib/data/profile.ts` - Profile data functions
- `lib/admin/save-context.tsx` - Master save state
- `lib/admin/preview-context.tsx` - Preview modal state

### Modified Files

**Components:**
- `components/layout/SiteHeader.tsx` - Dynamic social icons + hero-aware header
- `components/layout/SiteFooter.tsx` - Dynamic profile data
- `components/admin/AdminNav.tsx` - Added Profile link
- `components/admin/AdminShell.tsx` - Save/preview integration

**Data:**
- `lib/data/db.ts` - DynamoDB helpers + mock-mode switch
- `lib/auth/admin-store.ts` - Admin auth stored in DynamoDB

---

## Data Flow

### Production
```
DynamoDB -> lib/data/* -> Public pages + admin
S3/CloudFront -> public images
```

### Local Mock Mode
```
data/seed -> data/local -> lib/data/*
```

---

## Migration Notes

- Admin and public data now live in DynamoDB (prod)
- Local JSON remains for mock development
- Preview uses real public pages with draft overlay

---

**Document Version:** 4.0  
**Last Updated:** 2026-02-05
