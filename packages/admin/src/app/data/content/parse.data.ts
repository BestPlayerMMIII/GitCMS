import {
  parseContent,
  serializeContent,
  validateContentAgainstSchema,
  getContentMetadata,
} from '@git-cms/core';

/**
 * Parse, serialize, or validate content (client-callable)
 */
export async function contentParsePOST(body: {
  content: string;
  filePath: string;
  action: 'parse' | 'serialize' | 'validate';
  data?: { frontmatter?: any; content?: string };
  schema?: any;
}) {
  const { content, filePath, action, data, schema } = body;

  if (!content || !filePath || !action) {
    throw new Error('Content, filePath, and action are required');
  }

  switch (action) {
    case 'parse': {
      const parsed = parseContent(content, filePath);
      const metadata = getContentMetadata(parsed);

      let validation = null;
      if (schema) {
        validation = validateContentAgainstSchema(parsed, schema);
      }

      return {
        parsed,
        metadata,
        validation,
      };
    }

    case 'serialize': {
      if (!data) {
        throw new Error('Data is required for serialization');
      }

      const serialized = serializeContent(data.frontmatter || {}, data.content || '', filePath);

      return {
        serialized,
      };
    }

    case 'validate': {
      if (!schema) {
        throw new Error('Schema is required for validation');
      }

      const parsed = parseContent(content, filePath);
      const validation = validateContentAgainstSchema(parsed, schema);

      return {
        validation,
        parsed,
      };
    }

    default:
      throw new Error('Invalid action. Must be parse, serialize, or validate');
  }
}
