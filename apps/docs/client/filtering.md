# Filtering

Advanced filtering techniques for precise content queries.

## Operators

GitCMS supports these comparison operators:

```typescript
'==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
```

## Equality

```typescript
// Equal
const published = await cms
  .from('posts')
  .where('status', '==', 'published')
  .get();

// Not equal
const notDraft = await cms.from('posts').where('status', '!=', 'draft').get();
```

## Comparison

```typescript
// Greater than
const popular = await cms.from('posts').where('views', '>', 1000).get();

// Less than or equal
const affordable = await cms.from('products').where('price', '<=', 99.99).get();
```

## Array Membership

```typescript
// Field value in array
const selected = await cms
  .from('posts')
  .where('category', 'in', ['tech', 'tutorial', 'guide'])
  .get();
```

## Array Contains

```typescript
// Array field contains value
const jsPosts = await cms
  .from('posts')
  .where('tags', 'contains', 'javascript')
  .get();
```

## Nested Field Access

Use dot notation for nested fields:

```typescript
// Access nested metadata
const published = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('metadata.featured', true)
  .get();

// Deep nesting
const verified = await cms
  .from('posts')
  .where('author.profile.verified', true)
  .get();
```

## Multiple Conditions

Chain multiple `where()` calls:

```typescript
const results = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('metadata.featured', true)
  .where('author.verified', true)
  .where('stats.views', '>', 1000)
  .get();
```

## Real-World Examples

### Blog Posts

```typescript
// Published posts with tag
const reactPosts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('tags', 'contains', 'react')
  .get();
```

### Products

```typescript
// In-stock electronics under $1000
const products = await cms
  .from('products')
  .where('category', '==', 'electronics')
  .where('inStock', true)
  .where('price', '<', 1000)
  .get();
```

### Documentation

```typescript
// Docs for specific version
const v2Docs = await cms
  .from('docs')
  .where('version', '==', 'v2.0')
  .where('category', '==', 'guides')
  .get();
```

## Next Steps

::: info Continue Learning

- [Sorting & Limiting](/client/sorting-limiting) - Order results
- [Nested Fields](/client/nested-fields) - Advanced access
- [Examples](/client/examples) - More patterns

:::
