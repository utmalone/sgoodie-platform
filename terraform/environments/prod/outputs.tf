# =============================================================================
# Production Environment Outputs
# =============================================================================
# These outputs are displayed after terraform apply and can be used in CI/CD

# -----------------------------------------------------------------------------
# Amplify Outputs
# -----------------------------------------------------------------------------
output "amplify_app_id" {
  description = "Amplify application ID"
  value       = module.amplify.app_id
}

output "amplify_default_domain" {
  description = "Amplify default domain URL"
  value       = module.amplify.default_domain
}

output "amplify_production_branch_url" {
  description = "Production branch URL"
  value       = module.amplify.production_branch_url
}

output "site_url" {
  description = "Canonical production site URL (custom domain when configured)"
  value       = local.site_url != "" ? local.site_url : module.amplify.production_branch_url
}

output "custom_domain_dns" {
  description = "DNS records to add at GoDaddy after terraform apply (see docs/CUSTOM_DOMAIN.md)"
  value = {
    certificate_verification = module.amplify.domain_certificate_verification_dns_record
    subdomains               = module.amplify.domain_subdomain_dns_records
    domain_association_arn   = module.amplify.domain_association_arn
  }
}

# -----------------------------------------------------------------------------
# Storage Outputs
# -----------------------------------------------------------------------------
output "photos_bucket_name" {
  description = "S3 bucket name for photos"
  value       = module.storage.photos_bucket_name
}

output "uploads_bucket_name" {
  description = "S3 bucket name for uploads"
  value       = module.storage.uploads_bucket_name
}

# -----------------------------------------------------------------------------
# CDN Outputs
# -----------------------------------------------------------------------------
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cdn.distribution_id
}

output "cloudfront_domain" {
  description = "CloudFront domain name"
  value       = module.cdn.distribution_domain
}

# -----------------------------------------------------------------------------
# Database Outputs
# -----------------------------------------------------------------------------
output "dynamodb_tables" {
  description = "DynamoDB table names"
  value = {
    pages     = module.database.pages_table_name
    photos    = module.database.photos_table_name
    projects  = module.database.projects_table_name
    journal   = module.database.journal_table_name
    analytics = module.database.analytics_table_name
    admins    = module.database.admins_table_name
  }
}

# -----------------------------------------------------------------------------
# GitHub OIDC Outputs
# -----------------------------------------------------------------------------
output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions"
  value       = module.github_oidc.role_arn
}
