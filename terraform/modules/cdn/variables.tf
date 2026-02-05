# =============================================================================
# CDN Module Variables
# =============================================================================

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "photos_bucket_name" {
  description = "Name of the photos S3 bucket"
  type        = string
}

variable "photos_bucket_arn" {
  description = "ARN of the photos S3 bucket"
  type        = string
}

variable "photos_bucket_domain" {
  description = "Regional domain name of the photos S3 bucket"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name (optional)"
  type        = string
  default     = ""
}
