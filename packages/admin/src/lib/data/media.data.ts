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
  generateThumbnailBlob,
  generateThumbnailDataUrl,
  thumbnailBlobToFile,
  getThumbnailPath,
} from '@git-cms/core';
import { createGitHubClient } from '@/lib/client-github';

// ============================================================================
// Thumbnail Configuration (Client-Side)
// ============================================================================

// Maximum file size for thumbnail generation (10MB)
// Files larger than this will be loaded on-demand by AuthenticatedImage component
const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;

// ============================================================================
// API Functions
// ============================================================================

export async function mediaGET(owner: string, repo: string, action: string, params?: any) {
  switch (action) {
    case 'list':
      return await handleListMedia(params, owner, repo);

    case 'get':
      const mediaId = params?.mediaId;
      if (!mediaId) {
        throw new Error('Media ID is required');
      }
      return await handleGetMedia(mediaId);

    case 'folders':
      return await handleGetFolders();

    case 'stats':
      return await handleGetStats();

    case 'repository-media':
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }
      const github = createGitHubClient(owner, repo);
      const token = await (github as any).getAccessToken();
      return await handleGetRepositoryMedia(owner, repo, token, params || {});

    default:
      throw new Error('Invalid action');
  }
}

export async function mediaPOST(owner: string, repo: string, action: string, data: any) {
  const github = createGitHubClient(owner, repo);
  const token = await (github as any).getAccessToken();

  switch (action) {
    case 'upload':
      return await handleUploadMedia(data, token);

    case 'batch-upload':
      return await handleBatchUpload(data, token);

    case 'create-folder':
      return await handleCreateFolder(data);

    default:
      throw new Error('Invalid action');
  }
}

export async function mediaPUT(owner: string, repo: string, action: string, data: any) {
  const github = createGitHubClient(owner, repo);
  const token = await (github as any).getAccessToken();

  switch (action) {
    case 'update-metadata':
      return await handleUpdateMetadata(data);

    case 'move':
      return await handleMoveMedia(data, token);

    default:
      throw new Error('Invalid action');
  }
}

export async function mediaDELETE(owner: string, repo: string, mediaId: string) {
  if (!mediaId || !owner || !repo) {
    throw new Error('Media ID, owner, and repo are required');
  }

  const github = createGitHubClient(owner, repo);
  const token = await (github as any).getAccessToken();

  return await handleDeleteMedia(mediaId, owner, repo, token);
}

// Handler functions

async function handleListMedia(params: any, owner: string | null, repo: string | null) {
  const mediaType = params?.mediaType as MediaType | null;
  const folder = params?.folder;
  const search = params?.search;
  const tags = params?.tags?.split(',').filter(Boolean);

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

  return {
    media,
    total: media.length,
    filters,
  };
}

async function handleGetMedia(mediaId: string) {
  const media = defaultMediaRegistry.get(mediaId);

  if (!media) {
    throw new Error('Media not found');
  }

  return { media };
}

async function handleGetFolders() {
  const folders = defaultMediaRegistry.getFolders();
  return { folders };
}

async function handleGetStats() {
  const stats = defaultMediaRegistry.getStats();
  return { stats };
}

