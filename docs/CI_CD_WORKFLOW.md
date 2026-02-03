# CI/CD Workflow Documentation

**Last Updated:** 2026-02-03  
**Version:** 1.1

---

## Overview

This document describes the CI/CD (Continuous Integration/Continuous Deployment) workflow for the S.Goodie Photography Platform. The workflow ensures that code changes are properly tested, infrastructure is updated, and the single Next.js app (public + admin + API) deploys via Amplify when code is merged to the `main` branch.

---

## Branch Strategy

### Branches

- **`main` branch:**
  - Production-ready code
  - Protected branch (requires PR)
  - Triggers deployments on merge

- **`develop` branch:**
  - Development work
  - All feature work happens here
  - No automatic deployments
  - Push commits freely to save work

### Workflow

```
Developer -> develop branch -> PR -> main branch -> Deploy
```

1. **Development:** Work on `develop` branch, push commits
2. **Review:** Create PR from `develop` to `main`
3. **Merge:** After review, merge PR to `main`
4. **Deploy:** Automatic deployment triggered on merge

---

## Deployment Triggers

### What Triggers What

| Change Location | Triggers | Process |
|----------------|----------|---------|
| `app/**`, `components/**`, `lib/**` | App deployment | Amplify build |
| `terraform/**` | Infrastructure update | Terraform apply |
| `docs/**` | Nothing | Documentation only |
| Root config files | App deployment | Amplify build |

### Separation Logic

- **App code changes** -> Amplify build
- **Terraform changes** -> Terraform apply
- **Docs only** -> No deployment

---

## GitHub Actions Workflows

### Workflow Files

Located in `.github/workflows/`:

1. **`deploy.yml`** - Terraform apply (if needed) + Amplify build trigger

### Workflow Execution Order

When PR is merged to `main`:

1. **Terraform job** (runs first if `terraform/**` changed)
   - Ensures AWS resources exist
   - Creates/updates infrastructure

2. **Amplify build trigger**
   - Deploys the single Next.js app (public + admin + API)

---

## Deploy Workflow

### Workflow: `deploy.yml`

**Trigger:** PR merged to `main` (push). Terraform job runs only if `terraform/**` changed.

**Steps:**

1. **Checkout Code**
   ```yaml
   - uses: actions/checkout@v4
   ```

2. **Setup Terraform**
   ```yaml
   - uses: hashicorp/setup-terraform@v3
     with:
       terraform_version: latest
   ```

3. **Configure AWS Credentials**
   ```yaml
   - uses: aws-actions/configure-aws-credentials@v4
     with:
       aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
       aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
       aws-region: us-east-1
   ```

4. **Terraform Init**
   ```yaml
   - run: |
       cd terraform/environments/prod
       terraform init
   ```

5. **Terraform Plan**
   ```yaml
   - run: |
       cd terraform/environments/prod
       terraform plan -out=tfplan
   ```

6. **Terraform Apply**
   ```yaml
   - run: |
       cd terraform/environments/prod
       terraform apply -auto-approve tfplan
   ```

**Outputs:**
- Infrastructure resources created/updated
- Resource ARNs and IDs
- Any errors or warnings

---

## Amplify Build Trigger (Recommended)

**Trigger:** On merge to `main` after Terraform job completes (if any)

**Steps:**

1. **Configure AWS Credentials**
   ```yaml
   - uses: aws-actions/configure-aws-credentials@v4
     with:
       aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
       aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
       aws-region: us-east-1
   ```

2. **Trigger Amplify Build**
   ```yaml
   - run: |
       aws amplify start-job \
         --app-id ${{ secrets.AMPLIFY_APP_ID }} \
         --branch-name main \
         --job-type RELEASE
   ```

**Note:** Disable Amplify auto-deploy if you want Terraform to always run first.

---

## Legacy Backend Workflow (Not Used)

**Note:** The current architecture uses Next.js Route Handlers; no separate backend deploy.

### Legacy Workflow: `backend-ci.yml`

**Trigger:** PR merged to `main` AND changes in `services/backend/`

**Steps:**

1. **Checkout Code**
   ```yaml
   - uses: actions/checkout@v4
   ```

2. **Setup Node.js**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '20'
       cache: 'npm'
       cache-dependency-path: services/backend/package-lock.json
   ```

3. **Install Dependencies**
   ```yaml
   - run: |
       cd services/backend
       npm ci
   ```

4. **Run Tests** (if tests exist)
   ```yaml
   - run: |
       cd services/backend
       npm test
   ```

5. **Configure AWS Credentials**
   ```yaml
   - uses: aws-actions/configure-aws-credentials@v4
     with:
       aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
       aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
       aws-region: us-east-1
   ```

6. **Deploy with Serverless**
   ```yaml
   - run: |
       cd services/backend
       npm install -g serverless
       serverless deploy --stage prod
   ```

**Outputs:**
- Lambda function ARNs
- API Gateway endpoint URL
- Deployment status

---

## Legacy Frontend Workflow (Not Used)

**Note:** Use the Amplify Build Trigger section above for the recommended flow.

### Legacy Option 1: Amplify Auto-Deploy

**AWS Amplify automatically detects changes** in `apps/frontend/` when code is pushed to `main`. No GitHub Actions workflow needed.

**Amplify Configuration:**
- **Repository:** Connected to GitHub
- **Branch:** `main`
- **Base Directory:** `apps/frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

