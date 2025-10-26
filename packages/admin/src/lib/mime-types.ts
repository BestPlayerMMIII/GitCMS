/**
 * Common MIME type mappings for file extensions
 */
export const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string, defaultType = 'application/octet-stream'): string {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return IMAGE_MIME_TYPES[ext] || defaultType;
}
