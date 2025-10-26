/**
 * Thumbnail generation utilities for creating optimized preview images.
 * Supports caching and configurable dimensions.
 */

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG/WebP
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  maxWidth: 300,
  maxHeight: 300,
  quality: 0.8,
  format: 'image/jpeg',
};

/**
 * Simple in-memory cache for thumbnails
 * Key format: `${owner}/${repo}/${path}:${width}x${height}`
 */
const thumbnailCache = new Map<string, string>();

/**
 * Generate a cache key for thumbnail storage
 */
function getCacheKey(
  owner: string,
  repo: string,
  path: string,
  options: Required<ThumbnailOptions>
): string {
  return `${owner}/${repo}/${path}:${options.maxWidth}x${options.maxHeight}`;
}

/**
 * Draw a checkered background pattern (like Photoshop/GIMP transparency indicator)
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param squareSize - Size of each checker square (default: 10)
 */
function drawCheckeredBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  squareSize: number = 10
): void {
  const lightColor = '#ffffff'; // White
  const darkColor = '#cccccc'; // Light gray

  for (let y = 0; y < height; y += squareSize) {
    for (let x = 0; x < width; x += squareSize) {
      // Alternate colors in a checkerboard pattern
      const isEvenRow = Math.floor(y / squareSize) % 2 === 0;
      const isEvenCol = Math.floor(x / squareSize) % 2 === 0;
      const useLightColor = isEvenRow === isEvenCol;

      ctx.fillStyle = useLightColor ? lightColor : darkColor;
      ctx.fillRect(x, y, squareSize, squareSize);
    }
  }
}

/**
 * Generate a thumbnail from a blob and return as data URL.
 * The thumbnail is cached for subsequent requests.
 *
 * For PNG images with transparency, a checkered background is automatically added.
 *
 * @param blob - The image blob to create a thumbnail from
 * @param owner - GitHub repository owner (for cache key)
 * @param repo - GitHub repository name (for cache key)
 * @param path - File path (for cache key)
 * @param options - Thumbnail generation options
 * @returns Promise resolving to data URL of the thumbnail
 */
export async function generateThumbnail(
  blob: Blob,
  owner: string,
  repo: string,
  path: string,
  options: ThumbnailOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cacheKey = getCacheKey(owner, repo, path, opts);

  // Check cache first
  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Auto-detect if image is PNG (preserve transparency)
  const isPng = blob.type === 'image/png' || path.toLowerCase().endsWith('.png');
  const outputFormat = isPng ? 'image/png' : opts.format;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        // Calculate thumbnail dimensions maintaining aspect ratio
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

        // For PNG format, draw checkered background for transparency
        if (outputFormat === 'image/png') {
          drawCheckeredBackground(ctx, width, height, 16);
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL(outputFormat, opts.quality);

        // Cache the result
        thumbnailCache.set(cacheKey, dataUrl);

        // Cleanup
        URL.revokeObjectURL(objectUrl);

        resolve(dataUrl);
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
 * Get a cached thumbnail if it exists
 */
export function getCachedThumbnail(
  owner: string,
  repo: string,
  path: string,
  options: ThumbnailOptions = {}
): string | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cacheKey = getCacheKey(owner, repo, path, opts);
  return thumbnailCache.get(cacheKey) || null;
}

/**
 * Clear the thumbnail cache (useful for memory management)
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
  path: string,
  options: ThumbnailOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cacheKey = getCacheKey(owner, repo, path, opts);
  thumbnailCache.delete(cacheKey);
}
