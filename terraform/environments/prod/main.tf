# =============================================================================
# S.Goodie Photography Platform - Production Environment
# =============================================================================
# This is the main Terraform configuration for the production environment.
# It uses modules to create all required AWS resources.
# =============================================================================

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }

  # Remote state configuration - stores state in S3 with DynamoDB locking
  backend "s3" {
    bucket         = "sgoodie-terraform-state-667516054009"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    use_lockfile   = true
    encrypt        = true
  }
}

# -----------------------------------------------------------------------------
# Provider Configuration
# -----------------------------------------------------------------------------
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "sgoodie-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Provider for us-east-1 (required for CloudFront certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "sgoodie-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  project_name = "sgoodie-platform"

  common_tags = {
    Project     = local.project_name
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# GitHub Actions OIDC Provider (for secure CI/CD authentication)
# -----------------------------------------------------------------------------
module "github_oidc" {
  source = "../../modules/github-oidc"

  github_org           = var.github_org
  github_repo          = var.github_repo
  environment          = var.environment
  create_oidc_provider = false # OIDC provider was bootstrapped via CLI
  s3_bucket_arns       = [module.storage.photos_bucket_arn, module.storage.uploads_bucket_arn]
  dynamodb_table_arns = [
    module.database.pages_table_arn,
    module.database.photos_table_arn,
    module.database.projects_table_arn,
    module.database.journal_table_arn,
    module.database.analytics_table_arn,
    module.database.admins_table_arn
  ]
  amplify_app_arn = module.amplify.app_arn
}

# -----------------------------------------------------------------------------
# Storage Module (S3 buckets for photos and uploads)
# -----------------------------------------------------------------------------
module "storage" {
  source = "../../modules/storage"

  environment  = var.environment
  project_name = local.project_name
}

# -----------------------------------------------------------------------------
# Database Module (DynamoDB tables)
# -----------------------------------------------------------------------------
module "database" {
  source = "../../modules/database"

  environment  = var.environment
  project_name = local.project_name
}

# -----------------------------------------------------------------------------
# Secrets Manager Module (third-party API tokens)
# -----------------------------------------------------------------------------
module "secrets" {
  source = "../../modules/secrets"

  environment            = var.environment
  project_name           = local.project_name
  openai_api_key         = var.openai_api_key
  instagram_access_token = var.instagram_access_token
}

# -----------------------------------------------------------------------------
# CDN Module (CloudFront distribution)
# -----------------------------------------------------------------------------
module "cdn" {
  source = "../../modules/cdn"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment          = var.environment
  project_name         = local.project_name
  photos_bucket_name   = module.storage.photos_bucket_name
  photos_bucket_arn    = module.storage.photos_bucket_arn
  photos_bucket_domain = module.storage.photos_bucket_domain
  domain_name          = var.domain_name
}

# -----------------------------------------------------------------------------
# Amplify Module (Next.js hosting)
# -----------------------------------------------------------------------------
module "amplify" {
  source = "../../modules/amplify"

  environment         = var.environment
  project_name        = local.project_name
  github_org          = var.github_org
  github_repo         = var.github_repo
  github_access_token = var.github_access_token
  domain_name         = var.domain_name

  service_role_dynamodb_arns = [
    module.database.pages_table_arn,
    module.database.photos_table_arn,
    module.database.projects_table_arn,
    module.database.journal_table_arn,
    module.database.analytics_table_arn,
    module.database.admins_table_arn
  ]

  # Environment variables for the Next.js app
  # Note: AWS_ prefix is reserved by Amplify, so we use different names
  environment_variables = merge(
    {
      USE_MOCK_DATA       = "false"
      NEXTAUTH_URL        = var.nextauth_url
      NEXTAUTH_SECRET     = var.nextauth_secret
      ADMIN_EMAIL         = var.admin_email
      ADMIN_PASSWORD_HASH = var.admin_password_hash

      # S3/CloudFront Resources (using non-AWS prefix for Amplify compatibility)
      S3_PHOTOS_BUCKET      = module.storage.photos_bucket_name
      S3_UPLOADS_BUCKET     = module.storage.uploads_bucket_name
      CLOUDFRONT_URL        = module.cdn.distribution_domain
      DYNAMODB_REGION       = var.aws_region
      DYNAMODB_TABLE_PREFIX = local.project_name
      DYNAMODB_TABLE_ENV    = var.environment
    },
    var.openai_api_key != "" ? {
      OPENAI_API_KEY_SECRET_ID = module.secrets.openai_api_key_secret_arn
    } : {},
    var.instagram_access_token != "" ? {
      INSTAGRAM_ACCESS_TOKEN_SECRET_ID = module.secrets.instagram_access_token_secret_arn
    } : {},
    var.dynamodb_access_key_id != "" ? {
      DYNAMODB_ACCESS_KEY_ID = var.dynamodb_access_key_id
    } : {},
    var.dynamodb_secret_access_key != "" ? {
      DYNAMODB_SECRET_ACCESS_KEY = var.dynamodb_secret_access_key
    } : {},
    var.dynamodb_session_token != "" ? {
      DYNAMODB_SESSION_TOKEN = var.dynamodb_session_token
    } : {}
  )

  service_role_secret_arns = [
    module.secrets.openai_api_key_secret_arn,
    module.secrets.instagram_access_token_secret_arn
  ]
}
