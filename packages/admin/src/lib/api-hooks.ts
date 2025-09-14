/**
 * Specialized API hooks for GitCMS admin interface
 *
 * These hooks provide type-safe, cached access to specific API endpoints
 * with appropriate loading states and cache invalidation strategies.
 */

import { useCallback } from 'react';
import type { GitCMSSchema } from '@gitcms/core';
import {
  useApiData,
  createCacheKey,
  cacheInvalidation,
  DEFAULT_TTL,
  globalCache,
  type UseApiDataResult,
} from './api-cache';

// Types for content items
interface ContentItem {
  id: string;
  schemaId: string;
  data: Record<string, any>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
    status: 'draft' | 'published' | 'archived';
    slug?: string;
  };
}

interface ContentListResponse {
  success: boolean;
  items: ContentItem[];
  total: number;
  error?: string;
}

interface SchemaListResponse {
  schemas: GitCMSSchema[];
  total: number;
  path?: string;
  message?: string;
}

interface RepoSetupStatus {
  isSetup: boolean;
  hasSchemas: boolean;
  schemaCount: number;
  lastCheck: string;
}

// Hook for registry schemas (global schemas)
export function useRegistrySchemas(): UseApiDataResult<GitCMSSchema[]> {
  return useApiData({
    key: createCacheKey.registrySchemas(),
    fetcher: async () => {
      const response = await fetch('/api/schemas?action=list');
      if (!response.ok) {
        throw new Error(`Failed to fetch registry schemas: ${response.statusText}`);
      }
      const data: SchemaListResponse = await response.json();
      return data.schemas || [];
    },
    ttl: DEFAULT_TTL.REGISTRY_SCHEMAS,
    staleWhileRevalidate: true,
  });
}

// Hook for repository-specific schemas
export function useRepoSchemas(
  owner: string | null,
  repo: string | null,
  options: { enabled?: boolean; fallbackToRegistry?: boolean } = {}
): UseApiDataResult<GitCMSSchema[]> {
  const { enabled = true, fallbackToRegistry = true } = options;

  return useApiData({
    key: owner && repo ? createCacheKey.repoSchemas(owner, repo) : 'disabled',
    fetcher: async () => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      const params = new URLSearchParams({
        action: 'list',
        owner,
        repo,
      });

      const response = await fetch(`/api/schemas/storage?${params}`);

      if (!response.ok) {
        // If fallback is enabled and we get a 404/error, try registry schemas
        if (fallbackToRegistry && (response.status === 404 || response.status === 500)) {
          const fallbackResponse = await fetch('/api/schemas?action=list');
          if (fallbackResponse.ok) {
            const fallbackData: SchemaListResponse = await fallbackResponse.json();
            return fallbackData.schemas || [];
          }
        }
        throw new Error(`Failed to fetch repository schemas: ${response.statusText}`);
      }

      const data: SchemaListResponse = await response.json();
      return data.schemas || [];
    },
    ttl: DEFAULT_TTL.REPO_SCHEMAS,
    repoScope: owner && repo ? `${owner}/${repo}` : undefined,
    enabled: enabled && Boolean(owner && repo),
    staleWhileRevalidate: true,
  });
}

// Hook for content list
export function useContentList(
  owner: string | null,
  repo: string | null,
  schemaId?: string,
  options: { enabled?: boolean } = {}
): UseApiDataResult<ContentItem[]> {
  const { enabled = true } = options;

  return useApiData({
    key: owner && repo ? createCacheKey.contentList(owner, repo, schemaId) : 'disabled',
    fetcher: async () => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      const params = new URLSearchParams({
        action: 'list',
        owner,
        repo,
      });

      if (schemaId) {
        params.set('schemaId', schemaId);
      }

      const response = await fetch(`/api/content?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }

      const data: ContentListResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch content');
      }

      return data.items || [];
    },
    ttl: DEFAULT_TTL.CONTENT_LIST,
    repoScope: owner && repo ? `${owner}/${repo}` : undefined,
    enabled: enabled && Boolean(owner && repo),
    staleWhileRevalidate: true,
  });
}

// Hook for individual content item
export function useContentItem(
  owner: string | null,
  repo: string | null,
  schemaId: string | null,
  contentId: string | null,
  options: { enabled?: boolean } = {}
): UseApiDataResult<ContentItem> {
  const { enabled = true } = options;

  return useApiData({
    key:
      owner && repo && schemaId && contentId
        ? createCacheKey.contentItem(owner, repo, schemaId, contentId)
        : 'disabled',
    fetcher: async () => {
      if (!owner || !repo || !schemaId || !contentId) {
        throw new Error('Owner, repo, schemaId, and contentId are required');
      }

      const params = new URLSearchParams({
        action: 'get',
        owner,
        repo,
        schemaId,
        contentId,
      });

      const response = await fetch(`/api/content?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch content item: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch content item');
      }

      return data.content;
    },
    ttl: DEFAULT_TTL.CONTENT_ITEM,
    repoScope: owner && repo ? `${owner}/${repo}` : undefined,
    enabled: enabled && Boolean(owner && repo && schemaId && contentId),
    staleWhileRevalidate: true,
  });
}

