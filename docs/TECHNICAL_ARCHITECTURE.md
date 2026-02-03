# Technical Architecture - S.Goodie Photography Platform

**Last Updated:** 2026-02-03  
**Version:** 1.1

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

**Updated Architecture (Recommended)**
- Single Next.js app (public + admin + Route Handlers)
- AWS Amplify Hosting with SSR/ISR
- S3 + CloudFront for image delivery
- DynamoDB for content data
- Optional Lambda for heavy image processing (S3 event)

### Architecture Principles

1. **Single App, Clear Boundaries**
   - One Next.js deployable for public pages, admin UI, and API
   - Route groups keep public and admin code separated

2. **SSG + ISR**
   - Public pages pre-rendered at build time
   - On-demand revalidation for content updates
   - Maximum SEO performance with fresh content

3. **Built-In Backend**
   - Next.js Route Handlers for admin CRUD and uploads
   - Optional Lambda only for heavy async image processing

4. **Infrastructure as Code**
   - All AWS resources defined in Terraform
   - Version controlled
   - Reproducible deployments

5. **Local-First + Staging Parity**
   - LocalStack for S3/DynamoDB emulation
   - Early staging check for auth and image delivery parity

---

## Technology Stack

### Frontend

- **Framework:** Next.js 14+ (Latest Stable)
  - App Router (not Pages Router)
  - Static Site Generation (SSG) + ISR for public pages
  - Server-Side Rendering (SSR) only when truly required

- **React:** 18+ (Latest Stable)
  - Client components for interactivity
  - Server components for static content

- **Data Fetching:** Server Components + cached `fetch` for public pages
- **Admin Data Fetching:** TanStack Query (React Query) v5+ for dashboard UI

- **Styling:** Tailwind CSS (Latest Stable)
  - Utility-first CSS framework
  - Responsive design
  - Dark mode support (if needed)

- **TypeScript:** 5+ (Latest Stable)
  - Type safety
  - Better developer experience

- **Image Optimization:** Pre-generated variants + CDN delivery
  - Automatic WebP conversion
  - Lazy loading
  - Responsive images

### Backend

- **Runtime:** Node.js 20+ (Latest LTS)
- **Framework:** Next.js Route Handlers (App Router)
- **API:** REST/JSON endpoints via Route Handlers
- **Language:** TypeScript 5+ (Latest Stable)
- **Authentication:** NextAuth.js (Credentials), Cognito optional later
- **File Upload:** Direct S3 uploads (presigned URLs)
- **Async Processing:** Optional Lambda for heavy image processing

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
- **Hosting:** AWS Amplify Hosting (Next.js SSR/ISR)

### Development Tools

- **Package Manager:** npm 10+ (Latest Stable)
- **Linting:** ESLint (Latest Stable)
- **Formatting:** Prettier (Latest Stable)
- **Local AWS:** LocalStack (Docker)
- **Version Control:** Git (GitHub)

---

## Project Structure

### Recommended Structure (Single App)

```
sgoodie-platform/
  app/                    # Next.js App Router (public + admin + API)
  components/             # UI and layout components
  lib/                    # Data access, auth, AWS clients
  public/                 # Static assets
  scripts/                # LocalStack setup and utilities
  terraform/              # Infrastructure as Code
  docs/                   # Documentation
  docker-compose.yml      # LocalStack setup
  package.json
  README.md
```

### Legacy Monorepo Structure (Not Recommended)

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

### Key Separation Points (Recommended)

1. **Web App (`app/`)**
   - Public website (SSG + ISR)
   - Admin dashboard (client-side)
   - API Route Handlers (admin CRUD, uploads, revalidation)

2. **Infrastructure (`terraform/`)**
   - AWS resource definitions
   - Environment configurations
   - Reusable modules

---

## Frontend Architecture

### Next.js App Router Structure

**Note:** In the recommended single-app structure, the App Router lives at `app/` in the repo root. The tree below is illustrative.

