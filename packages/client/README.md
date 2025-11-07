# @git-cms/client

> TypeScript SDK for GitCMS - Universal GitHub-Based Content Management System

[![npm version](https://img.shields.io/npm/v/@git-cms/client)](https://www.npmjs.com/package/@git-cms/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

**GitCMS** transforms your GitHub repository into a powerful, type-safe content
management system. Perfect for blogs, documentation sites, portfolios, and any
content-driven application.

## ✨ Features

- 🚀 **Zero Backend Required** - Works with public GitHub repos client-side
- 🔐 **Secure Authentication** - Private repo support with token-based auth
- 📝 **Markdown & JSON** - Native support for both content formats
- 🖼️ **Rich Media** - Images, videos, audio, documents, 3D models
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive types
- 🔍 **Powerful Queries** - Filter, sort, and paginate content with nested field
  access
- 🎨 **Two Transport Modes** - Public or authenticated (proxy mode removed)
- ⚡ **Progressive Enhancement** - Fast thumbnails, async full resolution
- 🌐 **Framework Agnostic** - Works with React, Vue, Next.js, vanilla JS

## 📦 Installation

```bash
npm install @git-cms/client
```

## 🚀 Quick Start

### Public Repository (No Token Required)

For public GitHub repositories, you can use GitCMS without any authentication:

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize for public repository
const cms = new GitCMS({
  repository: 'username/my-blog',
});

// Fetch all blog posts
const posts = await cms.from('posts').get();

// Fetch a single post
const post = await cms.from('posts').doc('my-first-post').get();
```

### Private Repository (Authenticated)

For private repositories or higher rate limits, provide a GitHub token
(server-side only):

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize with authentication (server-side only!)
const cms = new GitCMS({
  repository: 'username/my-private-blog',
  token: process.env.GITHUB_TOKEN, // Never expose tokens client-side!
});

// Same API as public mode
const posts = await cms.from('posts').get();
```

### Authenticated Mode with Media Proxying

For secure media handling with private repositories, use the API endpoint:

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize with media API endpoint
const cms = new GitCMS({
  repository: 'username/my-blog',
  token: process.env.GITHUB_TOKEN, // Server-side only
  apiEndpoint: '/api/media', // Your Express/Next.js API endpoint
});

// Media URLs will automatically use the API endpoint for secure proxying
const posts = await cms.from('posts').get();
```

**Example Express endpoint for media proxying:**

```typescript
// server.js
import express from 'express';
import cors from 'cors';
import { getMediaMapping } from '@git-cms/client';

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));

