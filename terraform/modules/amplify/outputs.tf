# =============================================================================
# Amplify Module Outputs
# =============================================================================

output "app_id" {
  description = "Amplify application ID"
  value       = aws_amplify_app.main.id
}

output "app_arn" {
  description = "Amplify application ARN"
  value       = aws_amplify_app.main.arn
}

output "default_domain" {
  description = "Default Amplify domain"
  value       = aws_amplify_app.main.default_domain
}

output "production_branch_url" {
  description = "Production branch URL"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.main.default_domain}"
}

output "webhook_url" {
  description = "Webhook URL for triggering builds"
  value       = aws_amplify_webhook.main.url
  sensitive   = true
}
