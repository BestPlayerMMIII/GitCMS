import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  GitHubApiClient,
  getGitCMSConfig,
  getContentPath as getCentralizedContentPath,
  defaultValidationEngine,
  type GitCMSSchema,
} from '@git-cms/core';

// Content item interface
interface ContentItem {
  id: string;
  schemaId: string;
  data: Record<string, any>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
    status: 'draft' | 'published' | 'archived';
    slug?: string;
    publishedAt?: string;
  };
}

// Content API endpoints
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const schemaId = searchParams.get('schemaId');
    const contentId = searchParams.get('contentId');

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    const github = new GitHubApiClient(session.accessToken, owner, repo);

    switch (action) {
      case 'list':
        return await listContent(github, schemaId, owner!, repo!, session.accessToken);

      case 'get':
        if (!contentId) {
          return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
        }
        return await getContent(github, schemaId, contentId, owner!, repo!, session.accessToken);

      case 'validate-id':
        return await validateContentId(github, searchParams, owner!, repo!);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Content GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Content POST - Session:', {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      user: session?.user?.name,
    });

    if (!session?.accessToken) {
      console.log('Content POST - No access token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    console.log('Content POST - Params:', { action, owner, repo });

    if (!owner || !repo) {
      console.log('Content POST - Missing owner or repo');
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    const body = await request.json();
    console.log('Content POST - Body:', body);

    const github = new GitHubApiClient(session.accessToken, owner, repo);

    switch (action) {
      case 'create':
        return await createContent(
          github,
          body,
          session.user?.name || undefined,
          owner!,
          repo!,
          session.accessToken
        );

      case 'update':
        return await updateContent(
          github,
          body,
          session.user?.name || undefined,
          owner!,
          repo!,
          session.accessToken
        );

      default:
        console.log('Content POST - Invalid action:', action);
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Content POST error:', error);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const contentId = searchParams.get('contentId');
    const schemaId = searchParams.get('schemaId');

    if (!owner || !repo || !contentId || !schemaId) {
      return NextResponse.json(
        { error: 'Owner, repo, content ID, and schema ID are required' },
        { status: 400 }
      );
    }

    const github = new GitHubApiClient(session.accessToken, owner, repo);
    return await deleteContent(github, schemaId, contentId, owner, repo, session.accessToken);
  } catch (error) {
    console.error('Content DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}

// Implementation functions

async function listContent(
  github: GitHubApiClient,
  schemaId?: string | null,
  owner?: string,
  repo?: string,
  accessToken?: string
): Promise<NextResponse> {
  try {
    const contentPath = await getContentPath(github, owner!, repo!, accessToken!);
    const contentItems: ContentItem[] = [];

    // If schema ID is provided, list only that schema's content
    if (schemaId) {
      const schemaPath = `${contentPath}/${schemaId}`;
      try {
        const files = await github.getDirectory(schemaPath);

        for (const file of files) {
          if (file.name.endsWith('.json') && file.type === 'file') {
            try {
              const content = await github.getFileContent(file.path);
              const contentData = JSON.parse(content);

              const contentId = file.name.replace('.json', '');

              // Handle both old and new content structure
              const contentItem: ContentItem = {
                id: contentData.id || contentId,
                schemaId: contentData.schemaId || schemaId,
                data: contentData.data || {},
                metadata: {
                  createdAt: contentData.metadata?.createdAt || new Date().toISOString(),
                  updatedAt: contentData.metadata?.updatedAt || new Date().toISOString(),
                  author: contentData.metadata?.author,
                  status: contentData.metadata?.status || 'draft',
                  slug: contentData.metadata?.slug,
                  publishedAt: contentData.metadata?.publishedAt,
                },
              };

              contentItems.push(contentItem);
            } catch (error) {
              console.warn(`Failed to parse content file ${file.path}:`, error);
            }
          }
        }
      } catch (error) {
        // Schema directory doesn't exist yet
        console.warn(`Schema directory ${schemaPath} doesn't exist:`, error);
      }
    } else {
      // List all content across schemas
      try {
        const contentDir = await github.getDirectory(contentPath);

        for (const item of contentDir) {
          if (item.type === 'dir') {
            // This is a schema directory
            try {
              const schemaFiles = await github.getDirectory(item.path);

              for (const file of schemaFiles) {
                if (file.name.endsWith('.json') && file.type === 'file') {
                  try {
                    const content = await github.getFileContent(file.path);
                    const contentData = JSON.parse(content);

                    const contentId = file.name.replace('.json', '');

                    // Handle both old and new content structure
                    const contentItem: ContentItem = {
                      id: contentData.id || contentId,
                      schemaId: contentData.schemaId || item.name,
                      data: contentData.data || {},
                      metadata: {
                        createdAt: contentData.metadata?.createdAt || new Date().toISOString(),
                        updatedAt: contentData.metadata?.updatedAt || new Date().toISOString(),
                        author: contentData.metadata?.author,
                        status: contentData.metadata?.status || 'draft',
                        slug: contentData.metadata?.slug,
                        publishedAt: contentData.metadata?.publishedAt,
                      },
                    };

                    contentItems.push(contentItem);
                  } catch (error) {
                    console.warn(`Failed to parse content file ${file.path}:`, error);
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to read schema directory ${item.path}:`, error);
            }
          }
        }
      } catch (error) {
        // Content directory doesn't exist yet
        console.warn("Content directory doesn't exist:", error);
      }
    }

    // Sort by updated date (newest first)
    contentItems.sort(
      (a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
    );

    return NextResponse.json({
      success: true,
      items: contentItems,
      total: contentItems.length,
    });
  } catch (error) {
    console.error('List content error:', error);
    return NextResponse.json({ error: 'Failed to list content' }, { status: 500 });
  }
}

async function getContent(
  github: GitHubApiClient,
  schemaId: string | null,
  contentId: string,
  owner: string,
  repo: string,
  accessToken: string
): Promise<NextResponse> {
  try {
    const contentPath = await getContentPath(github, owner, repo, accessToken);
    const filePath = `${contentPath}/${schemaId}/${contentId}.json`;

    const content = await github.getFileContent(filePath);
    const contentData = JSON.parse(content);

    return NextResponse.json({
      success: true,
      content: {
        id: contentData.id || contentId,
        schemaId: contentData.schemaId || schemaId,
        data: contentData.data || {},
        metadata: {
          ...contentData.metadata,
          publishedAt: contentData.metadata?.publishedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }
}

async function createContent(
  github: GitHubApiClient,
  body: any,
  author?: string,
  owner?: string,
  repo?: string,
  accessToken?: string
): Promise<NextResponse> {
  try {
    console.log('Create content - Input:', { body, author });

    const { schemaId, data, metadata = {}, publish = false } = body;

    if (!schemaId || !data) {
      console.log('Create content - Missing required fields:', {
        schemaId: !!schemaId,
        data: !!data,
      });
      return NextResponse.json({ error: 'Schema ID and data are required' }, { status: 400 });
    }

    const contentPath = await getContentPath(github, owner!, repo!, accessToken!);

    // Handle content ID - either custom or generated
    let contentId: string;

    // Check if metadata was passed in data (old format) and extract it
    let finalData = { ...data };
    let finalMetadata = { ...metadata };

    if (data._metadata) {
      console.log('Create content - Found metadata in data, extracting it');
      finalMetadata = { ...finalMetadata, ...data._metadata };
      delete finalData._metadata;
    }

    if (finalMetadata.id) {
      // User provided a custom ID - check if it already exists
      console.log('Create content - Using custom ID:', finalMetadata.id);
      const contentFilePath = `${contentPath}/${schemaId}/${finalMetadata.id}.json`;

      try {
        await github.getFile(contentFilePath);
        // File exists, ID is taken
        console.log('Create content - Custom ID already exists:', finalMetadata.id);
        return NextResponse.json(
          {
            error: `Content with ID "${finalMetadata.id}" already exists`,
            fieldError: {
              field: 'id',
              message: `Content with ID "${finalMetadata.id}" already exists`,
            },
            type: 'validation_error',
          },
          { status: 409 }
        );
      } catch (error: any) {
        // File doesn't exist (404), ID is available - continue
        if (error.code !== 'NOT_FOUND') {
          console.warn('Error checking content ID existence:', error);
        }
      }

      contentId = finalMetadata.id;
    } else {
      // Generate content ID from data
      contentId = generateContentId(finalData, schemaId);
      console.log('Create content - Generated ID:', contentId);

      // Check if the generated ID conflicts and make it unique if needed
      const generatedFilePath = `${contentPath}/${schemaId}/${contentId}.json`;
      try {
        await github.getFile(generatedFilePath);
        // File exists, add timestamp to make it unique
        contentId = `${contentId}-${Date.now()}`;
        console.log('Create content - ID conflict resolved, new ID:', contentId);
      } catch (error: any) {
        // File doesn't exist (404), ID is available - continue
        if (error.code !== 'NOT_FOUND') {
          console.warn('Error checking generated content ID existence:', error);
        }
      }
    }

    // Validate content if publishing
    if (publish) {
      const schema = await getSchema(github, schemaId, owner!, repo!, accessToken!);
      const validation = await validateContent(finalData, schema, true);

      if (!validation.valid && validation.errors && validation.errors.length > 0) {
        console.log('Create content - Schema validation failed:', validation.errors);
        return NextResponse.json(
          {
            error: 'Content validation failed',
            fieldErrors: validation.errors,
            type: 'validation_error',
          },
          { status: 400 }
        );
      }
    }

    // Create content object with metadata at the root level
    const contentItem = {
      id: contentId,
      schemaId,
      data: finalData,
      metadata: {
        ...finalMetadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: author || finalMetadata.author,
        status: finalMetadata.status || 'draft',
      },
    };

    console.log('Create content - Content item:', contentItem);

    // Save to GitHub using createMultipleFiles (which handles directory creation)
    const filePath = `${contentPath}/${schemaId}/${contentId}.json`;
    const fileContent = JSON.stringify(contentItem, null, 2);

    console.log('Create content - File path:', filePath);

    // Use the createMultipleFiles method for atomic operation
    await github.createMultipleFiles(
      [
        {
          path: filePath,
          content: fileContent,
        },
      ],
      `Create ${schemaId} content: ${contentId}`
    );

    console.log('Create content - Success');

    return NextResponse.json({
      success: true,
      content: {
        id: contentId,
        schemaId,
        data: finalData,
        metadata: contentItem.metadata,
      },
    });
  } catch (error) {
    console.error('Create content error:', error);
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
  }
}

async function updateContent(
  github: GitHubApiClient,
  body: any,
  author?: string,
  owner?: string,
  repo?: string,
  accessToken?: string
): Promise<NextResponse> {
  try {
    const { contentId, schemaId, data, metadata = {}, publish = false, originalContentId } = body;

    if (!contentId || !schemaId || !data) {
      return NextResponse.json(
        { error: 'Content ID, schema ID, and data are required' },
        { status: 400 }
      );
    }

    const contentPath = await getContentPath(github, owner!, repo!, accessToken!);

    // Check if this is a content ID change (rename operation)
    const isRenamingContent = originalContentId && originalContentId !== contentId;

    // Get existing content to preserve metadata
    let existingContent: any = {};
    const originalFilePath = `${contentPath}/${schemaId}/${originalContentId || contentId}.json`;
    const newFilePath = `${contentPath}/${schemaId}/${contentId}.json`;

    try {
      const existing = await github.getFileContent(originalFilePath);
      existingContent = JSON.parse(existing);
    } catch {
      // Content doesn't exist, will be created
    }

    // Handle metadata extraction from data if present (backward compatibility)
    let finalData = { ...data };
    let finalMetadata = { ...metadata };

    if (data._metadata) {
      console.log('Update content - Found metadata in data, extracting it');
      finalMetadata = { ...finalMetadata, ...data._metadata };
      delete finalData._metadata;
    }

    // Determine the new status
    let newStatus = finalMetadata.status || existingContent.metadata?.status || 'draft';

    if (publish) {
      newStatus = 'published';
    }

    // Validate content if publishing
    if (publish) {
      const schema = await getSchema(github, schemaId, owner!, repo!, accessToken!);
      const validation = await validateContent(finalData, schema, true);

      if (!validation.valid && validation.errors && validation.errors.length > 0) {
        console.log('Update content - Schema validation failed:', validation.errors);
        return NextResponse.json(
          {
            error: 'Content validation failed',
            fieldErrors: validation.errors,
            type: 'validation_error',
          },
          { status: 400 }
        );
      }
    }

    // Update content object with metadata at root level
    const contentItem = {
      id: contentId,
      schemaId,
      data: finalData,
      metadata: {
        ...existingContent.metadata,
        ...finalMetadata,
        updatedAt: new Date().toISOString(),
        author: author || finalMetadata.author || existingContent.metadata?.author,
        createdAt: existingContent.metadata?.createdAt || new Date().toISOString(),
        status: newStatus,
        // Add publishedAt when content is published
        ...(newStatus === 'published' &&
          (!existingContent.metadata?.publishedAt ||
            existingContent.metadata?.status !== 'published') && {
            publishedAt: new Date().toISOString(),
          }),
      },
    };

    // Save to GitHub
    const fileContent = JSON.stringify(contentItem, null, 2);

    if (isRenamingContent) {
      // This is a rename operation: create new file and delete old file
      console.log(`Renaming content from ${originalContentId} to ${contentId}`);

      // 1. Create the new file
      await github.createMultipleFiles(
        [
          {
            path: newFilePath,
            content: fileContent,
          },
        ],
        `Rename ${schemaId} content: ${originalContentId} -> ${contentId}${publish ? ' (published)' : ''}`
      );

      // 2. Delete the old file if it exists and is different
      try {
        const originalFile = await github.getFile(originalFilePath);
        await github.deleteFile(
          originalFilePath,
          `Remove old content file after rename: ${originalContentId}`,
          originalFile.sha
        );
        console.log(`Successfully deleted old content file: ${originalFilePath}`);
      } catch (deleteError) {
        console.warn(`Could not delete old content file ${originalFilePath}:`, deleteError);
        // Continue even if we can't delete the old file - the new one was created successfully
      }
    } else {
      // Normal update operation
      try {
        console.log('Update content - Getting current file:', newFilePath);
        const currentFile = await github.getFile(newFilePath);
        console.log('Update content - Current file SHA:', currentFile.sha);

        await github.updateFile(
          newFilePath,
          fileContent,
          `Update ${schemaId} content: ${contentId}${publish ? ' (published)' : ''}`,
          currentFile.sha
        );
        console.log('Update content - File updated successfully');
      } catch (fileError) {
        console.log('Update content - File not found, creating new:', fileError);
        // File doesn't exist, create it
        await github.createMultipleFiles(
          [
            {
              path: newFilePath,
              content: fileContent,
            },
          ],
          `Create ${schemaId} content: ${contentId}${publish ? ' (published)' : ''}`
        );
        console.log('Update content - File created successfully');
      }
    }

    return NextResponse.json({
      success: true,
      content: {
        id: contentId,
        schemaId,
        data: finalData,
        metadata: contentItem.metadata,
      },
    });
  } catch (error) {
    console.error('Update content error:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}

async function deleteContent(
  github: GitHubApiClient,
  schemaId: string,
  contentId: string,
  owner: string,
  repo: string,
  accessToken: string
): Promise<NextResponse> {
  try {
    const contentPath = await getContentPath(github, owner, repo, accessToken);
    const filePath = `${contentPath}/${schemaId}/${contentId}.json`;

    // Get the file to get its SHA for deletion
    const file = await github.getFile(filePath);

    // Delete the file
    await github.deleteFile(filePath, `Delete content: ${contentId}`, file.sha);

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    console.error('Delete content error:', error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}

// Helper functions

async function getContentPath(
  github: GitHubApiClient,
  owner: string,
  repo: string,
  accessToken: string
): Promise<string> {
  try {
    const config = await getGitCMSConfig(accessToken, owner, repo);
    return getCentralizedContentPath(config);
  } catch (error) {
    console.warn('Failed to read GitCMS config, using default contentPath:', error);
    return getCentralizedContentPath(null);
  }
}

// Validation function for content ID uniqueness
async function validateContentId(
  github: GitHubApiClient,
  searchParams: URLSearchParams,
  owner: string,
  repo: string
) {
  try {
    const contentId = searchParams.get('id');
    const schemaId = searchParams.get('schemaId');
    const currentContentId = searchParams.get('currentId'); // For editing existing content

    if (!contentId || !schemaId) {
      return NextResponse.json({ error: 'Content ID and schema ID are required' }, { status: 400 });
    }

    const contentPath = `content/${schemaId}/${contentId}.json`;

    try {
      await github.getFile(contentPath);

      // File exists - check if it's the same as current (editing scenario)
      const isValid = currentContentId === contentId;

      return NextResponse.json({
        valid: isValid,
        exists: true,
        message: isValid ? 'Valid (current content)' : 'Content ID already exists',
      });
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        return NextResponse.json({
          valid: true,
          exists: false,
          message: 'Content ID is available',
        });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to validate content ID' }, { status: 500 });
  }
}

function generateContentId(data: any, schemaId: string): string {
  // Try to generate from title, name, or other identifying fields
  const titleFields = ['title', 'name', 'slug'];

  for (const field of titleFields) {
    if (data[field] && typeof data[field] === 'string') {
      return slugify(data[field]);
    }
  }

  // Fallback to timestamp with schema prefix
  return `${schemaId}-${Date.now()}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getSchema(
  github: GitHubApiClient,
  schemaId: string,
  owner: string,
  repo: string,
  accessToken: string
): Promise<GitCMSSchema | null> {
  return null;
  /*
  try {
    // For now, we'll skip schema validation since we don't have the schema storage path
    // In a full implementation, this would fetch the schema from the configured schemas path
    return null;
  } catch (error) {
    console.warn('Failed to fetch schema for validation:', error);
    return null;
  }
  */
}

async function validateContent(
  data: Record<string, any>,
  schema: GitCMSSchema | null,
  publish: boolean = false
): Promise<{ valid: boolean; errors?: any[] }> {
  // Only validate when publishing and we have a schema
  if (!publish || !schema) {
    return { valid: true };
  }

  try {
    const result = await defaultValidationEngine.validateContent(data, schema, 'create');

    return {
      valid: result.valid,
      errors: result.errors || [],
    };
  } catch (error) {
    console.error('Content validation error:', error);
    return { valid: false, errors: [{ field: '_form', message: 'Validation failed' }] };
  }
}
