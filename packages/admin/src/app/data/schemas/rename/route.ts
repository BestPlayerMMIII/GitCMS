import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  GitHubApiClient,
  type GitCMSSchema,
  extractSchemaReferences,
  getContentPath as getCentralizedContentPath,
  getGitCMSConfig,
} from '@git-cms/core';

/**
 * Schema Rename API - Handles atomic schema ID changes with cascading updates
 *
 * This endpoint orchestrates:
 * 1. Schema ID validation (no conflicts)
 * 2. Schema file rename
 * 3. Content directory rename (oldSchemaId/ -> newSchemaId/)
 * 4. Content file updates (update schemaId field in each content item)
 * 5. Schema reference updates (update schemaRef in all other schemas)
 *
 * All operations are atomic - if any step fails, none are committed.
 */

interface RenameSchemaRequest {
  oldSchemaId: string;
  newSchemaId: string;
}

interface FileOperation {
  path: string;
  content: string;
}

interface ContentItem {
  id: string;
  schemaId: string;
  data: Record<string, any>;
  metadata: any;
}

/**
 * Helper to get content path for a repository
 */
async function getContentPath(
  github: GitHubApiClient,
  owner: string,
  repo: string,
  accessToken: string
): Promise<string> {
  try {
    const config = await getGitCMSConfig(accessToken, owner, repo);
    console.log('fetched config for content path:', config);
    return getCentralizedContentPath(config);
  } catch (error) {
    console.warn('Failed to get config, using default content path');
    return getCentralizedContentPath();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    const body: RenameSchemaRequest = await request.json();
    const { oldSchemaId, newSchemaId } = body;

    if (!oldSchemaId || !newSchemaId) {
      return NextResponse.json(
        { error: 'Both oldSchemaId and newSchemaId are required' },
        { status: 400 }
      );
    }

    if (oldSchemaId === newSchemaId) {
      return NextResponse.json({ error: 'Schema IDs are the same' }, { status: 400 });
    }

    const github = new GitHubApiClient(session.accessToken, owner, repo);

    // Execute atomic rename operation
    const result = await renameSchemaWithCascade(
      github,
      oldSchemaId,
      newSchemaId,
      owner,
      repo,
      session.accessToken
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Schema rename error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to rename schema',
        success: false,
      },
      { status: 500 }
    );
  }
}

