# CI/CD Workflow Documentation

**Last Updated:** 2026-02-04  
**Version:** 3.0  

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
├── components/    # React components
├── lib/           # Data fetching and utilities
├── styles/        # CSS Modules
├── data/          # Mock data (seed + local)
├── types/         # TypeScript types
└── docs/          # Documentation
```

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

## Deployment (Planned)

- **Hosting:** AWS Amplify
- **Trigger:** Push/merge to `main`
- **Infrastructure:** Terraform (when AWS resources are added)

---

## Local Development

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`

---

## Next Steps

1. Replace legacy workflows with root-level workflow
2. Configure Amplify auto-deploy from `main`
3. Add staging environment when needed

---

**Document Version:** 3.0  
**Last Updated:** 2026-02-04
