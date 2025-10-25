import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  parseContent,
  serializeContent,
  validateContentAgainstSchema,
  getContentMetadata,
} from '@git-cms/core';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { content, filePath, action, data, schema } = body;

    if (!content || !filePath || !action) {
      return NextResponse.json(
        { error: 'Content, filePath, and action are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'parse': {
        const parsed = parseContent(content, filePath);
        const metadata = getContentMetadata(parsed);

        let validation = null;
        if (schema) {
          validation = validateContentAgainstSchema(parsed, schema);
        }

        return NextResponse.json({
          parsed,
          metadata,
          validation,
        });
      }

      case 'serialize': {
        if (!data) {
          return NextResponse.json(
            { error: 'Data is required for serialization' },
            { status: 400 }
          );
        }

        const serialized = serializeContent(data.frontmatter || {}, data.content || '', filePath);

        return NextResponse.json({
          serialized,
        });
      }

      case 'validate': {
        if (!schema) {
          return NextResponse.json({ error: 'Schema is required for validation' }, { status: 400 });
        }

        const parsed = parseContent(content, filePath);
        const validation = validateContentAgainstSchema(parsed, schema);

        return NextResponse.json({
          validation,
          parsed,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be parse, serialize, or validate' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Content parsing error:', error);
    return NextResponse.json({ error: 'Failed to process content' }, { status: 500 });
  }
}
