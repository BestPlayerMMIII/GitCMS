# @git-cms/client

TypeScript SDK for GitCMS - Universal GitHub-Based Content Management System.

## Installation

```bash
npm install @git-cms/client
```

## Quick Start

### Public Repository (No Token Required)

For public GitHub repositories, you can use GitCMS without any authentication:

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize for public repository
const cms = new GitCMS({
  repository: 'username/my-blog',
});

// Fetch all blog posts
const posts = await cms.from('blog-posts').get();

// Fetch a single post
const post = await cms.from('blog-posts').doc('my-first-post').get();
```

### Private Repository (Token Required)

For private repositories or to get higher rate limits, provide a GitHub token:

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize with authentication
const cms = new GitCMS({
  repository: 'username/my-private-blog',
  token: 'your-github-token', // GitHub Personal Access Token
});

// Same API as public mode
const posts = await cms.from('blog-posts').get();
```

### Custom API Proxy (Advanced)

If you need server-side rendering, custom caching, or additional processing:

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize with custom API endpoint
const cms = new GitCMS({
  repository: 'username/my-blog',
  baseUrl: 'https://my-api.com', // Your custom API endpoint
  token: 'optional-token', // Optional, for API authentication
});

const posts = await cms.from('blog-posts').get();
```

## Configuration

```typescript
interface GitCMSConfig {
  repository: string; // GitHub repository in format 'owner/repo'
  branch?: string; // Git branch (default: 'main')
  token?: string; // GitHub personal access token (optional for public repos)
  baseUrl?: string; // Custom API base URL for proxy mode
  transport?: 'public' | 'authenticated' | 'proxy'; // Force specific transport mode
}
```

### Transport Modes

GitCMS automatically selects the best transport mode based on your
configuration:

#### 1. **Public Mode** (Default for public repos)

- **When**: No `token` or `baseUrl` provided
- **Best for**: Public repositories, client-side applications
- **Rate limits**: 60 requests/hour per IP (generous on raw URLs)
- **Security**: No credentials exposed
- **Requirements**: Index files (see below)

```typescript
const cms = new GitCMS({
  repository: 'username/public-blog',
  // No token needed!
});
```

**Important**: Public mode requires `index.json` files in each schema directory
for reliable operation:

```json
// content/posts/_index.json
["post-1.json", "post-2.json", "welcome.md"]
```

**Alternative**: Use authenticated mode (server-side) or proxy mode for
production.

#### 2. **Authenticated Mode** (For private repos or higher limits)

- **When**: `token` provided, no `baseUrl`
- **Best for**: Private repositories, higher rate limits
- **Rate limits**: 5,000 requests/hour (authenticated)
- **Security**: Keep token server-side only

```typescript
const cms = new GitCMS({
  repository: 'username/private-blog',
  token: process.env.GITHUB_TOKEN, // Server-side only!
});
```

#### 3. **Proxy Mode** (For custom backends)

- **When**: `baseUrl` provided
- **Best for**: Server-side rendering, custom caching, additional processing
- **Rate limits**: Depends on your proxy implementation
- **Security**: Full control over authentication and caching

```typescript
const cms = new GitCMS({
  repository: 'username/my-blog',
  baseUrl: 'https://my-api.vercel.app',
});
```

### Forcing a Specific Transport Mode

You can explicitly specify the transport mode:

```typescript
// Force public mode even with a token present
const cms = new GitCMS({
  repository: 'username/public-blog',
  token: 'ghp_xxx', // Present but won't be used
  transport: 'public',
});

// Force authenticated mode
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxx',
  transport: 'authenticated',
});

// Force proxy mode
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://api.example.com',
  transport: 'proxy',
});
```

### Checking Current Transport Mode

```typescript
const cms = new GitCMS({
  repository: 'username/my-blog',
});

console.log(cms.getTransportMode()); // 'public', 'authenticated', or 'proxy'
console.log(cms.isPublicMode()); // true if in public mode
```

### Rate Limit Information

Monitor your GitHub API rate limits (public and authenticated modes only):

```typescript
const cms = new GitCMS({
  repository: 'username/my-blog',
  token: 'ghp_xxx',
});

const rateLimit = await cms.getRateLimit();
if (rateLimit) {
  console.log(`Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);
  console.log(`Resets at: ${rateLimit.reset}`);
}
```

## Recommended Usage Patterns

### Client-Side React/Vue/Next.js Application (Public Repository)

**Best Practice**: Use public mode - no backend needed!

```typescript
// app/lib/cms.ts
import { GitCMS } from '@git-cms/client';

export const cms = new GitCMS({
  repository: 'username/blog-content',
  // No token - completely safe for client-side
});

// app/page.tsx (Next.js App Router)
import { cms } from '@/lib/cms';

export default async function BlogPage() {
  const posts = await cms
    .from('posts')
    .where('metadata.status', '==', 'published')
    .orderBy('metadata.publishedAt', 'desc')
    .get();

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

### Server-Side Application (Private Repository)

**Best Practice**: Use authenticated mode with environment variables

```typescript
// lib/cms.ts (server-side only)
import { GitCMS } from '@git-cms/client';

if (!process.env.GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN is required for private repositories');
}

export const cms = new GitCMS({
  repository: 'company/private-content',
  token: process.env.GITHUB_TOKEN,
});

// NEVER expose this client to the browser!
```

### Next.js with Server Actions (Hybrid Approach)

**Best Practice**: Keep token server-side, expose public API

```typescript
// app/actions/content.ts (Server Action)
'use server';

import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN, // Server-side only
});

