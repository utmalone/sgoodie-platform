# =============================================================================
# GitHub OIDC Module Variables
# =============================================================================

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "create_oidc_provider" {
  description = "Whether to create the OIDC provider (set to false if it already exists)"
  type        = bool
  default     = true
}

variable "s3_bucket_arns" {
  description = "List of S3 bucket ARNs for permissions"
  type        = list(string)
  default     = []
}

variable "dynamodb_table_arns" {
  description = "List of DynamoDB table ARNs for permissions"
  type        = list(string)
  default     = []
}

variable "amplify_app_arn" {
  description = "Amplify app ARN for permissions"
  type        = string
  default     = ""
}
