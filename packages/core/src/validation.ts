import { z } from 'zod';
import type { ContentSchema, SchemaField, FieldType } from './types';

// Zod schemas for validation

export const FieldTypeSchema = z.enum([
  'string',
  'number', 
  'boolean',
  'date',
  'datetime',
  'markdown',
  'media',
  'array',
  'object',
  'select',
  'text'
]);

export const ValidationRuleSchema = z.object({
  type: z.enum(['required', 'min', 'max', 'pattern', 'custom']),
  value: z.any().optional(),
  message: z.string().optional(),
});

export const SchemaFieldSchema: z.ZodType<SchemaField> = z.object({
  name: z.string().min(1),
  type: FieldTypeSchema,
  required: z.boolean().optional(),
  description: z.string().optional(),
  validation: z.array(ValidationRuleSchema).optional(),
  itemType: z.string().optional(),
  mediaTypes: z.array(z.string()).optional(),
  options: z.array(z.string()).optional(),
});

export const ContentSchemaSchema: z.ZodType<ContentSchema> = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(SchemaFieldSchema),
});

export const GitCMSConfigSchema = z.object({
  repository: z.string().regex(/^[^\/]+\/[^\/]+$/),
  branch: z.string().optional().default('main'),
  token: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

export const ContentItemSchema = z.object({
  id: z.string().min(1),
}).passthrough(); // Allow additional properties

// Utility function to validate content against a schema
export function validateContent(content: any, schema: ContentSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  for (const field of schema.fields) {
    if (field.required && (content[field.name] === undefined || content[field.name] === null)) {
      errors.push(`Field '${field.name}' is required`);
    }

    // Type validation
    if (content[field.name] !== undefined) {
      const value = content[field.name];
      
      switch (field.type) {
        case 'string':
        case 'text':
        case 'markdown':
          if (typeof value !== 'string') {
            errors.push(`Field '${field.name}' must be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`Field '${field.name}' must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field '${field.name}' must be a boolean`);
          }
          break;
        case 'date':
        case 'datetime':
          if (typeof value !== 'string' || isNaN(Date.parse(value))) {
            errors.push(`Field '${field.name}' must be a valid date string`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`Field '${field.name}' must be an array`);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push(`Field '${field.name}' must be an object`);
          }
          break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}