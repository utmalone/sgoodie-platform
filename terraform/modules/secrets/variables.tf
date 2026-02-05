# =============================================================================
# Secrets Manager Module Variables
# =============================================================================

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "instagram_access_token" {
  description = "Instagram access token"
  type        = string
  sensitive   = true
  default     = ""
}
