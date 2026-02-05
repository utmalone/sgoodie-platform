# =============================================================================
# Staging Environment Outputs
# =============================================================================

output "photos_bucket_name" {
  description = "S3 bucket name for photos"
  value       = module.storage.photos_bucket_name
}

output "cloudfront_domain" {
  description = "CloudFront domain name"
  value       = module.cdn.distribution_domain
}

output "dynamodb_tables" {
  description = "DynamoDB table names"
  value = {
    pages     = module.database.pages_table_name
    photos    = module.database.photos_table_name
    projects  = module.database.projects_table_name
    journal   = module.database.journal_table_name
    analytics = module.database.analytics_table_name
  }
}
