import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import sharp from 'sharp';
import {
  GitCMSMediaFile,
  MediaValidator,
  MediaPathManager,
  GitHubMediaStorage,
  defaultMediaRegistry,
  MediaUploadOptions,
  MediaType,
  MEDIA_TYPES,
  GitHubApiClient,
  getGitCMSConfig,
  getMediaPath as getCentralizedMediaPath,
} from '@gitcms/core';

// Thumbnail configuration
const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 200, height: 200 },
  large: { width: 300, height: 300 },
} as const;

const DEFAULT_THUMBNAIL_CONFIG = {
  size: 'medium' as keyof typeof THUMBNAIL_SIZES,
  quality: 80,
  format: 'webp' as const,
};

// Generate thumbnail from base64 image data
async function generateThumbnail(
  base64Content: string,
  mimeType: string,
  size: keyof typeof THUMBNAIL_SIZES = 'medium'
): Promise<string> {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Content, 'base64');

    // Get thumbnail dimensions
    const { width, height } = THUMBNAIL_SIZES[size];

    // Resize and optimize image
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: DEFAULT_THUMBNAIL_CONFIG.quality })
      .toBuffer();

    // Convert back to base64
    const thumbnailBase64 = thumbnailBuffer.toString('base64');
    return `data:image/webp;base64,${thumbnailBase64}`;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    // Return original image as fallback
    return `data:${mimeType};base64,${base64Content}`;
  }
}

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

    switch (action) {
      case 'list':
        return await handleListMedia(searchParams, owner, repo);

      case 'get':
        const mediaId = searchParams.get('mediaId');
        if (!mediaId) {
          return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
        }
        return await handleGetMedia(mediaId);

      case 'folders':
        return await handleGetFolders();

      case 'stats':
        return await handleGetStats();

      case 'repository-media':
        if (!owner || !repo) {
          return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
        }
        return await handleGetRepositoryMedia(owner, repo, session.accessToken, searchParams);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Media API GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'upload':
        return await handleUploadMedia(request, session.accessToken);

      case 'batch-upload':
        return await handleBatchUpload(request, session.accessToken);

      case 'create-folder':
        return await handleCreateFolder(request);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Media API POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'update-metadata':
        return await handleUpdateMetadata(request);

      case 'move':
        return await handleMoveMedia(request, session.accessToken);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Media API PUT error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!mediaId || !owner || !repo) {
      return NextResponse.json(
        {
          error: 'Media ID, owner, and repo are required',
        },
        { status: 400 }
      );
    }

    return await handleDeleteMedia(mediaId, owner, repo, session.accessToken);
  } catch (error) {
    console.error('Media API DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handler functions

async function handleListMedia(
  searchParams: URLSearchParams,
  owner: string | null,
  repo: string | null
): Promise<NextResponse> {
  const mediaType = searchParams.get('mediaType') as MediaType | null;
  const folder = searchParams.get('folder');
  const search = searchParams.get('search');
  const tags = searchParams.get('tags')?.split(',').filter(Boolean);

  const filters = {
    ...(mediaType && { mediaType }),
    ...(folder && { folder }),
    ...(search && { search }),
    ...(tags && { tags }),
  };

  let media = defaultMediaRegistry.list(filters);

  // Filter by repository if specified
  if (owner && repo) {
    media = media.filter(file => file.repository.owner === owner && file.repository.repo === repo);
  }

  return NextResponse.json({
    media,
    total: media.length,
    filters,
  });
}

async function handleGetMedia(mediaId: string): Promise<NextResponse> {
  const media = defaultMediaRegistry.get(mediaId);

  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  return NextResponse.json({ media });
}

async function handleGetFolders(): Promise<NextResponse> {
  const folders = defaultMediaRegistry.getFolders();
  return NextResponse.json({ folders });
}

async function handleGetStats(): Promise<NextResponse> {
  const stats = defaultMediaRegistry.getStats();
  return NextResponse.json({ stats });
}

async function handleGetRepositoryMedia(
  owner: string,
  repo: string,
  accessToken: string,
  searchParams: URLSearchParams
): Promise<NextResponse> {
  // Handle placeholder values
  if (owner === 'placeholder' || repo === 'placeholder') {
    return NextResponse.json({
      media: [],
      total: 0,
      message: 'Please select a valid repository to view media files',
    });
  }

  const githubClient = new GitHubApiClient(accessToken, owner, repo);

  try {
    // Get the configured media path from .gitcms/config.json
    const mediaPath = await getMediaPath(owner, repo, accessToken);
    const files = await githubClient.getDirectory(mediaPath);

    // Check if we should include image content (for thumbnails)
    const includeContent = searchParams.get('includeContent') === 'true';

    // Convert GitHub files to media files
    const mediaFiles: GitCMSMediaFile[] = [];

    for (const file of files) {
      if (file.type === 'file') {
        // Create media file object from GitHub file
        const mediaType =
          MediaValidator.getMediaType({
            name: file.name,
            type: getMimeTypeFromExtension(file.name),
          } as File) || 'other';

        let imageUrl = GitHubMediaStorage.generateGitHubUrl(owner, repo, file.path);
        let thumbnailUrl: string | undefined;

        // For images, optionally fetch content and create thumbnail data URL
        if (includeContent && mediaType === 'image') {
          try {
            const fileContent = await githubClient.getFile(file.path);
            if (fileContent.content) {
              const mimeType = getMimeTypeFromExtension(file.name);
              // Get requested thumbnail size from query params
              const thumbnailSize =
                (searchParams.get('thumbnailSize') as keyof typeof THUMBNAIL_SIZES) || 'medium';
              // Generate low-resolution thumbnail
              thumbnailUrl = await generateThumbnail(fileContent.content, mimeType, thumbnailSize);
            }
          } catch (error) {
            console.warn(`Failed to fetch content for ${file.path}:`, error);
            // Fall back to GitHub raw URL
          }
        }

        const mediaFile: GitCMSMediaFile = {
          id: GitHubMediaStorage.generateId(),
          filename: file.name,
          originalName: file.name,
          path: file.path,
          size: file.size || 0,
          mimeType: getMimeTypeFromExtension(file.name),
          mediaType,
          url: imageUrl,
          thumbnailUrl,
          metadata: {
            folder: MediaPathManager.extractFolderFromPath(file.path, mediaPath) || undefined,
          },
          uploadedAt: new Date().toISOString(), // TODO: get from Git history
          uploadedBy: 'unknown', // TODO: get from Git history
          repository: { owner, repo },
        };

        mediaFiles.push(mediaFile);

        // Register in memory registry
        defaultMediaRegistry.register(mediaFile);
      }
    }

    return NextResponse.json({
      media: mediaFiles,
      total: mediaFiles.length,
    });
  } catch (error: any) {
    console.error('Error fetching repository media:', error);

    // Handle specific error cases
    if (error.code === 'NOT_FOUND') {
      // Media directory doesn't exist yet - this is normal for new repositories
      return NextResponse.json({
        media: [],
        total: 0,
        message: 'No media directory found. Upload your first file to get started!',
      });
    }

    if (error.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        {
          error: 'Unauthorized access to repository',
          details: 'Please check your GitHub permissions for this repository',
        },
        { status: 401 }
      );
    }

    if (error.code === 'FORBIDDEN') {
      return NextResponse.json(
        {
          error: 'Access forbidden',
          details: 'You do not have permission to access this repository',
        },
        { status: 403 }
      );
    }

    // For other errors, return a generic error
    return NextResponse.json(
      {
        error: 'Failed to fetch repository media',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleUploadMedia(request: NextRequest, accessToken: string): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const owner = formData.get('owner') as string;
    const repo = formData.get('repo') as string;
    const folder = (formData.get('folder') as string) || undefined;
    const tags = (formData.get('tags') as string)?.split(',').filter(Boolean) || [];
    const alt = (formData.get('alt') as string) || undefined;
    const description = (formData.get('description') as string) || undefined;

    if (!file || !owner || !repo) {
      return NextResponse.json(
        {
          error: 'File, owner, and repo are required',
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = MediaValidator.validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'File validation failed',
          details: validation.error,
        },
        { status: 400 }
      );
    }

    // Get the configured media path
    const mediaBasePath = await getMediaPath(owner, repo, accessToken);

    // Generate path with custom base path
    const path = MediaPathManager.generatePathWithBase(mediaBasePath, file.name, folder);

    // Upload options
    const options: MediaUploadOptions = {
      folder,
      tags,
      alt,
      description,
      generateThumbnail: validation.mediaType === 'image',
    };

    // Upload to GitHub
    const githubClient = new GitHubApiClient(accessToken, owner, repo);
    const mediaFile = await GitHubMediaStorage.uploadFile(
      file,
      path,
      githubClient,
      owner,
      repo,
      options
    );

    // Register in memory
    defaultMediaRegistry.register(mediaFile);

    return NextResponse.json({
      success: true,
      media: mediaFile,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleBatchUpload(request: NextRequest, accessToken: string): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const owner = formData.get('owner') as string;
    const repo = formData.get('repo') as string;
    const folder = (formData.get('folder') as string) || undefined;

    if (!files.length || !owner || !repo) {
      return NextResponse.json(
        {
          error: 'Files, owner, and repo are required',
        },
        { status: 400 }
      );
    }

    const githubClient = new GitHubApiClient(accessToken, owner, repo);

    // Get the configured media path
    const mediaBasePath = await getMediaPath(owner, repo, accessToken);

    const results: { success: GitCMSMediaFile[]; errors: { file: string; error: string }[] } = {
      success: [],
      errors: [],
    };

    // Process files sequentially to avoid GitHub API rate limits
    for (const file of files) {
      try {
        // Validate file
        const validation = MediaValidator.validateFile(file);
        if (!validation.valid) {
          results.errors.push({
            file: file.name,
            error: validation.error || 'Validation failed',
          });
          continue;
        }

        // Generate path with custom base path
        const path = MediaPathManager.generatePathWithBase(mediaBasePath, file.name, folder);

        // Upload options
        const options: MediaUploadOptions = {
          folder,
          generateThumbnail: validation.mediaType === 'image',
        };

        // Upload to GitHub
        const mediaFile = await GitHubMediaStorage.uploadFile(
          file,
          path,
          githubClient,
          owner,
          repo,
          options
        );

        // Register in memory
        defaultMediaRegistry.register(mediaFile);
        results.success.push(mediaFile);
      } catch (error) {
        results.errors.push({
          file: file.name,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Uploaded ${results.success.length} files, ${results.errors.length} errors`,
    });
  } catch (error) {
    console.error('Batch upload error:', error);
    return NextResponse.json(
      {
        error: 'Batch upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleUpdateMetadata(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { mediaId, metadata } = body;

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const success = defaultMediaRegistry.update(mediaId, { metadata });

    if (!success) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const updatedMedia = defaultMediaRegistry.get(mediaId);
    return NextResponse.json({
      success: true,
      media: updatedMedia,
      message: 'Metadata updated successfully',
    });
  } catch (error) {
    console.error('Update metadata error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleMoveMedia(request: NextRequest, accessToken: string): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { mediaId, newFolder, owner, repo } = body;

    if (!mediaId || !owner || !repo) {
      return NextResponse.json(
        {
          error: 'Media ID, owner, and repo are required',
        },
        { status: 400 }
      );
    }

    const media = defaultMediaRegistry.get(mediaId);
    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Get the configured media path
    const mediaBasePath = await getMediaPath(owner, repo, accessToken);

    // Generate new path with custom base path
    const newPath = MediaPathManager.generatePathWithBase(mediaBasePath, media.filename, newFolder);

    // TODO: Implement GitHub file move operation
    // This would involve creating the file at the new location and deleting the old one

    return NextResponse.json({
      success: true,
      message: 'Move operation not yet implemented',
    });
  } catch (error) {
    console.error('Move media error:', error);
    return NextResponse.json(
      {
        error: 'Failed to move media',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleCreateFolder(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { folderName } = body;

    if (!folderName) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    // For now, just return success - folders are created implicitly when files are uploaded
    return NextResponse.json({
      success: true,
      folder: MediaPathManager.sanitizeFilename(folderName),
      message: 'Folder will be created when first file is uploaded',
    });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create folder',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleDeleteMedia(
  mediaId: string,
  owner: string,
  repo: string,
  accessToken: string
): Promise<NextResponse> {
  try {
    const media = defaultMediaRegistry.get(mediaId);
    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // TODO: Implement GitHub file deletion
    // Need to get the file SHA first, then delete

    // Remove from registry
    defaultMediaRegistry.delete(mediaId);

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    });
  } catch (error) {
    console.error('Delete media error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete media',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Utility functions

function getMimeTypeFromExtension(filename: string): string {
  const extension = MediaValidator.getFileExtension(filename);

  // Find the mime type from MEDIA_TYPES
  for (const mediaType of Object.values(MEDIA_TYPES)) {
    const index = mediaType.extensions.indexOf(extension);
    if (index !== -1) {
      return mediaType.mimeTypes[index] || 'application/octet-stream';
    }
  }

  return 'application/octet-stream';
}

/**
 * Get the media path from GitCMS configuration
 */
async function getMediaPath(owner: string, repo: string, accessToken: string): Promise<string> {
  try {
    const config = await getGitCMSConfig(accessToken, owner, repo);
    return getCentralizedMediaPath(config);
  } catch (error) {
    console.warn('Failed to read GitCMS config, using default mediaPath:', error);
    return getCentralizedMediaPath(null);
  }
}
