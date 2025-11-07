# GitCMS Client SDK Guide

**Last Updated:** November 6, 2025

Complete developer guide for integrating `@git-cms/client` into your projects to
fetch and display content from GitHub repositories.

## 🎯 What is the Client SDK?

The **@git-cms/client** is a TypeScript SDK that lets you fetch content from
GitHub repositories managed with GitCMS. It provides a SQL-like query interface,
progressive media loading, and full type safety.

**Key Features:**

- Works with public and private repositories
- Type-safe TypeScript API
- SQL-like query syntax
- Progressive media loading
- Framework agnostic
- Zero backend required (for public repos)

## 📦 Installation

```bash
npm install @git-cms/client
```

**Dependencies:**

- Node.js 18+
- TypeScript 5+ (recommended)

## 🚀 Quick Start

### Basic Usage (Public Repository)

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize without token (public repos)
const cms = new GitCMS({
  repository: 'username/my-blog',
});

// Fetch all blog posts
const posts = await cms.from('posts').get();

// Fetch a single post
const post = await cms.from('posts').doc('my-first-post').get();

// Display posts
posts.forEach(post => {
  console.log(post.title, post.publishedAt);
});
```

### With Authentication (Private Repository)

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize with token (server-side only!)
const cms = new GitCMS({
  repository: 'company/private-content',
  token: process.env.GITHUB_TOKEN, // Never expose in browser!
});

// Same API as public mode
const posts = await cms.from('posts').get();
```

## ⚙️ Configuration

### GitCMSConfig Interface

```typescript
interface GitCMSConfig {
  repository: string; // GitHub repo: 'owner/repo'
  branch?: string; // Git branch (default: 'main')
  token?: string; // GitHub token (optional for public repos)
  apiEndpoint?: string; // API endpoint for media proxying
  transport?: 'public' | 'authenticated'; // Force transport mode
}
```

### Configuration Examples

**Public Repository (Client-Side):**

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  // No token - safe for browsers
});
```

**Private Repository (Server-Side):**

```typescript
const cms = new GitCMS({
  repository: 'company/blog',
  token: process.env.GITHUB_TOKEN,
  branch: 'production', // Custom branch
});
```

**With Media Proxying:**

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
  apiEndpoint: '/api/media', // Your API endpoint
});
```

## 🔍 Querying Content

### Basic Queries

**Get all items:**

```typescript
const posts = await cms.from('posts').get();
```

**Get single item:**

```typescript
const post = await cms.from('posts').doc('my-post-id').get();
```

**Get standalone document:**

```typescript
const config = await cms.doc('app-config').get();
```

### Filtering with `where()`

**Simple equality:**

```typescript
const published = await cms.from('posts').where('published', true).get();
```

**Comparison operators:**

```typescript
const recent = await cms
  .from('posts')
  .where('views', '>', 1000)
  .where('price', '<=', 99.99)
  .get();
```

**Array membership:**

```typescript
const selected = await cms
  .from('posts')
  .where('category', 'in', ['tech', 'tutorial', 'guide'])
  .get();
```

**Array contains:**

```typescript
const jsPosts = await cms
  .from('posts')
  .where('tags', 'contains', 'javascript')
  .get();
```

### Nested Field Access

Use **dot notation** to access nested fields:

```typescript
// Access nested metadata
const published = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('metadata.featured', true)
  .get();

// Deep nesting
const verified = await cms
  .from('posts')
  .where('author.profile.verified', true)
  .get();

// Nested comparisons
const affordable = await cms
  .from('products')
  .where('pricing.retail', '<', 100)
  .where('pricing.discount', '>', 0)
  .get();
```

### Sorting with `orderBy()`

**Single criterion:**

```typescript
const latest = await cms.from('posts').orderBy('publishedAt', 'desc').get();
```

**Multiple criteria (tiebreakers):**

```typescript
const prioritized = await cms
  .from('posts')
  .orderBy('priority', 'desc') // Primary sort
  .orderBy('publishedAt', 'desc') // Tiebreaker
  .get();
```

**Nested field sorting:**

