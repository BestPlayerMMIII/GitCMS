/**
 * Schema Management API
 *
 * Provides basic CRUD operations for schema management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { defaultRegistry, defaultSchemas, type GitCMSSchema } from '@gitcms/core';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        return handleListSchemas(searchParams);

      case 'get':
        return handleGetSchema(searchParams);

      case 'stats':
        return handleGetStats();

      case 'categories':
        return handleGetCategories();

      case 'defaults':
        return handleGetDefaultSchemas();

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schema API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'validate':
        return handleValidateContent(request);

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schema API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET handlers

/**
 * List all available schemas
 */
async function handleListSchemas(searchParams: URLSearchParams) {
  try {
    const schemas = defaultRegistry.list();

    return NextResponse.json({
      schemas,
      total: schemas.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list schemas' }, { status: 500 });
  }
}

/**
 * Get a specific schema by ID
 */
async function handleGetSchema(searchParams: URLSearchParams) {
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Schema ID is required' }, { status: 400 });
  }

  try {
    const schema = defaultRegistry.get(id);

    if (!schema) {
      return NextResponse.json({ error: 'Schema not found' }, { status: 404 });
    }

    return NextResponse.json({ schema });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get schema' }, { status: 500 });
  }
}

/**
 * Get registry statistics
 */
async function handleGetStats() {
  try {
    const stats = defaultRegistry.getStats();
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}

/**
 * Get all categories
 */
async function handleGetCategories() {
  try {
    const categories = defaultRegistry.getCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get categories' }, { status: 500 });
  }
}

/**
 * Get default schema templates
 */
async function handleGetDefaultSchemas() {
  try {
    const schemas = Object.values(defaultSchemas);
    return NextResponse.json({
      schemas,
      total: schemas.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get default schemas' }, { status: 500 });
  }
}

// POST handlers

/**
 * Validate content against a schema
 */
async function handleValidateContent(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, schemaId, mode = 'create' } = body;

    if (!content || !schemaId) {
      return NextResponse.json({ error: 'Content and schema ID are required' }, { status: 400 });
    }

    const validation = defaultRegistry.validateContent(content, schemaId, mode);

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation failed' }, { status: 400 });
  }
}
