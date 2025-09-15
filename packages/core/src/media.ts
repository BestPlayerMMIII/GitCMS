// GitCMS Media Management System
// Comprehensive media utilities for file handling, validation, and storage

export interface GitCMSMediaFile {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'other';
  url: string;
  thumbnailUrl?: string;
  metadata: MediaMetadata;
  uploadedAt: string;
  uploadedBy: string;
  repository: {
    owner: string;
    repo: string;
  };
}

export interface MediaMetadata {
  // Image metadata
  width?: number;
  height?: number;
  format?: string;
  aspectRatio?: number;

  // Video metadata
  duration?: number;
  bitrate?: number;
  fps?: number;

  // Audio metadata
  channels?: number;
  sampleRate?: number;

  // Document metadata
  pages?: number;
  author?: string;
  title?: string;

  // General metadata
  description?: string;
  tags?: string[];
  alt?: string;
  folder?: string;
}

export interface MediaUploadOptions {
  folder?: string;
  generateThumbnail?: boolean;
  optimizeImages?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  tags?: string[];
  alt?: string;
  description?: string;
}

export interface MediaStorageConfig {
  basePath: string; // e.g., '.gitcms/media'
  cdnUrl?: string;
  thumbnailSizes: number[];
  optimizationSettings: {
    images: {
      quality: number;
      maxWidth: number;
      maxHeight: number;
      formats: string[];
    };
  };
}

// Supported media types and validation
export const MEDIA_TYPES = {
  image: {
    extensions: [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
      '.bmp',
      '.ico',
    ] as readonly string[],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/x-icon',
    ] as readonly string[],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  video: {
    extensions: ['.mp4', '.webm', '.mov', '.avi', '.mkv'] as readonly string[],
    mimeTypes: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ] as readonly string[],
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  audio: {
    extensions: ['.mp3', '.wav', '.ogg', '.aac', '.flac'] as readonly string[],
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/flac',
    ] as readonly string[],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'] as readonly string[],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
    ] as readonly string[],
    maxSize: 25 * 1024 * 1024, // 25MB
  },
  other: {
    extensions: ['.zip', '.rar', '.json', '.xml', '.csv'] as readonly string[],
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/json',
      'application/xml',
      'text/csv',
    ] as readonly string[],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
};

export type MediaType = keyof typeof MEDIA_TYPES;

// Media validation utilities
export class MediaValidator {
  static validateFile(
    file: File,
    allowedTypes?: MediaType[]
  ): { valid: boolean; error?: string; mediaType?: MediaType } {
    // Determine media type
    const mediaType = this.getMediaType(file);
    if (!mediaType) {
      return { valid: false, error: 'Unsupported file type' };
    }

    // Check if type is allowed
    if (allowedTypes && !allowedTypes.includes(mediaType)) {
      return { valid: false, error: `File type '${mediaType}' is not allowed` };
    }

    // Check file size
    const maxSize = MEDIA_TYPES[mediaType as keyof typeof MEDIA_TYPES].maxSize;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`,
      };
    }

    // Check mime type
    const mediaTypeConfig = MEDIA_TYPES[mediaType as keyof typeof MEDIA_TYPES];
    if (!mediaTypeConfig.mimeTypes.includes(file.type)) {
      return { valid: false, error: 'File type does not match its content' };
    }

    return { valid: true, mediaType };
  }

  static getMediaType(file: File): MediaType | null {
    const extension = this.getFileExtension(file.name);

    for (const [type, config] of Object.entries(MEDIA_TYPES)) {
      if (config.extensions.includes(extension) || config.mimeTypes.includes(file.type)) {
        return type as MediaType;
      }
    }

    return null;
  }

  static getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Media path utilities
export class MediaPathManager {
  private static readonly BASE_PATH = '.gitcms/media';

  static generatePath(filename: string, folder?: string): string {
    return this.generatePathWithBase(this.BASE_PATH, filename, folder);
  }

  static generatePathWithBase(basePath: string, filename: string, folder?: string): string {
    const timestamp = Date.now();
    const cleanFilename = this.sanitizeFilename(filename);
    const extension = MediaValidator.getFileExtension(filename);
    const nameWithoutExt = cleanFilename.replace(extension, '');

    // Generate unique filename with timestamp
    const uniqueFilename = `${nameWithoutExt}-${timestamp}${extension}`;

    if (folder) {
      return `${basePath}/${this.sanitizeFilename(folder)}/${uniqueFilename}`;
    }

    return `${basePath}/${uniqueFilename}`;
  }

  static generateThumbnailPath(originalPath: string, size: number): string {
    const extension = MediaValidator.getFileExtension(originalPath);
    const pathWithoutExt = originalPath.replace(extension, '');
    return `${pathWithoutExt}-thumb-${size}x${size}.webp`;
  }

  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  static getFolderPath(folder: string): string {
    return `${this.BASE_PATH}/${this.sanitizeFilename(folder)}`;
  }

  static extractFolder(path: string): string | null {
    return this.extractFolderFromPath(path, this.BASE_PATH);
  }

  static extractFolderFromPath(path: string, basePath: string): string | null {
    const relativePath = path.replace(`${basePath}/`, '');
    const parts = relativePath.split('/');
    return parts.length > 1 ? parts[0] : null;
  }
}

// GitHub-specific media operations
export interface GitHubMediaOperation {
  action: 'upload' | 'delete' | 'move' | 'update';
  path: string;
  content?: string; // base64 for upload
  sha?: string; // for updates/deletes
  message: string;
}

export class GitHubMediaStorage {
  static async uploadFile(
    file: File,
    path: string,
    githubClient: any, // GitHub client from core
    owner: string,
    repo: string,
    options: MediaUploadOptions = {}
  ): Promise<GitCMSMediaFile> {
    try {
      // Convert file to base64
      const base64Content = await this.fileToBase64(file);

      // Create commit message
      const message = `Add media file: ${file.name}`;

      // Upload to GitHub
      const response = await githubClient.uploadBinaryFile(path, base64Content, message);

      // Generate media file object
      const mediaFile: GitCMSMediaFile = {
        id: this.generateDeterministicId(path),
        filename: MediaPathManager.sanitizeFilename(file.name),
        originalName: file.name,
        path,
        size: file.size,
        mimeType: file.type,
        mediaType: MediaValidator.getMediaType(file) || 'other',
        url: this.generateGitHubUrl(owner, repo, path),
        metadata: {
          folder: options.folder,
          tags: options.tags || [],
          alt: options.alt,
          description: options.description,
        },
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'current-user', // TODO: get from session
        repository: { owner, repo },
      };

      return mediaFile;
    } catch (error) {
      throw new Error(
        `Upload failed for ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  static async deleteFile(
    path: string,
    sha: string,
    githubClient: any,
    owner: string,
    repo: string
  ): Promise<void> {
    await githubClient.deleteFile(path, `Delete media file: ${path}`, sha);
  }

  static generateGitHubUrl(owner: string, repo: string, path: string): string {
    return `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  }

  static generateId(): string {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateDeterministicId(filepath: string): string {
    // Generate a deterministic ID based on the file path
    // This ensures the same file always gets the same ID
    const hash = filepath.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    return `media_${Math.abs(hash)}_${
      filepath
        .split('/')
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 10) || 'file'
    }`;
  }

  private static async fileToBase64(file: File): Promise<string> {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
      // Browser environment - use FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
    } else {
      // Server environment - use arrayBuffer and Buffer
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
      } catch (error) {
        throw new Error(
          `Failed to convert file to base64: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }
}

