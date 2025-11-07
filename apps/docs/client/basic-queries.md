# Basic Queries

Learn how to fetch content with the GitCMS Client SDK.

## Query by Schema

Use `from()` to query content by schema type:

```typescript
const posts = await cms.from('posts').get();
```

## Get Single Document

### From Schema

```typescript
const post = await cms.from('posts').doc('my-post-id').get();
```

### Standalone Document

```typescript
const config = await cms.doc('site-config').get();
```

## Simple Filtering

### Equality

```typescript
const published = await cms
  .from('posts')
  .where('status', '==', 'published')
  .get();
```

### Boolean Fields

```typescript
const featured = await cms.from('posts').where('featured', true).get();
```

### Nested Fields

```typescript
const published = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .get();
```

## Multiple Filters

Chain `where()` calls to combine filters:

```typescript
const results = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('featured', true)
  .get();
```

## Content Structure

Content is returned with this structure:

```typescript
{
  id: string;
  schemaId: string;
  data: {
    // Your content fields
    title: string;
    content: string;
    // ...
  }
  metadata: {
    status: 'draft' | 'published' | 'archived';
    publishedAt: string;
    // ...
  }
}
```

## Accessing Fields

```typescript
const posts = await cms.from('posts').get();

posts.forEach(post => {
  console.log(post.id); // Post ID
  console.log(post.data.title); // Title
  console.log(post.metadata.status); // Status
  console.log(post.metadata.publishedAt); // Date
});
```

## Next Steps

::: info Learn More

- [Filtering](/client/filtering) - Advanced queries
- [Sorting & Limiting](/client/sorting-limiting) - Order results
- [Nested Fields](/client/nested-fields) - Deep access

:::
