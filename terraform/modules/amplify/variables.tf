# =============================================================================
# Amplify Module Variables
# =============================================================================

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "github_access_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Custom domain name (optional)"
  type        = string
  default     = ""
}

variable "environment_variables" {
  description = "Environment variables for the Amplify app"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "service_role_dynamodb_arns" {
  description = "DynamoDB table ARNs the Amplify service role can access"
  type        = list(string)
  default     = []
}

variable "service_role_secret_arns" {
  description = "Secrets Manager ARNs the Amplify service role can access"
  type        = list(string)
  default     = []
}

variable "service_role_s3_bucket_arns" {
  description = "S3 bucket ARNs (and object ARNs) the Amplify service role can access for PutObject/DeleteObject"
  type        = list(string)
  default     = []
}