async function handleGetRepositoryMedia(
  owner: string,
  repo: string,
  accessToken: string,
  params: any
) {
  // Handle placeholder values
  if (owner === 'placeholder' || repo === 'placeholder') {
    return {
      media: [],
      total: 0,
      message: 'Please select a valid repository to view media files',
    };
  }

  const githubClient = new GitHubApiClient(accessToken, owner, repo);

  try {
    // Get the configured media path from .gitcms/config.json
    const mediaPath = await getMediaPath(owner, repo, accessToken);
    const files = await githubClient.getDirectory(mediaPath);

    // Convert GitHub files to media files
    const mediaFiles: GitCMSMediaFile[] = [];

    for (const file of files) {
      if (file.type === 'file') {
        // Start with the GitHub API reported size
        let actualSize = file.size || 0;

        // Check if this is an LFS pointer file (they're tiny, ~130 bytes)
        // If file is suspiciously small, fetch it and check if it's an LFS pointer
        if (actualSize < 200) {
          try {
            const fileWithLFS = await githubClient.getFileWithLFSInfo(file.path);
            if (fileWithLFS.lfsSize) {
              actualSize = fileWithLFS.lfsSize;
              console.log(`LFS file detected: ${file.name}, actual size: ${actualSize} bytes`);
            }
          } catch (error) {
            console.warn(`Could not check LFS info for ${file.path}:`, error);
          }
        }

        // Create media file object from GitHub file
        const mediaType =
          MediaValidator.getMediaType({
            name: file.name,
            type: getMimeTypeFromExtension(file.name),
          } as File) || 'other';

        let thumbnailUrl: string | undefined;

        // For images, try to fetch the pre-generated thumbnail from GitHub
        if (mediaType === 'image') {
          try {
            const thumbnailPath = getThumbnailPath(file.path);

            // Check if thumbnail exists and fetch it
            const thumbnailFile = await githubClient.getFile(thumbnailPath);

            if (thumbnailFile.content && thumbnailFile.encoding === 'base64') {
              // Convert base64 to data URL
              const mimeType = 'image/webp'; // Thumbnails are WebP
              thumbnailUrl = `data:${mimeType};base64,${thumbnailFile.content}`;
              console.log(`Loaded thumbnail for: ${file.name}`);
            }
          } catch (error) {
            // Thumbnail doesn't exist or failed to fetch - that's okay
            // The AuthenticatedImage component will handle it
            console.debug(`No thumbnail found for: ${file.name}`);
          }
        }

        const mediaFile: GitCMSMediaFile = {
          id: GitHubMediaStorage.generateDeterministicId(file.path),
          filename: file.name,
          originalName: file.name,
          path: file.path,
          size: actualSize,
          mimeType: getMimeTypeFromExtension(file.name),
          mediaType,
          url: GitHubMediaStorage.generateGitHubUrl(owner, repo, file.path),
          thumbnailUrl,
          metadata: {
            folder: MediaPathManager.extractFolderFromPath(file.path, mediaPath) || undefined,
          },
          uploadedAt: new Date().toISOString(), // TODO: get from Git history
          uploadedBy: 'unknown', // TODO: get from Git history
          repository: { owner, repo },
        };

        mediaFiles.push(mediaFile);
        defaultMediaRegistry.register(mediaFile);
      }
    }

    // Filter hidden files by default (files/folders starting with .)
    const showHidden = params?.showHidden === 'true' || params?.showHidden === true;
    const filteredMediaFiles = showHidden
      ? mediaFiles
      : mediaFiles.filter(file => {
          const filename = file.filename;
          const pathParts = file.path.split('/');
          // Filter out files that start with . or are in folders that start with .
          return !filename.startsWith('.') && !pathParts.some(part => part.startsWith('.'));
        });

    return {
      media: filteredMediaFiles,
      total: filteredMediaFiles.length,
    };
  } catch (error: any) {
    console.error('Error fetching repository media:', error);

    // Handle specific error cases
    if (error.code === 'NOT_FOUND') {
      // Media directory doesn't exist yet - this is normal for new repositories
      return {
        media: [],
        total: 0,
        message: 'No media directory found. Upload your first file to get started!',
      };
    }

    if (error.code === 'UNAUTHORIZED') {
      throw new Error(
        'Unauthorized access to repository. Please check your GitHub permissions for this repository'
      );
    }

    if (error.code === 'FORBIDDEN') {
      throw new Error('Access forbidden. You do not have permission to access this repository');
    }

    // For other errors, throw generic error
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch repository media');
  }
}

