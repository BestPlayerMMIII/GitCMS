/**
 * Upload Session Manager
 * Handles chunked upload sessions with progress tracking
 */

export interface UploadSession {
  fileName: string;
  fileSize: number;
  mimeType: string;
  targetPath: string;
  totalChunks: number;
  chunks: Buffer[];
  uploadedChunks: number;
  repository: {
    owner: string;
    repo: string;
  };
  createdAt: Date;
  lastActivity: Date;
}

export interface ProgressTracker {
  progress: number;
  phase: string;
  error?: string;
  completed?: boolean;
  result?: any;
}

class UploadSessionManager {
  private sessions = new Map<string, UploadSession>();
  private progressTrackers = new Map<string, ProgressTracker>();

  createSession(
    sessionId: string,
    sessionData: Omit<UploadSession, 'chunks' | 'uploadedChunks' | 'createdAt' | 'lastActivity'>
  ): void {
    const session: UploadSession = {
      ...sessionData,
      chunks: new Array(sessionData.totalChunks).fill(null),
      uploadedChunks: 0,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.progressTrackers.set(sessionId, {
      progress: 0,
      phase: 'uploading',
    });
  }

  getSession(sessionId: string): UploadSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  updateChunk(sessionId: string, chunkIndex: number, chunkData: Buffer): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.chunks[chunkIndex] = chunkData;
    session.uploadedChunks++;
    session.lastActivity = new Date();

    // Update progress
    const progress = (session.uploadedChunks / session.totalChunks) * 100;
    this.updateProgress(sessionId, { progress, phase: 'uploading' });

    return true;
  }

  isSessionComplete(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.uploadedChunks === session.totalChunks : false;
  }

  getCompleteFile(sessionId: string): Buffer | null {
    const session = this.sessions.get(sessionId);
    if (!session || !this.isSessionComplete(sessionId)) return null;

    return Buffer.concat(session.chunks);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.progressTrackers.delete(sessionId);
  }

  updateProgress(sessionId: string, update: Partial<ProgressTracker>): void {
    const current = this.progressTrackers.get(sessionId);
    if (current) {
      this.progressTrackers.set(sessionId, { ...current, ...update });
    }
  }

  getProgress(sessionId: string): ProgressTracker | undefined {
    return this.progressTrackers.get(sessionId);
  }

  // Cleanup old sessions (older than 1 hour)
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    this.sessions.forEach((session, sessionId) => {
      if (session.lastActivity < oneHourAgo) {
        this.deleteSession(sessionId);
      }
    });
  }

  // Get all session IDs for debugging
  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}

// Export singleton instance
export const uploadSessionManager = new UploadSessionManager();

// Set up periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      uploadSessionManager.cleanup();
    },
    10 * 60 * 1000
  ); // Cleanup every 10 minutes
}
