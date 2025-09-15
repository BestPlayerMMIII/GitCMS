import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  MediaValidator,
  MediaPathManager,
  GitHubMediaStorage,
  defaultMediaRegistry,
  MediaUploadOptions,
  GitHubApiClient,
  getGitCMSConfig,
  getMediaPath as getCentralizedMediaPath,
} from '@gitcms/core';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

// Chunked upload session storage
interface ChunkedUploadSession {
  uploadId: string;
  filename: string;
  fileSize: number;
  totalChunks: number;
  mimeType: string;
  owner: string;
  repo: string;
  folder?: string;
  chunks: Map<number, Buffer>;
  tempDir: string;
  createdAt: Date;
}

// In-memory session storage (in production, you might want to use Redis or a database)
const uploadSessions = new Map<string, ChunkedUploadSession>();

// Cleanup old sessions (older than 1 hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Only set up cleanup in environments that support setInterval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = new Date();
    const entriesToCleanup: string[] = [];

    uploadSessions.forEach((session, uploadId) => {
      if (now.getTime() - session.createdAt.getTime() > CLEANUP_INTERVAL) {
        entriesToCleanup.push(uploadId);
      }
    });

    entriesToCleanup.forEach(uploadId => {
      cleanupSession(uploadId);
    });
  }, CLEANUP_INTERVAL);
}

