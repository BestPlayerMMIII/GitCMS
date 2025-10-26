/**
 * Schema Storage Integration API
 *
 * Handles storing and retrieving schemas from GitHub repositories
 * in the .gitcms/schemas/ directory
 */

import { createGitHubClient } from '@/lib/client-github';
import { GitHubApiClient } from '@git-cms/core';
import type { GitCMSSchema, GitHubFileContent } from '@git-cms/core';

// ============================================================================
// CLIENT-CALLABLE FUNCTIONS
// ============================================================================

/**
 * Get schemas (client-callable)
 */
export async function schemasStorageGET(
  owner: string,
  repo: string,
  params: {
    action: 'list' | 'get' | 'check-setup' | 'validate-id';
    schemaId?: string;
    id?: string;
    currentId?: string;
    branch?: string;
  }
) {
  const branch = params.branch || 'main';
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();
  const client = new GitHubApiClient(token, owner, repo, branch);

  switch (params.action) {
    case 'list':
      return await listSchemasData(client);

    case 'get':
      if (!params.schemaId) {
        throw new Error('Schema ID is required');
      }
      return await getSchemaData(client, params.schemaId);

    case 'check-setup':
      return await checkSetupData(client);

    case 'validate-id':
      if (!params.id) {
        throw new Error('Schema ID is required for validation');
      }
      return await validateSchemaIdData(client, params.id, params.currentId);

    default:
      throw new Error('Invalid action parameter');
  }
}

/**
 * Save or sync schemas (client-callable)
 */
export async function schemasStoragePOST(
  owner: string,
  repo: string,
  params: {
    action: 'save' | 'init-setup' | 'sync';
    branch?: string;
  },
  body: {
    schema?: GitCMSSchema;
    commitMessage?: string;
    originalSchemaId?: string;
    direction?: 'to-repo' | 'from-repo';
    schemas?: GitCMSSchema[];
  }
) {
  const branch = params.branch || 'main';
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();
  const client = new GitHubApiClient(token, owner, repo, branch);

  switch (params.action) {
    case 'save':
      if (!body.schema || !body.schema.id) {
        throw new Error('Schema with ID is required');
      }
      return await saveSchemaData(client, body.schema, body.commitMessage, body.originalSchemaId);

    case 'init-setup':
      return await initSetupData(client);

    case 'sync':
      return await syncSchemasData(client, body.direction || 'to-repo', body.schemas);

    default:
      throw new Error('Invalid action parameter');
  }
}

/**
 * Delete schema (client-callable)
 */
export async function schemasStorageDELETE(
  owner: string,
  repo: string,
  params: {
    schemaId: string;
    branch?: string;
  }
) {
  const branch = params.branch || 'main';
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();
  const client = new GitHubApiClient(token, owner, repo, branch);

  return await deleteSchemaData(client, params.schemaId);
}

// ============================================================================
// DATA FUNCTIONS
// ============================================================================

async function listSchemasData(github: GitHubApiClient) {
  const schemasPath = '.gitcms/schemas';

  try {
    const contents = await github.getDirectory(schemasPath);
    const schemaFiles = contents.filter(
      (item: GitHubFileContent) => item.type === 'file' && item.name.endsWith('.json')
    );

    const schemas: GitCMSSchema[] = [];

    for (const file of schemaFiles) {
      try {
        const content = await github.getFileContent(file.path);
        const schema = JSON.parse(content);
        schemas.push(schema);
      } catch (error) {
        console.warn(`Failed to read schema file ${file.path}:`, error);
      }
    }

    return {
      schemas,
      total: schemas.length,
      path: schemasPath,
    };
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      return {
        schemas: [],
        total: 0,
        path: schemasPath,
        message: 'Schemas directory not found - repository not initialized for GitCMS',
      };
    }
    throw error;
  }
}

async function getSchemaData(github: GitHubApiClient, schemaId: string) {
  const schemaPath = `.gitcms/schemas/${schemaId}.json`;

  try {
    const content = await github.getFileContent(schemaPath);
    const file = await github.getFile(schemaPath);
    const schema = JSON.parse(content);

    return {
      schema,
      path: schemaPath,
      sha: file.sha,
    };
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      throw new Error('Schema not found');
    }
    throw new Error('Failed to get schema');
  }
}

async function checkSetupData(github: GitHubApiClient) {
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

  try {
    await github.getDirectory(gitcmsPath);
    status.hasGitCMSDirectory = true;
  } catch (error: any) {
    if (error.code !== 'NOT_FOUND') throw error;
  }

  try {
    const contents = await github.getDirectory(schemasPath);
    status.hasSchemasDirectory = true;
    status.schemaCount = contents.filter(
      (item: GitHubFileContent) => item.type === 'file' && item.name.endsWith('.json')
    ).length;
  } catch (error: any) {
    if (error.code !== 'NOT_FOUND') throw error;
  }

  try {
    await github.getFile(configPath);
    status.hasConfig = true;
  } catch (error: any) {
    if (error.code !== 'NOT_FOUND') throw error;
  }

  status.setupComplete =
    status.hasGitCMSDirectory && status.hasSchemasDirectory && status.hasConfig;

  return { status };
}

