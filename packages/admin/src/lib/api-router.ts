/**
 * API Router Utility
 *
 * This module provides a seamless migration path from fetch('/api/...') to client-side functions.
 * It routes API paths to the appropriate data functions, making the transition transparent.
 *
 * Usage Migration:
 * BEFORE: const response = await fetch('/api/github/repositories')
 * AFTER:  const repositories = await fetchData('/api/github/repositories')
 *
 * The router automatically:
 * - Parses URL parameters
 * - Routes to correct data function
 * - Handles errors consistently
 * - Returns data directly (no .json() needed)
 */

// Content
import { contentGET, contentPOST, contentDELETE } from '@/app/data/content.data';
import { contentParsePOST } from '@/app/data/content/parse.data';

// GitHub
import { githubRepositoriesGET } from '@/app/data/github/repositories.data';
import { githubConfigGET, githubConfigPOST } from '@/app/data/github/config.data';
import { githubFilesGET, githubFilesPOST, githubFilesDELETE } from '@/app/data/github/files.data';
import {
  githubPagesGET,
  githubPagesPOST,
  githubPagesPUT,
  githubPagesDELETE,
} from '@/app/data/github/pages.data';
import { gitcmsConfigGET } from '@/app/data/github/repositories/gitcms-config.data';

// Schemas
import {
  schemasStorageGET,
  schemasStoragePOST,
  schemasStorageDELETE,
} from '@/app/data/schemas/storage.data';
import { schemasGET, schemasPOST } from '@/app/data/schemas.data';
import { schemasPublicGET } from '@/app/data/schemas/public.data';
import { schemasRenamePOST } from '@/app/data/schemas/rename.data';
import { schemasImportGET } from '@/app/data/schemas/import.data';

// LFS
import { lfsStatusGET, lfsStatusPOST } from '@/app/data/lfs/status.data';
import { lfsInitializePOST } from '@/app/data/lfs/initialize.data';
import { lfsPatternsPOST, lfsPatternsDELETE } from '@/app/data/lfs/patterns.data';

// Media
import { mediaGET, mediaPOST, mediaPUT, mediaDELETE } from '@/app/data/media.data';

// Debug
import { debugTokenGET } from '@/app/data/debug/token.data';
import { headers } from 'next/headers';

// ============================================================================
// Router Types
// ============================================================================

interface FetchDataOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  params?: Record<string, any>;
}

type ApiResponse<T> = T;

// ============================================================================
// Main Router Function
// ============================================================================

/**
 * Route API calls to appropriate client-side functions
 *
 * This function replaces fetch('/api/...') calls and provides:
 * - Automatic routing to data-layer functions
 * - Consistent error handling
 * - Direct data return (no .json() needed)
 * - Type safety
 *
 * @example
 * ```ts
 * // Simple GET
 * const repos = await fetchDataWithOptions('/api/github/repositories');
 *
 * // With query parameters
 * const schemas = await fetchDataWithOptions('/api/schemas/storage', {
 *   params: { action: 'list', owner: 'user', repo: 'my-repo' }
 * });
 *
 * // POST with body
 * const newContent = await fetchDataWithOptions('/api/content', {
 *   method: 'POST',
 *   params: { action: 'create', owner: 'user', repo: 'my-repo' },
 *   body: { schemaId: 'blog', data: { title: 'Hello' } }
 * });
 * ```
 */
async function fetchDataWithOptions<T = any>(
  path: string,
  options: FetchDataOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, params = {} } = options;

  try {
    // Parse the path and extract route segments
    const cleanPath = path.replace(/^\/api\//, '');
    const segments = cleanPath.split('/').filter(Boolean);

    // Route to appropriate handler
    const result = await routeRequest(segments, method, params, body);
    return result as ApiResponse<T>;
  } catch (error) {
    console.error('fetchData error:', error);
    throw error;
  }
}

/**
 * Migration helper: converts old fetch() calls to fetchDataWithOptions()
 * Returns a Response-like object for backward compatibility
 *
 * @example
 * ```ts
 * // Old code:
 * const response = await fetch('/api/content?action=list&owner=x&repo=y');
 * const data = await response.json();
 *
 * // New code (still works the same):
 * const response = await fetchData('/api/content?action=list&owner=x&repo=y');
 * const data = await response.json();
 * ```
 */
