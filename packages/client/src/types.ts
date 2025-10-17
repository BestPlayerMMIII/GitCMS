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

export type TransportMode = 'github' | 'http';

export interface GitCMSError extends Error {
  code: string;
  details?: any;
}
