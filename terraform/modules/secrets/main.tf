# =============================================================================
# Secrets Manager Module
# =============================================================================

resource "aws_secretsmanager_secret" "openai_api_key" {
  name = "${var.project_name}-${var.environment}-openai-api-key"
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  count         = var.openai_api_key != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

resource "aws_secretsmanager_secret" "instagram_access_token" {
  name = "${var.project_name}-${var.environment}-instagram-access-token"
}

resource "aws_secretsmanager_secret_version" "instagram_access_token" {
  count         = var.instagram_access_token != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.instagram_access_token.id
  secret_string = var.instagram_access_token
}
