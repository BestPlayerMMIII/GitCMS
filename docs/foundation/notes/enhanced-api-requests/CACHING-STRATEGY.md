# Caching Strategy Design

## Overview

Implement a smart caching layer that:

1. **Caches API responses** with repository-scoped keys
2. **Deduplicates simultaneous requests** for the same data
3. **Invalidates smartly** when mutations occur
4. **Provides loading states** consistently across components
5. **Handles offline/error scenarios** gracefully

## Architecture

### 1. Cache Structure

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
  repoScope?: string; // "owner/repo" for repo-specific data
  ttl?: number; // Time to live in milliseconds
  loading?: Promise<T>; // Ongoing request promise for deduplication
}

interface CacheStore {
  // Repository-scoped caches
  schemas: Map<string, CacheEntry<GitCMSSchema[]>>; // key: "registry" | "owner/repo"
  content: Map<string, CacheEntry<ContentItem[]>>; // key: "owner/repo" | "owner/repo/schemaId"
  repoSetup: Map<string, CacheEntry<SetupStatus>>; // key: "owner/repo"

  // Global cache for registry data
  registrySchemas: CacheEntry<GitCMSSchema[]> | null;
}
```

### 2. Cache Keys

**Registry Schemas**: `"registry"` **Repository Schemas**: `"${owner}/${repo}"`
**Content Lists**: `"${owner}/${repo}/content"` or
`"${owner}/${repo}/content/${schemaId}"` **Repository Setup**:
`"${owner}/${repo}/setup"` **Individual Content**:
`"${owner}/${repo}/content/${schemaId}/${contentId}"`

### 3. Request Hook Pattern

Create a custom hook `useApiData` that:

- Handles caching logic
- Provides loading states
- Manages error states
- Deduplicates requests
- Supports refresh/invalidation

```typescript
interface UseApiDataOptions {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number; // Default: 5 minutes for schemas, 2 minutes for content
  repoScope?: string;
  enabled?: boolean; // Conditional fetching
  refreshOnMount?: boolean; // Force refresh when component mounts
}

const useApiData = <T>(options: UseApiDataOptions) => {
  // Returns: { data, loading, error, refresh, invalidate }
};
```

## Cache Invalidation Strategy

### 1. Mutation-Based Invalidation

**Schema Mutations**:

- **Create/Update Schema**: Invalidate `"${owner}/${repo}"` schemas
- **Delete Schema**: Invalidate `"${owner}/${repo}"` schemas and related content

**Content Mutations**:

- **Create Content**: Invalidate `"${owner}/${repo}/content"` and
  `"${owner}/${repo}/content/${schemaId}"`
- **Update Content**: Invalidate specific content and list caches
- **Delete Content**: Invalidate content lists

**Repository Setup**:

- **Setup Repository**: Invalidate `"${owner}/${repo}/setup"`

### 2. Time-Based Invalidation

**TTL Values**:

- **Registry Schemas**: 10 minutes (rarely change)
- **Repository Schemas**: 5 minutes (user-controlled)
- **Content Lists**: 2 minutes (frequently updated)
- **Individual Content**: 1 minute (editing scenarios)
- **Repository Setup**: 15 minutes (rarely changes after setup)

### 3. Manual Invalidation

- **Refresh buttons**: Force invalidate specific cache keys
- **Navigation events**: Optionally refresh stale data
- **WebSocket events**: Real-time invalidation (future enhancement)

## Loading State Management

### 1. Unified Loading Context

```typescript
interface LoadingState {
  [key: string]: boolean; // key: cache key, value: loading status
}

const LoadingContext = React.createContext<{
  loadingStates: LoadingState;
  setLoading: (key: string, loading: boolean) => void;
}>();
```

### 2. Loading Indicators

**Skeleton Loaders**:

- Schema lists: Card skeletons
- Content grids: Content card skeletons
- Forms: Field placeholder animations

**Progressive Loading**:

- Show cached data immediately if available
- Update with fresh data when loaded
- Indicate "updating" vs "initial loading"

## Request Deduplication

### 1. Promise Sharing

Store ongoing request promises in cache entries:

```typescript
const getOrFetchData = async (key: string, fetcher: () => Promise<T>) => {
  const existing = cache.get(key);

  // Return ongoing request if already loading
  if (existing?.loading) {
    return existing.loading;
  }

  // Create new request and store promise
  const promise = fetcher();
  cache.set(key, { ...existing, loading: promise });

  try {
    const data = await promise;
    cache.set(key, { data, timestamp: Date.now(), key });
    return data;
  } finally {
    // Clear loading promise
    const entry = cache.get(key);
    if (entry) {
      delete entry.loading;
    }
  }
};
```

### 2. Request Batching

For scenarios where multiple components need similar data:

- Batch schema fetches for same repository
- Combine content requests with different filters

## Error Handling Strategy

### 1. Stale-While-Revalidate

- Return cached data even if stale during errors
- Show error indicator but keep data visible
- Retry failed requests with exponential backoff

### 2. Fallback Behavior

**Schema Fetches**:

- Repository schemas fail → Fall back to registry schemas
- Registry schemas fail → Show error but allow manual retry

**Content Fetches**:

- Content list fails → Show error with retry button
- Keep previously loaded content visible

### 3. Offline Support

- Detect offline status
- Show appropriate messaging
- Queue mutations for when online (future enhancement)

## Implementation Plan

### Phase 1: Core Caching Infrastructure

1. Create cache store and types
2. Implement `useApiData` hook
3. Add request deduplication logic

### Phase 2: Loading States

1. Create loading context and components
2. Implement skeleton loaders
3. Update existing components to use new loading patterns

### Phase 3: Cache Integration

1. Replace direct fetch calls with cached versions
2. Implement invalidation logic for mutations
3. Add refresh functionality

### Phase 4: Advanced Features

1. Background refresh for stale data
2. Optimistic updates for mutations
3. Error boundary improvements

## Success Metrics

**Performance**:

- Reduce redundant API calls by 70%+
- Improve perceived loading time
- Decrease time to interactive

**UX**:

- Eliminate flash of empty content
- Consistent loading states across app
- Smooth navigation between pages

**Developer Experience**:

- Simplified data fetching patterns
- Better error handling
- Clear invalidation rules
