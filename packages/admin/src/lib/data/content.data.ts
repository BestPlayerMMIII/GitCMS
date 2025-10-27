import { createGitHubClient } from '@/lib/client-github';
import {
  GitHubApiClient,
  getGitCMSConfig,
  getContentPath as getCentralizedContentPath,
  defaultValidationEngine,
  type GitCMSSchema,
} from '@git-cms/core';
import * as IndexManager from '@/lib/data/index-manager';

// Content item interface
export interface ContentItem {
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// REFACTORED CLIENT-CALLABLE FUNCTIONS
// These functions can be called directly from client-side without Next.js
// ============================================================================

/**
 * Get content list (client-callable)
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param schemaId - Optional schema ID to filter by
 * @param author - Optional author for content creation
 */
export async function contentGET(
  owner: string,
  repo: string,
  params: {
    action: 'list' | 'get' | 'validate-id';
    schemaId?: string;
    contentId?: string;
    id?: string;
    currentId?: string;
  },
  author?: string
) {
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  switch (params.action) {
    case 'list':
      return await listContentData(github, params.schemaId, owner, repo, token);

    case 'get':
      if (!params.contentId) {
        throw new Error('Content ID is required');
      }
      return await getContentData(github, params.schemaId!, params.contentId, owner, repo, token);

    case 'validate-id':
      if (!params.id || !params.schemaId) {
        throw new Error('Content ID and schema ID are required');
      }
      return await validateContentIdData(
        github,
        params.id,
        params.schemaId,
        params.currentId,
        owner,
        repo
      );

    default:
      throw new Error('Invalid action');
  }
}

/**
 * Create or update content (client-callable)
 */
export async function contentPOST(
  owner: string,
  repo: string,
  params: {
    action: 'create' | 'update';
  },
  body: {
    schemaId: string;
    data: Record<string, any>;
    metadata?: any;
    publish?: boolean;
    contentId?: string;
    originalContentId?: string;
  },
  author?: string
) {
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  switch (params.action) {
    case 'create':
      return await createContentData(github, body, author, owner, repo, token);

    case 'update':
      return await updateContentData(github, body, author, owner, repo, token);

    default:
      throw new Error('Invalid action');
  }
}

/**
 * Delete content (client-callable)
 */
export async function contentDELETE(
  owner: string,
  repo: string,
  params: {
    schemaId: string;
    contentId: string;
  }
) {
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  return await deleteContentData(github, params.schemaId, params.contentId, owner, repo, token);
}

// Data-only versions of the functions (return data instead of NextResponse)

async function listContentData(
  github: GitHubApiClient,
  schemaId: string | undefined,
  owner: string,
  repo: string,
  accessToken: string
): Promise<{ success: boolean; items: ContentItem[]; total: number }> {
  const contentPath = await getContentPath(github, owner, repo, accessToken);
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
      console.warn(`Schema directory ${schemaPath} doesn't exist:`, error);
    }
  } else {
    // List all content across schemas
    try {
      const contentDir = await github.getDirectory(contentPath);

      for (const item of contentDir) {
        if (item.type === 'dir') {
          try {
            const schemaFiles = await github.getDirectory(item.path);

            for (const file of schemaFiles) {
              if (file.name.endsWith('.json') && file.type === 'file') {
                try {
                  const content = await github.getFileContent(file.path);
                  const contentData = JSON.parse(content);
                  const contentId = file.name.replace('.json', '');

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
      console.warn("Content directory doesn't exist:", error);
    }
  }

  // Sort by updated date (newest first)
  contentItems.sort(
    (a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
  );

  return {
    success: true,
    items: contentItems,
    total: contentItems.length,
  };
}

async function getContentData(
  github: GitHubApiClient,
  schemaId: string,
  contentId: string,
  owner: string,
  repo: string,
  accessToken: string
): Promise<{ success: boolean; content: ContentItem }> {
  const contentPath = await getContentPath(github, owner, repo, accessToken);
  const filePath = `${contentPath}/${schemaId}/${contentId}.json`;

  const content = await github.getFileContent(filePath);
  const contentData = JSON.parse(content);

  return {
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
  };
}

async function createContentData(
  github: GitHubApiClient,
  body: any,
  author: string | undefined,
  owner: string,
  repo: string,
  accessToken: string
): Promise<{ success: boolean; content: ContentItem }> {
  const { schemaId, data, metadata = {}, publish = false } = body;

  if (!schemaId || !data) {
    throw new Error('Schema ID and data are required');
  }

  const contentPath = await getContentPath(github, owner, repo, accessToken);

  let contentId: string;
  let finalData = { ...data };
  let finalMetadata = { ...metadata };

  if (data._metadata) {
    finalMetadata = { ...finalMetadata, ...data._metadata };
    delete finalData._metadata;
  }

  if (finalMetadata.id) {
    const contentFilePath = `${contentPath}/${schemaId}/${finalMetadata.id}.json`;

    try {
      await github.getFile(contentFilePath);
      throw new Error(`Content with ID "${finalMetadata.id}" already exists`);
    } catch (error: any) {
      if (error.code !== 'NOT_FOUND' && !error.message.includes('already exists')) {
        console.warn('Error checking content ID existence:', error);
      }
      if (error.message.includes('already exists')) {
        throw error;
      }
    }

    contentId = finalMetadata.id;
  } else {
    contentId = generateContentId(finalData, schemaId);

    const generatedFilePath = `${contentPath}/${schemaId}/${contentId}.json`;
    try {
      await github.getFile(generatedFilePath);
      contentId = `${contentId}-${Date.now()}`;
    } catch (error: any) {
      if (error.code !== 'NOT_FOUND') {
        console.warn('Error checking generated content ID existence:', error);
      }
    }
  }

  if (publish) {
    const schema = await getSchema(github, schemaId, owner, repo, accessToken);
    const validation = await validateContent(finalData, schema, true);

    if (!validation.valid && validation.errors && validation.errors.length > 0) {
      throw new Error(`Content validation failed: ${JSON.stringify(validation.errors)}`);
    }
  }

  const contentItem: ContentItem = {
    id: contentId,
    schemaId,
    data: finalData,
    metadata: {
      ...finalMetadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: author || finalMetadata.author,
      status: finalMetadata.status || 'draft',
    } as ContentItem['metadata'],
  };

  const filePath = `${contentPath}/${schemaId}/${contentId}.json`;
  const fileContent = JSON.stringify(contentItem, null, 2);

  await github.createMultipleFiles(
    [{ path: filePath, content: fileContent }],
    `Create ${schemaId} content: ${contentId}`
  );

  // Update index
  await IndexManager.addToIndex(github, contentPath, schemaId, `${contentId}.json`);

  return {
    success: true,
    content: contentItem,
  };
}

async function updateContentData(
  github: GitHubApiClient,
  body: any,
  author: string | undefined,
  owner: string,
  repo: string,
  accessToken: string
): Promise<{ success: boolean; content: ContentItem }> {
  const { contentId, schemaId, data, metadata = {}, publish = false, originalContentId } = body;

  if (!contentId || !schemaId || !data) {
    throw new Error('Content ID, schema ID, and data are required');
  }

  const contentPath = await getContentPath(github, owner, repo, accessToken);
  const isRenamingContent = originalContentId && originalContentId !== contentId;

  let existingContent: any = {};
  const originalFilePath = `${contentPath}/${schemaId}/${originalContentId || contentId}.json`;
  const newFilePath = `${contentPath}/${schemaId}/${contentId}.json`;

  try {
    const existing = await github.getFileContent(originalFilePath);
    existingContent = JSON.parse(existing);
  } catch {
    // Content doesn't exist
  }

  let finalData = { ...data };
  let finalMetadata = { ...metadata };

  if (data._metadata) {
    finalMetadata = { ...finalMetadata, ...data._metadata };
    delete finalData._metadata;
  }

  let newStatus = finalMetadata.status || existingContent.metadata?.status || 'draft';

  if (publish) {
    newStatus = 'published';
  }

  if (publish) {
    const schema = await getSchema(github, schemaId, owner, repo, accessToken);
    const validation = await validateContent(finalData, schema, true);

    if (!validation.valid && validation.errors && validation.errors.length > 0) {
      throw new Error(`Content validation failed: ${JSON.stringify(validation.errors)}`);
    }
  }

  const contentItem: ContentItem = {
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
      ...(newStatus === 'published' &&
        (!existingContent.metadata?.publishedAt ||
          existingContent.metadata?.status !== 'published') && {
          publishedAt: new Date().toISOString(),
        }),
    } as ContentItem['metadata'],
  };

  const fileContent = JSON.stringify(contentItem, null, 2);

  if (isRenamingContent) {
    await github.createMultipleFiles(
      [{ path: newFilePath, content: fileContent }],
      `Rename ${schemaId} content: ${originalContentId} -> ${contentId}${publish ? ' (published)' : ''}`
    );

    try {
      const originalFile = await github.getFile(originalFilePath);
      await github.deleteFile(
        originalFilePath,
        `Remove old content file after rename: ${originalContentId}`,
        originalFile.sha
      );
    } catch (deleteError) {
      console.warn(`Could not delete old content file ${originalFilePath}:`, deleteError);
    }

    // Update index to reflect rename
    await IndexManager.renameInIndex(
      github,
      contentPath,
      schemaId,
      `${originalContentId}.json`,
      `${contentId}.json`
    );
  } else {
    try {
      const currentFile = await github.getFile(newFilePath);
      await github.updateFile(
        newFilePath,
        fileContent,
        `Update ${schemaId} content: ${contentId}${publish ? ' (published)' : ''}`,
        currentFile.sha
      );
    } catch {
      await github.createMultipleFiles(
        [{ path: newFilePath, content: fileContent }],
        `Create ${schemaId} content: ${contentId}${publish ? ' (published)' : ''}`
      );

      // Add to index if creating new file
      await IndexManager.addToIndex(github, contentPath, schemaId, `${contentId}.json`);
    }
  }

  return {
    success: true,
    content: contentItem,
  };
}

async function deleteContentData(
  github: GitHubApiClient,
  schemaId: string,
  contentId: string,
  owner: string,
  repo: string,
  accessToken: string
): Promise<{ success: boolean; message: string }> {
  const contentPath = await getContentPath(github, owner, repo, accessToken);
  const filePath = `${contentPath}/${schemaId}/${contentId}.json`;

  const file = await github.getFile(filePath);
  await github.deleteFile(filePath, `Delete content: ${contentId}`, file.sha);

  // Update index
  await IndexManager.removeFromIndex(github, contentPath, schemaId, `${contentId}.json`);

  return {
    success: true,
    message: 'Content deleted successfully',
  };
}

async function validateContentIdData(
  github: GitHubApiClient,
  contentId: string,
  schemaId: string,
  currentContentId: string | undefined,
  owner: string,
  repo: string
): Promise<{ valid: boolean; exists: boolean; message: string }> {
  const contentPath = `content/${schemaId}/${contentId}.json`;

  try {
    await github.getFile(contentPath);
    const isValid = currentContentId === contentId;

    return {
      valid: isValid,
      exists: true,
      message: isValid ? 'Valid (current content)' : 'Content ID already exists',
    };
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      return {
        valid: true,
        exists: false,
        message: 'Content ID is available',
      };
    }
    throw error;
  }
}
