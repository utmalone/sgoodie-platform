# =============================================================================
# Amplify Module (Next.js Hosting)
# =============================================================================
# Creates an AWS Amplify app for hosting the Next.js application
# =============================================================================

# -----------------------------------------------------------------------------
# Amplify App
# -----------------------------------------------------------------------------
resource "aws_amplify_app" "main" {
  name       = "${var.project_name}-${var.environment}"
  repository = "https://github.com/${var.github_org}/${var.github_repo}"

  # GitHub access token for repository access
  access_token = var.github_access_token

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
