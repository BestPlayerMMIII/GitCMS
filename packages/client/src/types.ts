export interface GitCMSConfig {
  repository: string;
  branch?: string;
  /**
   * GitHub personal access token for private repositories or authenticated access.
   * Optional for public repositories.
   */
  token?: string;
  /**
   * Custom API endpoint URL for proxied requests.
   * When provided, all requests will go through this endpoint instead of GitHub API.
   * Useful for server-side rendering or when you need additional caching/processing.
   */
  baseUrl?: string;
  /**
   * Force a specific transport mode.
   * - 'public': Direct GitHub API access without authentication (public repos only)
   * - 'authenticated': GitHub API with token (private repos or rate limit benefits)
   * - 'proxy': Use custom API endpoint specified in baseUrl
   *
   * If not specified, the transport mode will be auto-detected:
   * - If baseUrl is provided -> 'proxy'
   * - If token is provided -> 'authenticated'
   * - Otherwise -> 'public'
   */
  transport?: TransportMode;
}

export interface ContentItem {
  id: string;
  [key: string]: any;
}

/**
 * SchemaGroup represents all content items grouped by their schema type
 */
export interface SchemaGroup {
  name: string;
  schema: ContentSchema;
  items: ContentItem[];
}

export interface ContentSchema {
  name: string;
  displayName: string;
  description?: string;
  fields: SchemaField[];
}

export interface SchemaField {
  name: string;
  type:
    | 'string'
    | 'text'
    | 'number'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'array'
    | 'object'
    | 'media'
    | 'rich-text'
    | 'select'
    | 'color';
  required?: boolean;
  description?: string;
  validation?: any;
  itemType?: string; // for array fields
  mediaTypes?: string[]; // for media fields
}

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export type TransportMode = 'public' | 'authenticated' | 'proxy';

export interface GitCMSError extends Error {
  code: string;
  details?: any;
}

/**
 * GitHub API rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}
