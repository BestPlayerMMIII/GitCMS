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

// Fetch all blog posts
const posts = await cms.collection('blog-posts').get();

// Fetch published posts ordered by date
const publishedPosts = await cms
  .collection('blog-posts')
  .where('published', true)
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .get();

// Fetch a single post
const post = await cms.collection('blog-posts').doc('my-first-post').get();

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

## Collections

Collections represent groups of similar content items stored in your repository.

```typescript
// Get all items in a collection
const products = await cms.collection('products').get();

// Query with filters
const electronics = await cms
  .collection('products')
  .where('category', 'electronics')
  .where('inStock', true)
  .get();

// Order results
const latestPosts = await cms
  .collection('blog-posts')
  .orderBy('createdAt', 'desc')
  .get();

// Limit results
const featuredProducts = await cms
  .collection('products')
  .where('featured', true)
  .limit(5)
  .get();
```

## Documents

Access individual content items by their ID.

```typescript
// Get a single document from a collection
const post = await cms.collection('blog-posts').doc('my-post-id').get();

// Get a standalone document
const config = await cms.doc('site-config').get();
```

## Error Handling

```typescript
try {
  const posts = await cms.collection('blog-posts').get();
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

const posts = (await cms.collection('blog-posts').get()) as BlogPost[];
```