async function handleUploadMedia(data: any, accessToken: string) {
  try {
    const { file, owner, repo, folder, tags, alt, description, customFilename } = data;

    if (!file || !owner || !repo) {
      throw new Error('File, owner, and repo are required');
    }

    // Validate file
    const validation = MediaValidator.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'File validation failed');
    }

    // Check for large files (GitHub LFS has a 2GB limit)
    const fileSizeMB = file.size / (1024 * 1024);
    const fileSizeGB = fileSizeMB / 1024;
    if (fileSizeGB > 2) {
      throw new Error(
        `File too large (${fileSizeGB.toFixed(2)}GB). GitHub LFS supports files up to 2GB. Please compress the file or split it into smaller parts.`
      );
    }

    // Info about large files (files ≥1MB automatically use Git LFS)
    if (fileSizeMB >= 1) {
      console.log(
        `Large file detected: ${file.name} (${fileSizeMB.toFixed(1)}MB). Will automatically use Git LFS.`
      );
    }

    // Recommend enabling LFS for very large files (>100MB) if not already configured
    if (fileSizeMB > 100) {
      console.log(
        `⚠️  Very large file: ${file.name} (${fileSizeMB.toFixed(1)}MB). Ensure Git LFS is enabled in your repository.`
      );
      console.log(`   If upload fails, please check: https://git-lfs.github.com/`);
    }

    // Upload to GitHub
    const githubClient = new GitHubApiClient(accessToken, owner, repo);

    // Log file info for debugging
    console.log(`Starting upload for file: ${file.name} (${fileSizeMB.toFixed(1)}MB)`);

    // Get the configured media path
    const mediaBasePath = await getMediaPath(owner, repo, accessToken);

    // Determine the filename to use - always keep original name
    const finalFilename = customFilename || file.name;

    // Generate path with duplicate check (always keep original names, add suffix if duplicate)
    const path = await MediaPathManager.generatePathWithBaseAndDuplicateCheck(
      mediaBasePath,
      finalFilename,
      folder,
      githubClient
    );

    // Upload options
    const options: MediaUploadOptions = {
      folder,
      tags,
      alt,
      description,
      generateThumbnail: validation.mediaType === 'image',
    };

    const mediaFile = await GitHubMediaStorage.uploadFile(
      file,
      path,
      githubClient,
      owner,
      repo,
      options
    );

    console.log(
      `Upload successful for file: ${file.name} (${fileSizeMB.toFixed(1)}MB) to path: ${path}`
    );

    // Generate and upload thumbnail for images
    if (validation.mediaType === 'image' && options.generateThumbnail !== false) {
      try {
        console.log(`Generating thumbnail for ${file.name}...`);

        // Generate thumbnail as data URL (uses centralized utility from @git-cms/core)
        const thumbnailDataUrl = await generateThumbnailDataUrl(file, {
          maxWidth: 300,
          maxHeight: 300,
          quality: 0.8,
          format: 'image/webp',
        });

        // Generate thumbnail blob for GitHub upload
        const thumbnailBlob = await generateThumbnailBlob(file, {
          maxWidth: 300,
          maxHeight: 300,
          quality: 0.8,
          format: 'image/webp',
        });

        // Convert to File for upload
        const thumbnailFile = thumbnailBlobToFile(thumbnailBlob, file.name);

        // Get thumbnail path (in thumbnails subfolder)
        const thumbnailPath = getThumbnailPath(path);

        // Convert thumbnail to base64
        const thumbnailBase64 = await GitHubMediaStorage['fileToBase64'](thumbnailFile);

        // Upload thumbnail to GitHub
        const thumbnailMessage = `Add thumbnail for: ${file.name}`;
        await githubClient.uploadBinaryFile(thumbnailPath, thumbnailBase64, thumbnailMessage);

        console.log(`Thumbnail uploaded successfully to: ${thumbnailPath}`);

        // Add thumbnail data URL to mediaFile object
        mediaFile.thumbnailUrl = thumbnailDataUrl;

        console.log(`Thumbnail data URL added to media file`);
      } catch (thumbnailError) {
        // Don't fail the entire upload if thumbnail generation fails
        console.warn(`Failed to generate/upload thumbnail for ${file.name}:`, thumbnailError);
      }
    } // Register in memory
    defaultMediaRegistry.register(mediaFile);

    return {
      success: true,
      media: mediaFile,
      message: 'File uploaded successfully',
    };
  } catch (error) {
    console.error('Upload error:', error);

    // Provide specific error messages based on error type
    let errorMessage = 'Upload failed';

    if (error instanceof Error) {
      if (error.message.includes('authentication') || error.message.includes('401')) {
        errorMessage = 'GitHub authentication failed. Please check your access token.';
      } else if (error.message.includes('permission') || error.message.includes('403')) {
        errorMessage = 'Access denied. Check your repository permissions.';
      } else if (error.message.includes('validation')) {
        errorMessage = 'File validation failed';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'GitHub rate limit exceeded. Please try again later.';
      } else if (error.message.includes('too large') || error.message.includes('413')) {
        errorMessage =
          'File is too large for GitHub (100MB limit). Consider using Git LFS for large files or compress the file.';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network error during upload. Please try again.';
      } else {
        errorMessage = error.message; // Use the original error message directly
      }
    }

    throw new Error(errorMessage);
  }
}

