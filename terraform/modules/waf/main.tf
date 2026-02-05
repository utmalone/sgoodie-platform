# =============================================================================
# WAF Module (Rate Limiting for Amplify/CloudFront)
# =============================================================================

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  distribution_arn = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${var.cloudfront_distribution_id}"
}

resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-${var.environment}-web-acl"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitAuth"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_auth
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/api/auth"
            positional_constraint = "STARTS_WITH"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-auth-rate"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitAdmin"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_admin
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/api/admin"
            positional_constraint = "STARTS_WITH"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-${var.environment}-admin-rate"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-${var.environment}-web-acl"
    sampled_requests_enabled   = true
  }
}
