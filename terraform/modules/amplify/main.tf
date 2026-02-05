# =============================================================================
# Amplify Module (Next.js Hosting)
# =============================================================================
# Creates an AWS Amplify app for hosting the Next.js application
# =============================================================================

# -----------------------------------------------------------------------------
# Amplify Service Role (grants runtime access to DynamoDB)
# -----------------------------------------------------------------------------
locals {
  dynamodb_resources = flatten([
    for arn in var.service_role_dynamodb_arns : [
      arn,
      "${arn}/index/*"
    ]
  ])
}

data "aws_iam_policy_document" "amplify_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["amplify.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "amplify_service_role" {
  dynamic "statement" {
    for_each = length(local.dynamodb_resources) > 0 ? [1] : []
    content {
      sid = "DynamoDbAccess"
      actions = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      resources = local.dynamodb_resources
    }
  }
}

resource "aws_iam_role" "amplify_service_role" {
  name               = "${var.project_name}-${var.environment}-amplify-service"
  assume_role_policy = data.aws_iam_policy_document.amplify_assume_role.json
}

resource "aws_iam_role_policy" "amplify_service_role" {
  name   = "${var.project_name}-${var.environment}-amplify-service"
  role   = aws_iam_role.amplify_service_role.id
  policy = data.aws_iam_policy_document.amplify_service_role.json
}

# -----------------------------------------------------------------------------
# Amplify App
# -----------------------------------------------------------------------------
resource "aws_amplify_app" "main" {
  name       = "${var.project_name}-${var.environment}"
  repository = "https://github.com/${var.github_org}/${var.github_repo}"

  # GitHub access token for repository access
  access_token = var.github_access_token

  # Allow SSR/runtime access to DynamoDB
  iam_service_role_arn = aws_iam_role.amplify_service_role.arn

  # Build settings for Next.js SSR
  # Note: USE_MOCK_DATA=true during build so we don't need DynamoDB access
  # Runtime will use the branch environment variables (USE_MOCK_DATA=false)
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - USE_MOCK_DATA=true npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
  EOT

  # Platform for Next.js SSR
  platform = "WEB_COMPUTE"

  # No custom rules needed for Next.js SSR - the framework handles routing
  # Custom rules are only needed for static SPA sites

  tags = {
    Name        = "${var.project_name}-${var.environment}"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Production Branch (main)
# -----------------------------------------------------------------------------
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = "main"

  framework = "Next.js - SSR"
  stage     = "PRODUCTION"

  enable_auto_build = true

  # Environment variables for this branch
  environment_variables = var.environment_variables

  tags = {
    Name        = "${var.project_name}-main-${var.environment}"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Development Branch (develop) - for previews
# -----------------------------------------------------------------------------
resource "aws_amplify_branch" "develop" {
  app_id      = aws_amplify_app.main.id
  branch_name = "develop"

  framework = "Next.js - SSR"
  stage     = "DEVELOPMENT"

  enable_auto_build = false # We don't auto-deploy develop

  # Use same env vars but with development flag
  environment_variables = merge(var.environment_variables, {
    NODE_ENV = "development"
  })

  tags = {
    Name        = "${var.project_name}-develop-${var.environment}"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# Webhook for triggering builds
# -----------------------------------------------------------------------------
resource "aws_amplify_webhook" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = aws_amplify_branch.main.branch_name
  description = "Webhook for CI/CD pipeline"
}

# -----------------------------------------------------------------------------
# Custom Domain (optional)
# -----------------------------------------------------------------------------
resource "aws_amplify_domain_association" "main" {
  count = var.domain_name != "" ? 1 : 0

  app_id      = aws_amplify_app.main.id
  domain_name = var.domain_name

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = ""
  }

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "www"
  }
}
