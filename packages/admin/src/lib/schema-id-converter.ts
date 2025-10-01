/**
 * Schema ID Converter - Secret Layer Implementation
 *
 * This module provides the "secret layer" that automatically converts between
 * user-friendly schema IDs and system-generated IDs throughout the admin interface.
 *
 * Users always see their friendly IDs, while the system stores and uses generated IDs.
 */

import type { GitCMSSchema } from '@git-cms/core';
import { getUserSchemaId, getSystemSchemaId } from './api-hooks';

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

/**
 * Convert a schema from system format to user-friendly format for display/editing
 */
export async function convertSchemaToUserFormat(
  schema: GitCMSSchema,
  owner: string,
  repo: string
): Promise<GitCMSSchema> {
  try {
    const userDefinedId = await getUserSchemaId(owner, repo, schema.id);
    return {
      ...schema,
      id: userDefinedId,
    };
  } catch (error) {
    // Fallback to original ID if mapping fails
    console.warn('Failed to convert schema ID to user format:', error);
    return schema;
  }
}

/**
 * Convert multiple schemas from system format to user-friendly format
 */
export async function convertSchemasToUserFormat(
  schemas: GitCMSSchema[],
  owner: string,
  repo: string
): Promise<GitCMSSchema[]> {
  const convertedSchemas = await Promise.allSettled(
    schemas.map(schema => convertSchemaToUserFormat(schema, owner, repo))
  );

  return convertedSchemas.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn('Failed to convert schema:', schemas[index].id, result.reason);
      return schemas[index]; // Fallback to original
    }
  });
}

/**
 * Convert a schema from user format to system format for storage
 */
export async function convertSchemaToSystemFormat(
  schema: GitCMSSchema,
  owner: string,
  repo: string,
  originalUserDefinedId?: string
): Promise<{ schema: GitCMSSchema; originalSystemId?: string }> {
  try {
    if (originalUserDefinedId) {
      // Editing existing schema - get the original system ID
      const originalSystemId = await getSystemSchemaId(owner, repo, originalUserDefinedId);
      return {
        schema: {
          ...schema,
          id: originalSystemId,
        },
        originalSystemId,
      };
    } else {
      // This should not happen here - new schemas should use createMapping
      throw new Error('Cannot convert new schema without mapping creation');
    }
  } catch (error) {
    console.error('Failed to convert schema to system format:', error);
    throw error;
  }
}

/**
 * Convert content item schema references from system to user format
 */
export async function convertContentToUserFormat(
  content: ContentItem,
  owner: string,
  repo: string
): Promise<ContentItem> {
  try {
    const userDefinedSchemaId = await getUserSchemaId(owner, repo, content.schemaId);
    return {
      ...content,
      schemaId: userDefinedSchemaId,
    };
  } catch (error) {
    console.warn('Failed to convert content schemaId to user format:', error);
    return content;
  }
}

/**
 * Convert multiple content items from system to user format
 */
export async function convertContentListToUserFormat(
  contentList: ContentItem[],
  owner: string,
  repo: string
): Promise<ContentItem[]> {
  const convertedContent = await Promise.allSettled(
    contentList.map(content => convertContentToUserFormat(content, owner, repo))
  );

  return convertedContent.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn('Failed to convert content item:', contentList[index].id, result.reason);
      return contentList[index]; // Fallback to original
    }
  });
}

/**
 * Convert content from user format to system format for storage
 */
export async function convertContentToSystemFormat(
  content: ContentItem,
  owner: string,
  repo: string
): Promise<ContentItem> {
  try {
    const systemSchemaId = await getSystemSchemaId(owner, repo, content.schemaId);
    return {
      ...content,
      schemaId: systemSchemaId,
    };
  } catch (error) {
    console.error('Failed to convert content to system format:', error);
    throw error;
  }
}

/**
 * Convert any object that might contain schema ID references from system to user format
 * This is useful for complex data structures that might reference schemas
 */
export async function convertSchemaReferencesToUserFormat(
  data: any,
  owner: string,
  repo: string,
  schemaIdFields: string[] = ['schemaId', 'schema_id', 'type']
): Promise<any> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item => convertSchemaReferencesToUserFormat(item, owner, repo, schemaIdFields))
    );
  }

  const converted = { ...data };

  for (const field of schemaIdFields) {
    if (field in converted && typeof converted[field] === 'string') {
      try {
        converted[field] = await getUserSchemaId(owner, repo, converted[field]);
      } catch (error) {
        // Keep original value if conversion fails
        console.warn(`Failed to convert ${field} to user format:`, error);
      }
    }
  }

  // Recursively convert nested objects
  for (const [key, value] of Object.entries(converted)) {
    if (value && typeof value === 'object') {
      converted[key] = await convertSchemaReferencesToUserFormat(
        value,
        owner,
        repo,
        schemaIdFields
      );
    }
  }

  return converted;
}

/**
 * Convert any object that might contain schema ID references from user to system format
 */
export async function convertSchemaReferencesToSystemFormat(
  data: any,
  owner: string,
  repo: string,
  schemaIdFields: string[] = ['schemaId', 'schema_id', 'type']
): Promise<any> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return Promise.all(
      data.map(item => convertSchemaReferencesToSystemFormat(item, owner, repo, schemaIdFields))
    );
  }

  const converted = { ...data };

  for (const field of schemaIdFields) {
    if (field in converted && typeof converted[field] === 'string') {
      try {
        converted[field] = await getSystemSchemaId(owner, repo, converted[field]);
      } catch (error) {
        // Keep original value if conversion fails
        console.warn(`Failed to convert ${field} to system format:`, error);
      }
    }
  }

  // Recursively convert nested objects
  for (const [key, value] of Object.entries(converted)) {
    if (value && typeof value === 'object') {
      converted[key] = await convertSchemaReferencesToSystemFormat(
        value,
        owner,
        repo,
        schemaIdFields
      );
    }
  }

  return converted;
}
