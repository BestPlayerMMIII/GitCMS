/**
 * Enhanced API Request Management
 *
 * Provides smart caching, request deduplication, and loading state management
 * for GitCMS admin interface to improve UX and reduce unnecessary API calls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
  repoScope?: string;
  ttl?: number;
  loading?: Promise<T>;
  error?: Error;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface UseApiDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number; // Time to live in milliseconds
  repoScope?: string;
  enabled?: boolean;
  refreshOnMount?: boolean;
  staleWhileRevalidate?: boolean;
}

export interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  invalidate: () => void;
  isStale: boolean;
}

// Default TTL values (in milliseconds)
export const DEFAULT_TTL = {
  REGISTRY_SCHEMAS: 10 * 60 * 1000, // 10 minutes
  REPO_SCHEMAS: 5 * 60 * 1000, // 5 minutes
  CONTENT_LIST: 2 * 60 * 1000, // 2 minutes
  CONTENT_ITEM: 1 * 60 * 1000, // 1 minute
  REPO_SETUP: 15 * 60 * 1000, // 15 minutes
} as const;

// Global cache store
class CacheStore {
  private cache = new Map<string, CacheEntry<any>>();
  private listeners = new Set<() => void>();

  get<T>(key: string): CacheEntry<T> | null {
    return this.cache.get(key) || null;
  }

  set<T>(key: string, entry: CacheEntry<T>): void {
    this.cache.set(key, entry);
    this.notifyListeners();
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.notifyListeners();
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.notifyListeners();
  }

  invalidateByPattern(pattern: string | RegExp): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      } else {
        if (pattern.test(key)) {
          keysToDelete.push(key);
        }
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) {
      this.notifyListeners();
    }
  }

  invalidateByRepoScope(repoScope: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.repoScope === repoScope) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) {
      this.notifyListeners();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Get all keys for debugging
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    let fresh = 0;
    let stale = 0;
    let loading = 0;

    this.cache.forEach(entry => {
      if (entry.loading) {
        loading++;
      } else {
        const age = now - entry.timestamp;
        const ttl = entry.ttl || DEFAULT_TTL.CONTENT_LIST;
        if (age < ttl) {
          fresh++;
        } else {
          stale++;
        }
      }
    });

    return {
      total: this.cache.size,
      fresh,
      stale,
      loading,
    };
  }
}

// Global cache instance
const globalCache = new CacheStore();

// Cache key generators
export const createCacheKey = {
  registrySchemas: () => 'registry:schemas',
  repoSchemas: (owner: string, repo: string) => `repo:${owner}/${repo}:schemas`,
  contentList: (owner: string, repo: string, schemaId?: string) =>
    schemaId ? `repo:${owner}/${repo}:content:${schemaId}` : `repo:${owner}/${repo}:content`,
  contentItem: (owner: string, repo: string, schemaId: string, contentId: string) =>
    `repo:${owner}/${repo}:content:${schemaId}:${contentId}`,
  repoSetup: (owner: string, repo: string) => `repo:${owner}/${repo}:setup`,
};

// Hook for API data with caching
export function useApiData<T>(options: UseApiDataOptions<T>): UseApiDataResult<T> {
  const {
    key,
    fetcher,
    ttl = DEFAULT_TTL.CONTENT_LIST,
    repoScope,
    enabled = true,
    refreshOnMount = false,
    staleWhileRevalidate = true,
  } = options;

  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
    isStale: boolean;
  }>(() => {
    const cached = globalCache.get<T>(key);
    if (cached && !cached.loading) {
      const age = Date.now() - cached.timestamp;
      const isStale = age > ttl;
      return {
        data: cached.data,
        loading: false,
        error: cached.error || null,
        isStale,
      };
    }
    return {
      data: null,
      loading: false,
      error: null,
      isStale: false,
    };
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(
    async (forceRefresh = false): Promise<void> => {
      if (!enabled) return;

      const cached = globalCache.get<T>(key);
      const now = Date.now();

      // Return ongoing request if already loading (deduplication)
      if (cached?.loading && !forceRefresh) {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
          const data = await cached.loading;
          setState(prev => ({ ...prev, data, loading: false, isStale: false }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
          }));
        }
        return;
      }

      // Check if data is fresh enough
      if (cached && !forceRefresh && !cached.loading) {
        const age = now - cached.timestamp;
        if (age < ttl) {
          setState(prev => ({
            ...prev,
            data: cached.data,
            loading: false,
            error: cached.error || null,
            isStale: false,
          }));
          return;
        }

        // Stale data - serve stale while revalidating if enabled
        if (staleWhileRevalidate && cached.data) {
          setState(prev => ({
            ...prev,
            data: cached.data,
            loading: true,
            error: null,
            isStale: true,
          }));
        } else {
          setState(prev => ({ ...prev, loading: true, error: null }));
        }
      } else {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Create and store the fetch promise
      const fetchPromise = fetcherRef.current();
      const cacheEntry: CacheEntry<T> = {
        data: (cached?.data ?? null) as T,
        timestamp: cached?.timestamp || now,
        key,
        repoScope,
        ttl,
        loading: fetchPromise,
        error: cached?.error,
      };
      globalCache.set(key, cacheEntry);

      try {
        const data = await fetchPromise;

        // Update cache with successful result
        const successEntry: CacheEntry<T> = {
          data,
          timestamp: now,
          key,
          repoScope,
          ttl,
        };
        globalCache.set(key, successEntry);

        setState(prev => ({ ...prev, data, loading: false, error: null, isStale: false }));
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');

        // Update cache with error
        const errorEntry: CacheEntry<T> = {
          data: (cached?.data ?? null) as T,
          timestamp: cached?.timestamp || now,
          key,
          repoScope,
          ttl,
          error: errorObj,
        };
        globalCache.set(key, errorEntry);

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorObj,
          // Keep stale data if available and staleWhileRevalidate is enabled
          data: staleWhileRevalidate && cached?.data ? cached.data : null,
          isStale: Boolean(staleWhileRevalidate && cached?.data),
        }));
      }
    },
    [key, enabled, ttl, repoScope, staleWhileRevalidate]
  );

  const refresh = useCallback(async (): Promise<void> => {
    await fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback((): void => {
    globalCache.delete(key);
    setState(prev => ({ ...prev, data: null, isStale: false }));
  }, [key]);

  // Subscribe to cache changes
  useEffect(() => {
    const unsubscribe = globalCache.subscribe(() => {
      const cached = globalCache.get<T>(key);
      if (cached && !cached.loading) {
        const age = Date.now() - cached.timestamp;
        const isStale = age > ttl;
        setState(prev => ({
          ...prev,
          data: cached.data,
          error: cached.error || null,
          isStale,
        }));
      } else if (!cached && enabled) {
        // Cache was invalidated - trigger refetch if enabled
        setState(prev => ({ ...prev, data: null, error: null, isStale: false }));
        fetchData();
      }
    });

    return unsubscribe;
  }, [key, ttl, enabled, fetchData]);

  // Initial fetch or refresh on mount
  useEffect(() => {
    if (enabled) {
      fetchData(refreshOnMount);
    }
  }, [enabled, refreshOnMount, fetchData]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refresh,
    invalidate,
    isStale: state.isStale,
  };
}

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate all schema caches for a repository
  invalidateRepoSchemas: (owner: string, repo: string) => {
    const repoScope = `${owner}/${repo}`;
    globalCache.delete(createCacheKey.repoSchemas(owner, repo));
    globalCache.invalidateByRepoScope(repoScope);
  },

  // Invalidate all content caches for a repository
  invalidateRepoContent: (owner: string, repo: string, schemaId?: string) => {
    if (schemaId) {
      globalCache.delete(createCacheKey.contentList(owner, repo, schemaId));
      globalCache.invalidateByPattern(`repo:${owner}/${repo}:content:${schemaId}:`);
    } else {
      globalCache.invalidateByPattern(`repo:${owner}/${repo}:content`);
    }
  },

  // Invalidate specific content item
  invalidateContentItem: (owner: string, repo: string, schemaId: string, contentId: string) => {
    globalCache.delete(createCacheKey.contentItem(owner, repo, schemaId, contentId));
    // Also invalidate list caches that might contain this item
    globalCache.delete(createCacheKey.contentList(owner, repo));
    globalCache.delete(createCacheKey.contentList(owner, repo, schemaId));
  },

  // Invalidate repository setup
  invalidateRepoSetup: (owner: string, repo: string) => {
    globalCache.delete(createCacheKey.repoSetup(owner, repo));
  },

  // Invalidate everything for a repository
  invalidateRepository: (owner: string, repo: string) => {
    const repoScope = `${owner}/${repo}`;
    globalCache.invalidateByRepoScope(repoScope);
  },

  // Invalidate registry schemas
  invalidateRegistrySchemas: () => {
    globalCache.delete(createCacheKey.registrySchemas());
  },

  // Invalidate schema mapping for a repository
  invalidateSchemaMapping: (owner: string, repo: string) => {
    globalCache.delete(`schema-mapping:${owner}:${repo}`);
  },

  // Clear all caches
  clearAll: () => {
    globalCache.clear();
  },
};

// Hook for cache statistics (useful for debugging)
export function useCacheStats() {
  const [stats, setStats] = useState(globalCache.getStats());

  useEffect(() => {
    const unsubscribe = globalCache.subscribe(() => {
      setStats(globalCache.getStats());
    });

    return unsubscribe;
  }, []);

  return {
    ...stats,
    keys: globalCache.getKeys(),
  };
}

// Export the global cache for direct access if needed
export { globalCache };