async function renameSchemaWithCascade(
  github: GitHubApiClient,
  oldSchemaId: string,
  newSchemaId: string,
  owner: string,
  repo: string,
  accessToken: string
): Promise<any> {
  const filesToCreate: FileOperation[] = [];
  const filesToDelete: string[] = [];

  // Step 1: Validate new schema ID is available
  const newSchemaPath = `.gitcms/schemas/${newSchemaId}.json`;
  try {
    await github.getFile(newSchemaPath);
    // File exists - conflict!
    throw new Error(`Schema with ID "${newSchemaId}" already exists`);
  } catch (error: any) {
    if (error.code !== 'NOT_FOUND') {
      throw error;
    }
    // File doesn't exist - good to proceed
  }

  // Step 2: Get the schema being renamed
  const oldSchemaPath = `.gitcms/schemas/${oldSchemaId}.json`;
  let schemaToRename: GitCMSSchema;

  try {
    const schemaContent = await github.getFileContent(oldSchemaPath);
    schemaToRename = JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Schema "${oldSchemaId}" not found`);
  }

  // Update schema's own ID
  schemaToRename.id = newSchemaId;

  // Add schema file operations
  filesToCreate.push({
    path: newSchemaPath,
    content: JSON.stringify(schemaToRename, null, 2),
  });
  filesToDelete.push(oldSchemaPath);

  // Step 3: Get all schemas to check for references
  const allSchemas = await getAllSchemas(github);

  // Step 4: Update schemaRef in all other schemas
  for (const schema of allSchemas) {
    if (schema.id === oldSchemaId) continue; // Skip the one being renamed

    let schemaModified = false;
    const updatedSchema = { ...schema };

    // Check all fields for schemaRef
    for (const [fieldKey, field] of Object.entries(schema.fields)) {
      const fieldAny = field as any;

      // Direct object field with schemaRef
      if (fieldAny.type === 'object' && fieldAny.schemaRef === oldSchemaId) {
        fieldAny.schemaRef = newSchemaId;
        updatedSchema.fields[fieldKey] = fieldAny;
        schemaModified = true;
      }

      // Array of objects with schemaRef
      if (
        fieldAny.type === 'array' &&
        fieldAny.items?.type === 'object' &&
        fieldAny.items?.schemaRef === oldSchemaId
      ) {
        fieldAny.items.schemaRef = newSchemaId;
        updatedSchema.fields[fieldKey] = fieldAny;
        schemaModified = true;
      }
    }

    if (schemaModified) {
      const schemaPath = `.gitcms/schemas/${schema.id}.json`;
      filesToCreate.push({
        path: schemaPath,
        content: JSON.stringify(updatedSchema, null, 2),
      });
    }
  }

  // Step 5: Handle content migration
  const contentPath = await getContentPath(github, owner, repo, accessToken);
  const oldContentDir = `${contentPath}/${oldSchemaId}`;

  console.log('old content directory:', oldContentDir);

  let contentItems: any[] = [];

  try {
    const files = await github.getDirectory(oldContentDir);

    for (const file of files) {
      if (file.name.endsWith('.json') && file.type === 'file') {
        try {
          const contentStr = await github.getFileContent(file.path);
          const contentItem: ContentItem = JSON.parse(contentStr);

          // Update schemaId in content
          contentItem.schemaId = newSchemaId;

          // Add to new location
          const newContentPath = `${contentPath}/${newSchemaId}/${file.name}`;
          filesToCreate.push({
            path: newContentPath,
            content: JSON.stringify(contentItem, null, 2),
          });

          // Mark old file for deletion
          filesToDelete.push(file.path);

          contentItems.push({ id: contentItem.id, path: newContentPath });
        } catch (error) {
          console.warn(`Failed to process content file ${file.path}:`, error);
        }
      }
    }
  } catch (error) {
    // Content directory doesn't exist - that's okay
    console.log(`No content directory found for schema ${oldSchemaId}`);
  }

  // Step 6: Execute atomic batch operation
  try {
    // Create all new files
    if (filesToCreate.length > 0) {
      await github.createMultipleFiles(
        filesToCreate,
        `Rename schema: ${oldSchemaId} → ${newSchemaId}`
      );
    }

    // Delete all old files sequentially
    if (filesToDelete.length > 0) {
      for (const filePath of filesToDelete) {
        try {
          // Get file SHA for deletion
          const fileInfo = await github.getFile(filePath);
          await github.deleteFile(
            filePath,
            `Cleanup after schema rename: ${oldSchemaId} → ${newSchemaId}`,
            fileInfo.sha
          );
        } catch (error) {
          console.warn(`Failed to delete ${filePath}:`, error);
          // Continue with other deletions even if one fails
        }
      }
    }

    return {
      success: true,
      message: `Schema renamed from "${oldSchemaId}" to "${newSchemaId}"`,
      details: {
        oldSchemaId,
        newSchemaId,
        schemasUpdated: allSchemas.filter(s => extractSchemaReferences(s).includes(oldSchemaId))
          .length,
        contentItemsMigrated: contentItems.length,
      },
    };
  } catch (error) {
    console.error('Batch operation failed:', error);
    throw new Error(
      `Failed to complete schema rename. Some files may have been created. ` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function getAllSchemas(github: GitHubApiClient): Promise<GitCMSSchema[]> {
  const schemas: GitCMSSchema[] = [];
  const schemasDir = '.gitcms/schemas';

  try {
    const files = await github.getDirectory(schemasDir);

    for (const file of files) {
      if (file.name.endsWith('.json') && file.type === 'file') {
        try {
          const content = await github.getFileContent(file.path);
          const schema = JSON.parse(content);
          schemas.push(schema);
        } catch (error) {
          console.warn(`Failed to parse schema ${file.path}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to read schemas directory:', error);
  }

  return schemas;
}
