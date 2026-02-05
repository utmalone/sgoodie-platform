# =============================================================================
# Secrets Manager Module Outputs
# =============================================================================

output "openai_api_key_secret_arn" {
  value = aws_secretsmanager_secret.openai_api_key.arn
}

output "instagram_access_token_secret_arn" {
  value = aws_secretsmanager_secret.instagram_access_token.arn
}
