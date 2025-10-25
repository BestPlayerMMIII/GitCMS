/**
 * Schema Management API
 *
 * Provides basic CRUD operations for schema management
 */

import { defaultRegistry, defaultSchemas, type GitCMSSchema } from '@git-cms/core';

export async function schemasGET(action: string, params?: any) {
  try {
    switch (action) {
      case 'list':
        return handleListSchemas();

      case 'get':
        return handleGetSchema(params?.id);

      case 'stats':
        return handleGetStats();

      case 'categories':
        return handleGetCategories();

      case 'defaults':
        return handleGetDefaultSchemas();

      default:
        throw new Error('Invalid action parameter');
    }
  } catch (error) {
    console.error('Schema API error:', error);
    throw error;
  }
}

export async function schemasPOST(action: string, data: any) {
  try {
    switch (action) {
      case 'validate':
        return handleValidateContent(data);

      default:
        throw new Error('Invalid action parameter');
    }
  } catch (error) {
    console.error('Schema API error:', error);
    throw error;
  }
}

// GET handlers

/**
 * List all available schemas
 */
async function handleListSchemas() {
  try {
    const schemas = defaultRegistry.list();

    return {
      schemas,
      total: schemas.length,
    };
  } catch (error) {
    throw new Error('Failed to list schemas');
  }
}

/**
 * Get a specific schema by ID
 */
async function handleGetSchema(id?: string) {
  if (!id) {
    throw new Error('Schema ID is required');
  }

  try {
    const schema = defaultRegistry.get(id);

    if (!schema) {
      throw new Error('Schema not found');
    }

    return { schema };
  } catch (error) {
    throw new Error('Failed to get schema');
  }
}

/**
 * Get registry statistics
 */
async function handleGetStats() {
  try {
    const stats = defaultRegistry.getStats();
    return { stats };
  } catch (error) {
    throw new Error('Failed to get stats');
  }
}

/**
 * Get all categories
 */
async function handleGetCategories() {
  try {
    const categories = defaultRegistry.getCategories();
    return { categories };
  } catch (error) {
    throw new Error('Failed to get categories');
  }
}

/**
 * Get default schema templates
 */
async function handleGetDefaultSchemas() {
  try {
    const schemas = Object.values(defaultSchemas);
    return {
      schemas,
      total: schemas.length,
    };
  } catch (error) {
    throw new Error('Failed to get default schemas');
  }
}

// POST handlers

/**
 * Validate content against a schema
 */
async function handleValidateContent(body: any) {
  try {
    const { content, schemaId, mode = 'create' } = body;

    if (!content || !schemaId) {
      throw new Error('Content and schema ID are required');
    }

    const validation = defaultRegistry.validateContent(content, schemaId, mode);

    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Validation failed');
  }
}
