// GitCMS Advanced Media Organization System
// Comprehensive metadata extraction, tagging, and bulk operations

import { GitCMSMediaFile, MediaType } from './media';

export interface ExtendedMediaMetadata {
  // Basic file metadata
  filename: string;
  filesize: number;
  mimeType: string;
  mediaType: MediaType;
  lastModified: Date;

  // Image-specific metadata
  dimensions?: {
    width: number;
    height: number;
  };
  colorProfile?: string;
  hasTransparency?: boolean;
  dominantColors?: string[];

  // Video-specific metadata
  duration?: number;
  framerate?: number;
  resolution?: string;
  codec?: string;

  // Audio-specific metadata
  bitrate?: number;
  sampleRate?: number;
  channels?: number;

  // Document-specific metadata
  pageCount?: number;
  wordCount?: number;
  author?: string;

  // Extracted content
  extractedText?: string;
  altText?: string;
  description?: string;

  // Auto-generated tags
  autoTags: string[];
  manualTags: string[];

  // Organization metadata
  collections: string[];
  labels: MediaLabel[];
  usage: MediaUsage[];

  // Analysis metadata
  analysisVersion: string;
  lastAnalyzed: Date;
}

export interface MediaLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  isSystem?: boolean;
}

export interface MediaUsage {
  contentId: string;
  contentType: string;
  fieldName: string;
  usageDate: Date;
  isActive: boolean;
}

