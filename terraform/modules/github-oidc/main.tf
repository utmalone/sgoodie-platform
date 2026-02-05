# =============================================================================
# GitHub Actions OIDC Module
# =============================================================================
# Creates an OIDC provider and IAM role for GitHub Actions to securely
# authenticate with AWS without storing long-lived credentials.
# =============================================================================

# -----------------------------------------------------------------------------
# OIDC Provider for GitHub Actions
# -----------------------------------------------------------------------------
data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]

  tags = {
    Name = "github-actions-oidc"
  }
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

# -----------------------------------------------------------------------------
# IAM Role for GitHub Actions
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Only allow specific repository and branches
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main",
        "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/develop"
      ]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "sgoodie-github-actions-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json

  tags = {
    Name        = "sgoodie-github-actions-${var.environment}"
    Environment = var.environment
  }
}

# -----------------------------------------------------------------------------
# IAM Policy for GitHub Actions
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "github_actions" {
  # S3 permissions for photo uploads and management
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]
    resources = concat(
      var.s3_bucket_arns,
      [for arn in var.s3_bucket_arns : "${arn}/*"]
    )
  }

  # DynamoDB permissions for content management
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem"
    ]
    resources = var.dynamodb_table_arns
  }

  # Amplify permissions for deployment
  statement {
    effect = "Allow"
    actions = [
      "amplify:UpdateApp",
      "amplify:GetApp",
      "amplify:StartJob",
      "amplify:GetJob",
      "amplify:ListJobs",
      "amplify:GetBranch",
      "amplify:UpdateBranch"
    ]
    resources = [var.amplify_app_arn, "${var.amplify_app_arn}/*"]
  }

  # CloudFront cache invalidation
  statement {
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations"
    ]
    resources = ["*"]
  }

  # Secrets Manager (third-party tokens stored securely)
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:CreateSecret",
      "secretsmanager:UpdateSecret",
      "secretsmanager:PutSecretValue",
      "secretsmanager:DeleteSecret",
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue",
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:TagResource",
      "secretsmanager:UntagResource",
      "secretsmanager:ListSecrets"
    ]
    resources = ["*"]
  }

  # WAFv2 (rate limiting on auth/admin endpoints)
  statement {
    effect = "Allow"
    actions = [
      "wafv2:CreateWebACL",
      "wafv2:UpdateWebACL",
      "wafv2:DeleteWebACL",
      "wafv2:GetWebACL",
      "wafv2:ListWebACLs",
      "wafv2:AssociateWebACL",
      "wafv2:DisassociateWebACL",
      "wafv2:ListResourcesForWebACL",
      "wafv2:TagResource",
      "wafv2:UntagResource",
      "wafv2:ListTagsForResource"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "github_actions" {
  name        = "sgoodie-github-actions-policy-${var.environment}"
  description = "Policy for GitHub Actions to deploy S.Goodie Platform"
  policy      = data.aws_iam_policy_document.github_actions.json

  tags = {
    Name        = "sgoodie-github-actions-policy-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions.arn
}
