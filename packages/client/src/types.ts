export interface GitCMSConfig {
  repository: string;
  branch?: string;
  token?: string;
  baseUrl?: string;
}

export interface ContentItem {
  id: string;
  [key: string]: any;
}

export interface Collection {
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
    | 'number'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'markdown'
    | 'media'
    | 'array'
    | 'object';
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

export type TransportMode = 'github' | 'http';

export interface GitCMSError extends Error {
  code: string;
  details?: any;
}

export interface EmbeddedMedia {
  url: string;
  alt: string;
  loading: 'lazy' | 'eager';
  thumbnail?: string;
  original?: string;
  metadata?: {
    filename: string;
    size: string;
    type: string;
  };
}

export interface EmbeddedVideo {
  url: string;
  autoplay: boolean;
  controls: boolean;
  muted: boolean;
  loop: boolean;
  poster?: string;
  type: string;
}

export interface ResponsiveImageSources {
  default: string;
  sources: {
    media: string;
    srcset: string;
    type: string;
  }[];
  fallback: string;
}
