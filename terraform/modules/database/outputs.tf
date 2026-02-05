# =============================================================================
# Database Module Outputs
# =============================================================================

output "pages_table_name" {
  description = "Name of the pages DynamoDB table"
  value       = aws_dynamodb_table.pages.name
}

output "pages_table_arn" {
  description = "ARN of the pages DynamoDB table"
  value       = aws_dynamodb_table.pages.arn
}

output "photos_table_name" {
  description = "Name of the photos DynamoDB table"
  value       = aws_dynamodb_table.photos.name
}

output "photos_table_arn" {
  description = "ARN of the photos DynamoDB table"
  value       = aws_dynamodb_table.photos.arn
}

output "projects_table_name" {
  description = "Name of the projects DynamoDB table"
  value       = aws_dynamodb_table.projects.name
}

output "projects_table_arn" {
  description = "ARN of the projects DynamoDB table"
  value       = aws_dynamodb_table.projects.arn
}

output "journal_table_name" {
  description = "Name of the journal DynamoDB table"
  value       = aws_dynamodb_table.journal.name
}

output "journal_table_arn" {
  description = "ARN of the journal DynamoDB table"
  value       = aws_dynamodb_table.journal.arn
}

output "analytics_table_name" {
  description = "Name of the analytics DynamoDB table"
  value       = aws_dynamodb_table.analytics.name
}

output "analytics_table_arn" {
  description = "ARN of the analytics DynamoDB table"
  value       = aws_dynamodb_table.analytics.arn
}
