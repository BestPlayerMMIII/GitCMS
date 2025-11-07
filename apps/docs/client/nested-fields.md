# Nested Fields

Access deeply nested data structures with dot notation.

## Dot Notation

GitCMS supports dot notation for accessing nested fields:

```typescript
// Access nested metadata
await cms.from('posts').where('metadata.status', '==', 'published').get();

// Deep nesting
await cms.from('posts').where('author.profile.verified', true).get();

// Any depth
await cms.from('data').where('a.b.c.d.e', '==', 'value').get();
```

## How It Works

Fields are checked in this order:

1. Exact path: `item.metadata.status`
2. Under data: `item.data.metadata.status` (backward compatibility)

## Common Patterns

### Metadata Access

```typescript
const published = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('metadata.featured', true)
  .orderBy('metadata.publishedAt', 'desc')
  .get();
```

### Author Information

```typescript
const verifiedPosts = await cms
  .from('posts')
  .where('author.verified', true)
  .where('author.role', '==', 'admin')
  .get();
```

### Stats and Analytics

```typescript
const popular = await cms
  .from('posts')
  .where('stats.views', '>', 1000)
  .where('stats.likes', '>=', 50)
  .orderBy('stats.views', 'desc')
  .get();
```

### Pricing

```typescript
const affordable = await cms
  .from('products')
  .where('pricing.retail', '<', 100)
  .where('pricing.discount', '>', 0)
  .get();
```

## Real-World Example

```typescript
interface BlogPost {
  id: string;
  data: {
    title: string;
    content: string;
  };
  metadata: {
    status: 'draft' | 'published' | 'archived';
    publishedAt: string;
    featured: boolean;
    category: string;
  };
  author: {
    name: string;
    verified: boolean;
    role: string;
  };
  stats: {
    views: number;
    likes: number;
    comments: number;
  };
}

// Query with nested fields
const posts = (await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('metadata.featured', true)
  .where('author.verified', true)
  .where('stats.views', '>', 1000)
  .orderBy('metadata.publishedAt', 'desc')
  .limit(10)
  .get()) as BlogPost[];
```

## Next Steps

::: info Continue Learning

- [Media Management](/client/media) - Images and videos
- [TypeScript](/client/typescript) - Type safety
- [Examples](/client/examples) - More patterns

:::
