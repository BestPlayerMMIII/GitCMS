# @git-cms/client

TypeScript SDK for GitCMS - Universal GitHub-Based Content Management System.

## Installation

```bash
npm install @git-cms/client
```

## Quick Start

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize the client
const cms = new GitCMS({
  repository: 'username/my-blog',
  token: 'your-github-token', // Optional for public repos
});

// Fetch all blog posts (using SQL-like FROM syntax)
const posts = await cms.from('blog-posts').get();

// Fetch published posts ordered by date
const publishedPosts = await cms
  .from('blog-posts')
  .where('published', true)
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .get();

// Fetch a single post
const post = await cms.from('blog-posts').doc('my-first-post').get();

// Fetch a standalone document
const aboutPage = await cms.doc('about').get();
```

## Configuration

```typescript
interface GitCMSConfig {
  repository: string; // GitHub repository in format 'owner/repo'
  branch?: string; // Git branch (default: 'main')
  token?: string; // GitHub personal access token
  baseUrl?: string; // Custom API base URL
}
```

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
