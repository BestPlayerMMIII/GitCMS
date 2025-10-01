# Example: Consuming GitCMS content (Phase 6)

This example shows two ways to fetch content:

1. Direct GitHub (private repos require a Fine-Grained PAT)
2. Via your deployed API (apps/web) proxy endpoint

## Install

```bash
npm i @git-cms/client
```

## Usage (direct GitHub)

```ts
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/my-blog',
  branch: 'main',
  token: process.env.GITCMS_GITHUB_TOKEN, // Fine-grained PAT
});

const posts = await cms
  .collection('blog-posts')
  .where('published', true)
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .get();
```

## Usage (HTTP via API proxy)

Expose the content endpoint:

- `GET /api/content/:owner/:repo/:schema?branch=main&limit=10&orderBy=publishedAt&order=desc&where={"published":true}`

```ts
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/my-blog',
  branch: 'main',
  baseUrl: process.env.NEXT_PUBLIC_GITCMS_API_BASE, // e.g. https://your-site.vercel.app
  token: process.env.GITCMS_GITHUB_TOKEN, // Optional if repo is public
});

const posts = await cms
  .collection('blog-posts')
  .where('published', true)
  .orderBy('publishedAt', 'desc')
  .limit(10)
  .get();
```

## Fetch a single document

```ts
const post = await cms.collection('blog-posts').doc('my-first-post').get();
```

Notes:

- For private repositories, provide a fine‑grained PAT with least privileges:
  `Contents: Read` on the specific repo.
- The API route will use the provided bearer token when present.
