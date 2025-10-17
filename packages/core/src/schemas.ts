/**
 * GitCMS Schema System
 *
 * This module provides a comprehensive schema definition system for GitCMS,
 * allowing users to define content types with validation, relationships,
 * and dynamic form generation capabilities.
 */

import { z } from 'zod';

// Base field types supported by GitCMS
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

// Field validation rules
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: string | number | boolean;
  message?: string;
}

// Field options for select and multi-select fields
export interface FieldOption {
  label: string;
  value: string | number;
  description?: string;
}

// Base field definition
export interface BaseField {
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  validation?: ValidationRule[];
  required?: boolean;
  hidden?: boolean;
  readonly?: boolean;
  group?: string;
  order?: number;
}

// String field with specific properties
export interface StringField extends BaseField {
  type: 'string' | 'text' | 'color';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'lowercase' | 'uppercase' | 'capitalize';
  // For string fields with predefined patterns (email, url, etc.)
  validation?: ValidationRule[];
}

// Number field with specific properties
export interface NumberField extends BaseField {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
}

// Date/DateTime field with specific properties
export interface DateField extends BaseField {
  type: 'date' | 'datetime';
  min?: string;
  max?: string;
  format?: string;
}

// Array field with item schema
export interface ArrayField extends BaseField {
  type: 'array';
  items: FieldDefinition;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

// Object field with properties schema
export interface ObjectField extends BaseField {
  type: 'object';
  properties: Record<string, FieldDefinition>;
  additionalProperties?: boolean;
}

// Media field for file uploads (replaces both 'media' and 'file' types)
export interface MediaField extends BaseField {
  type: 'media';
  accept?: string[];
  maxSize?: number;
  multiple?: boolean;
  storage?: 'github' | 'external';
  mediaTypes?: string[];
}

// Reference field for relationships
export interface ReferenceField extends BaseField {
  type: 'reference';
  collection: string;
  multiple?: boolean;
  displayField?: string;
}

// Rich text field for WYSIWYG content
export interface RichTextField extends BaseField {
  type: 'rich-text';
  toolbar?: string[];
  maxLength?: number;
  allowHtml?: boolean;
}

// Select field with options (supports both single and multiple selection)
export interface SelectField extends BaseField {
  type: 'select';
  options: FieldOption[];
  allowCustom?: boolean;
  multiple?: boolean; // Replaces separate 'multi-select' type
}

// Union type for all field definitions
export type FieldDefinition =
  | StringField
  | NumberField
  | DateField
  | ArrayField
  | ObjectField
  | MediaField
  | ReferenceField
  | RichTextField
  | SelectField
  | BaseField;

// Schema metadata
export interface SchemaMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  category?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

// Schema configuration
export interface SchemaConfig {
  slug?: {
    field?: string;
    pattern?: string;
    unique?: boolean;
  };
  timestamps?: {
    createdAt?: string;
    updatedAt?: string;
  };
  preview?: {
    template?: string;
    fields?: string[];
  };
  hooks?: {
    beforeCreate?: string;
    afterCreate?: string;
    beforeUpdate?: string;
    afterUpdate?: string;
    beforeDelete?: string;
    afterDelete?: string;
  };
}

// Main schema definition
export interface GitCMSSchema {
  id: string;
  metadata: SchemaMetadata;
  fields: Record<string, FieldDefinition>;
  config?: SchemaConfig;
  extends?: string; // Schema inheritance
}

// Pre-built schema templates for common content types
export const blogPostSchema: GitCMSSchema = {
  id: 'blog-post',
  metadata: {
    name: 'Blog Post',
    version: '1.0.0',
    description: 'Blog post content type with rich content features',
    category: 'Content',
    icon: '📝',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  fields: {
    title: {
      type: 'string',
      label: 'Title',
      required: true,
      description: 'Post title',
      maxLength: 200,
    },
    slug: {
      type: 'string',
      label: 'URL Slug',
      required: true,
      description: 'URL slug for the post',
      pattern: '^[a-z0-9-]+$',
    },
    excerpt: {
      type: 'text',
      label: 'Excerpt',
      description: 'Short description or excerpt',
      maxLength: 500,
    },
    content: {
      type: 'rich-text',
      label: 'Content',
      required: true,
      description: 'Post content with rich text and markdown support',
    },
    featuredImage: {
      type: 'media',
      label: 'Featured Image',
      mediaTypes: ['image'],
      description: 'Featured image for the post',
    },
    tags: {
      type: 'array',
      label: 'Tags',
      description: 'Post tags',
      items: { type: 'string', label: 'Tag' } as StringField,
    },
    category: {
      type: 'select',
      label: 'Category',
      options: [
        { label: 'Technology', value: 'technology' },
        { label: 'Lifestyle', value: 'lifestyle' },
        { label: 'Business', value: 'business' },
        { label: 'Other', value: 'other' },
      ],
      description: 'Post category',
    },
    published: {
      type: 'boolean',
      label: 'Published',
      description: 'Whether the post is published',
      defaultValue: false,
    },
    publishedAt: {
      type: 'datetime',
      label: 'Published At',
      description: 'Publication date and time',
    },
    author: {
      type: 'string',
      label: 'Author',
      description: 'Post author',
    },
  },
  config: {
    slug: {
      field: 'slug',
      unique: true,
    },
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    preview: {
      fields: ['title', 'excerpt', 'featuredImage'],
    },
  },
};

export const projectSchema: GitCMSSchema = {
  id: 'project',
  metadata: {
    name: 'Project',
    version: '1.0.0',
    description: 'Portfolio project content type',
    category: 'Portfolio',
    icon: '💼',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  fields: {
    title: {
      type: 'string',
      label: 'Title',
      required: true,
      description: 'Project title',
      maxLength: 200,
    },
    slug: {
      type: 'string',
      label: 'URL Slug',
      required: true,
      description: 'URL slug for the project',
      pattern: '^[a-z0-9-]+$',
    },
    description: {
      type: 'text',
      label: 'Description',
      required: true,
      description: 'Project description',
      maxLength: 500,
    },
    content: {
      type: 'rich-text',
      label: 'Content',
      description: 'Detailed project information with rich text and markdown support',
    },
    featuredImage: {
      type: 'media',
      label: 'Featured Image',
      mediaTypes: ['image'],
      description: 'Featured image for the project',
    },
    gallery: {
      type: 'array',
      label: 'Gallery',
      description: 'Project gallery images',
      items: { type: 'media', label: 'Image', mediaTypes: ['image'] } as MediaField,
    },
    technologies: {
      type: 'array',
      label: 'Technologies',
      description: 'Technologies used in the project',
      items: { type: 'string', label: 'Technology' } as StringField,
    },
    status: {
      type: 'select',
      label: 'Status',
      options: [
        { label: 'Planning', value: 'planning' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Archived', value: 'archived' },
      ],
      description: 'Project status',
    },
    liveUrl: {
      type: 'string',
      label: 'Live URL',
      description: 'Live project URL',
      validation: [
        {
          type: 'pattern',
          value: '^https?://.*$',
          message: 'Must be a valid URL starting with http:// or https://',
        },
      ],
    },
    githubUrl: {
      type: 'string',
      label: 'GitHub URL',
      description: 'GitHub repository URL',
      validation: [
        {
          type: 'pattern',
          value: '^https?://.*$',
          message: 'Must be a valid URL starting with http:// or https://',
        },
      ],
    },
    startDate: {
      type: 'date',
      label: 'Start Date',
      description: 'Project start date',
    },
    endDate: {
      type: 'date',
      label: 'End Date',
      description: 'Project completion date',
    },
  },
  config: {
    slug: {
      field: 'slug',
      unique: true,
    },
    preview: {
      fields: ['title', 'description', 'featuredImage'],
    },
  },
};

export const productSchema: GitCMSSchema = {
  id: 'product',
  metadata: {
    name: 'Product',
    version: '1.0.0',
    description: 'E-commerce product content type',
    category: 'E-commerce',
    icon: '🛍️',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  fields: {
    name: {
      type: 'string',
      label: 'Product Name',
      required: true,
      description: 'Product name',
      maxLength: 200,
    },
    slug: {
      type: 'string',
      label: 'URL Slug',
      required: true,
      description: 'URL slug for the product',
      pattern: '^[a-z0-9-]+$',
    },
    description: {
      type: 'text',
      label: 'Description',
      required: true,
      description: 'Product description',
      maxLength: 1000,
    },
    content: {
      type: 'rich-text',
      label: 'Content',
      description: 'Detailed product information with rich text and markdown support',
    },
    price: {
      type: 'number',
      label: 'Price',
      required: true,
      description: 'Product price',
      min: 0,
      step: 0.01,
    },
    compareAtPrice: {
      type: 'number',
      label: 'Compare At Price',
      description: 'Original price for comparison',
      min: 0,
      step: 0.01,
    },
    sku: {
      type: 'string',
      label: 'SKU',
      description: 'Stock keeping unit',
    },
    featuredImage: {
      type: 'media',
      label: 'Featured Image',
      mediaTypes: ['image'],
      description: 'Featured product image',
    },
    gallery: {
      type: 'array',
      label: 'Gallery',
      description: 'Product gallery images',
      items: { type: 'media', label: 'Image', mediaTypes: ['image'] } as MediaField,
    },
    category: {
      type: 'string',
      label: 'Category',
      description: 'Product category',
    },
    tags: {
      type: 'array',
      label: 'Tags',
      description: 'Product tags',
      items: { type: 'string', label: 'Tag' } as StringField,
    },
    inStock: {
      type: 'boolean',
      label: 'In Stock',
      description: 'Whether the product is in stock',
      defaultValue: true,
    },
    featured: {
      type: 'boolean',
      label: 'Featured',
      description: 'Whether the product is featured',
      defaultValue: false,
    },
  },
  config: {
    slug: {
      field: 'slug',
      unique: true,
    },
    preview: {
      fields: ['name', 'description', 'featuredImage', 'price'],
    },
  },
};

export const pageSchema: GitCMSSchema = {
  id: 'page',
  metadata: {
    name: 'Page',
    version: '1.0.0',
    description: 'Static page content type',
    category: 'Content',
    icon: '📄',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  fields: {
    title: {
      type: 'string',
      label: 'Title',
      required: true,
      description: 'Page title',
      maxLength: 200,
    },
    slug: {
      type: 'string',
      label: 'URL Slug',
      required: true,
      description: 'URL slug for the page',
      pattern: '^[a-z0-9-]+$',
    },
    content: {
      type: 'rich-text',
      label: 'Content',
      required: true,
      description: 'Page content with rich text and markdown support',
    },
    excerpt: {
      type: 'text',
      label: 'Excerpt',
      description: 'Page excerpt or meta description',
      maxLength: 300,
    },
    featuredImage: {
      type: 'media',
      label: 'Featured Image',
      mediaTypes: ['image'],
      description: 'Featured image for the page',
    },
    published: {
      type: 'boolean',
      label: 'Published',
      description: 'Whether the page is published',
      defaultValue: false,
    },
    showInNavigation: {
      type: 'boolean',
      label: 'Show in Navigation',
      description: 'Whether to show in site navigation',
      defaultValue: false,
    },
    order: {
      type: 'number',
      label: 'Navigation Order',
      description: 'Navigation order',
      min: 0,
    },
  },
  config: {
    slug: {
      field: 'slug',
      unique: true,
    },
    preview: {
      fields: ['title', 'excerpt', 'featuredImage'],
    },
  },
};

// Export all default schemas
export const defaultSchemas: Record<string, GitCMSSchema> = {
  'blog-post': blogPostSchema,
  project: projectSchema,
  product: productSchema,
  page: pageSchema,
};

// Schema validation using Zod
const fieldValidationSchema = z.object({
  type: z.enum(['required', 'min', 'max', 'pattern', 'custom']),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  message: z.string().optional(),
});

const baseFieldSchema = z.object({
  type: z.enum([
    'string',
    'text',
    'number',
    'boolean',
    'date',
    'datetime',
    'array',
    'object',
    'media',
    'reference',
    'rich-text',
    'select',
    'multi-select',
    'color',
  ]),
  label: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  validation: z.array(fieldValidationSchema).optional(),
  required: z.boolean().optional(),
  hidden: z.boolean().optional(),
  readonly: z.boolean().optional(),
  group: z.string().optional(),
  order: z.number().optional(),
});

const schemaMetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const schemaConfigSchema = z
  .object({
    slug: z
      .object({
        field: z.string().optional(),
        pattern: z.string().optional(),
        unique: z.boolean().optional(),
      })
      .optional(),
    timestamps: z
      .object({
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      })
      .optional(),
    preview: z
      .object({
        template: z.string().optional(),
        fields: z.array(z.string()).optional(),
      })
      .optional(),
    hooks: z
      .object({
        beforeCreate: z.string().optional(),
        afterCreate: z.string().optional(),
        beforeUpdate: z.string().optional(),
        afterUpdate: z.string().optional(),
        beforeDelete: z.string().optional(),
        afterDelete: z.string().optional(),
      })
      .optional(),
  })
  .optional();

export const gitCMSSchemaSchema = z.object({
  id: z.string(),
  metadata: schemaMetadataSchema,
  fields: z.record(z.string(), z.any()), // More flexible field validation
  config: schemaConfigSchema,
  extends: z.string().optional(),
});

// Schema utilities
export class SchemaUtils {
  /**
   * Validate a schema definition
   */
  static validateSchema(schema: unknown): { valid: boolean; errors?: string[] } {
    try {
      gitCMSSchemaSchema.parse(schema);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`),
        };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Create a new schema with default values
   */
  static createSchema(
    id: string,
    name: string,
    fields: Record<string, FieldDefinition>
  ): GitCMSSchema {
    return {
      id,
      metadata: {
        name,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      fields,
    };
  }

  /**
   * Generate a slug from a string
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get all required fields from a schema
   */
  static getRequiredFields(schema: GitCMSSchema): string[] {
    return Object.entries(schema.fields)
      .filter(([, field]) => field.required === true)
      .map(([key]) => key);
  }

  /**
   * Get field by path (supports nested objects)
   */
  static getFieldByPath(schema: GitCMSSchema, path: string): FieldDefinition | null {
    const parts = path.split('.');
    let current: any = schema.fields;

    for (const part of parts) {
      if (!current || typeof current !== 'object') return null;

      if (current[part]) {
        current = current[part];
      } else if (current.type === 'object' && current.properties) {
        current = current.properties[part];
      } else if (current.type === 'array' && current.items) {
        current = current.items;
      } else {
        return null;
      }
    }

    return current || null;
  }

  /**
   * Validate field definition
   */
  static validateField(field: FieldDefinition): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Type-specific validation
    switch (field.type) {
      case 'string':
      case 'text':
      case 'color':
        const stringField = field as StringField;
        if (
          stringField.minLength &&
          stringField.maxLength &&
          stringField.minLength > stringField.maxLength
        ) {
          errors.push('minLength cannot be greater than maxLength');
        }
        break;

      case 'number':
        const numberField = field as NumberField;
        if (numberField.min && numberField.max && numberField.min > numberField.max) {
          errors.push('min cannot be greater than max');
        }
        break;

      case 'array':
        const arrayField = field as ArrayField;
        if (!arrayField.items) {
          errors.push('Array field must define items schema');
        }
        if (
          arrayField.minItems &&
          arrayField.maxItems &&
          arrayField.minItems > arrayField.maxItems
        ) {
          errors.push('minItems cannot be greater than maxItems');
        }
        break;

      case 'object':
        const objectField = field as ObjectField;
        if (!objectField.properties || Object.keys(objectField.properties).length === 0) {
          errors.push('Object field must define properties');
        }
        break;

      case 'reference':
        const refField = field as ReferenceField;
        if (!refField.collection) {
          errors.push('Reference field must specify collection');
        }
        break;

      case 'select':
        const selectField = field as SelectField;
        if (!selectField.options || selectField.options.length === 0) {
          errors.push('Select field must define options');
        }
        break;
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Merge schemas (for inheritance)
   */
  static mergeSchemas(baseSchema: GitCMSSchema, extendingSchema: GitCMSSchema): GitCMSSchema {
    return {
      ...extendingSchema,
      fields: {
        ...baseSchema.fields,
        ...extendingSchema.fields,
      },
      config: {
        ...baseSchema.config,
        ...extendingSchema.config,
      },
    };
  }

  /**
   * Generate TypeScript interface from schema
   */
  static generateTypeScript(schema: GitCMSSchema): string {
    const interfaceName = schema.metadata.name.replace(/[^a-zA-Z0-9]/g, '');
    const fields = Object.entries(schema.fields)
      .map(([key, field]) => {
        const optional = !field.required ? '?' : '';
        const type = this.fieldToTypeScript(field);
        const comment = field.description ? `  /** ${field.description} */\n` : '';
        return `${comment}  ${key}${optional}: ${type};`;
      })
      .join('\n');

    return `interface ${interfaceName} {\n${fields}\n}`;
  }

  private static fieldToTypeScript(field: FieldDefinition): string {
    switch (field.type) {
      case 'string':
      case 'text':
      case 'color':
      case 'rich-text':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'datetime':
        return 'Date | string';
      case 'array':
        const arrayField = field as ArrayField;
        return `${this.fieldToTypeScript(arrayField.items)}[]`;
      case 'object':
        const objectField = field as ObjectField;
        const props = Object.entries(objectField.properties || {})
          .map(([key, prop]) => {
            const optional = !prop.required ? '?' : '';
            return `${key}${optional}: ${this.fieldToTypeScript(prop)}`;
          })
          .join('; ');
        return `{ ${props} }`;
      case 'media':
        const mediaField = field as MediaField;
        return mediaField.multiple ? 'string[]' : 'string'; // URL or array of URLs
      case 'reference':
        return 'string | string[]';
      case 'select':
        const selectField = field as SelectField;
        const values = selectField.options?.map(opt => `"${opt.value}"`).join(' | ');
        const baseType = values || 'string';
        return selectField.multiple ? `(${baseType})[]` : baseType;
      default:
        return 'any';
    }
  }
}