async function validateSchemaIdData(
  github: GitHubApiClient,
  schemaId: string,
  currentSchemaId?: string
) {
  const schemaPath = `.gitcms/schemas/${schemaId}.json`;

  try {
    await github.getFile(schemaPath);
    const isValid = currentSchemaId === schemaId;

    return {
      valid: isValid,
      exists: true,
      message: isValid ? 'Valid (current schema)' : 'Schema ID already exists',
    };
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      return {
        valid: true,
        exists: false,
        message: 'Schema ID is available',
      };
    }
    throw error;
  }
}

async function saveSchemaData(
  github: GitHubApiClient,
  schema: GitCMSSchema,
  commitMessage?: string,
  originalSchemaId?: string
) {
  const schemaPath = `.gitcms/schemas/${schema.id}.json`;
  const content = JSON.stringify(schema, null, 2);
  const message = commitMessage || `Update schema: ${schema.metadata?.name || schema.id}`;

  // Handle schema renaming
  if (originalSchemaId && originalSchemaId !== schema.id) {
    const originalPath = `.gitcms/schemas/${originalSchemaId}.json`;

    try {
      await github.getFile(originalPath);

      const createResult = await github.updateFile(schemaPath, content, message);

      try {
        const originalFile = await github.getFile(originalPath);
        await github.deleteFile(
          originalPath,
          `Remove renamed schema: ${originalSchemaId}`,
          originalFile.sha
        );
      } catch (deleteError) {
        console.warn('Failed to delete original schema file:', deleteError);
      }

      return {
        message: 'Schema renamed successfully',
        schema,
        path: schemaPath,
        originalPath,
        commit: createResult,
      };
    } catch (error: any) {
      if (error.code !== 'NOT_FOUND') throw error;
    }
  }

  // Regular save/update operation
  let isUpdate = false;
  let existingSha: string | undefined;

  try {
    const existing = await github.getFile(schemaPath);
    isUpdate = true;
    existingSha = existing.sha;
  } catch (error: any) {
    if (error.code !== 'NOT_FOUND') throw error;
  }

  const result = await github.updateFile(schemaPath, content, message, existingSha);

  return {
    message: isUpdate ? 'Schema updated successfully' : 'Schema created successfully',
    schema,
    path: schemaPath,
    commit: result,
  };
}

async function initSetupData(github: GitHubApiClient) {
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

  await github.createMultipleFiles(
    [
      { path: '.gitcms/README.md', content: readmeContent },
      { path: '.gitcms/config.json', content: configContent },
      { path: '.gitcms/schemas/.gitkeep', content: gitkeepContent },
    ],
    'Initialize GitCMS configuration'
  );

  return {
    message: 'GitCMS setup initialized successfully',
    files: ['.gitcms/README.md', '.gitcms/config.json', '.gitcms/schemas/.gitkeep'],
  };
}

async function syncSchemasData(
  github: GitHubApiClient,
  direction: 'to-repo' | 'from-repo',
  schemas?: GitCMSSchema[]
) {
  if (direction === 'to-repo') {
    if (!schemas || !Array.isArray(schemas)) {
      throw new Error('Schemas array is required for to-repo sync');
    }

    let successCount = 0;
    const results = [];

    for (const schema of schemas) {
      try {
        const schemaPath = `.gitcms/schemas/${schema.id}.json`;
        const content = JSON.stringify(schema, null, 2);

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

    return {
      message: `Synced ${successCount}/${schemas.length} schemas to repository`,
      synced: successCount,
      total: schemas.length,
      results,
    };
  } else if (direction === 'from-repo') {
    const schemasData = await listSchemasData(github);

    return {
      message: `Found ${schemasData.total} schemas in repository`,
      schemas: schemasData.schemas,
      total: schemasData.total,
    };
  } else {
    throw new Error('Invalid sync direction. Use "to-repo" or "from-repo"');
  }
}

async function deleteSchemaData(github: GitHubApiClient, schemaId: string) {
  const schemaPath = `.gitcms/schemas/${schemaId}.json`;

  try {
    const fileInfo = await github.getFile(schemaPath);
    await github.deleteFile(schemaPath, `Delete schema: ${schemaId}`, fileInfo.sha);

    return {
      message: 'Schema deleted successfully',
      schemaId,
      path: schemaPath,
    };
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      throw new Error('Schema not found');
    }
    throw new Error('Failed to delete schema');
  }
}
