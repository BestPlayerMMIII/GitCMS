/**
 * GitCMS Content Type Registry
 *
 * This module provides a registry for managing multiple content types,
 * including CRUD operations, validation, import/export functionality,
 * and schema inheritance/composition.
 */

import type { GitCMSSchema, FieldDefinition, SchemaMetadata } from './schemas';
import { SchemaUtils, defaultSchemas } from './schemas';
import { ValidationEngine, defaultValidationEngine } from './validation';

// Registry error types
export class RegistryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}

// Schema registration options
export interface SchemaRegistrationOptions {
  override?: boolean;
  validate?: boolean;
  merge?: boolean;
}

// Schema search/filter options
export interface SchemaSearchOptions {
  category?: string;
  tags?: string[];
  author?: string;
  version?: string;
  namePattern?: string;
}

// Schema export format
export interface SchemaExport {
  version: string;
  exportedAt: string;
  schemas: GitCMSSchema[];
  metadata?: {
    totalCount: number;
    categories: string[];
    tags: string[];
  };
}

// Schema inheritance chain
export interface InheritanceChain {
  schema: GitCMSSchema;
  parent?: InheritanceChain;
  children: InheritanceChain[];
}

// Content Type Registry class
export class ContentTypeRegistry {
  private schemas: Map<string, GitCMSSchema> = new Map();
  private validationEngine: ValidationEngine;
  private inheritanceMap: Map<string, string[]> = new Map(); // parent -> children
  private reverseInheritanceMap: Map<string, string> = new Map(); // child -> parent

  constructor(validationEngine?: ValidationEngine) {
    this.validationEngine = validationEngine || defaultValidationEngine;
    this.loadDefaultSchemas();
  }

  /**
   * Load default schemas into the registry
   */
  private loadDefaultSchemas(): void {
    for (const [id, schema] of Object.entries(defaultSchemas)) {
      this.schemas.set(id, schema);
    }
  }

  /**
   * Register a new schema
   */
  register(schema: GitCMSSchema, options: SchemaRegistrationOptions = {}): void {
    const { override = false, validate = true, merge = false } = options;

    // Validate schema if requested
    if (validate) {
      const validation = SchemaUtils.validateSchema(schema);
      if (!validation.valid) {
        throw new RegistryError(
          `Schema validation failed: ${validation.errors?.join(', ')}`,
          'SCHEMA_VALIDATION_FAILED',
          validation.errors
        );
      }
    }

    // Check if schema already exists
    const existingSchema = this.schemas.get(schema.id);
    if (existingSchema && !override && !merge) {
      throw new RegistryError(
        `Schema with id '${schema.id}' already exists`,
        'SCHEMA_ALREADY_EXISTS',
        { existingSchema, newSchema: schema }
      );
    }

    // Handle merging
    if (merge && existingSchema) {
      const mergedSchema = SchemaUtils.mergeSchemas(existingSchema, schema);
      this.schemas.set(schema.id, mergedSchema);
    } else {
      this.schemas.set(schema.id, schema);
    }

    // Handle inheritance
    if (schema.extends) {
      this.updateInheritanceMap(schema.id, schema.extends);
    }
  }

  /**
   * Get a schema by ID
   */
  get(id: string): GitCMSSchema | null {
    return this.schemas.get(id) || null;
  }

  /**
   * Get a resolved schema (with inheritance applied)
   */
  getResolved(id: string): GitCMSSchema | null {
    const schema = this.schemas.get(id);
    if (!schema) return null;

    if (!schema.extends) return schema;

    // Resolve inheritance chain
    const parentSchema = this.getResolved(schema.extends);
    if (!parentSchema) {
      throw new RegistryError(
        `Parent schema '${schema.extends}' not found for schema '${id}'`,
        'PARENT_SCHEMA_NOT_FOUND',
        { schemaId: id, parentId: schema.extends }
      );
    }

    return SchemaUtils.mergeSchemas(parentSchema, schema);
  }

  /**
   * Check if a schema exists
   */
  has(id: string): boolean {
    return this.schemas.has(id);
  }