**How It Works:**
1. Code pushed to `main`
2. Amplify detects changes in `apps/frontend/`
3. Automatically triggers build
4. Deploys to CDN

### Legacy Option 2: Manual GitHub Actions

**Workflow: `frontend-ci.yml`**

**Trigger:** PR merged to `main` AND changes in `apps/frontend/`

**Steps:**

1. **Checkout Code**
2. **Setup Node.js**
3. **Install Dependencies**
4. **Run Tests**
5. **Build Next.js**
6. **Deploy to Amplify** (via Amplify CLI or API)

---

## Workflow Dependencies

### Terraform Must Run First

**Why:** The app needs AWS resources (S3, DynamoDB) to exist before deploy.

**Solution:** Use a single `deploy.yml` with job dependencies.

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest
    if: needs_terraform == true
    steps: [...]

  amplify:
    needs: [terraform]
    runs-on: ubuntu-latest
    steps: [...]
```

**Alternative:** If Amplify auto-deploy is enabled, apply Terraform manually before merging.

---

## Environment Variables & Secrets

### GitHub Secrets Required

Set these in GitHub repository settings:

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AMPLIFY_APP_ID` - Amplify app ID (if using Amplify API)
- `AMPLIFY_BRANCH` - Amplify branch name (usually `main`)

### Environment Variables

Set in workflow files or GitHub repository settings:

- `AWS_REGION` - `us-east-1`
- `NODE_ENV` - `production`
- `STAGE` - `prod`

---

## Workflow Status Checks

### Required Checks for PR Merge

Configure branch protection rules:

1. **Terraform Plan** - Must pass (if terraform changed)
2. **App Tests** - Must pass (if app changed)
3. **Linting** - Must pass
4. **Type Checking** - Must pass

### Branch Protection Rules

**Settings → Branches → `main` branch:**

- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Include administrators

---

## Rollback Procedures

### App Rollback

**Via Amplify Console:**
1. Go to Amplify app
2. Navigate to "Deployments"
3. Select previous successful deployment
4. Click "Redeploy this version"

**Via Git:**
1. Revert commit on `main`
2. Push revert
3. Amplify automatically redeploys

### Infrastructure Rollback

**Via Terraform:**
```bash
cd terraform/environments/prod
terraform state list  # See current state
terraform apply -target=<resource>  # Rollback specific resource
```

---

## Monitoring & Notifications

### Workflow Notifications

**GitHub Actions:**
- Email notifications on failure
- Slack integration (if configured)
- Status badges in README

### Deployment Monitoring

**Amplify:**
- Build status in Amplify console
- Email notifications on build failure
- Deployment history

**Lambda:**
- CloudWatch logs
- CloudWatch metrics
- Error alerts

---

## Troubleshooting

### Common Issues

**1. Terraform Fails:**
- Check AWS credentials
- Verify Terraform state is accessible
- Check for resource conflicts

**2. App Deployment Fails:**
- Check AWS credentials
- Verify Amplify app configuration
- Check build logs in Amplify

**3. Build Fails:**
- Check Node.js version
- Verify dependencies
- Check build logs in Amplify

**4. Workflow Not Triggering:**
- Verify branch is `main`
- Check file paths in workflow
- Verify GitHub Actions is enabled

---

## Best Practices

### Development

1. **Always work on `develop` branch**
2. **Push frequently** to save work
3. **Create PRs early** for review
4. **Test locally** before pushing

### Deployment

1. **Review PRs carefully** before merging
2. **Monitor deployments** after merge
3. **Check logs** if deployment fails
4. **Rollback quickly** if issues found

### Infrastructure

1. **Terraform plan first** (review changes)
2. **Test in dev environment** before prod
3. **Keep state files secure**
4. **Document infrastructure changes**

---

## Workflow Examples

### Example 1: App-Only Change

**Scenario:** Developer updates home page design

**Process:**
1. Push to `develop` branch
2. Create PR: `develop` → `main`
3. Merge PR
4. **Only app deployment runs:**
   - Amplify builds the app
   - Deploys UI + API together
5. Terraform does not run unless `terraform/**` changed

### Example 2: Infrastructure Change

**Scenario:** Developer adds new S3 bucket

**Process:**
1. Push to `develop` branch
2. Create PR: `develop` → `main`
3. Merge PR
4. **Only Terraform job runs:**
   - Creates S3 bucket
   - Updates IAM permissions
5. Amplify build does not run unless app changed

### Example 3: App + Infrastructure Change

**Scenario:** Developer adds new feature (app code + infrastructure)

**Process:**
1. Push to `develop` branch
2. Create PR: `develop` → `main`
3. Merge PR
4. **Terraform job runs first** (if `terraform/**` changed)
5. **Amplify build runs after Terraform**
6. Everything deploys together

---

## Future Enhancements

### Potential Improvements

1. **Staging Environment:**
   - Deploy to staging on `develop` branch
   - Deploy to prod on `main` branch

2. **Automated Testing:**
   - E2E tests before deployment
   - Performance tests
   - Security scans

3. **Blue-Green Deployments:**
   - Zero-downtime deployments
   - Instant rollback capability

4. **Feature Flags:**
   - Gradual feature rollouts
   - A/B testing support

---

**Document Version:** 1.1  
**Last Updated:** 2026-02-03  
**Maintained By:** Development Team
