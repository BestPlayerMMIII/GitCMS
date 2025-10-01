/**
 * Schema Storage Integration API
 *
 * Handles storing and retrieving schemas from GitHub repositories
 * in the .gitcms/schemas/ directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GitHubApiClient } from '@git-cms/core';
import type { GitCMSSchema, GitHubFileContent } from '@git-cms/core';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    const github = new GitHubApiClient(session.accessToken, owner, repo, branch);

    switch (action) {
      case 'list':
        return handleListSchemas(github);

      case 'get':
        return handleGetSchema(github, searchParams);

      case 'check-setup':
        return handleCheckSetup(github);

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schema storage API error:', error);
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
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    const github = new GitHubApiClient(session.accessToken, owner, repo, branch);

    switch (action) {
      case 'save':
        return handleSaveSchema(github, request);

      case 'init-setup':
        return handleInitSetup(github);

      case 'sync':
        return handleSyncSchemas(github, request);

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schema storage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';
    const schemaId = searchParams.get('schemaId');

    if (!owner || !repo || !schemaId) {
      return NextResponse.json(
        { error: 'Owner, repo, and schemaId parameters are required' },
        { status: 400 }
      );
    }

    const github = new GitHubApiClient(session.accessToken, owner, repo, branch);
    return handleDeleteSchema(github, schemaId);
  } catch (error) {
    console.error('Schema storage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET handlers

/**
 * List all schemas in the repository
 */