export interface MediaCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  mediaIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isSystem?: boolean;
}

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  mediaIds: string[];
  parameters: Record<string, any>;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results: BulkOperationResult[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export type BulkOperationType =
  | 'add-tags'
  | 'remove-tags'
  | 'add-to-collection'
  | 'remove-from-collection'
  | 'apply-labels'
  | 'optimize-images'
  | 'generate-thumbnails'
  | 'extract-metadata'
  | 'move-to-folder'
  | 'duplicate'
  | 'delete';

export interface BulkOperationResult {
  mediaId: string;
  success: boolean;
  error?: string;
  changes?: Record<string, any>;
}

export interface MediaSearchOptions {
  query?: string;
  mediaTypes?: MediaType[];
  tags?: string[];
  labels?: string[];
  collections?: string[];
  folders?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  dimensionRange?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  hasMetadata?: string[];
  sortBy?: 'name' | 'date' | 'size' | 'type' | 'usage' | 'relevance';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MediaSearchResult {
  media: GitCMSMediaFile[];
  total: number;
  facets: {
    mediaTypes: Record<MediaType, number>;
    tags: Record<string, number>;
    labels: Record<string, number>;
    collections: Record<string, number>;
    folders: Record<string, number>;
  };
}

// Metadata Extractor Class
export class MediaMetadataExtractor {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }
  }

  async extractMetadata(file: File): Promise<Partial<ExtendedMediaMetadata>> {
    const baseMetadata: Partial<ExtendedMediaMetadata> = {
      filename: file.name,
      filesize: file.size,
      mimeType: file.type,
      mediaType: this.getMediaType(file.type),
      lastModified: new Date(file.lastModified),
      autoTags: [],
      manualTags: [],
      collections: [],
      labels: [],
      usage: [],
      analysisVersion: '1.0.0',
      lastAnalyzed: new Date(),
    };

    try {
      // Extract type-specific metadata
      if (file.type.startsWith('image/')) {
        const imageMetadata = await this.extractImageMetadata(file);
        return { ...baseMetadata, ...imageMetadata };
      } else if (file.type.startsWith('video/')) {
        const videoMetadata = await this.extractVideoMetadata(file);
        return { ...baseMetadata, ...videoMetadata };
      } else if (file.type.startsWith('audio/')) {
        const audioMetadata = await this.extractAudioMetadata(file);
        return { ...baseMetadata, ...audioMetadata };
      } else if (this.isDocumentType(file.type)) {
        const documentMetadata = await this.extractDocumentMetadata(file);
        return { ...baseMetadata, ...documentMetadata };
      }

      return baseMetadata;
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return baseMetadata;
    }
  }

  private async extractImageMetadata(file: File): Promise<Partial<ExtendedMediaMetadata>> {
    return new Promise(resolve => {
      const img = new Image();

      img.onload = () => {
        const metadata: Partial<ExtendedMediaMetadata> = {
          dimensions: {
            width: img.width,
            height: img.height,
          },
        };

        // Extract colors and analyze image
        if (this.canvas && this.context) {
          this.canvas.width = Math.min(img.width, 200);
          this.canvas.height = Math.min(img.height, 200);

          this.context.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            0,
            0,
            this.canvas.width,
            this.canvas.height
          );

          try {
            const imageData = this.context.getImageData(
              0,
              0,
              this.canvas.width,
              this.canvas.height
            );
            const dominantColors = this.extractDominantColors(imageData);
            const hasTransparency = this.detectTransparency(imageData);

            metadata.dominantColors = dominantColors;
            metadata.hasTransparency = hasTransparency;
            metadata.autoTags = this.generateImageTags(metadata);
          } catch (error) {
            console.warn('Could not analyze image colors:', error);
          }
        }

        resolve(metadata);
      };

      img.onerror = () => resolve({});
      img.src = URL.createObjectURL(file);
    });
  }

  private async extractVideoMetadata(file: File): Promise<Partial<ExtendedMediaMetadata>> {
    return new Promise(resolve => {
      const video = document.createElement('video');

      video.onloadedmetadata = () => {
        const metadata: Partial<ExtendedMediaMetadata> = {
          duration: video.duration,
          dimensions: {
            width: video.videoWidth,
            height: video.videoHeight,
          },
          resolution: `${video.videoWidth}x${video.videoHeight}`,
          autoTags: this.generateVideoTags({
            duration: video.duration,
            dimensions: { width: video.videoWidth, height: video.videoHeight },
          }),
        };

        resolve(metadata);
      };

      video.onerror = () => resolve({});
      video.src = URL.createObjectURL(file);
    });
  }

  private async extractAudioMetadata(file: File): Promise<Partial<ExtendedMediaMetadata>> {
    return new Promise(resolve => {
      const audio = document.createElement('audio');

      audio.onloadedmetadata = () => {
        const metadata: Partial<ExtendedMediaMetadata> = {
          duration: audio.duration,
          autoTags: this.generateAudioTags({
            duration: audio.duration,
          }),
        };

        resolve(metadata);
      };

      audio.onerror = () => resolve({});
      audio.src = URL.createObjectURL(file);
    });
  }

  private async extractDocumentMetadata(file: File): Promise<Partial<ExtendedMediaMetadata>> {
    // For documents, we can extract basic info and potentially text content
    const metadata: Partial<ExtendedMediaMetadata> = {
      autoTags: this.generateDocumentTags(file),
    };

    // Could add PDF.js or other document parsers here for deeper analysis
    return metadata;
  }

  private extractDominantColors(imageData: ImageData): string[] {
    const colors = new Map<string, number>();
    const data = imageData.data;

    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent pixels
      if (a < 128) continue;

      // Quantize colors to reduce noise
      const quantizedR = Math.floor(r / 32) * 32;
      const quantizedG = Math.floor(g / 32) * 32;
      const quantizedB = Math.floor(b / 32) * 32;

      const color = `rgb(${quantizedR}, ${quantizedG}, ${quantizedB})`;
      colors.set(color, (colors.get(color) || 0) + 1);
    }

    // Return top 5 colors
    return Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);
  }

  private detectTransparency(imageData: ImageData): boolean {
    const data = imageData.data;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }

    return false;
  }

  private generateImageTags(metadata: Partial<ExtendedMediaMetadata>): string[] {
    const tags: string[] = [];

    if (metadata.dimensions) {
      const { width, height } = metadata.dimensions;
      const aspectRatio = width / height;

      // Size tags
      if (width >= 1920 || height >= 1080) tags.push('high-resolution');
      if (width <= 400 && height <= 400) tags.push('thumbnail');

      // Orientation tags
      if (aspectRatio > 1.5) tags.push('landscape');
      else if (aspectRatio < 0.67) tags.push('portrait');
      else tags.push('square');

      // Dimension-specific tags
      if (width === height) tags.push('square');
      if (aspectRatio === 16 / 9) tags.push('widescreen');
    }

    if (metadata.hasTransparency) tags.push('transparent');

    return tags;
  }

  private generateVideoTags(metadata: any): string[] {
    const tags: string[] = ['video'];

    if (metadata.duration) {
      if (metadata.duration < 30) tags.push('short');
      else if (metadata.duration > 600) tags.push('long');
    }

    if (metadata.dimensions) {
      const { width, height } = metadata.dimensions;
      if (height >= 1080) tags.push('hd');
      if (height >= 2160) tags.push('4k');
    }

    return tags;
  }

  private generateAudioTags(metadata: any): string[] {
    const tags: string[] = ['audio'];

    if (metadata.duration) {
      if (metadata.duration < 60) tags.push('short');
      else if (metadata.duration > 3600) tags.push('long');
    }

    return tags;
  }

  private generateDocumentTags(file: File): string[] {
    const tags: string[] = ['document'];

    if (file.type.includes('pdf')) tags.push('pdf');
    if (file.type.includes('word')) tags.push('word');
    if (file.type.includes('text')) tags.push('text');

    return tags;
  }

  private getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  private isDocumentType(mimeType: string): boolean {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
      'text/markdown',
    ].includes(mimeType);
  }
}

