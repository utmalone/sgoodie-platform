# CI/CD Workflow Documentation

**Last Updated:** 2025-01-16  
**Version:** 1.0

---

## Overview

This document describes the CI/CD (Continuous Integration/Continuous Deployment) workflow for the S.Goodie Photography Platform. The workflow ensures that code changes are properly tested, infrastructure is updated, and deployments happen automatically when code is merged to the `main` branch.

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
Developer → develop branch → PR → main branch → Deploy
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
| `apps/frontend/**` | Frontend deployment | Amplify rebuild |
| `services/backend/**` | Backend deployment | Lambda deploy |
| `terraform/**` | Infrastructure update | Terraform apply |
| `docs/**` | Nothing | Documentation only |
| Root files | Nothing | Config files only |

### Separation Logic

- **Frontend changes** in `apps/frontend/` → Only Amplify rebuilds
- **Backend changes** in `services/backend/` → Only Lambda deploys
- **Terraform changes** in `terraform/` → Only infrastructure updates
- **Multiple changes** → All relevant processes run in parallel

---

## GitHub Actions Workflows

### Workflow Files

Located in `.github/workflows/`:

1. **`terraform-ci.yml`** - Infrastructure deployment
2. **`backend-ci.yml`** - Backend Lambda deployment
3. **`frontend-ci.yml`** - Frontend Amplify deployment (optional, Amplify auto-detects)

### Workflow Execution Order

When PR is merged to `main`:

1. **Terraform Workflow** (runs first)
   - Ensures AWS resources exist
   - Creates/updates infrastructure
   - Must succeed before other deployments

2. **Backend Workflow** (runs if backend changed)
   - Deploys Lambda functions
   - Updates API Gateway
   - Runs in parallel with frontend if both changed

3. **Frontend Workflow** (runs if frontend changed)
   - Triggers Amplify rebuild
   - Or deploys directly (if not using Amplify auto-deploy)

---

## Terraform Workflow

### Workflow: `terraform-ci.yml`

**Trigger:** PR merged to `main` AND changes in `terraform/`

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

## Backend Workflow

### Workflow: `backend-ci.yml`

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

## Frontend Workflow

### Option 1: Amplify Auto-Deploy (Recommended)

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

### Option 2: Manual GitHub Actions (If Needed)

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

**Why:** Backend and frontend deployments need AWS resources to exist.

**Solution:** Use workflow dependencies or sequential execution.

**Option 1: Sequential (Recommended)**
```yaml
# terraform-ci.yml
jobs:
  terraform:
    runs-on: ubuntu-latest
    steps: [...]
    
# backend-ci.yml
jobs:
  backend:
    needs: terraform  # Wait for terraform
    runs-on: ubuntu-latest
    steps: [...]
```

**Option 2: Check Resources Exist**
```yaml
# backend-ci.yml
- name: Verify DynamoDB table exists
  run: |
    aws dynamodb describe-table --table-name sgoodie-projects-prod
```

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
2. **Backend Tests** - Must pass (if backend changed)
3. **Frontend Tests** - Must pass (if frontend changed)
4. **Linting** - Must pass
5. **Type Checking** - Must pass

### Branch Protection Rules

**Settings → Branches → `main` branch:**

- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Include administrators

---

## Rollback Procedures

### Frontend Rollback

**Via Amplify Console:**
1. Go to Amplify app
2. Navigate to "Deployments"
3. Select previous successful deployment
4. Click "Redeploy this version"

**Via Git:**
1. Revert commit on `main`
2. Push revert
3. Amplify automatically redeploys

### Backend Rollback

**Via Serverless:**
```bash
cd services/backend
serverless deploy --stage prod --version <previous-version>
```

**Via Git:**
1. Revert commit on `main`
2. Push revert
3. GitHub Actions redeploys

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

**2. Backend Deployment Fails:**
- Check AWS credentials
- Verify IAM permissions
- Check Serverless configuration

**3. Frontend Build Fails:**
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

### Example 1: Frontend Only Change

**Scenario:** Developer updates home page design

**Process:**
1. Push to `develop` branch
2. Create PR: `develop` → `main`
3. Merge PR
4. **Only frontend workflow runs:**
   - Amplify detects change in `apps/frontend/`
   - Triggers build
   - Deploys to CDN
5. Backend and Terraform workflows **do not run**

### Example 2: Backend Only Change

**Scenario:** Developer adds new API endpoint

**Process:**
1. Push to `develop` branch
2. Create PR: `develop` → `main`
3. Merge PR
4. **Terraform runs first** (ensures resources exist)
5. **Backend workflow runs:**
   - Deploys Lambda function
   - Updates API Gateway
6. Frontend workflow **does not run**

### Example 3: Infrastructure Change

**Scenario:** Developer adds new S3 bucket

**Process:**
1. Push to `develop` branch
2. Create PR: `develop` → `main`
3. Merge PR
4. **Only Terraform workflow runs:**
   - Creates S3 bucket
   - Updates IAM permissions
5. Backend and frontend workflows **do not run**

### Example 4: Full Stack Change

**Scenario:** Developer adds new feature (frontend + backend + infrastructure)

**Process:**
1. Push to `develop` branch
2. Create PR: `develop` → `main`
3. Merge PR
4. **All workflows run:**
   - Terraform runs first
   - Backend and frontend run in parallel (after Terraform)
5. Everything deploys together

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

**Document Version:** 1.0  
**Last Updated:** 2025-01-16  
**Maintained By:** Development Team