// Hook for individual schema
export function useRepoSchema(
  owner: string | null,
  repo: string | null,
  schemaId: string | null,
  options: { enabled?: boolean } = {}
): UseApiDataResult<GitCMSSchema> {
  const { enabled = true } = options;

  return useApiData({
    key: owner && repo && schemaId ? `repo:${owner}/${repo}:schema:${schemaId}` : 'disabled',
    fetcher: async () => {
      if (!owner || !repo || !schemaId) {
        throw new Error('Owner, repo, and schemaId are required');
      }

      const params = new URLSearchParams({
        action: 'get',
        owner,
        repo,
        schemaId,
      });

      const response = await fetch(`/api/schemas/storage?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.schema) {
        throw new Error('Schema not found');
      }

      return data.schema;
    },
    ttl: DEFAULT_TTL.REPO_SCHEMAS,
    repoScope: owner && repo ? `${owner}/${repo}` : undefined,
    enabled: enabled && Boolean(owner && repo && schemaId),
    staleWhileRevalidate: true,
  });
}

// Hook for repository setup status
export function useRepoSetup(
  owner: string | null,
  repo: string | null,
  options: { enabled?: boolean } = {}
): UseApiDataResult<RepoSetupStatus> {
  const { enabled = true } = options;

  return useApiData({
    key: owner && repo ? createCacheKey.repoSetup(owner, repo) : 'disabled',
    fetcher: async () => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      const params = new URLSearchParams({
        action: 'check-setup',
        owner,
        repo,
      });

      const response = await fetch(`/api/schemas/storage?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to check repository setup: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        isSetup: data.isSetup || false,
        hasSchemas: data.hasSchemas || false,
        schemaCount: data.schemaCount || 0,
        lastCheck: new Date().toISOString(),
      };
    },
    ttl: DEFAULT_TTL.REPO_SETUP,
    repoScope: owner && repo ? `${owner}/${repo}` : undefined,
    enabled: enabled && Boolean(owner && repo),
    staleWhileRevalidate: true,
  });
}

// Mutation hooks with automatic cache invalidation
export function useSchemaMutations(owner: string | null, repo: string | null) {
  const saveSchema = useCallback(
    async (schema: GitCMSSchema) => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      const response = await fetch(`/api/schemas/storage?action=save&owner=${owner}&repo=${repo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save schema: ${response.statusText}`);
      }

      // Invalidate related caches
      cacheInvalidation.invalidateRepoSchemas(owner, repo);

      return response.json();
    },
    [owner, repo]
  );

  const deleteSchema = useCallback(
    async (schemaId: string) => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      const response = await fetch(
        `/api/schemas/storage?owner=${owner}&repo=${repo}&schemaId=${schemaId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete schema: ${response.statusText}`);
      }

      // Invalidate related caches
      cacheInvalidation.invalidateRepoSchemas(owner, repo);
      cacheInvalidation.invalidateRepoContent(owner, repo, schemaId);

      return response.json();
    },
    [owner, repo]
  );

  return {
    saveSchema,
    deleteSchema,
  };
}

