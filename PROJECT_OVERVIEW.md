# S.Goodie Photography Platform - Project Overview

**Repository:** `sgoodie-platform`  
**Created:** 2025-01-16  
**Status:** Planning Phase

---

## 1. Migration Purpose & Goals

### Current State
- **Platform:** WordPress website hosted on Bluehost
- **Issues:**
  - Slow page load times
  - High hosting costs
  - Limited customization and control
  - Poor performance for image-heavy portfolio site

### Migration Goals
1. **Performance:** Dramatically improve page load speeds through modern web technologies and CDN
2. **Cost Reduction:** Move from expensive Bluehost hosting to cost-effective AWS infrastructure
3. **Modern Architecture:** Build on Next.js/React for seamless frontend/backend integration
4. **Scalability:** Infrastructure that can grow with the business
5. **Control:** Full control over design, functionality, and content management
6. **Design Refresh:** Complete redesign inspired by modern photography portfolio sites

### Success Metrics
- Page load time < 2 seconds (vs current slow performance)
- Monthly hosting costs reduced by 50%+ compared to Bluehost
- Improved SEO and user experience
- Easy content management for site owner

---

## 2. Project Intent & Vision

### Business Context
S.Goodie Photography is a professional photography business specializing in:
- **Interiors Photography** (home & garden, restaurant, hotel sub-categories)
- **Travel Photography**
- **Brand Marketing Photography**
- **Personal Branding Packages**

### Website Purpose
The website serves as a digital art gallery showcasing the photographer's work. It needs to:
- Display high-quality photography portfolios
- Allow visitors to browse by category
- Showcase individual projects with detailed views
- Present professional branding and about information
- Enable easy content management for the site owner