export async function getPosts() {
  return await cms
    .from('posts')
    .where('metadata.status', '==', 'published')
    .get();
}

// app/page.tsx (Client Component)
import { getPosts } from './actions/content';

export default async function Page() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```

### High-Traffic Application with Caching

**Best Practice**: Use proxy mode with your own API endpoint

```typescript
// Your API endpoint (e.g., /api/content/[...path])
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schema = searchParams.get('schema');

  // Add caching layer
  const cacheKey = `content:${schema}`;
  const cached = await redis.get(cacheKey);
  if (cached) return Response.json(cached);

  const items = await cms.from(schema).get();
  await redis.set(cacheKey, items, { ex: 300 }); // 5min cache

  return Response.json(items);
}

// Client-side usage
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://your-app.com',
  transport: 'proxy',
});
```

### Mobile App or Static Site Generator

**Best Practice**: Fetch at build time, no runtime API calls

```typescript
// build-time script or static site generator
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/app-content',
  // Public repo - no token needed
});

async function generateStaticData() {
  const posts = await cms.from('posts').get();
  const pages = await cms.from('pages').get();

  // Write to static JSON files
  await fs.writeFile('data/posts.json', JSON.stringify(posts));
  await fs.writeFile('data/pages.json', JSON.stringify(pages));
}

generateStaticData();
```

## Security Best Practices

### ⚠️ NEVER Expose Tokens Client-Side

```typescript
// ❌ BAD: Token in client-side code
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxxxxxxxxxxxx', // NEVER DO THIS!
});

// ✅ GOOD: Use public mode for client-side
const cms = new GitCMS({
  repository: 'username/blog',
  // No token - safe for browsers
});

// ✅ GOOD: Token in server environment
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN, // Server-only
});
```

### Rate Limit Considerations

**Public Mode**: 60 requests/hour per IP

- Best for: Low-traffic sites, development
- Consider: Static generation or caching for high traffic

**Authenticated Mode**: 5,000 requests/hour

- Best for: Server-side applications, high-traffic sites
- Consider: Only use server-side, never expose token

**Proxy Mode**: Custom limits

- Best for: Enterprise applications, fine-grained control
- Implement your own rate limiting and caching

## Querying Content

Query content by schema type using the SQL-like `from()` method.

```typescript
// Get all items from a schema
const products = await cms.from('products').get();

// Query with filters (simple fields)
const electronics = await cms
  .from('products')
  .where('category', 'electronics')
  .where('inStock', true)
  .get();

// Query with nested fields (dot notation)
const published = await cms
  .from('blog-posts')
  .where('metadata.status', '==', 'published')
  .where('author.verified', true)
  .get();

// Order results (supports nested fields)
const latestPosts = await cms
  .from('blog-posts')
  .orderBy('createdAt', 'desc')
  .get();

// Order by nested field
const topRated = await cms
  .from('products')
  .orderBy('ratings.average', 'desc')
  .get();

// Multiple order criteria (tiebreakers)
// First sort by priority (desc), then by publishedAt (desc) for ties
const prioritizedPosts = await cms
  .from('blog-posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.priority', 'desc')
  .orderBy('metadata.publishedAt', 'desc')
  .get();

// Limit results
const featuredProducts = await cms
  .from('products')
  .where('featured', true)
  .limit(5)
  .get();
```

### Advanced Field Access

GitCMS supports **dot notation** for accessing nested fields in your content:

```typescript
// Access top-level fields
await cms.from('posts').where('title', '==', 'Hello World').get();

// Access nested fields with dot notation
await cms.from('posts').where('metadata.status', '==', 'published').get();
await cms.from('posts').where('author.verified', true).get();
await cms.from('posts').where('settings.visibility.public', true).get();

// Works with orderBy too
await cms.from('products').orderBy('pricing.retail', 'desc').get();
await cms.from('posts').orderBy('metadata.publishedAt', 'desc').get();

// Combine multiple nested filters
const results = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('author.role', '==', 'admin')
  .where('stats.views', '>', 1000)
  .orderBy('metadata.publishedAt', 'desc')
  .get();