// Media Search Engine
export class MediaSearchEngine {
  searchMedia(media: GitCMSMediaFile[], options: MediaSearchOptions): MediaSearchResult {
    let filtered = [...media];

    // Apply filters
    if (options.query) {
      const query = options.query.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.filename.toLowerCase().includes(query) ||
          item.path.toLowerCase().includes(query) ||
          (item.metadata as any)?.description?.toLowerCase().includes(query) ||
          (item.metadata as any)?.altText?.toLowerCase().includes(query) ||
          (item.metadata as any)?.autoTags?.some((tag: string) =>
            tag.toLowerCase().includes(query)
          ) ||
          (item.metadata as any)?.manualTags?.some((tag: string) =>
            tag.toLowerCase().includes(query)
          )
      );
    }

    if (options.mediaTypes?.length) {
      filtered = filtered.filter(item => options.mediaTypes!.includes(item.mediaType));
    }

    if (options.tags?.length) {
      filtered = filtered.filter(item => {
        const itemTags = [
          ...((item.metadata as any)?.autoTags || []),
          ...((item.metadata as any)?.manualTags || []),
        ];
        return options.tags!.some(tag => itemTags.includes(tag));
      });
    }

    if (options.folders?.length) {
      filtered = filtered.filter(item =>
        options.folders!.some(folder => item.path.startsWith(folder))
      );
    }

    if (options.sizeRange) {
      filtered = filtered.filter(item => {
        const size = item.size;
        return (
          (!options.sizeRange!.min || size >= options.sizeRange!.min) &&
          (!options.sizeRange!.max || size <= options.sizeRange!.max)
        );
      });
    }

    // Generate facets
    const facets = this.generateFacets(filtered);

    // Apply sorting
    filtered = this.sortMedia(filtered, options.sortBy, options.sortDirection);

