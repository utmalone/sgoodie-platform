# =============================================================================
# Production Environment Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string
  default     = "prod"
}

# -----------------------------------------------------------------------------
# GitHub Configuration
# -----------------------------------------------------------------------------
variable "github_org" {
  description = "GitHub organization or username"
  type        = string
  default     = "utmalone"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "sgoodie-platform"
}

variable "github_access_token" {
  description = "GitHub personal access token for Amplify"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Domain Configuration
# -----------------------------------------------------------------------------
variable "domain_name" {
  description = "Custom domain name (optional, e.g., sgoodie.com)"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Application Secrets (stored in GitHub Secrets, passed via CI/CD)
# -----------------------------------------------------------------------------
variable "nextauth_secret" {
  description = "NextAuth.js secret for JWT encryption"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Admin login email"
  type        = string
  sensitive   = true
}

variable "admin_password_hash" {
  description = "Admin password hash (argon2id or legacy SHA256)"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key for AI features (stored in Secrets Manager)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "instagram_access_token" {
  description = "Instagram API access token (stored in Secrets Manager)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "dynamodb_access_key_id" {
  description = "Access key ID for DynamoDB (optional; used for SSR runtime access)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "dynamodb_secret_access_key" {
  description = "Secret access key for DynamoDB (optional; used for SSR runtime access)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "dynamodb_session_token" {
  description = "Session token for DynamoDB (optional; used for SSR runtime access)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "nextauth_url" {
  description = "NextAuth.js callback URL (e.g., https://main.xxx.amplifyapp.com)"
  type        = string
  default     = ""
}
