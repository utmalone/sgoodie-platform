# Custom Domain: sgoodiephotography.com

Production Terraform associates **sgoodiephotography.com** and **www.sgoodiephotography.com** with the Amplify `main` branch. DNS is still configured at **GoDaddy** (Terraform does not manage GoDaddy records).

## What Terraform manages

| Resource | Purpose |
|----------|---------|
| `aws_amplify_domain_association` | Links apex + `www` to the Amplify app |
| `NEXTAUTH_URL` env var | Set to `https://sgoodiephotography.com` (derived from `domain_name`) |

Domain association uses `wait_for_verification = false` so `terraform apply` succeeds before GoDaddy DNS is updated. SSL becomes active after DNS propagates.

## After deploy: get DNS records

From the repo root (with AWS credentials):

```bash
cd terraform/environments/prod
terraform init
terraform output custom_domain_dns
```

Or in the AWS Console: **Amplify** → your app → **Hosting** → **Custom domains** → **sgoodiephotography.com**.

Add every record Amplify shows to GoDaddy → **sgoodiephotography.com** → **DNS**.

**Keep MX records** if email uses `@sgoodiephotography.com` at GoDaddy.

## GoDaddy checklist

1. Remove old WordPress **A** / **CNAME** records for `@` and `www`.
2. Add Amplify certificate **CNAME** (validation).
3. Add Amplify routing records for `@` and `www`.
4. Wait for Amplify domain status **Available** and HTTPS working.
5. In Amplify Console, confirm domain status is **Available**, then test `https://sgoodiephotography.com` and admin login.

## Configuration reference

| Setting | Location | Value |
|---------|----------|--------|
| `domain_name` | `terraform/environments/prod/variables.tf` (default) | `sgoodiephotography.com` |
| `domain_name` | `.github/workflows/deploy.yml` | `sgoodiephotography.com` |
| `NEXTAUTH_URL` | Amplify env (via Terraform) | `https://sgoodiephotography.com` |

The GitHub secret `NEXTAUTH_URL` is **no longer passed** to Terraform; the URL is derived from `domain_name`. You can remove or update that secret for documentation only.

## Troubleshooting: domain association FAILED

If Terraform apply fails with `route53:ListHostedZones` or state `FAILED`:

**Root cause (CI):** GitHub Actions assumes the IAM role once per job. Updating the IAM policy in the same workflow run does **not** update the active STS session’s permissions. The deploy workflow applies IAM first, **re-assumes the role**, then creates the domain association.

1. Remove the failed association before retrying:
   - **Amplify Console** → Hosting → Custom domains → remove `sgoodiephotography.com`, or
   - `aws amplify delete-domain-association --app-id <APP_ID> --domain-name sgoodiephotography.com`
2. Push to `main` to run **Deploy to Production** again (IAM target apply → credential refresh → full apply).
3. If it still fails, add `route53:ListHostedZones` manually to `sgoodie-github-actions-policy-prod` in IAM, then re-run.

## Optional: wait for verification in Terraform

After DNS is correct, you can set `domain_wait_for_verification = true` on the Amplify module in `terraform/environments/prod/main.tf` if you want apply to block until Amplify verifies the domain.