    // Apply pagination
    const total = filtered.length;
    if (options.offset) {
      filtered = filtered.slice(options.offset);
    }
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return {
      media: filtered,
      total,
      facets,
    };
  }

  private generateFacets(media: GitCMSMediaFile[]) {
    const facets = {
      mediaTypes: {} as Record<MediaType, number>,
      tags: {} as Record<string, number>,
      labels: {} as Record<string, number>,
      collections: {} as Record<string, number>,
      folders: {} as Record<string, number>,
    };

    media.forEach(item => {
      // Media types
      facets.mediaTypes[item.mediaType] = (facets.mediaTypes[item.mediaType] || 0) + 1;

      // Tags
      const tags = [
        ...((item.metadata as any)?.autoTags || []),
        ...((item.metadata as any)?.manualTags || []),
      ];
      tags.forEach(tag => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      });

      // Folders
      const folder = item.path.substring(0, item.path.lastIndexOf('/')) || '/';
      facets.folders[folder] = (facets.folders[folder] || 0) + 1;
    });

    return facets;
  }

  private sortMedia(
    media: GitCMSMediaFile[],
    sortBy: MediaSearchOptions['sortBy'] = 'name',
    direction: MediaSearchOptions['sortDirection'] = 'asc'
  ): GitCMSMediaFile[] {
    const multiplier = direction === 'asc' ? 1 : -1;

    return media.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename) * multiplier;
        case 'date':
          return (new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()) * multiplier;
        case 'size':
          return (a.size - b.size) * multiplier;
        case 'type':
          return a.mediaType.localeCompare(b.mediaType) * multiplier;
        default:
          return 0;
      }
    });
  }
}

// Bulk Operations Manager
export class BulkOperationsManager {
  private operations = new Map<string, BulkOperation>();

  async executeBulkOperation(
    type: BulkOperationType,
    mediaIds: string[],
    parameters: Record<string, any>,
    onProgress?: (progress: BulkOperation['progress']) => void
  ): Promise<BulkOperation> {
    const operation: BulkOperation = {
      id: this.generateId(),
      type,
      status: 'pending',
      mediaIds,
      parameters,
      progress: {
        total: mediaIds.length,
        completed: 0,
        failed: 0,
      },
      results: [],
      createdAt: new Date(),
    };

    this.operations.set(operation.id, operation);

    try {
      operation.status = 'running';

      for (const mediaId of mediaIds) {
        try {
          const result = await this.executeOperationOnMedia(operation, mediaId);
          operation.results.push(result);

          if (result.success) {
            operation.progress.completed++;
          } else {
            operation.progress.failed++;
          }

          onProgress?.(operation.progress);
        } catch (error) {
          operation.results.push({
            mediaId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          operation.progress.failed++;
          onProgress?.(operation.progress);
        }
      }

      operation.status = 'completed';
      operation.completedAt = new Date();
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      operation.completedAt = new Date();
    }

    return operation;
  }

  private async executeOperationOnMedia(
    operation: BulkOperation,
    mediaId: string
  ): Promise<BulkOperationResult> {
    // This would integrate with the actual media API
    // For now, return a mock result
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async work

    return {
      mediaId,
      success: true,
      changes: {
        operation: operation.type,
        parameters: operation.parameters,
      },
    };
  }

  getOperation(id: string): BulkOperation | undefined {
    return this.operations.get(id);
  }

  private generateId(): string {
    return `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export utility functions
export function createMediaLabel(name: string, color: string, description?: string): MediaLabel {
  return {
    id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    color,
    description,
    isSystem: false,
  };
}

export function createMediaCollection(name: string, description?: string): MediaCollection {
  return {
    id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    mediaIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isSystem: false,
  };
}

export const DEFAULT_MEDIA_LABELS: MediaLabel[] = [
  {
    id: 'featured',
    name: 'Featured',
    color: '#f59e0b',
    description: 'Featured content',
    isSystem: true,
  },
  {
    id: 'approved',
    name: 'Approved',
    color: '#10b981',
    description: 'Approved for use',
    isSystem: true,
  },
  { id: 'draft', name: 'Draft', color: '#6b7280', description: 'Work in progress', isSystem: true },
  {
    id: 'archived',
    name: 'Archived',
    color: '#ef4444',
    description: 'Archived content',
    isSystem: true,
  },
];