```typescript
const topRated = await cms
  .from('products')
  .orderBy('ratings.average', 'desc')
  .get();
```

### Limiting Results

```typescript
const featured = await cms.from('posts').where('featured', true).limit(5).get();
```

### Chaining Everything

```typescript
const results = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('metadata.featured', true)
  .where('author.verified', true)
  .orderBy('metadata.priority', 'desc')
  .orderBy('metadata.publishedAt', 'desc')
  .limit(10)
  .get();
```

### Content Structure

**JSON Document:**

```json
{
  "id": "my-post",
  "schemaId": "post",
  "data": {
    "title": "Hello World",
    "content": "Post content..."
  },
  "metadata": {
    "status": "published",
    "publishedAt": "2025-11-06T10:00:00Z"
  }
}
```

**Accessed as:**

```typescript
post.id; // "my-post"
post.data.title; // "Hello World"
post.data.content; // "Post content..."
post.metadata.status; // "published"
```

## 🖼️ Media Management

### Progressive Media Loading

GitCMS provides **fast thumbnail loading** with **async full-resolution
fetching**:

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'owner/repo',
  token: process.env.GITHUB_TOKEN,
});

// Get post with embedded media
const post = await cms.from('posts').where('id', '==', 'my-post').get();

// Extract media references (fast, synchronous)
const mediaRefs = cms.media.extractFromHTML(post.content);

// Get thumbnails immediately (fast)
const thumbnail = cms.media.getThumbnail(mediaRefs[0]);

// Fetch full resolution asynchronously
const fullMedia = await cms.media.fetchFull(mediaRefs[0]);
```

### Fast Render → Full Render Pattern

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

// 3. Replace with full resolution
document.getElementById('content').innerHTML = fullHtml;
```

### Content Media Helpers

For entire content items (rich-text + fields):

```typescript
// Extract ALL media (rich-text + media fields)
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

- **Images:** jpg, png, gif, webp, svg
- **Videos:** mp4, webm, mov
- **Audio:** mp3, wav, ogg
- **Documents:** pdf, doc, docx, txt

### Video & Document Embedding

```typescript
import {
  injectMediaStyles,
  enableProgressiveMediaLoading,
} from '@git-cms/client';

// 1. Inject styles (once)
injectMediaStyles();

// 2. Render content with media
const html = cms.media.renderFast(content);
container.innerHTML = html;

// 3. Enable click-to-load for videos/documents
enableProgressiveMediaLoading(container, cms.media);
```

**How it works:**

- **Videos:** Thumbnail with play button → Click to load video
- **Documents:** Thumbnail preview → Click to download
- **Images:** Thumbnail → Async load full resolution
- **Audio:** Icon → Click to load player

## 🔐 Security Best Practices

### ⚠️ Never Expose Tokens Client-Side

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

### Transport Modes

| Mode              | Token | Rate Limit     | Use Case                   |
| ----------------- | ----- | -------------- | -------------------------- |
| **Public**        | No    | 60/hour per IP | Public repos, client-side  |
| **Authenticated** | Yes   | 5,000/hour     | Private repos, server-side |

**Check current mode:**

```typescript
console.log(cms.getTransportMode()); // 'public' or 'authenticated'
console.log(cms.isPublicMode()); // true if public
```

### Rate Limiting

**Monitor rate limits:**

```typescript
const rateLimit = await cms.getRateLimit();
if (rateLimit) {
  console.log(`Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);
  console.log(`Resets at: ${rateLimit.reset}`);
}
```

**Recommendations:**

- **Public mode:** Use for low-traffic or static generation
- **Authenticated mode:** Use server-side for high-traffic sites
- **Caching:** Implement caching to reduce API calls
- **Static generation:** Pre-fetch at build time when possible

## 🎯 Framework Integration

### Next.js App Router (Server Components)

```typescript
// app/lib/cms.ts
import { GitCMS } from '@git-cms/client';

export const cms = new GitCMS({
  repository: 'username/blog',
  // Public repo - no token needed
});

// app/blog/page.tsx
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
          <h2>{post.data.title}</h2>
          <p>{post.data.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

### Next.js Server Actions

```typescript
// app/actions/content.ts
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

// app/blog/page.tsx (Client Component)
import { getPosts } from '../actions/content';

export default async function BlogPage() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```

### Next.js API Routes

```typescript
// pages/api/posts.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const posts = await cms.from('posts').get();
  res.status(200).json(posts);
}
```

### React with Vite

```typescript
// src/lib/cms.ts
import { GitCMS } from '@git-cms/client';

export const cms = new GitCMS({
  repository: 'username/blog',
  // Public repo - safe for client-side
});

// src/components/BlogList.tsx
import { useEffect, useState } from 'react';
import { cms } from '../lib/cms';

export function BlogList() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    cms.from('posts').get().then(setPosts);
  }, []);

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.data.title}</h2>
        </article>
      ))}
    </div>
  );
}
```

### Vue.js

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
});

const posts = ref([]);

onMounted(async () => {
  posts.value = await cms.from('posts').get();
});
</script>

<template>
  <div>
    <article v-for="post in posts" :key="post.id">
      <h2>{{ post.data.title }}</h2>
    </article>
  </div>
</template>
```

