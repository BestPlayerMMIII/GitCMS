# Sorting & Limiting

Control the order and number of results returned.

## Sorting

### Single Criterion

```typescript
// Descending order
const latest = await cms.from('posts').orderBy('publishedAt', 'desc').get();

// Ascending order
const oldest = await cms.from('posts').orderBy('publishedAt', 'asc').get();
```

### Multiple Criteria (Tiebreakers)

```typescript
const prioritized = await cms
  .from('posts')
  .orderBy('priority', 'desc') // Primary sort
  .orderBy('publishedAt', 'desc') // Tiebreaker
  .get();
```

### Nested Field Sorting

```typescript
const topRated = await cms
  .from('products')
  .orderBy('ratings.average', 'desc')
  .get();
```

## Limiting

### Limit Results

```typescript
const featured = await cms.from('posts').where('featured', true).limit(5).get();
```

### Combine with Filters

```typescript
const topPosts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('stats.views', 'desc')
  .limit(10)
  .get();
```

## Complete Example

```typescript
// Top 5 published posts by views
const trending = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('metadata.featured', true)
  .orderBy('stats.views', 'desc')
  .orderBy('metadata.publishedAt', 'desc')
  .limit(5)
  .get();
```

## Next Steps

::: info Continue Learning

- [Nested Fields](/client/nested-fields) - Deep access
- [Media](/client/media) - Images and videos
- [Framework Integration](/client/nextjs) - Use in apps

:::
