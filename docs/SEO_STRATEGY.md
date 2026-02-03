# SEO Strategy: SPA vs Server-Side Rendering

**For S.Goodie Photography Portfolio Website**

---

## Quick Answer: Server-Side is MUCH Better for SEO

**SPAs have WORSE SEO, not better.** For a public business website, we should use **Next.js with Static Site Generation (SSG)** or **Server-Side Rendering (SSR)**.

---

## SEO Comparison

### ❌ SPA (Single Page Application) - Poor SEO

**How SPAs Work:**
- Initial HTML is minimal/empty
- JavaScript must execute to render content
- Content is loaded dynamically via API calls
- All routing happens client-side

**SEO Problems:**
1. **Search engines see empty HTML initially**
   - Google has to execute JavaScript to see content
   - Slower indexing
   - May miss content if JavaScript fails

2. **Social media sharing doesn't work well**
   - Open Graph meta tags aren't in initial HTML
   - Facebook/Twitter see empty pages
   - No preview images when sharing links

3. **Slower initial page load**
   - Users see blank page while JavaScript loads
   - Poor user experience = lower SEO rankings

4. **Limited crawlability**
   - Some search engines don't execute JavaScript well
   - Older crawlers can't see content at all

### ✅ Server-Side Rendering (SSR/SSG) - Excellent SEO

**How SSR/SSG Works:**
- Full HTML content in initial response
- Content is pre-rendered (SSG) or rendered on server (SSR)
- Search engines see complete content immediately
- Meta tags, structured data all in HTML

**SEO Benefits:**
1. **Immediate content visibility**
   - Search engines see full HTML immediately
   - No JavaScript execution needed
   - Faster indexing

2. **Perfect social media sharing**
   - Open Graph tags in HTML
   - Preview images work perfectly
   - Rich previews on Facebook, Twitter, LinkedIn

3. **Better performance**
   - Faster initial page load
   - Better user experience = higher SEO rankings
   - Lower bounce rate

4. **Universal crawlability**
   - Works with all search engines
   - Works even if JavaScript is disabled
   - Better accessibility

---

## Recommended Approach: Next.js with SSG (Static Site Generation)

For a photography portfolio website, **SSG is the best choice**:

### Why SSG for This Project?

1. **Most content is static**
   - Portfolio pages don't change frequently
   - About page is mostly static
   - Project pages are static once created

2. **Best SEO performance**
   - Pre-rendered HTML at build time
   - Fastest possible page loads
   - Perfect for search engines

3. **Cost-effective**
   - Static files served from CDN
   - No server compute costs
   - AWS Amplify serves static files very cheaply

4. **When content updates**
   - Admin uploads new photos → Rebuild site
   - Admin edits content → Rebuild site
   - Rebuilds are fast (minutes) and happen automatically

### Next.js Rendering Modes

**Next.js App Router supports:**

1. **Static Site Generation (SSG)** - ✅ **RECOMMENDED**
   ```typescript
   // app/page.tsx
   export default async function HomePage() {
     const projects = await getProjects(); // Fetch at build time
     return <Portfolio projects={projects} />;
   }
   ```
   - Pre-renders at build time
   - Perfect HTML for SEO
   - Fastest performance
   - Works perfectly with AWS Amplify

2. **Server-Side Rendering (SSR)** - Use for dynamic content
   ```typescript
   // app/projects/[id]/page.tsx
   export default async function ProjectPage({ params }) {
     const project = await getProject(params.id); // Fetch on each request
     return <ProjectDetails project={project} />;
   }
   ```
   - Renders on each request
   - Good for frequently changing content
   - Still excellent SEO (full HTML)

3. **Client-Side Rendering (SPA)** - ❌ **NOT RECOMMENDED**
   ```typescript
   'use client';
   export default function Page() {
     const [data, setData] = useState(null);
     useEffect(() => {
       fetch('/api/data').then(setData); // Client-side only
     }, []);
   }
   ```
   - Only use for admin dashboard (not public pages)
   - Poor SEO

---

## Implementation Strategy

### Public Pages: Use SSG

**All public-facing pages should use Static Site Generation:**

```typescript
// app/page.tsx - Home page
export default async function HomePage() {
  const featuredProjects = await getFeaturedProjects(); // Build time
  return <HomePageContent projects={featuredProjects} />;
}

// app/work/interiors/page.tsx - Portfolio category
export default async function InteriorsPage() {
  const projects = await getProjectsByCategory('interiors'); // Build time
  return <PortfolioGrid projects={projects} />;
}

// app/projects/[id]/page.tsx - Project detail
export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map(project => ({ id: project.id }));
}

export default async function ProjectPage({ params }) {
  const project = await getProject(params.id); // Build time
  return <ProjectDetails project={project} />;
}
```

