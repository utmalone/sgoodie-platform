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

output "custom_domain" {
  description = "Custom domain associated with Amplify (empty if not configured)"
  value       = var.domain_name
}

output "custom_domain_url" {
  description = "HTTPS URL for the custom domain apex"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : ""
}

output "domain_certificate_verification_dns_record" {
  description = "Space-delimited CNAME for SSL certificate verification (add at GoDaddy)"
  value = length(aws_amplify_domain_association.main) > 0 ? (
    aws_amplify_domain_association.main[0].certificate_verification_dns_record
  ) : ""
}

output "domain_subdomain_dns_records" {
  description = "Per-subdomain DNS records from Amplify (space-prefixed CNAME format)"
  value = length(aws_amplify_domain_association.main) > 0 ? [
    for sub in aws_amplify_domain_association.main[0].sub_domain : {
      prefix     = sub.prefix
      dns_record = sub.dns_record
      verified   = sub.verified
    }
  ] : []
}

output "domain_association_arn" {
  description = "ARN of the Amplify custom domain association"
  value = length(aws_amplify_domain_association.main) > 0 ? (
    aws_amplify_domain_association.main[0].arn
  ) : ""
}