### Static Site Generation (Astro)

```typescript
// src/pages/blog/index.astro
---
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
});

const posts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .get();
---

<div>
  {posts.map(post => (
    <article>
      <h2>{post.data.title}</h2>
      <p>{post.data.excerpt}</p>
    </article>
  ))}
</div>
```

### Express.js Backend

```typescript
// server.js
import express from 'express';
import { GitCMS } from '@git-cms/client';

const app = express();

const cms = new GitCMS({
  repository: 'username/content',
  token: process.env.GITHUB_TOKEN,
});

app.get('/api/posts', async (req, res) => {
  const posts = await cms.from('posts').get();
  res.json(posts);
});

app.listen(3000);
```

## 🎨 TypeScript Support

### Type Definitions

Define your content types:

```typescript
interface BlogPost {
  id: string;
  // schemaId: string;
  data: {
    title: string;
    content: string;
    excerpt: string;
    author: {
      name: string;
      email: string;
      verified: boolean;
    };
    tags: string[];
  };
  metadata: {
    status: 'draft' | 'published' | 'archived';
    publishedAt: string;
    featured: boolean;
    priority: number;
  };
}

// Type-safe queries
const posts = (await cms.from('posts').get()) as BlogPost[];

const post = (await cms
  .from('posts')
  .where('id', '==', 'my-post')
  .get()) as BlogPost;

// TypeScript knows the structure
posts.forEach(post => {
  console.log(post.metadata.status); // ✅ Type-safe
  console.log(post.data.author.name); // ✅ Type-safe
});
```

### Generic Queries

```typescript
async function fetchContent<T>(schema: string): Promise<T[]> {
  return (await cms.from(schema).get()) as T[];
}

const posts = await fetchContent<BlogPost>('post');
const projects = await fetchContent<Project>('project');
```

## 📊 Common Patterns

### Pattern 1: Blog Posts

```typescript
// Fetch published posts
const posts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.publishedAt', 'desc')
  .limit(10)
  .get();

// Fetch single post
const post = await cms.from('posts').where('id', '==', 'my-post-slug').get();

// Featured posts
const featured = await cms
  .from('posts')
  .where('metadata.featured', true)
  .limit(3)
  .get();

// Posts by category
const tech = await cms
  .from('posts')
  .where('category', '==', 'technology')
  .get();

// Posts with tag
const jsPosts = await cms
  .from('posts')
  .where('tags', 'contains', 'javascript')
  .get();
```

### Pattern 2: E-commerce Products

```typescript
// All products in stock
const products = await cms
  .from('products')
  .where('inStock', true)
  .orderBy('price', 'asc')
  .get();

// Products by category
const electronics = await cms
  .from('products')
  .where('category', '==', 'electronics')
  .where('price', '<', 1000)
  .get();

// Featured products
const featured = await cms
  .from('products')
  .where('featured', true)
  .limit(4)
  .get();

// Product details
const product = await cms
  .from('products')
  .where('id', '==', 'product-id')
  .get();
```

