# React Integration

Use GitCMS with React applications.

## With Hooks

```typescript
import { useEffect, useState } from 'react';
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({ repository: 'username/blog' });

function BlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cms.from('posts')
      .where('metadata.status', '==', 'published')
      .get()
      .then(data => {
        setPosts(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

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

## With Vite

```typescript
// src/lib/cms.ts
import { GitCMS } from '@git-cms/client';

export const cms = new GitCMS({
  repository: import.meta.env.VITE_GITHUB_REPO,
});
```
