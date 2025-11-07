# TypeScript Support

GitCMS is built with TypeScript and provides full type safety.

## Define Content Types

```typescript
interface BlogPost {
  id: string;
  data: {
    title: string;
    content: string;
    excerpt: string;
  };
  metadata: {
    status: 'draft' | 'published' | 'archived';
    publishedAt: string;
    featured: boolean;
  };
}

// Type-safe queries
const posts = (await cms.from('posts').get()) as BlogPost[];

// TypeScript knows the structure
posts.forEach(post => {
  console.log(post.metadata.status); // ✅ Type-safe
  console.log(post.data.title); // ✅ Type-safe
});
```

## Generic Queries

```typescript
async function fetchContent<T>(schema: string): Promise<T[]> {
  return (await cms.from(schema).get()) as T[];
}

const posts = await fetchContent<BlogPost>('posts');
const projects = await fetchContent<Project>('projects');
```

## Auto-completion

TypeScript provides auto-completion for all GitCMS methods and properties.