```

**How it works:**

- Fields are checked in the exact path specified: `item.metadata.status`
- If not found, the system tries `item.data.metadata.status` (for backward
  compatibility)
- This works for any depth: `a.b.c.d.e...`

### Multiple Ordering (Tiebreakers)

When you need to sort by multiple criteria, you can chain `orderBy()` calls.
Each subsequent `orderBy()` acts as a tiebreaker for the previous one:

```typescript
// Sort by priority (desc), then by date (desc) for items with same priority
const posts = await cms
  .from('blog-posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.priority', 'desc') // Primary sort
  .orderBy('metadata.publishedAt', 'desc') // Tiebreaker
  .get();

// Sort by category (asc), then price (asc), then name (asc)
const products = await cms
  .from('products')
  .orderBy('category', 'asc') // 1st: by category
  .orderBy('price', 'asc') // 2nd: by price (within same category)
  .orderBy('name', 'asc') // 3rd: by name (within same category & price)
  .get();
```

**How it works:**

- Items are first sorted by the first `orderBy()` criterion
- When two items have equal values for the first criterion, the second criterion
  is used
- This continues for all chained `orderBy()` calls
- The order of `orderBy()` calls matters - they're applied in sequence

## Documents

Access individual content items by their ID.

```typescript
// Get a single document from a schema
const post = await cms.from('blog-posts').doc('my-post-id').get();

// Get a standalone document
const config = await cms.doc('site-config').get();
```

## Error Handling

```typescript
try {
  const posts = await cms.from('blog-posts').get();
} catch (error) {
  console.error('Failed to fetch posts:', error);
}
```

## Repository Structure

Your GitHub repository should follow this structure:

```
repository/
├── .gitcms/
│   ├── config.json
│   └── schemas/
│       ├── blog-post.json
│       └── product.json
├── content/
│   ├── blog-posts/
│   │   ├── my-first-post.md
│   │   └── another-post.json
│   ├── products/
│   │   └── awesome-product.json
│   └── about.json
└── media/
    └── images/
```

## Content Formats

GitCMS supports both JSON and Markdown files:

### JSON Content

```json
{
  "id": "my-post",
  "title": "My Blog Post",
  "content": "This is the content...",
  "published": true,
  "publishedAt": "2024-01-15T10:00:00Z"
}
```

### Markdown with Frontmatter

```markdown
---
title: My Blog Post
published: true
publishedAt: 2024-01-15T10:00:00Z
---

This is the content of my blog post written in **Markdown**.
```

## TypeScript Support

The SDK is fully typed and provides excellent TypeScript support:

```typescript
interface BlogPost {
  id: string;
  title: string;
  content: string;
  published: boolean;
  publishedAt: string;
}

const posts = (await cms.from('blog-posts').get()) as BlogPost[];
```

## Media Management

GitCMS provides a powerful media API for working with embedded media in your
content. It supports **fast thumbnail loading** with **async full-resolution
fetching** for optimal performance.

### Quick Example

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'owner/repo',
  token: 'your-token',
});

// Get a post with embedded media
const post = await cms.from('posts').doc('my-post').get();

// Extract media references (fast, synchronous)
const mediaRefs = cms.media.extractFromHTML(post.content);

// Get thumbnails immediately (fast)
const thumbnail = cms.media.getThumbnail(mediaRefs[0]);

// Fetch full resolution asynchronously
const fullMedia = await cms.media.fetchFull(mediaRefs[0]);
```

### Progressive Enhancement Pattern

```typescript
// 1. Render with thumbnails immediately
const fastHtml = cms.media.renderFast(post.content);
document.getElementById('content').innerHTML = fastHtml;

// 2. Load full resolution in background
const fullHtml = await cms.media.renderFull(post.content, {
  onProgress: (current, total, ref) => {
    console.log(`Loading ${current}/${total}: ${ref.filename}`);
  },
});
document.getElementById('content').innerHTML = fullHtml;
```

### Content Helper

For convenient media operations on entire content items:

```typescript
// Extract ALL media (rich-text + fields)
const allMedia = cms.contentMedia.extractAll(post);

// Get all thumbnails
const thumbnails = cms.contentMedia.getThumbnails(post);

// Preload all media
const fullMediaMap = await cms.contentMedia.preloadAll(post);

// Render entire content item
const fastPost = cms.contentMedia.renderFast(post);
const fullPost = await cms.contentMedia.renderFull(post);
```

### Supported Media Types

- **Images**: jpg, png, gif, webp, svg, etc.
- **Videos**: mp4, webm, mov, etc.
- **Audio**: mp3, wav, ogg, etc.
- **3D Models**: glb, gltf, obj, fbx
- **Documents**: pdf, doc, docx, txt

### Media API Features

- 🚀 **Fast thumbnails**: Instant display with embedded base64 data
- 🔄 **Async loading**: Progressive enhancement for full resolution
- 💾 **Smart caching**: Automatic caching of fetched media
- 🎯 **Type-safe**: Full TypeScript support
- 🎨 **Multiple formats**: Images, videos, audio, 3D models, documents
- ⚡ **LFS support**: Handles Git LFS files automatically

For complete documentation, see [MEDIA-API.md](./docs/MEDIA-API.md).