### Admin Pages: Can Use Client-Side

**Admin dashboard can use client-side rendering (not public, so SEO doesn't matter):**

```typescript
// app/admin/dashboard/page.tsx
'use client';
export default function AdminDashboard() {
  // Client-side rendering is fine for admin
  // Not indexed by search engines anyway
}
```

### API Routes: For Dynamic Operations

**Use API routes for admin operations:**

```typescript
// app/api/projects/route.ts
export async function POST(request: Request) {
  // Handle photo uploads, content updates
  // These trigger site rebuild
}
```

---

## AWS Amplify Support

**AWS Amplify fully supports Next.js SSG and SSR:**

### Static Site Generation (SSG)
- ✅ Pre-renders at build time
- ✅ Serves static files from CDN
- ✅ Automatic rebuilds on content changes
- ✅ Perfect for portfolio sites

### Server-Side Rendering (SSR)
- ✅ Renders on each request
- ✅ Supports dynamic content
- ✅ Still excellent SEO
- ✅ Works with API routes

### Build Configuration

**amplify.yml:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

**Next.js automatically:**
- Detects SSG vs SSR
- Pre-renders static pages at build time
- Sets up API routes
- Optimizes images
- Generates sitemap

---

## SEO Best Practices We'll Implement

### 1. Meta Tags (SSG makes this easy)
```typescript
// app/layout.tsx
export const metadata = {
  title: 'S.Goodie Photography | Professional Photography Services',
  description: 'Professional photography specializing in interiors, travel, and brand marketing.',
  openGraph: {
    title: 'S.Goodie Photography',
    description: 'Professional photography services',
    images: ['/og-image.jpg'],
  },
};

// app/projects/[id]/page.tsx
export async function generateMetadata({ params }) {
  const project = await getProject(params.id);
  return {
    title: `${project.title} | S.Goodie Photography`,
    description: project.description,
    openGraph: {
      images: [project.featuredImage],
    },
  };
}
```

### 2. Structured Data (JSON-LD)
```typescript
// app/layout.tsx
export default function RootLayout() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PhotographyBusiness',
    name: 'S.Goodie Photography',
    // ... more structured data
  };

  return (
    <html>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Sitemap Generation
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const projects = await getAllProjects();
  return [
    {
      url: 'https://sgoodiephotography.com',
      lastModified: new Date(),
    },
    ...projects.map(project => ({
      url: `https://sgoodiephotography.com/projects/${project.id}`,
      lastModified: project.updatedAt,
    })),
  ];
}
```

### 4. Image Optimization
```typescript
// Next.js Image component automatically optimizes
import Image from 'next/image';

<Image
  src={photo.url}
  alt={photo.altText}
  width={1200}
  height={800}
  priority // For above-the-fold images
/>
```

---

## Content Update Workflow

**When admin updates content:**

1. **Admin uploads photo or edits content** → API route saves to DynamoDB/S3
2. **Trigger rebuild** → Webhook or scheduled job
3. **Next.js rebuilds site** → Fetches latest data, pre-renders all pages
4. **Deploy to Amplify** → New static files deployed
5. **CDN cache cleared** → Users see updated content

**Rebuild time:** 2-5 minutes (acceptable for portfolio site)

---

## Performance & SEO Metrics

**Expected results with SSG:**

- ✅ **Lighthouse SEO Score:** 100/100
- ✅ **First Contentful Paint:** < 1s
- ✅ **Time to Interactive:** < 2s
- ✅ **Google PageSpeed:** 95+
- ✅ **Search Engine Indexing:** Immediate (full HTML)

---

## Conclusion

**For S.Goodie Photography website:**

1. ✅ **Use Next.js with Static Site Generation (SSG)** for all public pages
2. ✅ **Perfect SEO** - Full HTML, meta tags, structured data
3. ✅ **Fast performance** - Pre-rendered, CDN-served
4. ✅ **Cost-effective** - Static files, no server costs
5. ✅ **AWS Amplify support** - Native Next.js SSG support
6. ✅ **Easy content updates** - Rebuild on content changes

**Do NOT use SPA for public pages** - It will hurt SEO significantly.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-16