app.get('/api/media/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  const token = process.env.GITHUB_TOKEN;

  // Get the actual GitHub URL from media ID
  const mapping = getMediaMapping(mediaId);
  if (!mapping) {
    return res.status(404).send('Media not found');
  }

  // Fetch from GitHub with authentication
  const response = await fetch(mapping.url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const buffer = await response.arrayBuffer();

  // Set proper headers
  res.setHeader('Content-Type', mapping.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', buffer.byteLength);
  res.setHeader('Cache-Control', 'public, max-age=31536000');

  // Send raw binary data
  res.send(Buffer.from(buffer));
});

app.listen(5000);
```

## ⚙️ Configuration

```typescript
interface GitCMSConfig {
  repository: string; // GitHub repository in format 'owner/repo'
  branch?: string; // Git branch (default: 'main')
  token?: string; // GitHub personal access token (optional for public repos)
  apiEndpoint?: string; // API endpoint for media proxying (authenticated mode)
  transport?: 'public' | 'authenticated'; // Force specific transport mode
}
```

### Transport Modes

GitCMS automatically selects the transport mode based on your configuration:

#### 1. **Public Mode** (Default for public repos)

- **When**: No `token` provided
- **Best for**: Public repositories, client-side applications
- **Rate limits**: 60 requests/hour per IP (generous on raw URLs)
- **Security**: No credentials exposed
- **Media**: Direct GitHub URLs (public access)

```typescript
const cms = new GitCMS({
  repository: 'username/public-blog',
  // No token needed!
});
```

#### 2. **Authenticated Mode** (For private repos or higher limits)

- **When**: `token` provided
- **Best for**: Private repositories, server-side apps, higher rate limits
- **Rate limits**: 5,000 requests/hour (authenticated)
- **Security**: Keep token server-side only
- **Media**: Use `apiEndpoint` for secure proxying

```typescript
const cms = new GitCMS({
  repository: 'username/private-blog',
  token: process.env.GITHUB_TOKEN, // Server-side only!
  apiEndpoint: '/api/media', // Optional: for media proxying
});
```

### Checking Current Transport Mode

```typescript
const cms = new GitCMS({
  repository: 'username/my-blog',
});

console.log(cms.getTransportMode()); // 'public' or 'authenticated'
console.log(cms.isPublicMode()); // true if in public mode
```

### Rate Limit Information

Monitor your GitHub API rate limits (public and authenticated modes):

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

## 🔍 Querying Content

Query content by schema type using the SQL-like `from()` method.

```typescript
// Get all items from a schema
const products = await cms.from('products').get();

// Simple field filters
const electronics = await cms
  .from('products')
  .where('category', '==', 'electronics')
  .where('inStock', true)
  .get();

// Nested field access with dot notation
const published = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('author.verified', true)
  .get();

// Order by nested fields
const latestPosts = await cms
  .from('posts')
  .orderBy('metadata.publishedAt', 'desc')
  .get();

// Multiple order criteria (tiebreakers)
const prioritizedPosts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.priority', 'desc') // Primary sort
  .orderBy('metadata.publishedAt', 'desc') // Tiebreaker
  .get();

// Limit results
const featured = await cms
  .from('products')
  .where('featured', true)
  .limit(5)
  .get();
```

### Nested Field Access

GitCMS supports **dot notation** for accessing nested fields:

```typescript
// Access nested fields
await cms.from('posts').where('metadata.status', '==', 'published').get();
await cms.from('posts').where('author.profile.verified', true).get();
await cms.from('products').where('pricing.retail', '<', 100).get();

// Works with orderBy too
await cms.from('products').orderBy('ratings.average', 'desc').get();
await cms.from('posts').orderBy('stats.views', 'desc').get();
```

**How it works:**

- Fields are checked in the exact path specified: `item.metadata.status`
- If not found, tries `item.data.metadata.status` (backward compatibility)
- Supports any nesting depth: `a.b.c.d.e...`

### Supported Operators

```typescript
'==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
```

**Examples:**

```typescript
// Equality
.where('status', '==', 'published')
.where('verified', true)

// Comparison
.where('views', '>', 1000)
.where('price', '<=', 99.99)

// In array
.where('category', 'in', ['tech', 'tutorial', 'guide'])

// Contains (array field contains value)
.where('tags', 'contains', 'javascript')
```

## 📄 Documents

Access individual content items by their ID:

```typescript
// Get a single document from a schema
const post = await cms.from('posts').doc('my-post-id').get();

// Get a standalone document
const config = await cms.doc('site-config').get();
```

## 🖼️ Media Management

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

### Video & Document Embedding

```typescript
import {
  injectMediaStyles,
  enableProgressiveMediaLoading,
} from '@git-cms/client';

// 1. Inject styles (once)
injectMediaStyles();

// 2. Render content with media
const html = cms.media.renderFast(content); // Shows thumbnails/placeholders
container.innerHTML = html;

// 3. Enable click-to-load for videos/documents
enableProgressiveMediaLoading(container, cms.media);
```

**How it works:**

- **Videos**: Fast render shows poster image with play button → Full render
  embeds actual `<video>` element
- **Documents**: Fast render shows thumbnail preview → Full render provides
  download link
- **Images**: Fast render shows thumbnail → Full render shows high-resolution
  image
- **Audio**: Fast render shows icon → Full render embeds `<audio>` element

### Media API Features

- 🚀 **Fast thumbnails**: Instant display with embedded base64 data
- 🔄 **Async loading**: Progressive enhancement for full resolution
- 💾 **Smart caching**: Automatic caching of fetched media
- 🎯 **Type-safe**: Full TypeScript support
- 🎨 **Multiple formats**: Images, videos, audio, 3D models, documents
- ⚡ **LFS support**: Handles Git LFS files automatically

## 🔒 Security Best Practices

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

## 📚 Recommended Usage Patterns

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

## 📐 Repository Structure

Your GitHub repository should follow this structure:

```
repository/
├── .gitcms/
│   ├── config.json
│   └── schemas/
│       ├── blog-post.json
│       └── product.json
├── content/
│   ├── posts/
│   │   ├── my-first-post.md
│   │   └── another-post.json
│   ├── products/
│   │   └── awesome-product.json
│   └── about.json
└── media/
    └── images/
```

## 📝 Content Formats

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

## 🎯 TypeScript Support

The SDK is fully typed and provides excellent TypeScript support:

```typescript
interface BlogPost {
  id: string;
  title: string;
  content: string;
  metadata: {
    status: 'draft' | 'published' | 'archived';
    publishedAt: string;
    featured: boolean;
  };
  author: {
    name: string;
    verified: boolean;
  };
}

const posts = (await cms.from('posts').get()) as BlogPost[];

// Type-safe queries
const published = (await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .get()) as BlogPost[];
```

## ⚠️ Error Handling

```typescript
try {
  const posts = await cms.from('posts').get();
} catch (error) {
  console.error('Failed to fetch posts:', error);
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub**:
  [BestPlayerMMIII/GitCMS](https://github.com/BestPlayerMMIII/GitCMS)
- **NPM**: [@git-cms/client](https://www.npmjs.com/package/@git-cms/client)
- **Full Documentation**: [GitCMS Docs](https://gitcms-docs.bestplayer.dev)
- **Admin Panel**: [GitCMS Admin](https://gitcms-admin.bestplayer.dev)
- **Issues**: [GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)

## 🌟 What's New

### Version 0.1.0

- ✨ Two transport modes: public and authenticated
- ✨ Nested field access with dot notation
- ✨ Media API with progressive enhancement
- ✨ Video and document embedding support
- ✨ Full TypeScript support
- ✨ Secure media proxying with API endpoints
- 🔧 Rate limit monitoring
- 📝 Comprehensive documentation

---

**Made with ❤️ by [Manuel Maiuolo](https://github.com/BestPlayerMMIII)**