### Pattern 3: Documentation

```typescript
// All docs
const docs = await cms.from('docs').orderBy('order', 'asc').get();

// Docs by category
const guides = await cms.from('docs').where('category', '==', 'guides').get();

// Single doc page
const doc = await cms.from('docs').where('id', '==', 'getting-started').get();
```

## 🔧 Advanced Usage

### Custom Media Proxying

For private repositories with client-side rendering:

**Backend (Express/Next.js API Route):**

```typescript
import { getMediaMapping } from '@git-cms/client';

app.get('/api/media/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  const token = process.env.GITHUB_TOKEN;

  // Get GitHub URL from media ID
  const mapping = getMediaMapping(mediaId);
  if (!mapping) {
    return res.status(404).send('Media not found');
  }

  // Fetch from GitHub with authentication
  const response = await fetch(mapping.url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const buffer = await response.arrayBuffer();

  // Proxy to client
  res.setHeader('Content-Type', mapping.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.send(Buffer.from(buffer));
});
```

**Frontend:**

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  apiEndpoint: '/api/media', // Use your API endpoint
});

// Media URLs automatically use the proxy
const post = await cms.from('posts').doc('my-post').get();
```

### Caching Strategy

Implement caching to reduce API calls:

```typescript
class CachedCMS {
  private cache = new Map();
  private cms: GitCMS;

  constructor(config: GitCMSConfig) {
    this.cms = new GitCMS(config);
  }

  async from(schema: string) {
    const cacheKey = `schema:${schema}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const data = await this.cms.from(schema).get();
    this.cache.set(cacheKey, data);

    // Expire after 5 minutes
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

    return data;
  }
}
```

## 🐛 Troubleshooting

### Content Not Found

**Problem:** `cms.from('posts').get()` returns empty array

**Solutions:**

1. Verify repository name is correct
2. Check subfolder `/posts` exists in your `content` folder
3. Verify branch is correct (default: 'main')
4. Check .gitcms/schemas/posts.json exists

### Rate Limit Exceeded

**Problem:** "API rate limit exceeded" error

**Solutions:**

1. Use authenticated mode (5,000/hour vs 60/hour)
2. Implement caching
3. Use static generation at build time
4. Reduce number of API calls

### TypeScript Errors

**Problem:** Type errors when accessing nested fields

**Solutions:**

1. Define proper interfaces
2. Use type assertions: `as BlogPost`
3. Use optional chaining: `post.metadata?.status`

### Media Not Loading

**Problem:** Images/videos not displaying

**Solutions:**

1. Check file exists in repository
2. Verify repository is public (or use token)
3. Check CORS settings (for client-side)
4. Use media proxying for private repos

## 📚 API Reference

### GitCMS Class

```typescript
class GitCMS {
  constructor(config: GitCMSConfig);

  // Query by schema
  from(schema: string): Query;

  // Transport mode
  getTransportMode(): 'public' | 'authenticated';
  isPublicMode(): boolean;

  // Rate limits
  getRateLimit(): Promise<RateLimit | null>;

  // Media API
  media: MediaAPI;
  contentMedia: ContentMediaAPI;
}
```

### Query Class

```typescript
class Query {
  where(field: string, operator: Operator, value: any): Query;
  orderBy(field: string, direction: 'asc' | 'desc'): Query;
  limit(count: number): Query;
  get(): Promise<Document[]>;
}
```

### Operators

```typescript
type Operator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
```

## 🎓 Next Steps

1. **Install the SDK** - `npm install @git-cms/client`
2. **Try examples** - Start with simple queries
3. **Add to your project** - Integrate with your framework
4. **Optimize** - Implement caching and static generation
5. **Read more** - Check other documentation pages

## 📖 Related Documentation

- **[Admin Panel Guide](./ADMIN-PANEL-GUIDE.md)** - Content creation

---

**Questions or feedback?** Open an issue on
[GitHub](https://github.com/BestPlayerMMIII/GitCMS/issues).

---

**Made with ❤️ by [Manuel Maiuolo](https://github.com/BestPlayerMMIII)**
