# Other Frameworks

GitCMS works with any JavaScript framework.

## Astro

```typescript
---
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({ repository: 'username/blog' });
const posts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .get();
---

<div>
  {posts.map(post => (
    <article>
      <h2>{post.data.title}</h2>
    </article>
  ))}
</div>
```

## SvelteKit

```typescript
// +page.server.ts
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({ repository: 'username/blog' });

export async function load() {
  const posts = await cms.from('posts').get();
  return { posts };
}
```

## Express.js

```typescript
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