// Media registry for tracking uploaded files
export class MediaRegistry {
  private media: Map<string, GitCMSMediaFile> = new Map();

  register(mediaFile: GitCMSMediaFile): void {
    this.media.set(mediaFile.id, mediaFile);
  }

  get(id: string): GitCMSMediaFile | undefined {
    return this.media.get(id);
  }

  getByPath(path: string): GitCMSMediaFile | undefined {
    return Array.from(this.media.values()).find(file => file.path === path);
  }

  list(
    filters: {
      mediaType?: MediaType;
      folder?: string;
      tags?: string[];
      search?: string;
    } = {}
  ): GitCMSMediaFile[] {
    let files = Array.from(this.media.values());

    if (filters.mediaType) {
      files = files.filter(file => file.mediaType === filters.mediaType);
    }

    if (filters.folder) {
      files = files.filter(file => file.metadata.folder === filters.folder);
    }

    if (filters.tags && filters.tags.length > 0) {
      files = files.filter(file => filters.tags!.some(tag => file.metadata.tags?.includes(tag)));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      files = files.filter(
        file =>
          file.filename.toLowerCase().includes(searchLower) ||
          file.originalName.toLowerCase().includes(searchLower) ||
          file.metadata.description?.toLowerCase().includes(searchLower) ||
          file.metadata.alt?.toLowerCase().includes(searchLower)
      );
    }

    return files.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  delete(id: string): boolean {
    return this.media.delete(id);
  }

  update(id: string, updates: Partial<GitCMSMediaFile>): boolean {
    const existing = this.media.get(id);
    if (!existing) return false;

    this.media.set(id, { ...existing, ...updates });
    return true;
  }

  getFolders(): string[] {
    const folders = new Set<string>();
    this.media.forEach(file => {
      if (file.metadata.folder) {
        folders.add(file.metadata.folder);
      }
    });
    return Array.from(folders).sort();
  }

  getStats(): {
    total: number;
    byType: Record<MediaType, number>;
    totalSize: number;
    folders: number;
  } {
    const stats = {
      total: this.media.size,
      byType: { image: 0, video: 0, audio: 0, document: 0, other: 0 } as Record<MediaType, number>,
      totalSize: 0,
      folders: this.getFolders().length,
    };

    this.media.forEach(file => {
      stats.byType[file.mediaType]++;
      stats.totalSize += file.size;
    });

    return stats;
  }

  clear(): void {
    this.media.clear();
  }

  // Serialization for persistence
  toJSON(): GitCMSMediaFile[] {
    return Array.from(this.media.values());
  }

  fromJSON(data: GitCMSMediaFile[]): void {
    this.clear();
    data.forEach(file => this.register(file));
  }
}

// Default registry instance
export const defaultMediaRegistry = new MediaRegistry();

// Export utility classes (already exported above, so no need to re-export)
// MediaValidator, MediaPathManager, GitHubMediaStorage are already exported as classes
