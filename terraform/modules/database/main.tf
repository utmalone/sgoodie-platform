# =============================================================================
# Database Module (DynamoDB Tables)
# =============================================================================
# Creates DynamoDB tables for content storage
# =============================================================================

# -----------------------------------------------------------------------------
# Pages Table (page content and SEO metadata)
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "pages" {
  name         = "${var.project_name}-pages-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "slug"

  attribute {
    name = "slug"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-pages-${var.environment}"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Photos Table (photo metadata and URLs)
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "photos" {
  name         = "${var.project_name}-photos-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-photos-${var.environment}"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Projects Table (portfolio projects)
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "projects" {
  name         = "${var.project_name}-projects-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "category-createdAt-index"
    hash_key        = "category"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-projects-${var.environment}"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Journal Table (blog posts)
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "journal" {
  name         = "${var.project_name}-journal-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "publishedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "publishedAt-index"
    hash_key        = "publishedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-journal-${var.environment}"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Analytics Table (page view events)
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "analytics" {
  name         = "${var.project_name}-analytics-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  range_key    = "timestamp"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "path"
    type = "S"
  }

  global_secondary_index {
    name            = "path-timestamp-index"
    hash_key        = "path"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup of old events (90 days)
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-analytics-${var.environment}"
    Environment = var.environment
  }
}
