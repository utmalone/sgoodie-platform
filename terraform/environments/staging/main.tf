# =============================================================================
# S.Goodie Photography Platform - Staging Environment
# =============================================================================
# This environment is used to validate Terraform changes before production.
# Changes are applied here on PR, and only merged to main if successful.
# =============================================================================

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state configuration - separate from prod
  backend "s3" {
    bucket         = "sgoodie-terraform-state-667516054009"
    key            = "staging/terraform.tfstate"
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
}

# -----------------------------------------------------------------------------
# Storage Module (S3 buckets)
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
  domain_name          = ""
}
