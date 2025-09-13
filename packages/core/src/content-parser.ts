import * as YAML from 'yaml';
import matter from 'gray-matter';

export interface ParsedContent {
  data: Record<string, any>;
  content: string;
  isEmpty: boolean;
  originalContent: string;
}

export interface ContentValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ContentValidationResult {
  valid: boolean;
  errors: ContentValidationError[];
  warnings: ContentValidationError[];
}

/**
 * Parse markdown content with frontmatter
 */
export function parseMarkdown(content: string): ParsedContent {
  try {
    const parsed = matter(content);
    return {
      data: parsed.data || {},
      content: parsed.content || '',
      isEmpty: !parsed.content.trim() && Object.keys(parsed.data).length === 0,
      originalContent: content,
    };
  } catch (error) {
    console.error('Failed to parse markdown:', error);
    return {
      data: {},
      content: content,
      isEmpty: !content.trim(),
      originalContent: content,
    };
  }
}

/**
 * Parse JSON content
 */
export function parseJSON(content: string): ParsedContent {
  try {
    const data = JSON.parse(content);
    return {
      data: typeof data === 'object' && data !== null ? data : { value: data },
      content: '',
      isEmpty: content.trim() === '{}' || content.trim() === '',
      originalContent: content,
    };
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return {
      data: {},
      content: content,
      isEmpty: !content.trim(),
      originalContent: content,
    };
  }
}

/**
 * Parse YAML content
 */
export function parseYAML(content: string): ParsedContent {
  try {
    const data = YAML.parse(content);
    return {
      data: typeof data === 'object' && data !== null ? data : { value: data },
      content: '',
      isEmpty: !content.trim() || content.trim() === '{}',
      originalContent: content,
    };
  } catch (error) {
    console.error('Failed to parse YAML:', error);
    return {
      data: {},
      content: content,
      isEmpty: !content.trim(),
      originalContent: content,
    };
  }
}

/**
 * Auto-detect content type and parse accordingly
 */
export function parseContent(content: string, filePath: string): ParsedContent {
  const extension = getFileExtension(filePath).toLowerCase();

  switch (extension) {
    case 'md':
    case 'markdown':
      return parseMarkdown(content);
    case 'json':
      return parseJSON(content);
    case 'yml':
    case 'yaml':
      return parseYAML(content);
    default:
      // Default to treating as plain text
      return {
        data: {},
        content: content,
        isEmpty: !content.trim(),
        originalContent: content,
      };
  }
}

/**
 * Serialize content back to file format
 */
export function serializeContent(
  data: Record<string, any>,
  content: string,
  filePath: string
): string {
  const extension = getFileExtension(filePath).toLowerCase();

  switch (extension) {
    case 'md':
    case 'markdown':
      return serializeMarkdown(data, content);
    case 'json':
      return serializeJSON(data);
    case 'yml':
    case 'yaml':
      return serializeYAML(data);
    default:
      return content;
  }
}

/**
 * Serialize markdown with frontmatter
 */
export function serializeMarkdown(data: Record<string, any>, content: string): string {
  if (Object.keys(data).length === 0) {
    return content;
  }

  const frontmatter = YAML.stringify(data).trim();
  return `---\n${frontmatter}\n---\n\n${content}`;
}

/**
 * Serialize to JSON
 */
export function serializeJSON(data: Record<string, any>): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Serialize to YAML
 */
export function serializeYAML(data: Record<string, any>): string {
  return YAML.stringify(data);
}

/**
 * Extract file extension from path
 */
function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Validate content against schema
 */
