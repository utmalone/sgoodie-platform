# CI/CD Workflow Documentation

**Last Updated:** 2026-02-05  
**Version:** 4.0  

---

## Overview

This document describes the CI/CD state for the S.Goodie Photography Platform.
The codebase is a single Next.js app at the repo root.

---

## Current State

### Project Structure
```
sgoodie-platform/
├── app/           # Next.js App Router pages
│   ├── (public)/  # Public routes (home, portfolio, journal, about, contact)
│   ├── (admin)/   # Admin routes (protected)
│   └── api/       # API routes
├── components/    # React components
│   ├── admin/     # Admin UI components
│   ├── layout/    # Header, footer
│   └── portfolio/ # Public portfolio components
├── lib/           # Data fetching and utilities
│   ├── admin/     # Admin utilities (save context, preview context)
│   ├── ai/        # OpenAI integration
│   ├── auth/      # Authentication helpers
│   └── data/      # Data access layer
├── styles/        # CSS Modules
│   ├── public/    # Public site styles
│   └── admin/     # Admin UI styles
├── data/          # Mock data
│   ├── seed/      # Source of truth (committed)
│   └── local/     # Working copy (gitignored)
├── types/         # TypeScript types
└── docs/          # Documentation
```

### Data Files
| File | Purpose |
|------|---------|
| `pages.json` | Static page content and SEO |
| `projects.json` | Portfolio projects with categories |
| `journal.json` | Journal posts |
| `photos.json` | Photo assets and metadata |
| `home.json` | Home page layout |
| `about.json` | About page structure |
| `contact.json` | Contact page structure |
| `work.json` | Portfolio project ordering |
| `profile.json` | Admin profile and social links |
| `analytics.json` | Analytics events (local only) |

### Legacy Workflows
The `.github/workflows/` folder contains legacy files from a previous monorepo structure:
- `frontend-ci.yml` (targets `apps/frontend/**`)
- `backend-ci.yml` (targets `services/backend/**`)
- `terraform-ci.yml` (targets `terraform/**`)

These workflows do not run against the current root app structure.

---

## Recommended CI Pipeline

When automating builds and deploys, use a root-level workflow:

### Trigger Paths
```yaml
on:
  push:
    paths:
      - 'app/**'
      - 'components/**'
      - 'lib/**'
      - 'styles/**'
      - 'types/**'
      - 'data/seed/**'
      - 'package*.json'
```

### Jobs
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

---

## Branch Strategy

- `main`: Production-ready code
- `develop`: Active development

### Flow
```
feature branch → develop → PR → main → deploy
```

---

## Environment Variables

### Required for Build
```
USE_MOCK_DATA=true
NEXTAUTH_SECRET=<random-string>
```

### Required for AI Features
```
OPENAI_API_KEY=<your-key>
```

### Required for Instagram
```
INSTAGRAM_ACCESS_TOKEN=<token>
```

---

## Deployment (Planned)

- **Hosting:** AWS Amplify
- **Trigger:** Push/merge to `main`
- **Infrastructure:** Terraform (when AWS resources are added)

### Static Files
- `data/seed/` is committed and deployed
- `data/local/` is gitignored (runtime only)
- Public images in `public/images/`

### Environment
- Set environment variables in Amplify console
- Ensure `NEXTAUTH_URL` matches production URL

---

## Local Development

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`

### Admin Access
- Email: `admin@example.com`
- Password: `admin123`

---

## Next Steps

1. Replace legacy workflows with root-level workflow
2. Configure Amplify auto-deploy from `main`
3. Add staging environment when needed
4. Set up AWS resources (S3, DynamoDB) via Terraform
5. Migrate from local JSON to cloud storage

---

**Document Version:** 4.0  
**Last Updated:** 2026-02-05
