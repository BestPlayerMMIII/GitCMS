/**
 * GitCMS Validation System
 *
 * This module provides comprehensive validation capabilities for GitCMS schemas
 * and content, including schema validation, content validation against schemas,
 * and runtime validation with detailed error reporting.
 */

import { z } from 'zod';
import type { GitCMSSchema, FieldDefinition, ValidationRule, FieldType } from './schemas';

// Legacy imports for backward compatibility
import type { ContentSchema, SchemaField } from './types';

// Validation error structure
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  path?: string[];
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// Content validation context
export interface ValidationContext {
  schema: GitCMSSchema;
  content: Record<string, any>;
  mode: 'create' | 'update';
  strictMode?: boolean;
  availableSchemas?: GitCMSSchema[]; // For resolving schema references in object fields
}

// Custom validation function type
export type CustomValidator = (
  value: any,
  field: FieldDefinition,
  context: ValidationContext
) => ValidationError | null;

// Built-in custom validators
export const customValidators: Record<string, CustomValidator> = {
  slug: (value: any, field: FieldDefinition) => {
    if (typeof value !== 'string') return null;

    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugPattern.test(value)) {
      return {
        field: field.label,
        message: 'Must be a valid slug (lowercase letters, numbers, and hyphens only)',
        code: 'INVALID_SLUG',
        value,
      };
    }
    return null;
  },

  uniqueSlug: (value: any, field: FieldDefinition, context: ValidationContext) => {
    // This would need to check against existing content in real implementation
    // For now, just validate format
    return customValidators.slug(value, field, context);
  },

  email: (value: any, field: FieldDefinition) => {
    if (typeof value !== 'string') return null;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return {
        field: field.label,
        message: 'Must be a valid email address',
        code: 'INVALID_EMAIL',
        value,
      };
    }
    return null;
  },

  url: (value: any, field: FieldDefinition) => {
    if (typeof value !== 'string') return null;

    try {
      new URL(value);
      return null;
    } catch {
      return {
        field: field.label,
        message: 'Must be a valid URL',
        code: 'INVALID_URL',
        value,
      };
    }
  },

  color: (value: any, field: FieldDefinition) => {
    if (typeof value !== 'string') return null;

    const colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorPattern.test(value)) {
      return {
        field: field.label,
        message: 'Must be a valid hex color (e.g., #FF0000 or #F00)',
        code: 'INVALID_COLOR',
        value,
      };
    }
    return null;
  },
};