export function validateContentAgainstSchema(
  parsedContent: ParsedContent,
  schema: any
): ContentValidationResult {
  const errors: ContentValidationError[] = [];
  const warnings: ContentValidationError[] = [];

  if (!schema || !schema.fields) {
    return { valid: true, errors, warnings };
  }

  // Validate required fields
  for (const field of schema.fields) {
    if (field.required && !parsedContent.data.hasOwnProperty(field.name)) {
      errors.push({
        field: field.name,
        message: `Required field '${field.name}' is missing`,
      });
    }

    // Validate field types
    if (parsedContent.data.hasOwnProperty(field.name)) {
      const value = parsedContent.data[field.name];
      const validationError = validateFieldValue(value, field);
      if (validationError) {
        errors.push(validationError);
      }
    }
  }

  // Check for unknown fields
  for (const key in parsedContent.data) {
    if (!schema.fields.find((f: any) => f.name === key)) {
      warnings.push({
        field: key,
        message: `Unknown field '${key}' not defined in schema`,
        value: parsedContent.data[key],
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate individual field value
 */
function validateFieldValue(value: any, field: any): ContentValidationError | null {
  const { name, type, validation = [] } = field;

  // Type validation
  switch (type) {
    case 'string':
    case 'text':
    case 'markdown':
      if (typeof value !== 'string') {
        return { field: name, message: `Field '${name}' must be a string`, value };
      }
      break;
    case 'number':
      if (typeof value !== 'number') {
        return { field: name, message: `Field '${name}' must be a number`, value };
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { field: name, message: `Field '${name}' must be a boolean`, value };
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        return { field: name, message: `Field '${name}' must be an array`, value };
      }
      break;
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { field: name, message: `Field '${name}' must be an object`, value };
      }
      break;
    case 'date':
    case 'datetime':
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { field: name, message: `Field '${name}' must be a valid date`, value };
        }
      } else if (!(value instanceof Date)) {
        return { field: name, message: `Field '${name}' must be a date`, value };
      }
      break;
  }

  // Custom validation rules
  for (const rule of validation) {
    const error = validateRule(value, rule, field);
    if (error) {
      return error;
    }
  }

  return null;
}

/**
 * Validate individual validation rule
 */
function validateRule(value: any, rule: any, field: any): ContentValidationError | null {
  const { type, value: ruleValue, message } = rule;
  const fieldName = field.name;

  switch (type) {
    case 'required':
      if (value === undefined || value === null || value === '') {
        return {
          field: fieldName,
          message: message || `Field '${fieldName}' is required`,
          value,
        };
      }
      break;
    case 'min':
      if (typeof value === 'string' || Array.isArray(value)) {
        if (value.length < ruleValue) {
          return {
            field: fieldName,
            message:
              message || `Field '${fieldName}' must have at least ${ruleValue} characters/items`,
            value,
          };
        }
      } else if (typeof value === 'number') {
        if (value < ruleValue) {
          return {
            field: fieldName,
            message: message || `Field '${fieldName}' must be at least ${ruleValue}`,
            value,
          };
        }
      }
      break;
    case 'max':
      if (typeof value === 'string' || Array.isArray(value)) {
        if (value.length > ruleValue) {
          return {
            field: fieldName,
            message:
              message || `Field '${fieldName}' must have at most ${ruleValue} characters/items`,
            value,
          };
        }
      } else if (typeof value === 'number') {
        if (value > ruleValue) {
          return {
            field: fieldName,
            message: message || `Field '${fieldName}' must be at most ${ruleValue}`,
            value,
          };
        }
      }
      break;
    case 'pattern':
      if (typeof value === 'string') {
        const regex = new RegExp(ruleValue);
        if (!regex.test(value)) {
          return {
            field: fieldName,
            message: message || `Field '${fieldName}' does not match required pattern`,
            value,
          };
        }
      }
      break;
  }

  return null;
}

/**
 * Get content metadata (word count, reading time, etc.)
 */
export function getContentMetadata(parsedContent: ParsedContent) {
  const wordCount = parsedContent.content.split(/\s+/).filter(word => word.length > 0).length;

  const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute

  const charCount = parsedContent.content.length;
  const charCountNoSpaces = parsedContent.content.replace(/\s/g, '').length;

  return {
    wordCount,
    readingTime,
    charCount,
    charCountNoSpaces,
    isEmpty: parsedContent.isEmpty,
    hasData: Object.keys(parsedContent.data).length > 0,
    dataFields: Object.keys(parsedContent.data),
  };
}