```
app/
  (public)/                 # Public route group
    page.tsx                # Home page (SSG + ISR)
    about/
    work/
      interiors/
      travel/
      brand-marketing/
    projects/[id]/          # Project detail (SSG)
  (admin)/                  # Admin route group (protected)
    admin/                  # Admin URL prefix to avoid public route collisions
      login/
      dashboard/
      photos/
      projects/
  api/                      # Route Handlers
    auth/
    projects/
    photos/
    admin/revalidate/
  layout.tsx
  providers.tsx
components/
lib/
types/
```


### React Query Integration

**Note:** Use React Query for admin/dashboard UI only. Public pages use server components and cached `fetch`.

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

### On-Demand Revalidation (ISR)

**Trigger revalidation after admin updates:**
```typescript
// app/api/admin/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { paths, tags } = await request.json();

  (paths || []).forEach((path: string) => revalidatePath(path));
  (tags || []).forEach((tag: string) => revalidateTag(tag));

  return Response.json({ revalidated: true });
}
```

**Tag data fetches for targeted revalidation:**
```typescript
// lib/api/projects.ts
export async function getProjectsByCategory(category: string) {
  const res = await fetch(`${process.env.API_BASE_URL}/projects?category=${category}`, {
    next: { tags: [`projects:${category}`] },
  });
  return res.json();
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

### Route Handler Structure (Recommended)

```
app/api/
  auth/                     # NextAuth routes
  projects/                 # Admin CRUD for projects
  photos/                   # Presigned upload + metadata
  admin/revalidate/         # On-demand ISR revalidation
```

### Route Handler Example (Recommended)

```typescript
// app/api/projects/route.ts
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/aws/dynamodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  if (!category) {
    return Response.json({ error: 'category is required' }, { status: 400 });
  }

  const result = await db.send(
    new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE_PROJECTS!,
      IndexName: 'gsi_category_order',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: { ':category': category },
    })
  );

  return Response.json(result.Items ?? []);
}
```

### Legacy Lambda Function Structure (Not Recommended)

#### Legacy Lambda Function Structure Details

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

#### Legacy Serverless Framework Configuration Details

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

#### Legacy Lambda Handler Example

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
Sort Key: None

Attributes:
- project_id: String (UUID)
- category: String (interiors, travel, brand-marketing)
- title: String
- description: String
- order: Number (for sorting)
- cover_photo_id: String
- created_at: String (ISO 8601)
- updated_at: String (ISO 8601)
- published: Boolean

GSI: gsi_category_order
- GSI Partition Key: category
- GSI Sort Key: order
```

**Photos Table:**
```
Table: sgoodie-photos-prod
Partition Key: project_id (String)
Sort Key: order#photo_id (String)

Attributes:
- project_id: String (UUID)
- photo_id: String (UUID)
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
   - Operation: Query on GSI `gsi_category_order`
   - Index: category (PK) + order (SK)

2. **Get single project**
   - Table: Projects
   - Operation: GetItem
   - Key: project_id

3. **Get photos for project**
   - Table: Photos
   - Operation: Query
   - Key: project_id (PK)

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

**Image Variants (Recommended):**
- Store pre-generated sizes under `projects/{project_id}/variants/{photo_id}/{width}.jpg`
- Include AVIF/WebP/JPEG for responsive delivery

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
   - NextAuth Credentials provider verifies against DynamoDB
   - Session created automatically

2. **Token Storage:**
   - Secure, HttpOnly session cookies (NextAuth)
   - Session duration configured in NextAuth

3. **Protected Routes:**
   - Middleware checks NextAuth session
   - Redirects unauthenticated users to login

### Implementation Options

**Option 1: NextAuth.js (Recommended)**
- Built-in session management
- Credentials provider for single-admin login
- Works with Next.js Route Handlers
- Easy to implement

**Option 2: AWS Cognito**
- Managed authentication service
- More features (MFA, social login)
- Higher cost
- More complex setup

**Recommendation:** Start with NextAuth.js, migrate to Cognito if needed.

---

## Deployment Architecture

### Application Deployment (AWS Amplify Hosting)

**Amplify App Configuration:**
- **Build Settings:** `amplify.yml` in repo root
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Base Directory:** `.`
- **Watch Path:** `app/**/*`, `components/**/*`, `lib/**/*`

**Build Process:**
1. GitHub push to `main` branch
2. Amplify detects changes in app code
3. Runs build command
4. Deploys app (public pages + admin UI + Route Handlers)
5. Invalidates CloudFront cache

**Single Deploy:** UI and API update together in the same build

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
   - **Step 1:** Run Terraform (if infrastructure changed)
   - **Step 2:** Deploy App (Amplify build)

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

**Note:** In the recommended architecture, the `api-gateway` module is not required. The `lambda-function` module is optional and only used for async image processing.

### AWS Resources

- **S3 Buckets:** Photo storage
- **DynamoDB Tables:** Database
- **Lambda Functions:** Optional async image processing
- **Amplify Apps:** App hosting (SSR/ISR)
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
      SERVICES: s3,dynamodb
    ports:
      - "4566:4566"
```