export async function fetchData(
  url: string,
  init?: { method?: string; headers?: any; body?: any }
): Promise<any> {
  try {
    const [path] = url.split('?');
    const params = parseQueryString(url);

    let body: any;
    if (init?.body) {
      // Handle FormData (for file uploads)
      if (init.body instanceof FormData) {
        // Convert FormData to object and extract params
        const formObj: any = {};
        init.body.forEach((value: any, key: string) => {
          formObj[key] = value;
        });

        // Extract owner/repo from FormData and merge with params
        if (formObj.owner) params.owner = formObj.owner;
        if (formObj.repo) params.repo = formObj.repo;

        body = formObj;
      } else if (typeof init.body === 'string') {
        body = JSON.parse(init.body);
      } else {
        body = init.body;
      }
    }

    const data = await fetchDataWithOptions(path, {
      method: (init?.method as any) || 'GET',
      params,
      body,
    });

    // Return a Response-like object for backward compatibility
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    };
  } catch (error: any) {
    // Return error response
    return {
      ok: false,
      status: error.status || 500,
      statusText: error.statusText || 'Internal Server Error',
      json: async () => ({ error: error.message || 'An error occurred' }),
      text: async () => JSON.stringify({ error: error.message || 'An error occurred' }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    };
  }
}

// ============================================================================
// Request Router
// ============================================================================

async function routeRequest(
  segments: string[],
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  const [category, ...rest] = segments;

  switch (category) {
    case 'github':
      return await routeGitHub(rest, method, params, body);

    case 'schemas':
      return await routeSchemas(rest, method, params, body);

    case 'content':
      return await routeContent(rest, method, params, body);

    case 'media':
      return await routeMedia(rest, method, params, body);

    case 'lfs':
      return await routeLFS(rest, method, params, body);

    case 'cdn':
      return await routeCDN(rest, method, params, body);

    case 'debug':
      return await routeDebug(rest, method, params, body);

    default:
      throw new Error(`Unknown API category: ${category}`);
  }
}

// ============================================================================
// Category Routers
// ============================================================================

async function routeGitHub(
  segments: string[],
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  const [endpoint, ...rest] = segments;

  switch (endpoint) {
    case 'repositories':
      if (method === 'GET') {
        // Handle both /github/repositories and /github/repositories/{owner}/{repo}/gitcms-config
        if (rest.length >= 3 && rest[2] === 'gitcms-config') {
          const [owner, repo] = rest;
          return await gitcmsConfigGET(owner, repo);
        }
        return await githubRepositoriesGET();
      }
      break;

    case 'config':
      if (method === 'GET') {
        const { owner, repo, path } = params;
        return await githubConfigGET(owner, repo, { path });
      }
      if (method === 'POST' || method === 'PUT') {
        const { owner, repo } = params;
        return await githubConfigPOST(owner, repo, body);
      }
      break;

    case 'files':
      const { owner, repo, path } = params;
      if (method === 'GET') {
        return await githubFilesGET(owner, repo, path);
      }
      if (method === 'POST') {
        const { content, message, sha } = body;
        return await githubFilesPOST(owner, repo, path, content, message, sha);
      }
      if (method === 'DELETE') {
        const { sha, message } = params;
        return await githubFilesDELETE(owner, repo, path, sha, message);
      }
      break;

    case 'pages':
      const pagesOwner = params.owner;
      const pagesRepo = params.repo;
      if (method === 'GET') {
        return await githubPagesGET(pagesOwner, pagesRepo);
      }
      if (method === 'POST') {
        const { source, customDomain } = body;
        return await githubPagesPOST(pagesOwner, pagesRepo, source, customDomain);
      }
      if (method === 'PUT') {
        const { source, customDomain } = body;
        return await githubPagesPUT(pagesOwner, pagesRepo, source, customDomain);
      }
      if (method === 'DELETE') {
        return await githubPagesDELETE(pagesOwner, pagesRepo);
      }
      break;
  }

  throw new Error(`Unknown GitHub endpoint: ${endpoint}`);
}

