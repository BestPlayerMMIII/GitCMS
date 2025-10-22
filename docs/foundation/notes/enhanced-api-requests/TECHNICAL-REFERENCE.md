# Enhanced API Request Management - Technical Reference

## API Reference

### Core Cache Hook

#### `useApiData<T>(options: UseApiDataOptions<T>): UseApiDataResult<T>`

Primary hook for cached API requests with automatic deduplication and
intelligent caching.

**Parameters:**

```typescript
interface UseApiDataOptions<T> {
  key: string; // Unique cache key
  fetcher: () => Promise<T>; // Data fetching function
  ttl?: number; // Time to live in milliseconds
  repoScope?: string; // Repository scope for invalidation
  enabled?: boolean; // Enable/disable the request
  refreshOnMount?: boolean; // Force refresh when component mounts
  staleWhileRevalidate?: boolean; // Serve stale data while fetching fresh
}
```

**Returns:**

```typescript
interface UseApiDataResult<T> {
  data: T | null; // Cached or fetched data
  loading: boolean; // Loading state
  error: Error | null; // Error state
  refresh: () => Promise<void>; // Force refresh function
  invalidate: () => void; // Invalidate cache entry
  isStale: boolean; // Whether data is stale
}
```

**Example:**

```typescript
const { data, loading, error, refresh } = useApiData({
  key: createCacheKey.repoSchemas(owner, repo),
  fetcher: () => fetchSchemas(owner, repo),
  ttl: DEFAULT_TTL.REPO_SCHEMAS,
  repoScope: `${owner}/${repo}`,
  enabled: Boolean(owner && repo),
  staleWhileRevalidate: true,
});
```

### Specialized Hooks

#### `useRepoSchemas(owner: string | null, repo: string | null)`

Fetches and caches repository schemas and storage information.

**Returns:**

