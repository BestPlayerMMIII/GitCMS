# Next.js Integration

Use GitCMS with Next.js applications.

## App Router (Recommended)

### Server Components

```typescript
// app/lib/cms.ts
import { GitCMS } from '@git-cms/client';

export const cms = new GitCMS({
  repository: 'username/blog',
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

### Server Actions

```typescript
// app/actions/content.ts
'use server';

import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
});

export async function getPosts() {
  return await cms
    .from('posts')
    .where('metadata.status', '==', 'published')
    .get();
}
```

## Pages Router

### getStaticProps

```typescript
import { GitCMS } from '@git-cms/client';

export async function getStaticProps() {
  const cms = new GitCMS({ repository: 'username/blog' });
  const posts = await cms.from('posts').get();

  return {
    props: { posts },
    revalidate: 3600, // ISR: revalidate every hour
  };
}
```

### API Routes

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
