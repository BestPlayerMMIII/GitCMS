/**
 * GitCMS Thumbnail Management System
 * Centralized utilities for generating, storing, and retrieving thumbnails
 */

import type { MediaType } from './media';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ThumbnailOptions {
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Image quality (0-1) */
  quality?: number;
  /** Output format */
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ThumbnailConfig {
  /** Subdirectory name for storing thumbnails */
  subdirectory: string;
  /** Default thumbnail sizes */
  sizes: {
    small: { width: number; height: number };
    medium: { width: number; height: number };
    large: { width: number; height: number };
  };
  /** Default quality setting */
  quality: number;
  /** Default format */
  format: 'image/webp' | 'image/jpeg';
}

export const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  subdirectory: 'thumbnails',
  sizes: {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 },
  },
  quality: 0.8,
  format: 'image/webp',
};

export const DEFAULT_THUMBNAIL_OPTIONS: Required<ThumbnailOptions> = {
  maxWidth: DEFAULT_THUMBNAIL_CONFIG.sizes.medium.width,
  maxHeight: DEFAULT_THUMBNAIL_CONFIG.sizes.medium.height,
  quality: DEFAULT_THUMBNAIL_CONFIG.quality,
  format: DEFAULT_THUMBNAIL_CONFIG.format,
};

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Generate thumbnail path from original media path
 * Example: '.gitcms/media/image.jpg' -> '.gitcms/media/thumbnails/image.jpg'
 */
export function getThumbnailPath(
  originalPath: string,
  config: ThumbnailConfig = DEFAULT_THUMBNAIL_CONFIG
): string {
  const pathParts = originalPath.split('/');
  const filename = pathParts.pop() || '';
  const directory = pathParts.join('/');

  // Insert 'thumbnails' subdirectory
  return `${directory}/${config.subdirectory}/${filename}`;
}

/**
 * Get original media path from thumbnail path
 * Example: '.gitcms/media/thumbnails/image.jpg' -> '.gitcms/media/image.jpg'
 */
export function getOriginalPathFromThumbnail(
  thumbnailPath: string,
  config: ThumbnailConfig = DEFAULT_THUMBNAIL_CONFIG
): string {
  return thumbnailPath.replace(`/${config.subdirectory}/`, '/');
}

/**
 * Generate GitHub raw URL for thumbnail
 */
