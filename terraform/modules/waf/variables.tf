# =============================================================================
# WAF Module Variables
# =============================================================================

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID to associate with the Web ACL"
  type        = string
}

variable "rate_limit_auth" {
  description = "Rate limit for auth endpoints (per 5 minutes per IP)"
  type        = number
  default     = 100
}

variable "rate_limit_admin" {
  description = "Rate limit for admin endpoints (per 5 minutes per IP)"
  type        = number
  default     = 300
}