### Design Inspiration
The new design will be inspired by modern photography portfolio sites:
- **Home Page:** Clean, minimal design similar to [jennverrier.com](https://www.jennverrier.com/)
- **Menu Structure:** Split portfolio into Interiors (home & garden, restaurant, hotel), Travel, and Brand Marketing
- **Portfolio Pages:** Grid-based layout similar to [jennverrier.com/architectural-photography-portfolio](https://www.jennverrier.com/architectural-photography-portfolio)
- **Personal Branding:** Package presentation similar to [allegraanderson.com/personal-branding-packages](https://allegraanderson.com/personal-branding-packages)
- **Project Detail Pages:** Immersive, full-screen experience similar to [drewkelly.com/#/tenakeetime/](https://drewkelly.com/#/tenakeetime/)

---

## 3. Technical Architecture

### Frontend Stack
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** React 18+
- **Styling:** Tailwind CSS (for rapid, responsive design)
- **Image Optimization:** Next.js Image component with AWS CloudFront CDN
- **State Management:** React Context API or Zustand (for admin state)

### Backend Stack
- **API:** Next.js API Routes (for simple operations)
- **Serverless Functions:** AWS Lambda (for complex operations, if needed)
- **Authentication:** AWS Cognito or NextAuth.js (for admin login)
- **File Storage:** AWS S3 (for photo storage)
- **Database:** 
  - **Option 1:** DynamoDB (NoSQL, serverless, pay-per-use) - **Recommended for cost**
  - **Option 2:** PostgreSQL on RDS (more features, higher cost)
  - **Option 3:** AWS Amplify DataStore (simplified, but may have limitations)

### Infrastructure
- **Hosting:** AWS Amplify (frontend + API routes)
- **CDN:** CloudFront (via Amplify)
- **Infrastructure as Code:** Terraform (reusable modules)
- **CI/CD:** AWS Amplify (automatic deployments from GitHub)

### Data Storage Strategy

#### Recommended: DynamoDB + S3
**Why DynamoDB:**
- **Cost-Effective:** Pay only for what you use (read/write units)
- **Serverless:** No server management, auto-scaling
- **Fast:** Single-digit millisecond latency
- **Simple Schema:** Perfect for portfolio data (photos, projects, pages, settings)

**Data Structure:**
```
- Projects Table: project_id, category, title, description, photos[], order, created_at
- Photos Table: photo_id, project_id, url (S3), alt_text, order, created_at
- Pages Table: page_id, page_type, content (JSON), photos[], updated_at
- Settings Table: setting_key, setting_value (JSON)
- Admin Users Table: user_id, email, password_hash, created_at
```

**S3 Buckets:**
- `sgoodie-photos-prod` - Production photos
- `sgoodie-photos-thumbnails` - Optimized thumbnails
- `sgoodie-admin-uploads` - Temporary uploads before processing

**Cost Estimate (DynamoDB):**
- Free tier: 25 GB storage, 25 read/write units
- Estimated monthly: $5-15 (depending on traffic)
- Much cheaper than RDS for this use case

---

## 4. Terraform Infrastructure as Code

### Philosophy: Reusability First
All Terraform modules will be designed for maximum reusability. We'll create modules that can be instantiated multiple times with different parameters (names, configurations, etc.).

### Module Structure
```
terraform/
├── modules/
│   ├── amplify-app/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── s3-bucket/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── dynamodb-table/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── lambda-function/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── cognito-user-pool/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   └── iam-role/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── README.md
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
├── main.tf (root module)
├── variables.tf
├── outputs.tf
└── README.md
```

### Reusable Module Example: S3 Bucket
```hcl
# terraform/modules/s3-bucket/main.tf
module "photo_storage" {
  source = "../../modules/s3-bucket"
  
  bucket_name = "sgoodie-photos-prod"
  environment = "prod"
  enable_versioning = true
  enable_encryption = true
  lifecycle_rules = [
    {
      id = "delete-old-versions"
      enabled = true
      expiration_days = 90
    }
  ]
}

module "thumbnail_storage" {
  source = "../../modules/s3-bucket"
  
  bucket_name = "sgoodie-photos-thumbnails-prod"
  environment = "prod"
  enable_versioning = false
  enable_encryption = true
}
```

### Module Principles
1. **Parameterized:** All configurable values passed as variables
2. **Documented:** Each module has README with usage examples
3. **Idempotent:** Can be run multiple times safely
4. **Environment-Aware:** Supports dev/staging/prod with different configs
5. **Output-Driven:** Modules expose outputs for other modules to use

---

## 5. Feature Requirements

### Public-Facing Features

#### Home Page
- Hero section with featured photography
- Navigation menu: Work (Interiors, Travel, Brand Marketing), About, Contact
- Clean, minimal design inspired by jennverrier.com
- Fast loading with optimized images

#### Portfolio Pages
- **Interiors Portfolio:**
  - Sub-categories: Home & Garden, Restaurant, Hotel
  - Grid-based photo layout
  - Click to view project details
- **Travel Portfolio:**
  - Grid-based photo layout
  - Click to view project details
- **Brand Marketing Portfolio:**
  - Grid-based photo layout
  - Click to view project details

#### Project Detail Pages
- Full-screen photo experience
- Navigation between photos in project
- Project information (title, description, location, etc.)
- Similar to drewkelly.com project pages

#### About Page
- Owner photo (editable by admin)
- Biography/content (editable by admin)
- Professional information

#### Personal Branding Page
- Package offerings
- Pricing information (if applicable)
- Similar to allegraanderson.com personal branding packages

### Admin Features (Authenticated)

#### Authentication
- Single admin user login (site owner)
- Secure password-based authentication
- Session management

#### Photo Management
- **Upload Photos:**
  - Drag-and-drop interface
  - Multiple file upload
  - Automatic thumbnail generation
  - Image optimization
- **Organize Photos:**
  - Drag-and-drop to reorder photos
  - Assign photos to projects/categories
  - Delete photos
- **Photo Positioning:**
  - Visual drag-and-drop interface
  - Save position/order
  - Preview changes before publishing

#### Content Management
- **Page Content Editing:**
  - Edit text content on any page
  - Rich text editor for formatting
  - Save drafts vs. publish
- **Project Management:**
  - Create/edit/delete projects
  - Assign photos to projects
  - Set project metadata (title, description, category)
  - Reorder projects within categories
- **About Page Management:**
  - Upload/edit owner photo
  - Edit biography text
  - Update contact information

#### Admin Dashboard
- Overview of site statistics
- Quick access to common tasks
- Recent uploads/edits

---

## 6. Development Workflow

### Phase 1: Infrastructure Setup (Week 1)
1. **Terraform Modules Creation**
   - Create reusable modules for all AWS resources
   - S3 bucket module
   - DynamoDB table module
   - Amplify app module
   - Cognito user pool module
   - Lambda function module (if needed)
   - IAM roles module

2. **Environment Configuration**
   - Set up dev environment
   - Set up staging environment
   - Set up prod environment
   - Configure Terraform state management (S3 backend)

3. **Initial Infrastructure Deployment**
   - Deploy dev environment
   - Verify all resources created correctly
   - Test connectivity and permissions

### Phase 2: Next.js Application Setup (Week 1-2)
1. **Project Initialization**
   - Initialize Next.js 14+ with App Router
   - Configure TypeScript
   - Set up Tailwind CSS
   - Configure ESLint/Prettier

2. **Project Structure**
   ```
   sgoodie-platform/
   ├── app/                    # Next.js App Router
   │   ├── (public)/           # Public routes
   │   │   ├── page.tsx       # Home page
   │   │   ├── about/
   │   │   ├── work/
   │   │   │   ├── interiors/
   │   │   │   ├── travel/
   │   │   │   └── brand-marketing/
   │   │   └── projects/[id]/
   │   ├── (admin)/            # Admin routes (protected)
   │   │   ├── login/
   │   │   ├── dashboard/
   │   │   ├── photos/
   │   │   ├── projects/
   │   │   └── pages/
   │   └── api/                # API routes
   │       ├── auth/
   │       ├── photos/
   │       ├── projects/
   │       └── pages/
   ├── components/
   │   ├── ui/                 # Reusable UI components
   │   ├── layout/             # Layout components
   │   ├── portfolio/         # Portfolio-specific components
   │   └── admin/              # Admin components
   ├── lib/
   │   ├── aws/                # AWS SDK clients
   │   ├── db/                 # Database utilities
   │   ├── auth/               # Authentication utilities
   │   └── utils/              # General utilities
   ├── types/                  # TypeScript types
   ├── terraform/              # Infrastructure as Code
   └── public/                 # Static assets
   ```

3. **AWS Integration**
   - Set up AWS SDK clients
   - Configure S3 upload/download
   - Set up DynamoDB client
   - Configure Cognito authentication

### Phase 3: Core Features Development (Week 2-4)
1. **Public Pages**
   - Home page with hero and navigation
   - Portfolio category pages
   - Project detail pages
   - About page
   - Personal branding page

2. **Image Optimization**
   - Next.js Image component integration
   - CloudFront CDN setup
   - Thumbnail generation pipeline
   - Lazy loading implementation

3. **Database Schema**
   - DynamoDB table creation
   - Data access layer (DAOs)
   - Type definitions

### Phase 4: Admin Features (Week 4-6)
1. **Authentication**
   - Login page
   - Session management
   - Protected routes middleware

2. **Photo Management**
   - Upload interface
   - Photo gallery view
   - Drag-and-drop reordering
   - Delete functionality

3. **Content Management**
   - Page content editor
   - Project management interface
   - About page editor

4. **Admin Dashboard**
   - Overview page
   - Navigation
   - Quick actions

### Phase 5: Design & Polish (Week 6-7)
1. **Design Implementation**
   - Implement design inspired by reference sites
   - Responsive design (mobile, tablet, desktop)
   - Animation and transitions
   - Image loading states

2. **Performance Optimization**
   - Image optimization
   - Code splitting
   - Caching strategies
   - CDN configuration

3. **SEO Optimization**
   - Meta tags
   - Open Graph tags
   - Sitemap generation
   - Structured data

### Phase 6: Testing & Deployment (Week 7-8)
1. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests (critical flows)
   - Performance testing

2. **Staging Deployment**
   - Deploy to staging environment
   - Client review and feedback
   - Bug fixes

3. **Production Deployment**
   - Final production deployment
   - DNS configuration
   - SSL certificate setup
   - Monitoring setup

4. **Migration**
   - Export content from WordPress (if needed)
   - Import to new system
   - Redirect old URLs to new site

---

## 7. Cost Optimization Strategy

### Current Costs (Bluehost)
- Estimated: $10-20/month for hosting
- Additional costs for plugins, themes, etc.

### AWS Cost Breakdown (Estimated)

#### AWS Amplify
- **Free Tier:** 1,000 build minutes/month, 15 GB storage, 5 GB served/month
- **Paid:** ~$0.01 per build minute, $0.15/GB storage, $0.15/GB served
- **Estimated Monthly:** $5-10 (for low-medium traffic)

#### S3 Storage
- **Free Tier:** 5 GB storage, 20,000 GET requests, 2,000 PUT requests
- **Paid:** $0.023/GB storage, $0.0004/1,000 GET requests
- **Estimated Monthly:** $2-5 (for ~50-100 GB of photos)

#### DynamoDB
- **Free Tier:** 25 GB storage, 25 read/write units
- **Paid:** $0.25/GB storage, $0.00025/read unit, $0.00125/write unit
- **Estimated Monthly:** $5-10 (for low-medium traffic)

#### CloudFront CDN
- **Free Tier:** 1 TB data transfer out, 10,000,000 HTTP/HTTPS requests
- **Paid:** $0.085/GB after free tier
- **Estimated Monthly:** $0-5 (likely within free tier for small-medium sites)

#### Lambda (if used)
- **Free Tier:** 1M requests, 400,000 GB-seconds
- **Paid:** $0.20 per 1M requests, $0.0000166667/GB-second
- **Estimated Monthly:** $0-2 (if used minimally)

#### Cognito
- **Free Tier:** 50,000 MAUs (Monthly Active Users)
- **Paid:** $0.0055/MAU after free tier
- **Estimated Monthly:** $0 (single admin user)

### Total Estimated Monthly Cost
- **Low Traffic:** $12-22/month
- **Medium Traffic:** $20-35/month
- **High Traffic:** $40-60/month

### Cost Savings
- **Compared to Bluehost:** Similar or lower cost with much better performance
- **Scalability:** Pay only for what you use
- **No Lock-in:** Easy to optimize costs as traffic grows

### Cost Optimization Tips
1. Use S3 Intelligent-Tiering for photos (automatic cost optimization)
2. Enable CloudFront caching (reduce origin requests)
3. Use DynamoDB On-Demand pricing (pay per request, no capacity planning)
4. Optimize images before upload (reduce storage costs)
5. Use AWS Free Tier wherever possible
6. Monitor costs with AWS Cost Explorer

---

## 8. Technical Decisions & Rationale

### Why Next.js?
- **SSR/SSG:** Better SEO and performance
- **API Routes:** Built-in backend capabilities
- **Image Optimization:** Built-in image optimization
- **React Ecosystem:** Large community and resources
- **AWS Amplify Support:** Native Next.js support

### Why AWS Amplify?
- **Easy Deployment:** Automatic deployments from GitHub
- **Built-in CDN:** CloudFront integration
- **SSL Certificates:** Automatic SSL management
- **Environment Management:** Dev/staging/prod environments
- **Cost-Effective:** Pay only for what you use

### Why DynamoDB over RDS?
- **Cost:** Much cheaper for this use case
- **Simplicity:** No server management
- **Performance:** Fast, consistent performance
- **Scalability:** Auto-scaling
- **Schema Flexibility:** Easy to evolve schema

### Why Terraform?
- **Infrastructure as Code:** Version control for infrastructure
- **Reusability:** Create modules once, use everywhere
- **Consistency:** Same infrastructure across environments
- **Documentation:** Self-documenting infrastructure
- **Collaboration:** Team can review infrastructure changes

### Why S3 for Photos?
- **Cost-Effective:** Very cheap storage
- **Scalability:** Unlimited storage
- **CDN Integration:** Works seamlessly with CloudFront
- **Durability:** 99.999999999% (11 9's) durability
- **Versioning:** Can enable versioning for backups

---

## 9. Security Considerations

### Authentication
- Secure password hashing (bcrypt)
- JWT tokens for session management
- HTTPS only (enforced by Amplify)
- Rate limiting on login endpoints

### Data Protection
- S3 bucket encryption at rest
- DynamoDB encryption at rest
- Secure API endpoints (authentication required)
- Input validation and sanitization

### Access Control
- IAM roles with least privilege
- S3 bucket policies (admin-only write access)
- DynamoDB access via IAM roles
- Admin routes protected by authentication middleware

---

## 10. Monitoring & Maintenance

### Monitoring
- AWS CloudWatch for logs and metrics
- Amplify build notifications
- Error tracking (consider Sentry)
- Performance monitoring

### Maintenance Tasks
- Regular backups (S3 versioning, DynamoDB backups)
- Security updates (dependencies, AWS services)
- Cost monitoring (AWS Cost Explorer)
- Performance optimization (image optimization, caching)

---

## 11. Success Criteria

### Performance
- ✅ Page load time < 2 seconds
- ✅ Lighthouse score > 90
- ✅ Image optimization (WebP format, lazy loading)
- ✅ CDN caching working correctly

### Cost
- ✅ Monthly costs < $30 (for low-medium traffic)
- ✅ Cost monitoring in place
- ✅ Cost optimization strategies implemented

### Functionality
- ✅ All public pages working correctly
- ✅ Admin can upload/manage photos
- ✅ Admin can edit content
- ✅ Photo positioning/drag-and-drop working
- ✅ Responsive design on all devices

### User Experience
- ✅ Modern, clean design
- ✅ Fast, smooth navigation
- ✅ Professional presentation
- ✅ Easy content management for admin

---

## 12. Next Steps

1. **Review this document** with stakeholders
2. **Set up Terraform modules** (start with S3 and DynamoDB)
3. **Initialize Next.js project** with proper structure
4. **Create development environment** using Terraform
5. **Begin Phase 1 development** (public pages)

---

## 13. References

### Design Inspiration
- [Jenn Verrier Photography](https://www.jennverrier.com/) - Home page and menu structure
- [Jenn Verrier - Architectural Portfolio](https://www.jennverrier.com/architectural-photography-portfolio) - Portfolio page layout
- [Allegra Anderson - Personal Branding](https://allegraanderson.com/personal-branding-packages) - Personal branding page
- [Drew Kelly - Project Detail](https://drewkelly.com/#/tenakeetime/) - Project detail page experience

### Technical Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-16  
**Author:** Development Team
