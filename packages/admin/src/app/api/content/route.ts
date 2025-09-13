import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GitHubApiClient } from '@gitcms/core';

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
        return await listContent(github, schemaId);

      case 'get':
        if (!contentId) {
          return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
        }
        return await getContent(github, schemaId, contentId);

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
        return await createContent(github, body, session.user?.name || undefined);

      case 'update':
        return await updateContent(github, body, session.user?.name || undefined);

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
    return await deleteContent(github, schemaId, contentId);
  } catch (error) {
    console.error('Content DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}

// Implementation functions

async function listContent(
  github: GitHubApiClient,
  schemaId?: string | null
): Promise<NextResponse> {
  try {
    const contentItems: ContentItem[] = [];

    // If schema ID is provided, list only that schema's content
    if (schemaId) {
      const schemaPath = `.gitcms/content/${schemaId}`;
      try {
        const files = await github.getDirectory(schemaPath);

        for (const file of files) {
          if (file.name.endsWith('.json') && file.type === 'file') {
            try {
              const content = await github.getFileContent(file.path);
              const contentData = JSON.parse(content);

              const contentId = file.name.replace('.json', '');

              contentItems.push({
                id: contentId,
                schemaId: contentData.schemaId || schemaId,
                data: contentData.data || {},
                metadata: {
                  createdAt: contentData.metadata?.createdAt || new Date().toISOString(),
                  updatedAt: contentData.metadata?.updatedAt || new Date().toISOString(),
                  author: contentData.metadata?.author,
                  status: contentData.metadata?.status || 'draft',
                  slug: contentData.metadata?.slug,
                },
              });
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
        const contentDir = await github.getDirectory('.gitcms/content');

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

                    contentItems.push({
                      id: contentId,
                      schemaId: contentData.schemaId || item.name,
                      data: contentData.data || {},
                      metadata: {
                        createdAt: contentData.metadata?.createdAt || new Date().toISOString(),
                        updatedAt: contentData.metadata?.updatedAt || new Date().toISOString(),
                        author: contentData.metadata?.author,
                        status: contentData.metadata?.status || 'draft',
                        slug: contentData.metadata?.slug,
                      },
                    });
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
  contentId: string
): Promise<NextResponse> {
  try {
    let filePath = `.gitcms/content/${schemaId}/${contentId}.json`;

    const content = await github.getFileContent(filePath);
    const contentData = JSON.parse(content);

    return NextResponse.json({
      success: true,
      content: {
        id: contentId,
        schemaId: contentData.schemaId || schemaId,
        data: contentData.data || {},
        metadata: contentData.metadata || {},
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
  author?: string
): Promise<NextResponse> {
  try {
    console.log('Create content - Input:', { body, author });

    const { schemaId, data, metadata = {} } = body;

    if (!schemaId || !data) {
      console.log('Create content - Missing required fields:', {
        schemaId: !!schemaId,
        data: !!data,
      });
      return NextResponse.json({ error: 'Schema ID and data are required' }, { status: 400 });
    }

    // Generate content ID
    const contentId = metadata.id || generateContentId(data, schemaId);
    console.log('Create content - Generated ID:', contentId);

    // Create content object
    const contentItem = {
      schemaId,
      data,
      metadata: {
        ...metadata,
        id: contentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: author || metadata.author,
        status: metadata.status || 'draft',
      },
    };

    console.log('Create content - Content item:', contentItem);

    // Save to GitHub using createMultipleFiles (which handles directory creation)
    const filePath = `.gitcms/content/${schemaId}/${contentId}.json`;
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
        data,
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
  author?: string
): Promise<NextResponse> {
  try {
    const { contentId, schemaId, data, metadata = {} } = body;

    if (!contentId || !schemaId || !data) {
      return NextResponse.json(
        { error: 'Content ID, schema ID, and data are required' },
        { status: 400 }
      );
    }

    // Get existing content to preserve metadata
    let existingContent: any = {};
    const filePath = `.gitcms/content/${schemaId}/${contentId}.json`;

    try {
      const existing = await github.getFileContent(filePath);
      existingContent = JSON.parse(existing);
    } catch {
      // Content doesn't exist, will be created
    }

    // Update content object
    const contentItem = {
      schemaId,
      data,
      metadata: {
        ...existingContent.metadata,
        ...metadata,
        id: contentId,
        updatedAt: new Date().toISOString(),
        author: author || metadata.author || existingContent.metadata?.author,
        createdAt: existingContent.metadata?.createdAt || new Date().toISOString(),
      },
    };

    // Save to GitHub
    const fileContent = JSON.stringify(contentItem, null, 2);

    // Get the current file to get its SHA for updating
    try {
      console.log('Update content - Getting current file:', filePath);
      const currentFile = await github.getFile(filePath);
      console.log('Update content - Current file SHA:', currentFile.sha);

      await github.updateFile(
        filePath,
        fileContent,
        `Update ${schemaId} content: ${contentId}`,
        currentFile.sha
      );
      console.log('Update content - File updated successfully');
    } catch (fileError) {
      console.log('Update content - File not found, creating new:', fileError);
      // File doesn't exist, create it
      await github.createMultipleFiles(
        [
          {
            path: filePath,
            content: fileContent,
          },
        ],
        `Create ${schemaId} content: ${contentId}`
      );
      console.log('Update content - File created successfully');
    }

    return NextResponse.json({
      success: true,
      content: {
        id: contentId,
        schemaId,
        data,
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
  contentId: string
): Promise<NextResponse> {
  try {
    const filePath = `.gitcms/content/${schemaId}/${contentId}.json`;

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