```typescript
{
  data: {
    schemas: GitCMSSchema[];
    storageSchemas: GitCMSSchema[];
    hasGitCMSConfig: boolean;
  } | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

#### `useContentList(owner: string | null, repo: string | null, schemaId?: string)`

Fetches and caches content lists, optionally filtered by schema.

**Returns:**

```typescript
{
  data: ContentItem[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

#### `useSchemaMutations(owner: string | null, repo: string | null)`

Provides mutation functions for schema operations with automatic cache
invalidation.

**Returns:**

```typescript
{
  saveSchema: (schema: GitCMSSchema) => Promise<any>;
  deleteSchema: (schemaId: string) => Promise<any>;
}
```

#### `useContentMutations(owner: string | null, repo: string | null)`

Provides mutation functions for content operations with automatic cache
invalidation.

**Returns:**

```typescript
{
  saveContent: (
    schemaId: string,
    data: Record<string, any>,
    contentId?: string
  ) => Promise<any>;
  deleteContent: (schemaId: string, contentId: string) => Promise<any>;
}
```

### Cache Management

#### Cache Key Generators

```typescript
export const createCacheKey = {
  registrySchemas: () => 'registry:schemas',
  repoSchemas: (owner: string, repo: string) => `repo:${owner}/${repo}:schemas`,
  contentList: (owner: string, repo: string, schemaId?: string) =>
    schemaId
      ? `repo:${owner}/${repo}:content:${schemaId}`
      : `repo:${owner}/${repo}:content`,
  contentItem: (
    owner: string,
    repo: string,
    schemaId: string,
    contentId: string
  ) => `repo:${owner}/${repo}:content:${schemaId}:${contentId}`,
  repoSetup: (owner: string, repo: string) => `repo:${owner}/${repo}:setup`,
};
```

#### Cache Invalidation

```typescript
export const cacheInvalidation = {
  // Invalidate all schema caches for a repository
  invalidateRepoSchemas: (owner: string, repo: string) => void;

  // Invalidate content caches (all or schema-specific)
  invalidateRepoContent: (owner: string, repo: string, schemaId?: string) => void;

  // Invalidate specific content item
  invalidateContentItem: (owner: string, repo: string, schemaId: string, contentId: string) => void;

  // Invalidate repository setup
  invalidateRepoSetup: (owner: string, repo: string) => void;

  // Invalidate everything for a repository
  invalidateRepository: (owner: string, repo: string) => void;

  // Invalidate registry schemas
  invalidateRegistrySchemas: () => void;

  // Clear all caches
  clearAll: () => void;
};
```

### Loading Components

#### `ProgressiveLoading`

Wrapper component that handles loading states and provides consistent UX
patterns.

**Props:**

```typescript
interface ProgressiveLoadingProps {
  loading: boolean;
  error: Error | null;
  skeleton?: React.ReactNode; // Skeleton loader component
  children: React.ReactNode; // Content to show when loaded
  onRetry?: () => void; // Retry function for errors
  className?: string;
  showError?: boolean; // Whether to show error state
}
```

**Example:**

```jsx
<ProgressiveLoading
  loading={loading}
  error={error}
  skeleton={<SchemaListSkeleton />}
  onRetry={refresh}
>
  <SchemaList schemas={schemas} />
</ProgressiveLoading>
```

#### Available Skeleton Components

```typescript
// Schema-related skeletons
<SchemaListSkeleton count={3} />
<SchemaCardSkeleton />

// Content-related skeletons
<ContentGridSkeleton count={6} />
<ContentCardSkeleton />

// Generic skeletons
<TableSkeleton rows={5} columns={4} />
<ListSkeleton items={3} />
```

### Cache Configuration

#### Default TTL Values

```typescript
export const DEFAULT_TTL = {
  REGISTRY_SCHEMAS: 10 * 60 * 1000, // 10 minutes
  REPO_SCHEMAS: 5 * 60 * 1000, // 5 minutes
  CONTENT_LIST: 2 * 60 * 1000, // 2 minutes
  CONTENT_ITEM: 1 * 60 * 1000, // 1 minute
  REPO_SETUP: 15 * 60 * 1000, // 15 minutes
} as const;
```

#### Cache Statistics

```typescript
const { total, fresh, stale, loading, keys } = useCacheStats();

// Returns:
// total: number of cached entries
// fresh: number of fresh (non-expired) entries
// stale: number of stale entries
// loading: number of entries currently loading
// keys: array of all cache keys
```

## Migration Patterns

### Pattern 1: Basic Data Fetching

**Before:**

```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

**After:**

```typescript
const { data, loading, error, refresh } = useApiData({
  key: 'unique-cache-key',
  fetcher: () => fetch('/api/data').then(res => res.json()),
  ttl: DEFAULT_TTL.CONTENT_LIST,
});
```

### Pattern 2: Conditional Fetching

**Before:**

```typescript
useEffect(() => {
  if (owner && repo) {
    fetchSchemas();
  }
}, [owner, repo]);
```

**After:**

```typescript
const { data } = useRepoSchemas(owner, repo); // Automatically handles null checks
```

### Pattern 3: Mutation with Cache Invalidation

**Before:**

```typescript
const saveSchema = async schema => {
  const response = await fetch('/api/schemas', {
    method: 'POST',
    body: JSON.stringify(schema),
  });

  // Manual refetch
  fetchSchemas();
};
```

**After:**

```typescript
const { saveSchema } = useSchemaMutations(owner, repo); // Auto-invalidation built-in
```

### Pattern 4: Loading States

**Before:**

```jsx
{
  loading ? (
    <div>Loading...</div>
  ) : error ? (
    <div>Error: {error.message}</div>
  ) : (
    <DataComponent data={data} />
  );
}
```

**After:**

```jsx
<ProgressiveLoading
  loading={loading}
  error={error}
  skeleton={<DataSkeleton />}
  onRetry={refresh}
>
  <DataComponent data={data} />
</ProgressiveLoading>
```

## Best Practices

### Cache Key Design

- Use consistent prefixes (`registry:`, `repo:`)
- Include all parameters that affect the data
- Use hierarchical structure for easy invalidation
- Keep keys human-readable for debugging

### TTL Selection

- **Frequent changes**: 1-2 minutes (content items)
- **Moderate changes**: 5 minutes (schema lists)
- **Rare changes**: 10-15 minutes (registry data, setup info)
- **User-specific**: Consider shorter TTLs for user-generated content

### Error Handling

- Always provide retry mechanisms
- Use stale-while-revalidate for better UX
- Show meaningful error messages
- Log errors for debugging

### Performance

- Use `enabled` parameter to prevent unnecessary requests
- Implement proper loading skeletons
- Consider preloading for predictable navigation patterns
- Monitor cache hit rates

### Testing

- Mock the cache for unit tests
- Test cache invalidation scenarios
- Verify loading state transitions
- Test error recovery flows

## Common Issues and Solutions

### Issue: Cache Not Invalidating

**Cause:** Incorrect cache key patterns **Solution:** Use exact cache key
matching or proper pattern matching

### Issue: Stale Data Persisting

**Cause:** TTL too long or missing invalidation **Solution:** Reduce TTL or add
manual invalidation triggers

### Issue: Too Many Requests

**Cause:** Cache not being used or keys changing unnecessarily **Solution:**
Verify cache keys are stable and consistent

### Issue: Memory Leaks

**Cause:** Cache growing unbounded **Solution:** Implement proper cleanup and
reasonable TTLs

### Issue: TypeScript Errors

**Cause:** Generic type mismatches **Solution:** Properly type the fetcher
function and data interface

## Debugging Tips

### Cache Inspection

```typescript
// Get current cache state
console.log('Cache keys:', globalCache.getKeys());
console.log('Cache stats:', useCacheStats());

// Clear cache for testing
cacheInvalidation.clearAll();
```

### Request Monitoring

```typescript
// Add logging to fetcher functions
const fetcher = async () => {
  console.log('Fetching data for key:', cacheKey);
  const result = await fetchData();
  console.log('Data fetched:', result);
  return result;
};
```

### Performance Analysis

- Monitor network tab for request reduction
- Check component re-render frequency
- Measure Time to Interactive (TTI) improvements
- Track cache hit/miss ratios
