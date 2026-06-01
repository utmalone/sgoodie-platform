# =============================================================================
# GitHub OIDC Module Outputs
# =============================================================================

output "role_arn" {
  description = "ARN of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.arn
}

output "role_name" {
  description = "Name of the GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.name
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider"
  value       = local.oidc_provider_arn
}

output "iam_policy_attachment_id" {
  description = "ID of the GitHub Actions IAM policy attachment (use to order domain association after IAM updates)"
  value       = aws_iam_role_policy_attachment.github_actions.id
}