export function getThumbnailUrl(
  owner: string,
  repo: string,
  originalPath: string,
  branch: string = 'main',
  config: ThumbnailConfig = DEFAULT_THUMBNAIL_CONFIG
): string {
  const thumbnailPath = getThumbnailPath(originalPath, config);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${thumbnailPath}`;
}

/**
 * Check if a path is a thumbnail path
 */
export function isThumbnailPath(
  path: string,
  config: ThumbnailConfig = DEFAULT_THUMBNAIL_CONFIG
): boolean {
  return path.includes(`/${config.subdirectory}/`);
}

// ============================================================================
// Default Thumbnails for Non-Image Types
// ============================================================================

/**
 * Default thumbnail placeholders for different media types (SVG data URLs)
 */
export const DEFAULT_THUMBNAILS: Record<MediaType, string> = {
  image:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect fill="%23E5E7EB" width="300" height="300"/%3E%3Cpath fill="%239CA3AF" d="M150 90c-22.1 0-40 17.9-40 40s17.9 40 40 40 40-17.9 40-40-17.9-40-40-40zm0 60c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20z"/%3E%3Cpath fill="%239CA3AF" d="M240 60H60c-11 0-20 9-20 20v140c0 11 9 20 20 20h180c11 0 20-9 20-20V80c0-11-9-20-20-20zm0 160H60V80h180v140zm-30-100l-40 53.3-30-40-50 66.7h180l-60-80z"/%3E%3C/svg%3E',

  video:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect fill="%23E5E7EB" width="300" height="300"/%3E%3Cpath fill="%239CA3AF" d="M150 70c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80zm0 140c-33.1 0-60-26.9-60-60s26.9-60 60-60 60 26.9 60 60-26.9 60-60 60z"/%3E%3Cpath fill="%239CA3AF" d="M130 120v60l50-30z"/%3E%3C/svg%3E',

  audio:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect fill="%23E5E7EB" width="300" height="300"/%3E%3Cpath fill="%239CA3AF" d="M190 60l-60 60h-40c-11 0-20 9-20 20v20c0 11 9 20 20 20h40l60 60V60zm-90 80v-20h30l30-30v100l-30-30h-30v-20zm90 20c8.3-7.5 13.3-18.3 13.3-30s-5-22.5-13.3-30v60z"/%3E%3C/svg%3E',

  document:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect fill="%23E5E7EB" width="300" height="300"/%3E%3Cpath fill="%239CA3AF" d="M180 60H90c-11 0-20 9-20 20v140c0 11 9 20 20 20h120c11 0 20-9 20-20v-110l-50-50zm30 160H90V80h70v50h50v90zm-90-80h60v10h-60v-10zm0 20h60v10h-60v-10zm0 20h60v10h-60v-10z"/%3E%3C/svg%3E',

  other:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect fill="%23E5E7EB" width="300" height="300"/%3E%3Cpath fill="%239CA3AF" d="M180 60H90c-11 0-20 9-20 20v140c0 11 9 20 20 20h120c11 0 20-9 20-20v-110l-50-50zm10 160H110c-5.5 0-10-4.5-10-10V90c0-5.5 4.5-10 10-10h50v40c0 11 9 20 20 20h40v80c0 5.5-4.5 10-10 10z"/%3E%3C/svg%3E',
};

/**
 * Get default thumbnail for a media type
 */
export function getDefaultThumbnail(mediaType: MediaType): string {
  return DEFAULT_THUMBNAILS[mediaType] || DEFAULT_THUMBNAILS.other;
}

/**
 * Determine media type from filename extension
 */
export function getMediaTypeFromFilename(filename: string): MediaType {
  const ext = filename.toLowerCase().split('.').pop() || '';

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (docExts.includes(ext)) return 'document';

  return 'other';
}

// ============================================================================
// Thumbnail Generation (Browser-side)
// ============================================================================

/**
 * Generate thumbnail from a File or Blob using Canvas API (client-side only)
 * Returns a Blob that can be uploaded to GitHub
 */
export async function generateThumbnailBlob(
  file: File | Blob,
  options: ThumbnailOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };

  // Only works in browser environment
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    throw new Error('Thumbnail generation is only available in browser environment');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        let { width, height } = img;
        const aspectRatio = width / height;

        if (width > opts.maxWidth) {
          width = opts.maxWidth;
          height = width / aspectRatio;
        }

        if (height > opts.maxHeight) {
          height = opts.maxHeight;
          width = height * aspectRatio;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          blob => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail blob'));
            }
          },
          opts.format,
          opts.quality
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for thumbnail generation'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generate thumbnail as data URL (for immediate display)
 */
export async function generateThumbnailDataUrl(
  file: File | Blob,
  options: ThumbnailOptions = {}
): Promise<string> {
  const blob = await generateThumbnailBlob(file, options);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read thumbnail as data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert thumbnail blob to File for upload
 */
export function thumbnailBlobToFile(blob: Blob, originalFilename: string): File {
  // Extract original name without extension
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
  // Use webp extension (or infer from blob type)
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
  const thumbnailFilename = `${nameWithoutExt}.${extension}`;

  return new File([blob], thumbnailFilename, { type: blob.type });
}

// ============================================================================
// Thumbnail Retrieval Utilities
// ============================================================================

/**
 * In-memory cache for fetched thumbnails (data URLs)
 * Key format: `${owner}/${repo}:${path}@${branch}`
 */
const thumbnailCache = new Map<string, string>();

/**
 * Generate cache key for thumbnail
 */
function getThumbnailCacheKey(
  owner: string,
  repo: string,
  originalPath: string,
  branch: string = 'main'
): string {
  return `${owner}/${repo}:${originalPath}@${branch}`;
}

/**
 * Build a thumbnail URL with authentication support for private repositories
 * This is meant to be used with fetch + Authorization header
 */
export function buildAuthenticatedThumbnailUrl(
  owner: string,
  repo: string,
  originalPath: string,
  branch: string = 'main'
): string {
  const thumbnailPath = getThumbnailPath(originalPath);
  return `https://api.github.com/repos/${owner}/${repo}/contents/${thumbnailPath}?ref=${branch}`;
}

/**
 * Fetch thumbnail with authentication (for private repos)
 * Returns data URL for immediate use
 * Cached in memory to avoid redundant API calls
 */
export async function fetchAuthenticatedThumbnail(
  owner: string,
  repo: string,
  originalPath: string,
  token: string,
  branch: string = 'main'
): Promise<string> {
  // Check cache first
  const cacheKey = getThumbnailCacheKey(owner, repo, originalPath, branch);
  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const apiUrl = buildAuthenticatedThumbnailUrl(owner, repo, originalPath, branch);

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.raw',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch thumbnail: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read thumbnail'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Cache the result
    thumbnailCache.set(cacheKey, dataUrl);

    return dataUrl;
  } catch (error) {
    // Fallback to default thumbnail if fetch fails
    console.warn(`Failed to fetch thumbnail for ${originalPath}, using default`);
    const mediaType = getMediaTypeFromFilename(originalPath);
    const defaultThumbnail = getDefaultThumbnail(mediaType);

    // Cache the default thumbnail as well to avoid repeated failed requests
    thumbnailCache.set(cacheKey, defaultThumbnail);

    return defaultThumbnail;
  }
}

/**
 * Clear the entire thumbnail cache
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}

/**
 * Remove a specific thumbnail from cache
 */
export function removeCachedThumbnail(
  owner: string,
  repo: string,
  originalPath: string,
  branch: string = 'main'
): void {
  const cacheKey = getThumbnailCacheKey(owner, repo, originalPath, branch);
  thumbnailCache.delete(cacheKey);
}

/**
 * Get a cached thumbnail if it exists
 */
export function getCachedThumbnail(
  owner: string,
  repo: string,
  originalPath: string,
  branch: string = 'main'
): string | null {
  const cacheKey = getThumbnailCacheKey(owner, repo, originalPath, branch);
  return thumbnailCache.get(cacheKey) || null;
}
