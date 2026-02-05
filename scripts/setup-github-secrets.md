# GitHub Secrets Setup Guide

This guide explains how to set up the required GitHub Secrets for the CI/CD pipeline.

## Required Secrets

Navigate to your repository settings: **Settings -> Secrets and variables -> Actions**

Click "New repository secret" for each of the following:

### 1. AWS_ACCOUNT_ID
- **Value:** `667516054009`
- **Description:** Your AWS account ID for OIDC role ARN

### 2. GH_ACCESS_TOKEN
- **How to create:**
  1. Go to https://github.com/settings/tokens
  2. Click "Generate new token" -> "Generate new token (classic)"
  3. Name: `sgoodie-amplify-access`
  4. Select scopes: `repo`, `admin:repo_hook`
  5. Click "Generate token"
  6. Copy the token (starts with `ghp_`)
- **Value:** The generated token

### 3. NEXTAUTH_URL
- **Value:** Your production URL (e.g., `https://main.<app>.amplifyapp.com` or your custom domain)

### 4. NEXTAUTH_SECRET
- **How to create:** Generate a random 32+ character string
- **Command:** Run in terminal: `openssl rand -base64 32`
- **Value:** The generated string

### 5. ADMIN_EMAIL
- **Value:** Seed admin login email (e.g., `admin@sgoodiephoto.com`)

### 6. ADMIN_PASSWORD_HASH
- **How to create:** Argon2id hash of your desired password (preferred)
- **Command (PowerShell, from repo root after `npm install`):**
  ```powershell
  node -e "const argon2 = require('argon2'); argon2.hash('your-secure-password', { type: argon2.argon2id }).then(console.log)"
  ```
- **Value:** The generated hash string

### 7. OPENAI_API_KEY (Optional)
- **How to get:** From https://platform.openai.com/api-keys
- **Value:** Your OpenAI API key (stored in AWS Secrets Manager via Terraform)

### 8. INSTAGRAM_ACCESS_TOKEN (Optional)
- **How to get:** From Facebook Developer Console
- **Value:** Your Instagram access token (stored in AWS Secrets Manager via Terraform)

### 9. AMPLIFY_CLOUDFRONT_DISTRIBUTION_ID (Required for WAF rate limiting)
- **How to get:** From CloudFront console or CLI
- **Value:** CloudFront distribution ID (e.g., `E2Y76CUV9MZ8N3`)

## Notes

- `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` seed the DynamoDB admin record on first run.
- After seeding, admin credentials can be updated in the Admin Profile UI.

## Verification

After adding all secrets, your repository should show:

```
AWS_ACCOUNT_ID         ********
GH_ACCESS_TOKEN        ********
NEXTAUTH_URL           ********
NEXTAUTH_SECRET        ********
ADMIN_EMAIL            ********
ADMIN_PASSWORD_HASH    ********
OPENAI_API_KEY         ********
INSTAGRAM_ACCESS_TOKEN ********
AMPLIFY_CLOUDFRONT_DISTRIBUTION_ID ********
```

## Testing the Setup

1. Push a change to the `develop` branch
2. The "Development CI" workflow should run and pass
3. Create a PR from `develop` to `main`
4. The "PR Validation" workflow should run
5. Merge the PR to trigger deployment