async function handleListSchemas(github: GitHubApiClient) {
  try {
    const schemasPath = '.gitcms/schemas';

    // Check if schemas directory exists
    try {
      const contents = await github.getDirectory(schemasPath);
      const schemaFiles = contents.filter(
        (item: GitHubFileContent) => item.type === 'file' && item.name.endsWith('.json')
      );

      const schemas: GitCMSSchema[] = [];

      // Read each schema file
      for (const file of schemaFiles) {
        try {
          const content = await github.getFileContent(file.path);
          const schema = JSON.parse(content);
          schemas.push(schema);
        } catch (error) {
          console.warn(`Failed to read schema file ${file.path}:`, error);
        }
      }

      return NextResponse.json({
        schemas,
        total: schemas.length,
        path: schemasPath,
      });
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        return NextResponse.json({
          schemas: [],
          total: 0,
          path: schemasPath,
          message: 'Schemas directory not found - repository not initialized for GitCMS',
        });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list schemas' }, { status: 500 });
  }
}

/**
 * Get a specific schema from the repository
 */
async function handleGetSchema(github: GitHubApiClient, searchParams: URLSearchParams) {
  const schemaId = searchParams.get('schemaId');

  if (!schemaId) {
    return NextResponse.json({ error: 'Schema ID is required' }, { status: 400 });
  }

  try {
    const schemaPath = `.gitcms/schemas/${schemaId}.json`;

    const content = await github.getFileContent(schemaPath);
    const file = await github.getFile(schemaPath);
    const schema = JSON.parse(content);

    return NextResponse.json({
      schema,
      path: schemaPath,
      sha: file.sha,
    });
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Schema not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to get schema' }, { status: 500 });
  }
}

/**
 * Check if the repository is set up for GitCMS schemas
 */
async function handleCheckSetup(github: GitHubApiClient) {
  try {
    const gitcmsPath = '.gitcms';
    const schemasPath = '.gitcms/schemas';
    const configPath = '.gitcms/config.json';

    const status = {
      hasGitCMSDirectory: false,
      hasSchemasDirectory: false,
      hasConfig: false,
      schemaCount: 0,
      setupComplete: false,
    };

    // Check .gitcms directory
    try {
      await github.getDirectory(gitcmsPath);
      status.hasGitCMSDirectory = true;
    } catch (error: any) {
      if (error.code !== 'NOT_FOUND') throw error;
    }

    // Check schemas directory
    try {
      const contents = await github.getDirectory(schemasPath);
      status.hasSchemasDirectory = true;
      status.schemaCount = contents.filter(
        (item: GitHubFileContent) => item.type === 'file' && item.name.endsWith('.json')
      ).length;
    } catch (error: any) {
      if (error.code !== 'NOT_FOUND') throw error;
    }

    // Check config file
    try {
      await github.getFile(configPath);
      status.hasConfig = true;
    } catch (error: any) {
      if (error.code !== 'NOT_FOUND') throw error;
    }

    status.setupComplete =
      status.hasGitCMSDirectory && status.hasSchemasDirectory && status.hasConfig;

    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check setup status' }, { status: 500 });
  }
}

// POST handlers

/**
 * Save a schema to the repository
 */
async function handleSaveSchema(github: GitHubApiClient, request: NextRequest) {
  try {
    const body = await request.json();
    const { schema, commitMessage } = body;

    if (!schema || !schema.id) {
      return NextResponse.json({ error: 'Schema with ID is required' }, { status: 400 });
    }

    const schemaPath = `.gitcms/schemas/${schema.id}.json`;
    const content = JSON.stringify(schema, null, 2);
    const message = commitMessage || `Update schema: ${schema.metadata?.name || schema.id}`;

    // Check if file exists to determine if this is an update
    let isUpdate = false;
    let existingSha: string | undefined;

    try {
      const existing = await github.getFile(schemaPath);
      isUpdate = true;
      existingSha = existing.sha;
    } catch (error: any) {
      if (error.code !== 'NOT_FOUND') throw error;
    }

    // Save the schema file
    const result = await github.updateFile(schemaPath, content, message, existingSha);

    return NextResponse.json({
      message: isUpdate ? 'Schema updated successfully' : 'Schema created successfully',
      schema,
      path: schemaPath,
      commit: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save schema' }, { status: 500 });
  }
}

/**
 * Initialize GitCMS setup in the repository
 */
async function handleInitSetup(github: GitHubApiClient) {
  try {
    const readmeContent = `# GitCMS Configuration

This directory contains GitCMS configuration files and schemas.

## Structure

- \`config.json\` - Main GitCMS configuration
- \`schemas/\` - Content type schema definitions
- \`templates/\` - Content templates (optional)

## Generated automatically by GitCMS
`;

    const configContent = JSON.stringify(
      {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        schemas: {
          directory: 'schemas',
          autoload: true,
        },
        content: {
          directory: 'content',
          formats: ['md', 'json', 'yaml'],
        },
      },
      null,
      2
    );

    const gitkeepContent = '# This file ensures the schemas directory is tracked by Git\n';

    // Create files using multiple files approach
    await github.createMultipleFiles(
      [
        { path: '.gitcms/README.md', content: readmeContent },
        { path: '.gitcms/config.json', content: configContent },
        { path: '.gitcms/schemas/.gitkeep', content: gitkeepContent },
      ],
      'Initialize GitCMS configuration'
    );

    return NextResponse.json({
      message: 'GitCMS setup initialized successfully',
      files: ['.gitcms/README.md', '.gitcms/config.json', '.gitcms/schemas/.gitkeep'],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initialize setup' },
      { status: 500 }
    );
  }
}

/**
 * Sync schemas between registry and repository
 */
async function handleSyncSchemas(github: GitHubApiClient, request: NextRequest) {
  try {
    const body = await request.json();
    const { direction = 'to-repo', schemas } = body;

    if (direction === 'to-repo') {
      // Sync from registry to repository
      if (!schemas || !Array.isArray(schemas)) {
        return NextResponse.json(
          { error: 'Schemas array is required for to-repo sync' },
          { status: 400 }
        );
      }

      let successCount = 0;
      const results = [];

      for (const schema of schemas) {
        try {
          const schemaPath = `.gitcms/schemas/${schema.id}.json`;
          const content = JSON.stringify(schema, null, 2);

          // Check if file exists
          let existingSha: string | undefined;
          try {
            const existing = await github.getFile(schemaPath);
            existingSha = existing.sha;
          } catch (error: any) {
            if (error.code !== 'NOT_FOUND') throw error;
          }

          await github.updateFile(
            schemaPath,
            content,
            `Sync schema: ${schema.metadata?.name || schema.id}`,
            existingSha
          );

          results.push({ schema: schema.id, success: true, path: schemaPath });
          successCount++;
        } catch (error) {
          results.push({ schema: schema.id, success: false, error: error });
        }
      }

      return NextResponse.json({
        message: `Synced ${successCount}/${schemas.length} schemas to repository`,
        synced: successCount,
        total: schemas.length,
        results,
      });
    } else if (direction === 'from-repo') {
      // Get schemas from repository
      const schemasResponse = await handleListSchemas(github);
      const schemasData = await schemasResponse.json();

      return NextResponse.json({
        message: `Found ${schemasData.total} schemas in repository`,
        schemas: schemasData.schemas,
        total: schemasData.total,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid sync direction. Use "to-repo" or "from-repo"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to sync schemas' }, { status: 500 });
  }
}

// DELETE handlers

/**
 * Delete a schema from the repository
 */
async function handleDeleteSchema(github: GitHubApiClient, schemaId: string) {
  try {
    const schemaPath = `.gitcms/schemas/${schemaId}.json`;

    // Get file info first
    const fileInfo = await github.getFile(schemaPath);

    // Delete the file
    await github.deleteFile(schemaPath, `Delete schema: ${schemaId}`, fileInfo.sha);

    return NextResponse.json({
      message: 'Schema deleted successfully',
      schemaId,
      path: schemaPath,
    });
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Schema not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete schema' },
      { status: 500 }
    );
  }
}