// Legacy Zod schemas for backward compatibility
export const FieldTypeSchema = z.enum([
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
  'color',
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

export const ContentItemSchema = z
  .object({
    id: z.string().min(1),
  })
  .passthrough(); // Allow additional properties

// Main validation engine
export class ValidationEngine {
  private customValidators: Record<string, CustomValidator>;

  constructor(customValidators?: Record<string, CustomValidator>) {
    this.customValidators = { ...customValidators, ...customValidators };
  }

  /**
   * Validate content against a schema
   */
  validateContent(
    content: Record<string, any>,
    schema: GitCMSSchema,
    mode: 'create' | 'update' = 'create',
    availableSchemas?: GitCMSSchema[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const context: ValidationContext = { schema, content, mode, availableSchemas };

    // Check required fields
    const requiredFields = Object.entries(schema.fields)
      .filter(([, field]) => field.required === true)
      .map(([key]) => key);

    for (const fieldName of requiredFields) {
      if (
        content[fieldName] === undefined ||
        content[fieldName] === null ||
        content[fieldName] === ''
      ) {
        errors.push({
          field: fieldName,
          message: `${schema.fields[fieldName].label || fieldName} is required`,
          code: 'REQUIRED_FIELD_MISSING',
          path: [fieldName],
        });
      }
    }

    // Validate each field in the content
    for (const [fieldName, value] of Object.entries(content)) {
      const field = schema.fields[fieldName];

      if (!field) {
        if (context.strictMode) {
          warnings.push({
            field: fieldName,
            message: `Field '${fieldName}' is not defined in schema`,
            code: 'UNKNOWN_FIELD',
            value,
            path: [fieldName],
          });
        }
        continue;
      }

      const fieldErrors = this.validateField(value, field, context, [fieldName]);
      errors.push(...fieldErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate a single field value
   */
  validateField(
    value: any,
    field: FieldDefinition,
    context: ValidationContext,
    path: string[] = []
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldName = path[path.length - 1] || field.label;

    // Skip validation if value is empty and field is not required
    if ((value === undefined || value === null || value === '') && !field.required) {
      return errors;
    }

    // Type-specific validation
    switch (field.type) {
      case 'string':
      case 'text':
      case 'color':
        errors.push(...this.validateStringField(value, field, fieldName, path));
        break;

      case 'number':
        errors.push(...this.validateNumberField(value, field, fieldName, path));
        break;

      case 'boolean':
        errors.push(...this.validateBooleanField(value, field, fieldName, path));
        break;

      case 'date':
      case 'datetime':
        errors.push(...this.validateDateField(value, field, fieldName, path));
        break;

      case 'array':
        errors.push(...this.validateArrayField(value, field, context, fieldName, path));
        break;

      case 'object':
        errors.push(...this.validateObjectField(value, field, context, fieldName, path));
        break;

      case 'media':
        errors.push(...this.validateMediaField(value, field, fieldName, path));
        break;

      case 'reference':
        errors.push(...this.validateReferenceField(value, field, fieldName, path));
        break;

      case 'select':
        errors.push(...this.validateSelectField(value, field, fieldName, path));
        break;

      case 'rich-text':
        errors.push(...this.validateRichTextField(value, field, fieldName, path));
        break;
    }

    // Custom validation rules
    if (field.validation) {
      for (const rule of field.validation) {
        const error = this.validateRule(value, rule, field, fieldName, path);
        if (error) errors.push(error);
      }
    }

    return errors;
  }

  // ... (all the private validation methods would continue here)
  // For brevity, I'll include the key ones and reference the rest

  private validateStringField(
    value: any,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value !== 'string') {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be a string`,
        code: 'INVALID_TYPE',
        value,
        path,
      });
      return errors;
    }

    const stringField = field as any;

    // Length validation
    if (stringField.minLength && value.length < stringField.minLength) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be at least ${stringField.minLength} characters`,
        code: 'MIN_LENGTH',
        value,
        path,
      });
    }

    if (stringField.maxLength && value.length > stringField.maxLength) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be no more than ${stringField.maxLength} characters`,
        code: 'MAX_LENGTH',
        value,
        path,
      });
    }

    // Pattern validation
    if (stringField.pattern) {
      const pattern = new RegExp(stringField.pattern);
      if (!pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: `${field.label || fieldName} format is invalid`,
          code: 'PATTERN_MISMATCH',
          value,
          path,
        });
      }
    }

    // Type-specific validation for special string types
    // Email and URL validation is now handled through pattern validation rules
    if (field.type === 'color' && this.customValidators.color) {
      const error = this.customValidators.color(value, field, {} as ValidationContext);
      if (error) errors.push({ ...error, path });
    }

    return errors;
  }

  private validateNumberField(
    value: any,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be a valid number`,
        code: 'INVALID_TYPE',
        value,
        path,
      });
      return errors;
    }

    const numberField = field as any;

    if (numberField.min !== undefined && value < numberField.min) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be at least ${numberField.min}`,
        code: 'MIN_VALUE',
        value,
        path,
      });
    }

    if (numberField.max !== undefined && value > numberField.max) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be no more than ${numberField.max}`,
        code: 'MAX_VALUE',
        value,
        path,
      });
    }

    return errors;
  }

  private validateBooleanField(
    value: any,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    if (typeof value !== 'boolean') {
      return [
        {
          field: fieldName,
          message: `${field.label || fieldName} must be true or false`,
          code: 'INVALID_TYPE',
          value,
          path,
        },
      ];
    }
    return [];
  }

  private validateDateField(
    value: any,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      date = new Date(value);
    } else {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be a valid date`,
        code: 'INVALID_TYPE',
        value,
        path,
      });
      return errors;
    }

    if (isNaN(date.getTime())) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be a valid date`,
        code: 'INVALID_DATE',
        value,
        path,
      });
    }

    return errors;
  }

  private validateArrayField(
    value: any,
    field: FieldDefinition,
    context: ValidationContext,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Array.isArray(value)) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be an array`,
        code: 'INVALID_TYPE',
        value,
        path,
      });
      return errors;
    }

    const arrayField = field as any;

    if (arrayField.minItems && value.length < arrayField.minItems) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must have at least ${arrayField.minItems} items`,
        code: 'MIN_ITEMS',
        value,
        path,
      });
    }

    if (arrayField.maxItems && value.length > arrayField.maxItems) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must have no more than ${arrayField.maxItems} items`,
        code: 'MAX_ITEMS',
        value,
        path,
      });
    }

    if (arrayField.items) {
      value.forEach((item, index) => {
        const itemErrors = this.validateField(item, arrayField.items, context, [
          ...path,
          index.toString(),
        ]);
        errors.push(...itemErrors);
      });
    }

    // Check for unique items if uniqueItems is true
    if (arrayField.uniqueItems) {
      const seen = new Map();
      value.forEach((item, index) => {
        const itemKey = JSON.stringify(item);
        if (seen.has(itemKey)) {
          const firstIndex = seen.get(itemKey);
          errors.push({
            field: fieldName,
            message: `${field.label || fieldName} contains duplicate items at positions ${firstIndex} and ${index}`,
            code: 'DUPLICATE_ITEMS',
            value: item,
            path: [...path, index.toString()],
          });
        } else {
          seen.set(itemKey, index);
        }
      });
    }

    return errors;
  }

  private validateObjectField(
    value: any,
    field: FieldDefinition,
    context: ValidationContext,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be an object`,
        code: 'INVALID_TYPE',
        value,
        path,
      });
      return errors;
    }

    const objectField = field as any;

    // Determine which properties to validate
    let propertiesToValidate: Record<string, FieldDefinition> = {};

    // If there's a schema reference, try to resolve it
    if (objectField.schemaRef && context.availableSchemas) {
      const referencedSchema = context.availableSchemas.find(s => s.id === objectField.schemaRef);
      if (referencedSchema) {
        propertiesToValidate = referencedSchema.fields;
      } else {
        // Schema reference not found - this is an error
        errors.push({
          field: fieldName,
          message: `Schema reference "${objectField.schemaRef}" not found`,
          code: 'SCHEMA_REF_NOT_FOUND',
          value: objectField.schemaRef,
          path,
        });
        return errors;
      }
    } else if (objectField.properties) {
      // Fall back to inline properties
      propertiesToValidate = objectField.properties;
    }

    // Validate each property
    for (const [propName, propField] of Object.entries(propertiesToValidate)) {
      const propValue = value[propName];
      const propErrors = this.validateField(propValue, propField as FieldDefinition, context, [
        ...path,
        propName,
      ]);
      errors.push(...propErrors);
    }

    return errors;
  }

  private validateMediaField(
    value: any,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Accept strings (file paths), File objects, or GitCMSMediaFile objects
    const isValidMedia =
      typeof value === 'string' ||
      value instanceof File ||
      (value && typeof value === 'object' && 'url' in value && 'filename' in value);

    if (!isValidMedia) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be a file or file path`,
        code: 'INVALID_TYPE',
        value,
        path,
      });
      return errors;
    }

    return errors;
  }

  private validateReferenceField(
    value: any,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const referenceField = field as any;

    if (referenceField.multiple) {
      if (!Array.isArray(value)) {
        errors.push({
          field: fieldName,
          message: `${field.label || fieldName} must be an array of references`,
          code: 'INVALID_TYPE',
          value,
          path,
        });
        return errors;
      }
    } else {
      if (typeof value !== 'string') {
        errors.push({
          field: fieldName,
          message: `${field.label || fieldName} must be a string reference`,
          code: 'INVALID_TYPE',
          value,
          path,
        });
      }
    }

    return errors;
  }

  private validateSelectField(
    value: any,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const selectField = field as any;

    if (!selectField.options || selectField.options.length === 0) {
      return errors;
    }

    const validValues = selectField.options.map((opt: any) => opt.value || opt);

    if (selectField.multiple) {
      if (!Array.isArray(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be an array for multiple selection`,
          code: 'INVALID_TYPE',
          value,
          path,
        });
        return errors;
      }

      value.forEach((selectedValue, index) => {
        if (!validValues.includes(selectedValue)) {
          errors.push({
            field: fieldName,
            message: `Invalid option: ${selectedValue}`,
            code: 'INVALID_OPTION',
            value: selectedValue,
            path: [...path, index.toString()],
          });
        }
      });
    } else {
      if (!validValues.includes(value)) {
        errors.push({
          field: fieldName,
          message: `Invalid option: ${value}`,
          code: 'INVALID_OPTION',
          value,
          path,
        });
      }
    }

    return errors;
  }

  private validateRichTextField(
    value: any,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value !== 'string') {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be a string`,
        code: 'INVALID_TYPE',
        value,
        path,
      });
      return errors;
    }

    const richTextField = field as any;

    if (richTextField.maxLength && value.length > richTextField.maxLength) {
      errors.push({
        field: fieldName,
        message: `${field.label || fieldName} must be no more than ${richTextField.maxLength} characters`,
        code: 'MAX_LENGTH',
        value,
        path,
      });
    }

    return errors;
  }

  private validateRule(
    value: any,
    rule: ValidationRule,
    field: FieldDefinition,
    fieldName: string,
    path: string[]
  ): ValidationError | null {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return {
            field: fieldName,
            message: rule.message || `${field.label || fieldName} is required`,
            code: 'REQUIRED',
            value,
            path,
          };
        }
        break;

      case 'min':
        if (typeof value === 'number' && typeof rule.value === 'number' && value < rule.value) {
          return {
            field: fieldName,
            message: rule.message || `${field.label || fieldName} must be at least ${rule.value}`,
            code: 'MIN_VALUE',
            value,
            path,
          };
        }
        break;

      case 'max':
        if (typeof value === 'number' && typeof rule.value === 'number' && value > rule.value) {
          return {
            field: fieldName,
            message:
              rule.message || `${field.label || fieldName} must be no more than ${rule.value}`,
            code: 'MAX_VALUE',
            value,
            path,
          };
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && typeof rule.value === 'string') {
          const pattern = new RegExp(rule.value);
          if (!pattern.test(value)) {
            return {
              field: fieldName,
              message: rule.message || `${field.label || fieldName} format is invalid`,
              code: 'PATTERN_MISMATCH',
              value,
              path,
            };
          }
        }
        break;

      case 'custom':
        if (typeof rule.value === 'string' && this.customValidators[rule.value]) {
          return this.customValidators[rule.value](value, field, {} as ValidationContext);
        }
        break;
    }

    return null;
  }

  /**
   * Add a custom validator
   */
  addCustomValidator(name: string, validator: CustomValidator): void {
    this.customValidators[name] = validator;
  }

  /**
   * Remove a custom validator
   */
  removeCustomValidator(name: string): void {
    delete this.customValidators[name];
  }
}

// Default validation engine instance
export const defaultValidationEngine = new ValidationEngine(customValidators);

// Convenience function for quick validation
export function validateContentAdvanced(
  content: Record<string, any>,
  schema: GitCMSSchema,
  mode: 'create' | 'update' = 'create'
): ValidationResult {
  return defaultValidationEngine.validateContent(content, schema, mode);
}

// Legacy function for backward compatibility
export function validateContent(
  content: any,
  schema: ContentSchema
): { valid: boolean; errors: string[] } {
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

// Export validation utilities
export function createValidationEngine(
  customValidators?: Record<string, CustomValidator>
): ValidationEngine {
  return new ValidationEngine(customValidators);
}
