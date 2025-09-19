// Core types used across GitCMS packages

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
  type: FieldType;
  required?: boolean;
  description?: string;
  validation?: ValidationRule[];
  itemType?: string; // for array fields
  mediaTypes?: string[]; // for media fields
  options?: string[]; // for select fields
  multiple?: boolean; // for select and media fields
}

export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'array'
  | 'object'
  | 'media'
  | 'reference'
  | 'rich-text'
  | 'select'
  | 'color';

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

export interface GitCMSError extends Error {
  code: string;
  details?: any;
}

export interface Repository {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

export interface User {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
}

export interface GitCMSMetadata {
  version: string;
  createdAt: string;
  updatedAt: string;
  schemas: Record<string, ContentSchema>;
  config: {
    mediaPath: string;
    contentPath: string;
    collections: string[];
  };
}

export interface MediaFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}
