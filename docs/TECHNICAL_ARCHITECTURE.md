# Technical Architecture - S.Goodie Photography Platform

**Last Updated:** 2025-01-16  
**Version:** 1.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Architecture](#database-architecture)
7. [Storage Architecture](#storage-architecture)
8. [Authentication Architecture](#authentication-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [CI/CD Architecture](#cicd-architecture)
11. [Infrastructure Architecture](#infrastructure-architecture)
12. [Local Development Architecture](#local-development-architecture)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Repository                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Frontend   │  │   Backend    │  │  Terraform   │    │
│  │   (Next.js)  │  │  (Lambda)    │  │  (IaC)       │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  AWS Amplify    │  │  AWS Lambda     │  │  Terraform      │
│  (Frontend)     │  │  (Backend API)  │  │  (Infrastructure)│
│                 │  │                 │  │                 │
│  - SSG Build    │  │  - API Routes   │  │  - S3 Buckets   │
│  - CDN          │  │  - Auth         │  │  - DynamoDB     │
│  - Auto Deploy  │  │  - File Upload  │  │  - IAM Roles    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   AWS Services   │
                    │                 │
                    │  - S3 (Photos)  │
                    │  - DynamoDB     │
                    │  - CloudFront   │
                    │  - Cognito      │
                    └─────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**
   - Frontend and backend are separate build processes
   - Changes to one don't trigger rebuilds of the other
   - Independent deployment pipelines

2. **Static Site Generation (SSG)**
   - All public pages pre-rendered at build time
   - Maximum SEO performance
   - Fastest possible page loads

3. **Serverless Backend**
   - AWS Lambda functions for API operations
   - No server management
   - Auto-scaling

4. **Infrastructure as Code**
   - All AWS resources defined in Terraform
   - Version controlled
   - Reproducible deployments

5. **Local-First Development**
   - LocalStack for AWS service emulation
   - Zero AWS costs during development
   - Same code works locally and in AWS

---

## Technology Stack

### Frontend

- **Framework:** Next.js 14+ (Latest Stable)
  - App Router (not Pages Router)
  - Static Site Generation (SSG) for public pages
  - Server-Side Rendering (SSR) for dynamic content if needed

- **React:** 18+ (Latest Stable)
  - Client components for interactivity
  - Server components for static content

- **Data Fetching:** TanStack Query (React Query) v5+ (Latest Stable)
  - Server state management
  - Caching and synchronization
  - Optimistic updates

- **Styling:** Tailwind CSS (Latest Stable)
  - Utility-first CSS framework
  - Responsive design
  - Dark mode support (if needed)

- **TypeScript:** 5+ (Latest Stable)
  - Type safety
  - Better developer experience

- **Image Optimization:** Next.js Image component
  - Automatic WebP conversion
  - Lazy loading
  - Responsive images

### Backend

- **Runtime:** Node.js 20+ (Latest LTS)
- **Framework:** AWS Lambda (Serverless)
- **API:** RESTful API design
- **Language:** TypeScript 5+ (Latest Stable)
- **Authentication:** AWS Cognito or NextAuth.js
- **File Upload:** Direct S3 uploads (presigned URLs)

### Database

- **Primary:** AWS DynamoDB
  - NoSQL database
  - Serverless
  - Auto-scaling
  - Pay-per-use pricing

### Storage

- **File Storage:** AWS S3
  - Photo storage
  - Thumbnail storage
  - Admin uploads

- **CDN:** AWS CloudFront
  - Global content delivery
  - Image optimization
  - Caching

### Infrastructure

- **Infrastructure as Code:** Terraform (Latest Stable)
- **CI/CD:** GitHub Actions
- **Hosting:** AWS Amplify (Frontend)
- **API Gateway:** AWS API Gateway (for Lambda)

### Development Tools

- **Package Manager:** npm 10+ (Latest Stable)
- **Linting:** ESLint (Latest Stable)
- **Formatting:** Prettier (Latest Stable)
- **Local AWS:** LocalStack (Docker)
- **Version Control:** Git (GitHub)

---

## Project Structure

### Monorepo Structure

```
sgoodie-platform/
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml      # Frontend CI/CD
│       ├── backend-ci.yml        # Backend CI/CD
│       └── terraform-ci.yml      # Terraform CI/CD
├── apps/
│   └── frontend/                 # Next.js Frontend Application
│       ├── app/                  # Next.js App Router
│       ├── components/           # React components
│       ├── lib/                  # Utilities
│       ├── public/               # Static assets
│       ├── package.json
│       └── next.config.js
├── services/
│   └── backend/                  # Lambda Backend Services
│       ├── src/
│       │   ├── handlers/         # Lambda handlers
│       │   ├── utils/             # Utilities
│       │   └── types/            # TypeScript types
│       ├── package.json
│       └── serverless.yml         # Serverless Framework config
├── terraform/                    # Infrastructure as Code
│   ├── modules/                  # Reusable Terraform modules
│   ├── environments/             # Environment-specific configs
│   └── main.tf
├── docs/                         # Documentation
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── PROJECT_OVERVIEW.md
│   ├── SEO_STRATEGY.md
│   └── CI_CD_WORKFLOW.md
├── docker-compose.yml            # LocalStack setup
├── .cursorrules                  # Cursor AI rules
├── .gitignore
├── package.json                  # Root package.json (workspace)
└── README.md
```

### Key Separation Points

1. **Frontend (`apps/frontend/`)**
   - Next.js application
   - Public-facing website
   - Admin dashboard
   - Builds to static files (SSG)

2. **Backend (`services/backend/`)**
   - Lambda functions
   - API endpoints
   - Authentication logic
   - File upload handling

3. **Infrastructure (`terraform/`)**
   - AWS resource definitions
   - Environment configurations
   - Reusable modules

---

## Frontend Architecture

### Next.js App Router Structure

```
apps/frontend/
├── app/
│   ├── (public)/                 # Public route group
│   │   ├── page.tsx              # Home page (SSG)
│   │   ├── about/
│   │   │   └── page.tsx          # About page (SSG)
│   │   ├── work/
│   │   │   ├── interiors/
│   │   │   │   └── page.tsx      # Interiors portfolio (SSG)
│   │   │   ├── travel/
│   │   │   │   └── page.tsx      # Travel portfolio (SSG)
│   │   │   └── brand-marketing/
│   │   │       └── page.tsx      # Brand marketing (SSG)
│   │   └── projects/
│   │       └── [id]/
│   │           └── page.tsx      # Project detail (SSG)
│   ├── (admin)/                  # Admin route group (protected)
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Admin dashboard
│   │   ├── photos/
│   │   │   └── page.tsx          # Photo management
│   │   └── projects/
│   │       └── page.tsx          # Project management
│   ├── api/                      # API routes (Next.js)
│   │   ├── auth/
│   │   ├── photos/
│   │   └── projects/
│   ├── layout.tsx                # Root layout
│   └── providers.tsx             # React Query provider
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── layout/                   # Layout components
│   ├── portfolio/               # Portfolio-specific components
│   └── admin/                    # Admin components
├── lib/
│   ├── api/                      # API client (React Query)
│   ├── aws/                       # AWS SDK clients
│   ├── utils/                     # Utility functions
│   └── constants/                # Constants
└── types/                        # TypeScript types
```

### React Query Integration

**Setup:**
```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Usage Example:**
```typescript
// lib/api/projects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProjects(category?: string) {
  return useQuery({
    queryKey: ['projects', category],
    queryFn: async () => {
      const response = await fetch(`/api/projects${category ? `?category=${category}` : ''}`);
      return response.json();
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateProjectData) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

### Static Site Generation (SSG)

**Home Page:**
```typescript
// app/page.tsx
import { getFeaturedProjects } from '@/lib/api/projects';

export default async function HomePage() {
  const projects = await getFeaturedProjects(); // Fetched at build time
  
  return <HomePageContent projects={projects} />;
}

export const metadata = {
  title: 'S.Goodie Photography',
  description: 'Professional photography services',
};
```

**Portfolio Pages:**
```typescript
// app/work/interiors/page.tsx
import { getProjectsByCategory } from '@/lib/api/projects';

export default async function InteriorsPage() {
  const projects = await getProjectsByCategory('interiors'); // Build time
  
  return <PortfolioGrid projects={projects} />;
}

export async function generateMetadata() {
  return {
    title: 'Interiors Photography | S.Goodie Photography',
    description: 'Professional interiors photography portfolio',
  };
}
```

**Dynamic Routes with SSG:**
```typescript
// app/projects/[id]/page.tsx
import { getAllProjects, getProject } from '@/lib/api/projects';

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map(project => ({ id: project.id }));
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProject(params.id); // Build time
  
  return <ProjectDetails project={project} />;
}
```

### Build Configuration

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For Amplify deployment
  images: {
    domains: ['sgoodie-photos-prod.s3.amazonaws.com'],
    formats: ['image/avif', 'image/webp'],
  },
  // SSG configuration
  experimental: {
    // Enable static optimization
  },
};

module.exports = nextConfig;
```

---

## Backend Architecture

### Lambda Function Structure

```
services/backend/
├── src/
│   ├── handlers/
│   │   ├── projects/
│   │   │   ├── list.ts           # GET /projects
│   │   │   ├── get.ts             # GET /projects/:id
│   │   │   ├── create.ts          # POST /projects
│   │   │   ├── update.ts          # PUT /projects/:id
│   │   │   └── delete.ts          # DELETE /projects/:id
│   │   ├── photos/
│   │   │   ├── upload.ts          # POST /photos/upload
│   │   │   ├── list.ts            # GET /photos
│   │   │   └── delete.ts           # DELETE /photos/:id
│   │   └── auth/
│   │       ├── login.ts            # POST /auth/login
│   │       └── verify.ts           # GET /auth/verify
│   ├── utils/
│   │   ├── dynamodb.ts            # DynamoDB client
│   │   ├── s3.ts                  # S3 client
│   │   ├── auth.ts                # Auth utilities
│   │   └── validation.ts          # Input validation
│   └── types/
│       ├── project.types.ts
│       ├── photo.types.ts
│       └── api.types.ts
├── serverless.yml                 # Serverless Framework
└── package.json
```

### Serverless Framework Configuration

**serverless.yml:**
```yaml
service: sgoodie-backend

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    STAGE: ${self:provider.stage}
    DYNAMODB_TABLE_PROJECTS: ${self:custom.dynamodbTables.projects.${self:provider.stage}}
    S3_BUCKET_PHOTOS: ${self:custom.s3Buckets.photos.${self:provider.stage}}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource:
            - ${self:custom.dynamodbTables.projects.${self:provider.stage}}
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
            - s3:DeleteObject
          Resource:
            - arn:aws:s3:::${self:custom.s3Buckets.photos.${self:provider.stage}}/*

functions:
  listProjects:
    handler: src/handlers/projects/list.handler
    events:
      - http:
          path: projects
          method: get
          cors: true

  getProject:
    handler: src/handlers/projects/get.handler
    events:
      - http:
          path: projects/{id}
          method: get
          cors: true

  createProject:
    handler: src/handlers/projects/create.handler
    events:
      - http:
          path: projects
          method: post
          cors: true
    # Add auth middleware here

custom:
  dynamodbTables:
    projects:
      dev: sgoodie-projects-dev
      prod: sgoodie-projects-prod
  s3Buckets:
    photos:
      dev: sgoodie-photos-dev
      prod: sgoodie-photos-prod
```

### Lambda Handler Example

```typescript
// src/handlers/projects/list.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient } from '../../utils/dynamodb';

const dynamoClient = getDynamoDBClient();
const tableName = process.env.DYNAMODB_TABLE_PROJECTS!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const category = event.queryStringParameters?.category;
    
    const command = new ScanCommand({
      TableName: tableName,
      ...(category && {
        FilterExpression: 'category = :category',
        ExpressionAttributeValues: { ':category': category },
      }),
    });
    
    const result = await dynamoClient.send(command);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    console.error('Error listing projects:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

---

## Database Architecture

### DynamoDB Table Design

**Projects Table:**
```
Table: sgoodie-projects-prod
Partition Key: project_id (String)
Sort Key: None (or created_at if needed)

Attributes:
- project_id: String (UUID)
- category: String (interiors, travel, brand-marketing)
- title: String
- description: String
- photos: List (Array of photo objects)
- order: Number (for sorting)
- created_at: String (ISO 8601)
- updated_at: String (ISO 8601)
- published: Boolean
```

**Photos Table:**
```
Table: sgoodie-photos-prod
Partition Key: photo_id (String)
Sort Key: None

Attributes:
- photo_id: String (UUID)
- project_id: String (UUID)
- s3_key: String
- s3_url: String
- alt_text: String
- order: Number
- created_at: String
```

**Pages Table:**
```
Table: sgoodie-pages-prod
Partition Key: page_id (String)
Sort Key: None

Attributes:
- page_id: String (home, about, personal-branding)
- content: Map (JSON structure)
- photos: List
- updated_at: String
```

**Admin Users Table:**
```
Table: sgoodie-admins-prod
Partition Key: user_id (String)
Sort Key: None

Attributes:
- user_id: String (UUID)
- email: String
- password_hash: String (bcrypt)
- created_at: String
```

### Access Patterns

1. **Get all projects by category**
   - Table: Projects
   - Operation: Scan with FilterExpression
   - Index: GSI on category (if needed for performance)

2. **Get single project**
   - Table: Projects
   - Operation: GetItem
   - Key: project_id

3. **Get photos for project**
   - Table: Photos
   - Operation: Query
   - Index: GSI on project_id

---

## Storage Architecture

### S3 Bucket Structure

```
sgoodie-photos-prod/
├── projects/
│   ├── {project_id}/
│   │   ├── original/
│   │   │   └── {photo_id}.jpg
│   │   └── thumbnails/
│   │       └── {photo_id}_thumb.jpg
├── pages/
│   ├── about/
│   │   └── owner-photo.jpg
│   └── home/
│       └── hero-image.jpg
└── admin/
    └── uploads/
        └── {temp_id}.jpg
```

### S3 Configuration

- **Versioning:** Enabled (for backups)
- **Encryption:** AES-256 (server-side encryption)
- **Lifecycle Rules:**
  - Move old versions to Glacier after 90 days
  - Delete incomplete multipart uploads after 7 days
- **CORS:** Configured for frontend uploads
- **CloudFront:** CDN distribution for fast delivery

---

## Authentication Architecture

### Admin Authentication Flow

1. **Login:**
   - Admin enters email/password
   - Frontend sends to `/api/auth/login`
   - Backend verifies credentials (DynamoDB)
   - Returns JWT token

2. **Token Storage:**
   - JWT stored in HttpOnly cookie (secure)
   - Token expires after 24 hours
   - Refresh token for extended sessions

3. **Protected Routes:**
   - Middleware checks JWT token
   - Validates token signature
   - Extracts user information
   - Allows/denies access

### Implementation Options

**Option 1: NextAuth.js (Recommended)**
- Built-in session management
- JWT support
- Works with Next.js API routes
- Easy to implement

**Option 2: AWS Cognito**
- Managed authentication service
- More features (MFA, social login)
- Higher cost
- More complex setup

**Recommendation:** Start with NextAuth.js, migrate to Cognito if needed.

---

## Deployment Architecture

### Frontend Deployment (AWS Amplify)

**Amplify App Configuration:**
- **Build Settings:** `amplify.yml` in `apps/frontend/`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Base Directory:** `apps/frontend`
- **Watch Path:** `apps/frontend/**/*` (only frontend changes trigger build)

**Build Process:**
1. GitHub push to `main` branch
2. Amplify detects changes in `apps/frontend/`
3. Runs build command
4. Deploys static files to CDN
5. Invalidates CloudFront cache

### Backend Deployment (Serverless Framework)

**Deployment Process:**
1. GitHub push to `main` branch
2. GitHub Actions detects changes in `services/backend/`
3. Runs `serverless deploy`
4. Creates/updates Lambda functions
5. Updates API Gateway

**Separation:**
- Frontend changes in `apps/frontend/` → Only Amplify rebuilds
- Backend changes in `services/backend/` → Only Lambda deploys
- Terraform changes → Only infrastructure updates

---

## CI/CD Architecture

### Branch Strategy

- **`main` branch:** Production-ready code
- **`develop` branch:** Development work

### Workflow

1. **Development:**
   - Work on `develop` branch
   - Push commits to `develop`
   - No automatic deployments

2. **Production Release:**
   - Create PR: `develop` → `main`
   - Review and approve PR
   - Merge to `main`

3. **On Merge to `main`:**
   - **Step 1:** Run Terraform (ensure AWS resources exist)
   - **Step 2:** Deploy Backend (if backend changed)
   - **Step 3:** Deploy Frontend (if frontend changed)

### GitHub Actions Workflows

**See [CI_CD_WORKFLOW.md](./CI_CD_WORKFLOW.md) for detailed workflow documentation.**

---

## Infrastructure Architecture

### Terraform Structure

```
terraform/
├── modules/
│   ├── s3-bucket/
│   ├── dynamodb-table/
│   ├── lambda-function/
│   ├── api-gateway/
│   ├── amplify-app/
│   └── iam-role/
├── environments/
│   ├── dev/
│   └── prod/
└── main.tf
```

### AWS Resources

- **S3 Buckets:** Photo storage
- **DynamoDB Tables:** Database
- **Lambda Functions:** Backend API
- **API Gateway:** API endpoints
- **Amplify Apps:** Frontend hosting
- **CloudFront:** CDN
- **IAM Roles:** Permissions
- **Cognito:** Authentication (if used)

---

## Local Development Architecture

### LocalStack Setup

**Docker Compose:**
```yaml
version: '3.8'
services:
  localstack:
    image: localstack/localstack:latest
    container_name: sgoodie-localstack
    environment:
      SERVICES: s3,dynamodb,lambda
    ports:
      - "4566:4566"
```

### Environment Detection

**AWS SDK clients automatically detect environment:**
- `USE_LOCALSTACK=true` → Use LocalStack
- `USE_LOCALSTACK=false` → Use real AWS

**Same code works in both environments!**

---

## Performance Considerations

### Frontend

- **SSG:** Pre-rendered pages = instant load
- **Image Optimization:** Next.js Image component
- **CDN:** CloudFront for global delivery
- **Caching:** React Query for API responses

### Backend

- **Lambda:** Auto-scaling, pay-per-use
- **DynamoDB:** Single-digit millisecond latency
- **S3:** Direct uploads (presigned URLs)

### Database

- **DynamoDB:** On-demand pricing (no capacity planning)
- **GSI:** Global Secondary Indexes for query patterns
- **Caching:** Consider ElastiCache if needed (future)

---

## Security Architecture

### Frontend Security

- **HTTPS:** Enforced by Amplify
- **CSP:** Content Security Policy headers
- **XSS Protection:** React's built-in escaping
- **CSRF Protection:** SameSite cookies

### Backend Security

- **Authentication:** JWT tokens
- **Authorization:** Role-based access control
- **Input Validation:** Zod schemas
- **Rate Limiting:** API Gateway throttling

### Infrastructure Security

- **IAM:** Least privilege principle
- **Encryption:** S3 and DynamoDB encryption at rest
- **VPC:** Lambda in VPC if needed (future)
- **Secrets:** AWS Secrets Manager

---

## Monitoring & Observability

### Frontend

- **Amplify Monitoring:** Built-in metrics
- **Error Tracking:** Consider Sentry
- **Analytics:** Google Analytics or Amplify Analytics

### Backend

- **CloudWatch Logs:** Lambda function logs
- **CloudWatch Metrics:** Function invocations, errors
- **X-Ray:** Distributed tracing (if needed)

### Database

- **DynamoDB Metrics:** Read/write capacity, throttling
- **CloudWatch Alarms:** Set up alerts

---

## Scalability

### Current Architecture Supports

- **Frontend:** Unlimited (CDN-served static files)
- **Backend:** Auto-scaling Lambda (up to 1000 concurrent)
- **Database:** DynamoDB on-demand (unlimited)
- **Storage:** S3 (unlimited)

### Future Scaling Options

- **Database:** Add ElastiCache for caching
- **CDN:** Already using CloudFront
- **API:** API Gateway throttling and caching
- **Lambda:** Reserved concurrency if needed

---

## Cost Optimization

### Current Estimates

- **Amplify:** $5-10/month (low-medium traffic)
- **Lambda:** $0-2/month (minimal usage)
- **DynamoDB:** $5-10/month (on-demand)
- **S3:** $2-5/month (50-100 GB)
- **CloudFront:** $0-5/month (likely free tier)

**Total:** $12-32/month

### Optimization Strategies

1. **S3 Intelligent-Tiering:** Automatic cost optimization
2. **DynamoDB On-Demand:** Pay per request
3. **CloudFront Caching:** Reduce origin requests
4. **Image Optimization:** Reduce storage costs
5. **Lambda Reserved Concurrency:** Only if needed

---

## Disaster Recovery

### Backups

- **S3:** Versioning enabled
- **DynamoDB:** Point-in-time recovery (enable if needed)
- **Code:** GitHub (version control)

### Recovery Procedures

1. **S3 Data Loss:** Restore from versions
2. **DynamoDB Data Loss:** Point-in-time recovery
3. **Code Issues:** Git revert and redeploy
4. **Infrastructure:** Terraform can recreate everything

---

## Future Enhancements

### Potential Additions

1. **Search:** Algolia or AWS OpenSearch
2. **Analytics:** Enhanced tracking
3. **Caching:** ElastiCache for frequently accessed data
4. **Monitoring:** Enhanced observability
5. **Testing:** E2E tests with Playwright
6. **Performance:** Further optimization

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-16  
**Maintained By:** Development Team
