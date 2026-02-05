# Branch Protection Setup Guide

**Last Updated:** 2026-02-05

This guide explains how to configure GitHub branch protection rules to ensure:
- PRs can only merge when all checks pass
- Terraform staging deployment must succeed before merging
- Direct pushes to `main` are blocked

---

## Configure Branch Protection for `main`

1. Go to: **https://github.com/utmalone/sgoodie-platform/settings/branches**
2. Click **"Add branch protection rule"** (or edit existing)
3. Configure these settings:

### Branch name pattern
```
main
```

### Protect matching branches

- Require a pull request before merging
- Require approvals: `1` (optional, for solo projects set to 0)
- Dismiss stale pull request approvals when new commits are pushed

- Require status checks to pass before merging
- Require branches to be up to date before merging
- Add these required status checks:
  - `Validate Build` (from PR Validation workflow)
  - `Deploy to Staging` (from PR Validation workflow)
  - `Preview Production Changes` (from PR Validation workflow)
  - `Lint & Security Scan` (from Terraform Lint workflow)

- Require conversation resolution before merging
- Do not allow bypassing the above settings
- Do not allow force pushes
- Do not allow deletions

4. Click **"Create"** or **"Save changes"**

---

## Configure Branch Protection for `develop`

1. Add another rule for `develop`:

### Branch name pattern
```
develop
```

### Settings
- Require a pull request before merging (optional)
- Require status checks to pass before merging
- Add: `Build & Validate` (from Development CI workflow)

---

## How This Protects You

### The Safety Flow:

```
1. Developer pushes to develop
   |
2. Development CI runs (validates build)
   |
3. Developer creates PR: develop -> main
   |
4. PR Validation runs:
   a. Build validation OK
   b. Terraform applies to staging
   c. Production plan preview
   |
5. All checks pass -> Merge enabled
   |
6. Merge to main
   |
7. Production deploy runs
```

### What This Catches:

| Issue Type | Caught By |
|------------|-----------|
| Syntax errors | Terraform Validate |
| Format issues | Terraform Format Check |
| Security vulnerabilities | Trivy Security Scan |
| Lint warnings | TFLint |
| Permission issues | Staging Apply |
| Resource conflicts | Staging Apply |
| API rate limits | Staging Apply |
| Dependency timing | Staging Apply |

---

## Required Status Checks Summary

After your first PR, these status checks will be available:

| Workflow | Job Name | Required? |
|----------|----------|-----------|
| PR Validation | `Validate Build` | Yes |
| PR Validation | `Deploy to Staging` | Yes |
| PR Validation | `Preview Production Changes` | Yes |
| Terraform Lint | `Lint & Security Scan` | Yes |
| Development CI | `Build & Validate` | Optional |

---

## Testing the Setup

1. Create a branch with a small change
2. Push to `develop`
3. Create a PR to `main`
4. Watch the checks run
5. Verify merge button is disabled until all pass
6. Merge and verify production deployment