async function routeSchemas(
  segments: string[],
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  const [endpoint] = segments;

  switch (endpoint) {
    case 'storage':
      return await routeSchemasStorage(method, params, body);

    case 'public':
      if (method === 'GET') {
        const { owner, repo, branch } = params;
        return await schemasPublicGET(owner, repo, branch);
      }
      break;

    case 'import':
      if (method === 'GET') {
        const { owner, repo, branch, includePrivate } = params;
        return await schemasImportGET({ owner, repo, branch, includePrivate });
      }
      break;

    case 'rename':
      if (method === 'POST') {
        const { owner, repo } = params;
        return await schemasRenamePOST(owner, repo, body);
      }
      break;

    default:
      // Default schemas endpoint - registry operations
      if (method === 'GET') {
        const { action, id } = params;
        return await schemasGET(action, { id });
      }
      if (method === 'POST') {
        const { action } = params;
        return await schemasPOST(action, body);
      }
  }

  throw new Error(`Unknown schemas endpoint: ${endpoint || 'default'}`);
}

async function routeSchemasStorage(
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  const { action, owner, repo, schemaId, currentSchemaId, id } = params;

  switch (method) {
    case 'GET':
      return await schemasStorageGET(owner, repo, {
        action: action as 'list' | 'get' | 'check-setup' | 'validate-id',
        schemaId,
        id,
        currentId: currentSchemaId,
      });

    case 'POST':
      return await schemasStoragePOST(
        owner,
        repo,
        { action: action as 'save' | 'init-setup' | 'sync' },
        body
      );

    case 'DELETE':
      return await schemasStorageDELETE(owner, repo, { schemaId });
  }

  throw new Error(`Unknown schemas storage method: ${method}`);
}

async function routeContent(
  segments: string[],
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  const [endpoint] = segments;
  const { action, owner, repo, schemaId, contentId } = params;

  if (endpoint === 'parse') {
    if (method === 'POST') {
      return await contentParsePOST(body);
    }
  }

  switch (method) {
    case 'GET':
      return await contentGET(owner, repo, {
        action: action as 'list' | 'get' | 'validate-id',
        schemaId,
        contentId,
        id: params.id,
        currentId: params.currentId,
      });

    case 'POST':
      return await contentPOST(
        owner,
        repo,
        { action: action as 'create' | 'update' },
        body,
        body?.author
      );

    case 'DELETE':
      return await contentDELETE(owner, repo, { schemaId, contentId });
  }

  throw new Error(`Unknown content action or method: ${action || method}`);
}

async function routeMedia(
  segments: string[],
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  const { action, owner, repo, mediaId } = params;

  switch (method) {
    case 'GET':
      return await mediaGET(owner, repo, action, params);

    case 'POST':
      return await mediaPOST(owner, repo, action, body);

    case 'PUT':
      return await mediaPUT(owner, repo, action, body);

    case 'DELETE':
      return await mediaDELETE(owner, repo, mediaId);
  }

  throw new Error(`Unknown media method: ${method}`);
}

async function routeLFS(
  segments: string[],
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  const [endpoint] = segments;
  const { owner, repo } = params;

  switch (endpoint) {
    case 'status':
      if (method === 'GET') {
        return await lfsStatusGET(owner, repo);
      }
      if (method === 'POST') {
        return await lfsStatusPOST(owner, repo, body);
      }
      break;

    case 'initialize':
      if (method === 'POST') {
        const { patterns } = body;
        return await lfsInitializePOST(owner, repo, patterns);
      }
      break;

    case 'patterns':
      if (method === 'POST') {
        const { pattern } = body;
        return await lfsPatternsPOST(owner, repo, pattern);
      }
      if (method === 'DELETE') {
        const { pattern } = params;
        return await lfsPatternsDELETE(owner, repo, pattern);
      }
      break;
  }

  throw new Error(`Unknown LFS endpoint: ${endpoint}`);
}

async function routeCDN(
  segments: string[],
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  // CDN operations would need implementation
  throw new Error('CDN operations not yet implemented in client-side');
}

async function routeDebug(
  segments: string[],
  method: string,
  params: Record<string, any>,
  body?: any
): Promise<any> {
  const [endpoint] = segments;

  switch (endpoint) {
    case 'token':
      if (method === 'GET') {
        return await debugTokenGET();
      }
      break;
  }

  throw new Error(`Unknown debug endpoint: ${endpoint}`);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Helper to build query string from params object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Helper to parse query string into params object
 */
export function parseQueryString(url: string): Record<string, any> {
  const searchParams = new URLSearchParams(url.split('?')[1] || '');
  const params: Record<string, any> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}