### Environment Detection

**AWS SDK clients automatically detect environment:**
- `USE_LOCALSTACK=true` -> Use LocalStack
- `USE_LOCALSTACK=false` -> Use real AWS

**Same code works in both environments!**

**Staging Parity Check (Recommended):**
- Validate auth and image delivery in a small staging stack
- LocalStack does not fully emulate Cognito/CloudFront/Amplify behavior

---

## Performance Considerations

### Frontend

- **SSG + ISR:** Pre-rendered pages with on-demand freshness
- **Image Optimization:** Pre-generated variants + CDN delivery
- **CDN:** CloudFront for global delivery
- **Caching:** React Query for admin API responses

### Backend

- **Route Handlers:** Auto-scaling via Amplify Hosting
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

- **Authentication:** NextAuth sessions (HttpOnly cookies)
- **Authorization:** Admin-only route protection
- **Input Validation:** Zod schemas
- **Rate Limiting:** Middleware or AWS WAF/CloudFront

### Infrastructure Security

- **IAM:** Least privilege principle
- **Encryption:** S3 and DynamoDB encryption at rest
- **VPC:** Lambda in VPC if used (optional)
- **Secrets:** AWS Secrets Manager

---

## Monitoring & Observability

### Frontend

- **Amplify Monitoring:** Built-in metrics
- **Error Tracking:** Consider Sentry
- **Analytics:** Google Analytics or Amplify Analytics

### Backend

- **Amplify Logs:** App server logs and build logs
- **CloudWatch Metrics:** For Lambda if async processing is enabled
- **X-Ray:** Distributed tracing (if needed)

### Database

- **DynamoDB Metrics:** Read/write capacity, throttling
- **CloudWatch Alarms:** Set up alerts

---

## Scalability

### Current Architecture Supports

- **Frontend:** Unlimited (CDN-served static files)
- **Backend:** Auto-scaling Route Handlers via Amplify
- **Database:** DynamoDB on-demand (unlimited)
- **Storage:** S3 (unlimited)

### Future Scaling Options

- **Database:** Add ElastiCache for caching
- **CDN:** Already using CloudFront
- **API:** App-level caching and rate limiting
- **Lambda:** Reserved concurrency if async processing is enabled

---

## Cost Optimization

### Current Estimates

- **Amplify:** $5-10/month (low-medium traffic)
- **Lambda:** $0-2/month (optional image processing)
- **DynamoDB:** $5-10/month (on-demand)
- **S3:** $2-5/month (50-100 GB)
- **CloudFront:** $0-5/month (likely free tier)

**Total:** $12-32/month

### Optimization Strategies

1. **S3 Intelligent-Tiering:** Automatic cost optimization
2. **DynamoDB On-Demand:** Pay per request
3. **CloudFront Caching:** Reduce origin requests
4. **Image Optimization:** Reduce storage costs
5. **Lambda Reserved Concurrency:** Only if async processing is enabled

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