async function handleBatchUpload(data: any, accessToken: string) {
  try {
    const { files, owner, repo, folder } = data;

    if (!files?.length || !owner || !repo) {
      throw new Error('Files, owner, and repo are required');
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

        // Generate and upload thumbnail for images
        if (validation.mediaType === 'image' && options.generateThumbnail !== false) {
          try {
            console.log(`Generating thumbnail for ${file.name}...`);

            // Generate thumbnail as data URL (uses centralized utility from @git-cms/core)
            const thumbnailDataUrl = await generateThumbnailDataUrl(file, {
              maxWidth: 300,
              maxHeight: 300,
              quality: 0.8,
              format: 'image/webp',
            });

            // Generate thumbnail blob for GitHub upload
            const thumbnailBlob = await generateThumbnailBlob(file, {
              maxWidth: 300,
              maxHeight: 300,
              quality: 0.8,
              format: 'image/webp',
            });

            // Convert to File for upload
            const thumbnailFile = thumbnailBlobToFile(thumbnailBlob, file.name);

            // Get thumbnail path (in thumbnails subfolder)
            const thumbnailPath = getThumbnailPath(path);

            // Convert thumbnail to base64
            const thumbnailBase64 = await GitHubMediaStorage['fileToBase64'](thumbnailFile);

            // Upload thumbnail to GitHub
            const thumbnailMessage = `Add thumbnail for: ${file.name}`;
            await githubClient.uploadBinaryFile(thumbnailPath, thumbnailBase64, thumbnailMessage);

            // Add thumbnail data URL to mediaFile object
            mediaFile.thumbnailUrl = thumbnailDataUrl;

            console.log(`Thumbnail uploaded and data URL added for: ${file.name}`);
          } catch (thumbnailError) {
            console.warn(`Failed to generate/upload thumbnail for ${file.name}:`, thumbnailError);
          }
        }

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

    return {
      success: true,
      results,
      message: `Uploaded ${results.success.length} files, ${results.errors.length} errors`,
    };
  } catch (error) {
    console.error('Batch upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Batch upload failed');
  }
}

async function handleUpdateMetadata(data: any) {
  try {
    const { mediaId, metadata } = data;

    if (!mediaId) {
      throw new Error('Media ID is required');
    }

    const success = defaultMediaRegistry.update(mediaId, { metadata });

    if (!success) {
      throw new Error('Media not found');
    }

    const updatedMedia = defaultMediaRegistry.get(mediaId);
    return {
      success: true,
      media: updatedMedia,
      message: 'Metadata updated successfully',
    };
  } catch (error) {
    console.error('Update metadata error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update metadata');
  }
}

async function handleMoveMedia(data: any, accessToken: string) {
  try {
    const { mediaId, newFolder, owner, repo } = data;

    if (!mediaId || !owner || !repo) {
      throw new Error('Media ID, owner, and repo are required');
    }

    const media = defaultMediaRegistry.get(mediaId);
    if (!media) {
      throw new Error('Media not found');
    }

    // Get the configured media path
    const mediaBasePath = await getMediaPath(owner, repo, accessToken);

    // Generate new path with custom base path
    const newPath = MediaPathManager.generatePathWithBase(mediaBasePath, media.filename, newFolder);

    // TODO: Implement GitHub file move operation
    // This would involve creating the file at the new location and deleting the old one

    return {
      success: true,
      message: 'Move operation not yet implemented',
    };
  } catch (error) {
    console.error('Move media error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to move media');
  }
}

async function handleCreateFolder(data: any) {
  try {
    const { folderName } = data;

    if (!folderName) {
      throw new Error('Folder name is required');
    }

    // For now, just return success - folders are created implicitly when files are uploaded
    return {
      success: true,
      folder: MediaPathManager.sanitizeFilename(folderName),
      message: 'Folder will be created when first file is uploaded',
    };
  } catch (error) {
    console.error('Create folder error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create folder');
  }
}

async function handleDeleteMedia(
  mediaId: string,
  owner: string,
  repo: string,
  accessToken: string
) {
  try {
    let media = defaultMediaRegistry.get(mediaId);

    // If not found in registry, try to find by path or regenerate ID
    if (!media) {
      console.warn(`Media ID ${mediaId} not found in registry. Attempting to find media...`);

      // Try to refresh the media list to ensure we have current data
      const githubClient = new GitHubApiClient(accessToken, owner, repo);
      const mediaPath = await getMediaPath(owner, repo, accessToken);
      const files = await githubClient.getDirectory(mediaPath);

      // Find the file and regenerate its ID
      for (const file of files) {
        if (file.type === 'file') {
          const regeneratedId = GitHubMediaStorage.generateDeterministicId(file.path);
          if (regeneratedId === mediaId) {
            // Found the file, create a temporary media object for deletion
            media = {
              id: mediaId,
              filename: file.name,
              originalName: file.name,
              path: file.path,
              size: file.size || 0,
              mimeType: getMimeTypeFromExtension(file.name),
              mediaType:
                MediaValidator.getMediaType({
                  name: file.name,
                  type: getMimeTypeFromExtension(file.name),
                } as File) || 'other',
              url: GitHubMediaStorage.generateGitHubUrl(owner, repo, file.path),
              metadata: {},
              uploadedAt: new Date().toISOString(),
              uploadedBy: 'unknown',
              repository: { owner, repo },
            };
            break;
          }
        }
      }

      if (!media) {
        throw new Error(`Media with ID ${mediaId} could not be found in repository.`);
      }
    }

    // Delete from GitHub repository
    const githubClient = new GitHubApiClient(accessToken, owner, repo);

    try {
      // Get the file to obtain its SHA (required for deletion)
      const fileInfo = await githubClient.getFile(media.path);

      // Delete the file
      await githubClient.deleteFile(
        media.path,
        `Delete media file: ${media.filename}`,
        fileInfo.sha
      );

      console.log(`Successfully deleted file from GitHub: ${media.path}`);
    } catch (deleteError) {
      console.error('Error deleting file from GitHub:', deleteError);
      // Continue with registry cleanup even if GitHub deletion fails
    }

    // Remove from registry
    defaultMediaRegistry.delete(mediaId);

    return {
      success: true,
      message: 'Media deleted successfully',
      deletedFile: {
        id: media.id,
        filename: media.filename,
        path: media.path,
      },
    };
  } catch (error) {
    console.error('Delete media error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete media');
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