  /**
   * Update an existing schema
   */
  update(
    id: string,
    updates: Partial<GitCMSSchema>,
    options: SchemaRegistrationOptions = {}
  ): void {
    const existingSchema = this.schemas.get(id);
    if (!existingSchema) {
      throw new RegistryError(`Schema with id '${id}' not found`, 'SCHEMA_NOT_FOUND', {
        schemaId: id,
      });
    }

    const updatedSchema: GitCMSSchema = {
      ...existingSchema,
      ...updates,
      id, // Ensure ID cannot be changed
      metadata: {
        ...existingSchema.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    this.register(updatedSchema, { ...options, override: true });
  }

  /**
   * Remove a schema from the registry
   */
  remove(id: string): boolean {
    const schema = this.schemas.get(id);
    if (!schema) return false;

    // Check for dependent schemas
    const dependents = this.findDependents(id);
    if (dependents.length > 0) {
      throw new RegistryError(
        `Cannot remove schema '${id}' as it has dependent schemas: ${dependents.join(', ')}`,
        'SCHEMA_HAS_DEPENDENTS',
        { schemaId: id, dependents }
      );
    }

    // Remove from maps
    this.schemas.delete(id);
    this.inheritanceMap.delete(id);
    this.reverseInheritanceMap.delete(id);

    // Clean up inheritance references
    for (const [parent, children] of this.inheritanceMap.entries()) {
      const filteredChildren = children.filter(child => child !== id);
      if (filteredChildren.length === 0) {
        this.inheritanceMap.delete(parent);
      } else {
        this.inheritanceMap.set(parent, filteredChildren);
      }
    }

    return true;
  }

  /**
   * List all schemas with optional filtering
   */
  list(options: SchemaSearchOptions = {}): GitCMSSchema[] {
    let schemas = Array.from(this.schemas.values());

    // Apply filters
    if (options.category) {
      schemas = schemas.filter(s => s.metadata.category === options.category);
    }

    if (options.tags && options.tags.length > 0) {
      schemas = schemas.filter(
        s => s.metadata.tags && options.tags!.some(tag => s.metadata.tags!.includes(tag))
      );
    }

    if (options.author) {
      schemas = schemas.filter(s => s.metadata.author === options.author);
    }

    if (options.version) {
      schemas = schemas.filter(s => s.metadata.version === options.version);
    }

    if (options.namePattern) {
      const pattern = new RegExp(options.namePattern, 'i');
      schemas = schemas.filter(s => pattern.test(s.metadata.name) || pattern.test(s.id));
    }

    return schemas;
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const schema of this.schemas.values()) {
      if (schema.metadata.category) {
        categories.add(schema.metadata.category);
      }
    }
    return Array.from(categories).sort();
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    const tags = new Set<string>();
    for (const schema of this.schemas.values()) {
      if (schema.metadata.tags) {
        schema.metadata.tags.forEach(tag => tags.add(tag));
      }
    }
    return Array.from(tags).sort();
  }

  /**
   * Get all authors
   */
  getAuthors(): string[] {
    const authors = new Set<string>();
    for (const schema of this.schemas.values()) {
      if (schema.metadata.author) {
        authors.add(schema.metadata.author);
      }
    }
    return Array.from(authors).sort();
  }

  /**
   * Find schemas that depend on a given schema
   */
  findDependents(schemaId: string): string[] {
    return this.inheritanceMap.get(schemaId) || [];
  }

  /**
   * Get inheritance chain for a schema
   */
  getInheritanceChain(schemaId: string): InheritanceChain | null {
    const schema = this.schemas.get(schemaId);
    if (!schema) return null;

    const buildChain = (id: string): InheritanceChain => {
      const currentSchema = this.schemas.get(id)!;
      const children = this.findDependents(id).map(childId => buildChain(childId));

      const chain: InheritanceChain = {
        schema: currentSchema,
        children,
      };

      // Add parent if exists
      if (currentSchema.extends) {
        const parentChain = this.getInheritanceChain(currentSchema.extends);
        if (parentChain) {
          chain.parent = parentChain;
        }
      }

      return chain;
    };

    return buildChain(schemaId);
  }

  /**
   * Validate content against a schema
   */
  validateContent(
    content: Record<string, any>,
    schemaId: string,
    mode: 'create' | 'update' = 'create'
  ) {
    const schema = this.getResolved(schemaId);
    if (!schema) {
      throw new RegistryError(`Schema '${schemaId}' not found`, 'SCHEMA_NOT_FOUND', { schemaId });
    }

    return this.validationEngine.validateContent(content, schema, mode);
  }

  /**
   * Export schemas
   */
  export(schemaIds?: string[]): SchemaExport {
    const schemas = schemaIds
      ? (schemaIds.map(id => this.schemas.get(id)).filter(Boolean) as GitCMSSchema[])
      : Array.from(this.schemas.values());

    const categories = new Set<string>();
    const tags = new Set<string>();

    schemas.forEach(schema => {
      if (schema.metadata.category) categories.add(schema.metadata.category);
      if (schema.metadata.tags) schema.metadata.tags.forEach(tag => tags.add(tag));
    });

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schemas,
      metadata: {
        totalCount: schemas.length,
        categories: Array.from(categories).sort(),
        tags: Array.from(tags).sort(),
      },
    };
  }