async function cleanupSession(uploadId: string) {
  const session = uploadSessions.get(uploadId);
  if (session) {
    try {
      await fs.rmdir(session.tempDir, { recursive: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory for ${uploadId}:`, error);
    }
    uploadSessions.delete(uploadId);
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
      case 'init':
        return await handleInitUpload(request, session.accessToken);
      case 'upload-chunk':
        return await handleUploadChunk(request);
      case 'finalize':
        return await handleFinalizeUpload(request, session.accessToken);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Chunked upload API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleInitUpload(request: NextRequest, accessToken: string): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { filename, fileSize, totalChunks, mimeType, owner, repo, folder, uploadId } = body;

    if (!filename || !fileSize || !totalChunks || !mimeType || !owner || !repo || !uploadId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate file parameters
    const mockFile = { name: filename, type: mimeType, size: fileSize } as File;
    const validation = MediaValidator.validateFile(mockFile);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'File validation failed', details: validation.error },
        { status: 400 }
      );
    }

    // Test GitHub access
    const githubClient = new GitHubApiClient(accessToken, owner, repo);
    try {
      await githubClient.getUser();
    } catch (authError) {
      return NextResponse.json({ error: 'GitHub authentication failed' }, { status: 401 });
    }

    // Create temporary directory for chunks
    const tempDir = path.join(tmpdir(), `gitcms-upload-${uploadId}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create upload session
    const session: ChunkedUploadSession = {
      uploadId,
      filename,
      fileSize,
      totalChunks,
      mimeType,
      owner,
      repo,
      folder,
      chunks: new Map(),
      tempDir,
      createdAt: new Date(),
    };

    uploadSessions.set(uploadId, session);

    return NextResponse.json({
      success: true,
      uploadId,
      message: 'Chunked upload initialized',
    });
  } catch (error) {
    console.error('Init upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleUploadChunk(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);

    if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: 'Missing required chunk parameters' }, { status: 400 });
    }

    const session = uploadSessions.get(uploadId);
    if (!session) {
      return NextResponse.json({ error: 'Upload session not found' }, { status: 404 });
    }

    // Convert chunk to buffer and store
    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Store chunk in memory (for small chunks) or temp file (for larger uploads)
    session.chunks.set(chunkIndex, buffer);

    return NextResponse.json({
      success: true,
      chunkIndex,
      receivedChunks: session.chunks.size,
      totalChunks: session.totalChunks,
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload chunk',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleFinalizeUpload(
  request: NextRequest,
  accessToken: string
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { uploadId } = body;

    const session = uploadSessions.get(uploadId);
    if (!session) {
      console.error(`Upload session not found for uploadId: ${uploadId}`);
      console.error('Available sessions:', Array.from(uploadSessions.keys()));
      return NextResponse.json({ error: 'Upload session not found' }, { status: 404 });
    }

    // Verify all chunks are received
    if (session.chunks.size !== session.totalChunks) {
      console.error(
        `Missing chunks for uploadId: ${uploadId}. Expected: ${session.totalChunks}, Received: ${session.chunks.size}`
      );
      return NextResponse.json({ error: 'Missing chunks' }, { status: 400 });
    }

    // Start async processing - the actual upload to GitHub will be tracked via SSE
    processUploadAsync(session, accessToken).catch(error => {
      console.error('Async upload processing failed:', error);
      // Set error in progress tracker
      uploadSessionManager.updateProgress(uploadId, {
        progress: 0,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Processing failed',
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Upload finalization started',
    });
  } catch (error) {
    console.error('Finalize upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to finalize upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Progress tracking for SSE
import { uploadSessionManager } from '@/lib/upload-session-manager';

async function processUploadAsync(session: ChunkedUploadSession, accessToken: string) {
  const { uploadId, owner, repo, folder } = session;

  try {
    // Initialize progress tracking
    uploadSessionManager.updateProgress(uploadId, {
      progress: 0,
      phase: 'assembling',
    });

    console.log(`Starting upload processing for uploadId: ${uploadId}`);

    // Step 1: Assemble file from chunks
    const assembledBuffer = await assembleChunks(session);

    uploadSessionManager.updateProgress(uploadId, {
      progress: 10,
      phase: 'uploading-to-github',
    });

    // Step 2: Upload to GitHub
    const githubClient = new GitHubApiClient(accessToken, owner, repo);
    const mediaBasePath = await getMediaPath(owner, repo, accessToken);
    const filePath = MediaPathManager.generatePathWithBase(mediaBasePath, session.filename, folder);

    // Convert to base64 for GitHub API
    const base64Content = assembledBuffer.toString('base64');

    uploadSessionManager.updateProgress(uploadId, {
      progress: 20,
      phase: 'uploading-to-github',
    });

    // Upload to GitHub (this could be further chunked for very large files)
    const message = `Add media file: ${session.filename}`;
    const response = await githubClient.uploadBinaryFile(filePath, base64Content, message);

    uploadSessionManager.updateProgress(uploadId, {
      progress: 80,
      phase: 'creating-media-record',
    });

    // Step 3: Create media file record
    const mediaFile = {
      id: GitHubMediaStorage.generateDeterministicId(filePath),
      filename: MediaPathManager.sanitizeFilename(session.filename),
      originalName: session.filename,
      path: filePath,
      size: session.fileSize,
      mimeType: session.mimeType,
      mediaType:
        MediaValidator.getMediaType({
          name: session.filename,
          type: session.mimeType,
        } as File) || 'other',
      url: GitHubMediaStorage.generateGitHubUrl(owner, repo, filePath),
      metadata: {
        folder: session.folder,
      },
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'current-user',
      repository: { owner, repo },
    };

    // Register in memory
    defaultMediaRegistry.register(mediaFile);

    uploadSessionManager.updateProgress(uploadId, {
      progress: 100,
      phase: 'complete',
      completed: true,
      result: mediaFile,
    });

    console.log(`Upload processing completed successfully for uploadId: ${uploadId}`);

    // Cleanup session after a delay to ensure SSE has time to send completion
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        cleanupSession(uploadId);
        console.log(`Session cleaned up for uploadId: ${uploadId}`);
      }, 5000); // 5 seconds delay
    } else {
      // Fallback for environments without setTimeout
      process.nextTick(() => {
        setTimeout(() => {
          cleanupSession(uploadId);
        }, 5000);
      });
    }
  } catch (error) {
    console.error('Upload processing error:', error);
    uploadSessionManager.updateProgress(uploadId, {
      progress: 0,
      phase: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Cleanup on error after a delay
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        cleanupSession(uploadId);
      }, 5000);
    } else {
      // Fallback for environments without setTimeout
      process.nextTick(() => {
        setTimeout(() => {
          cleanupSession(uploadId);
        }, 5000);
      });
    }
  }
}

async function assembleChunks(session: ChunkedUploadSession): Promise<Buffer> {
  const buffers: Buffer[] = [];

  // Sort chunks by index and combine
  for (let i = 0; i < session.totalChunks; i++) {
    const chunk = session.chunks.get(i);
    if (!chunk) {
      throw new Error(`Missing chunk ${i}`);
    }
    buffers.push(chunk);
  }

  return Buffer.concat(buffers);
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

// Session manager is available via direct import where needed
