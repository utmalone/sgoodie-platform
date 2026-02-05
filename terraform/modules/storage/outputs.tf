# =============================================================================
# Storage Module Outputs
# =============================================================================

output "photos_bucket_name" {
  description = "Name of the photos S3 bucket"
  value       = aws_s3_bucket.photos.bucket
}

output "photos_bucket_arn" {
  description = "ARN of the photos S3 bucket"
  value       = aws_s3_bucket.photos.arn
}

output "photos_bucket_domain" {
  description = "Regional domain name of the photos bucket"
  value       = aws_s3_bucket.photos.bucket_regional_domain_name
}

output "uploads_bucket_name" {
  description = "Name of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.bucket
}

output "uploads_bucket_arn" {
  description = "ARN of the uploads S3 bucket"
  value       = aws_s3_bucket.uploads.arn
}

output "uploads_bucket_domain" {
  description = "Regional domain name of the uploads bucket"
  value       = aws_s3_bucket.uploads.bucket_regional_domain_name
}