  /**
   * Import schemas from export
   */
  import(exportData: SchemaExport, options: SchemaRegistrationOptions = {}): void {
    if (!exportData.schemas || !Array.isArray(exportData.schemas)) {
      throw new RegistryError('Invalid export data format', 'INVALID_EXPORT_FORMAT', exportData);
    }

    const errors: { schemaId: string; error: string }[] = [];

    for (const schema of exportData.schemas) {
      try {
        this.register(schema, options);
      } catch (error) {
        errors.push({
          schemaId: schema.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (errors.length > 0) {
      throw new RegistryError(`Failed to import ${errors.length} schemas`, 'IMPORT_FAILED', errors);
    }
  }

  /**
   * Clone a schema with a new ID
   */
  clone(sourceId: string, newId: string, newName?: string): GitCMSSchema {
    const sourceSchema = this.schemas.get(sourceId);
    if (!sourceSchema) {
      throw new RegistryError(`Source schema '${sourceId}' not found`, 'SCHEMA_NOT_FOUND', {
        schemaId: sourceId,
      });
    }

    const clonedSchema: GitCMSSchema = {
      ...JSON.parse(JSON.stringify(sourceSchema)), // Deep clone
      id: newId,
      metadata: {
        ...sourceSchema.metadata,
        name: newName || `${sourceSchema.metadata.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    this.register(clonedSchema);
    return clonedSchema;
  }

  /**
   * Generate TypeScript interfaces for all schemas
   */
  generateTypeScript(): string {
    const interfaces = Array.from(this.schemas.values())
      .map(schema => SchemaUtils.generateTypeScript(schema))
      .join('\n\n');

    return `// Generated TypeScript interfaces for GitCMS schemas\n// Generated at: ${new Date().toISOString()}\n\n${interfaces}`;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const schemas = Array.from(this.schemas.values());
    const categories = this.getCategories();
    const tags = this.getTags();
    const authors = this.getAuthors();

    const fieldTypeCounts: Record<string, number> = {};
    let totalFields = 0;

    schemas.forEach(schema => {
      Object.values(schema.fields).forEach(field => {
        totalFields++;
        fieldTypeCounts[field.type] = (fieldTypeCounts[field.type] || 0) + 1;
      });
    });

    return {
      totalSchemas: schemas.length,
      totalFields,
      categories: categories.length,
      tags: tags.length,
      authors: authors.length,
      fieldTypeCounts,
      inheritance: {
        totalParents: this.inheritanceMap.size,
        totalChildren: this.reverseInheritanceMap.size,
      },
    };
  }

  /**
   * Clear all schemas (except defaults)
   */
  clear(includeDefaults = false): void {
    if (includeDefaults) {
      this.schemas.clear();
      this.inheritanceMap.clear();
      this.reverseInheritanceMap.clear();
    } else {
      // Keep only default schemas
      const defaultIds = Object.keys(defaultSchemas);
      for (const [id] of this.schemas) {
        if (!defaultIds.includes(id)) {
          this.remove(id);
        }
      }
    }
  }

  /**
   * Update inheritance mapping
   */
  private updateInheritanceMap(childId: string, parentId: string): void {
    // Add to inheritance map (parent -> children)
    const children = this.inheritanceMap.get(parentId) || [];
    if (!children.includes(childId)) {
      children.push(childId);
      this.inheritanceMap.set(parentId, children);
    }

    // Add to reverse map (child -> parent)
    this.reverseInheritanceMap.set(childId, parentId);
  }
}

// Default registry instance
export const defaultRegistry = new ContentTypeRegistry();

// Convenience functions
export function registerSchema(schema: GitCMSSchema, options?: SchemaRegistrationOptions): void {
  defaultRegistry.register(schema, options);
}

export function getSchema(id: string): GitCMSSchema | null {
  return defaultRegistry.get(id);
}

export function getResolvedSchema(id: string): GitCMSSchema | null {
  return defaultRegistry.getResolved(id);
}

export function listSchemas(options?: SchemaSearchOptions): GitCMSSchema[] {
  return defaultRegistry.list(options);
}

export function validateContent(
  content: Record<string, any>,
  schemaId: string,
  mode: 'create' | 'update' = 'create'
) {
  return defaultRegistry.validateContent(content, schemaId, mode);
}