export function useContentMutations(owner: string | null, repo: string | null) {
  const saveContent = useCallback(
    async (schemaId: string, contentData: Record<string, any>, contentId?: string) => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      // Determine action based on whether we have a contentId (update) or not (create)
      const action = contentId ? 'update' : 'create';

      const params = new URLSearchParams({
        action,
        owner,
        repo,
      });

      const payload: any = {
        schemaId,
        data: contentData,
      };

      if (contentId) {
        payload.contentId = contentId;
      }

      const response = await fetch(`/api/content?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save content: ${response.statusText}`);
      }

      const result = await response.json();

      // Invalidate related caches
      cacheInvalidation.invalidateRepoContent(owner, repo);
      cacheInvalidation.invalidateRepoContent(owner, repo, schemaId);

      if (contentId) {
        cacheInvalidation.invalidateContentItem(owner, repo, schemaId, contentId);
      }

      return result;
    },
    [owner, repo]
  );

  const deleteContent = useCallback(
    async (schemaId: string, contentId: string) => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      const params = new URLSearchParams({
        owner,
        repo,
        schemaId,
        contentId,
      });

      const response = await fetch(`/api/content?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete content: ${response.statusText}`);
      }

      // Invalidate related caches
      cacheInvalidation.invalidateContentItem(owner, repo, schemaId, contentId);
      cacheInvalidation.invalidateRepoContent(owner, repo);
      cacheInvalidation.invalidateRepoContent(owner, repo, schemaId);

      return response.json();
    },
    [owner, repo]
  );

  return {
    saveContent,
    deleteContent,
  };
}

// Utility hook for batch cache invalidation
export function useCacheInvalidation() {
  return {
    invalidateRepository: cacheInvalidation.invalidateRepository,
    invalidateRepoSchemas: cacheInvalidation.invalidateRepoSchemas,
    invalidateRepoContent: cacheInvalidation.invalidateRepoContent,
    invalidateContentItem: cacheInvalidation.invalidateContentItem,
    invalidateRepoSetup: cacheInvalidation.invalidateRepoSetup,
    invalidateRegistrySchemas: cacheInvalidation.invalidateRegistrySchemas,
    clearAll: cacheInvalidation.clearAll,
  };
}

/**
 * Setup and Configuration Hooks
 */
export function useGitHubConfig(
  owner: string | null,
  repo: string | null,
  options: { enabled?: boolean } = {}
): UseApiDataResult<any> {
  const { enabled = true } = options;

  return useApiData({
    key: owner && repo ? `github:config:${owner}:${repo}` : 'disabled',
    fetcher: async () => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      const response = await fetch(`/api/github/config?owner=${owner}&repo=${repo}`);
      if (!response.ok) {
        throw new Error('Failed to check configuration');
      }

      return response.json();
    },
    ttl: 30000, // Cache for 30 seconds
    enabled: enabled && !!owner && !!repo,
  });
}

export function useGitHubConfigMutations() {
  const initializeGitCMS = useCallback(
    async (config: { owner: string; repo: string; config: any }) => {
      const response = await fetch('/api/github/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize GitCMS');
      }

      const result = await response.json();

      // Invalidate the config cache after successful initialization
      globalCache.delete(`github:config:${config.owner}:${config.repo}`);

      return result;
    },
    []
  );

  return {
    initializeGitCMS,
  };
}

/**
 * GitHub Repository Hooks
 */
export function useGitHubRepositories(
  options: { enabled?: boolean } = {}
): UseApiDataResult<any[]> {
  const { enabled = true } = options;

  return useApiData({
    key: 'github:repositories',
    fetcher: async () => {
      const response = await fetch('/api/github/repositories');
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
      return response.json();
    },
    ttl: 60000, // Cache for 1 minute
    enabled,
  });
}

/**
 * Public Schema Registry Hooks
 */
export function usePublicSchemas(
  owner: string | null,
  repo: string | null,
  options: { enabled?: boolean } = {}
): UseApiDataResult<GitCMSSchema[]> {
  const { enabled = true } = options;

  return useApiData({
    key: owner && repo ? `public:schemas:${owner}:${repo}` : 'disabled',
    fetcher: async () => {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }

      const response = await fetch(`/api/schemas/public?owner=${owner}&repo=${repo}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch schemas: ${response.statusText}`);
      }

      const data = await response.json();
      return data.schemas || [];
    },
    ttl: 300000, // Cache for 5 minutes
    enabled: enabled && !!owner && !!repo,
  });
}
