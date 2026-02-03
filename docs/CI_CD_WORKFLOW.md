# CI/CD Workflow Documentation

**Last Updated:** 2026-02-03
**Version:** 2.0

---

## Overview

This document describes the current CI/CD state for the S.Goodie Photography Platform and the recommended next steps.
The codebase now lives in a single Next.js app at the repo root.
The existing workflows under `.github/workflows/` still reference legacy paths and are not actively used.

---

## Current State (As Built)

### What exists
- Legacy workflows:
  - `frontend-ci.yml` (targets `apps/frontend/**`)
  - `backend-ci.yml` (targets `services/backend/**`)
  - `terraform-ci.yml` (targets `terraform/**`)

### What this means
- These workflows do not run against the current root app structure
- No automated CI/CD is active for the main app at this time

---

## Recommended CI Pipeline (Next Step)

When we are ready to automate builds and deploys for the single-app structure, use a root-level workflow that runs on `app/**`, `components/**`, `lib/**`, and root config changes.

### Suggested jobs
1. Install dependencies
2. Run lint
3. Run type checks (if added)
4. Build Next.js
5. Deploy (Amplify or other host)

### Suggested commands
```bash
npm ci
npm run lint
npm run build
```

---

## Branch Strategy (Suggested)

- `main`: production-ready
- `develop`: active development

Flow:
```
feature branch -> develop -> PR -> main -> deploy
```

---

## Deployment Strategy (Planned)

- Hosting: AWS Amplify (single app)
- Trigger: push or merge to `main`
- Infrastructure: Terraform when AWS resources are introduced

---

## Next Steps

1. Replace legacy workflows with a root-level workflow
2. Decide on Amplify auto-deploy vs manual trigger
3. Add staging environment when needed

---

**Document Version:** 2.0
**Last Updated:** 2026-02-03
