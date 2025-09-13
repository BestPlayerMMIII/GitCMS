# Next.js Blog with GitCMS

This example demonstrates how to create a blog using Next.js and GitCMS.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure GitCMS:
```typescript
// lib/cms.ts
import { GitCMS } from '@gitcms/client';

export const cms = new GitCMS({
  repository: 'your-username/your-blog-repo',
  // token: 'your-github-token', // for private repos
});
```

3. Start development server:
```bash
npm run dev
```

## Usage

```typescript
// pages/index.tsx
import { cms } from '../lib/cms';

export async function getStaticProps() {
  const posts = await cms
    .collection('blog-posts')
    .where('published', true)
    .orderBy('publishedAt', 'desc')
    .get();

  return {
    props: { posts },
    revalidate: 60,
  };
}
```