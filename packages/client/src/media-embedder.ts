import type { GitCMSConfig, EmbeddedMedia, EmbeddedVideo, ResponsiveImageSources } from './types';

/**
 * Media embedding utility for converting GitCMS media references to usable URLs
 */
export class MediaEmbedder {
  constructor(private config: GitCMSConfig) {}

  /**
   * Embed media by converting thumbnail references to full media URLs
   * Useful for displaying full-size images from thumbnails
   */
  embedMedia(
    thumbnailUrl: string,
    options: {
      size?: 'thumbnail' | 'medium' | 'large' | 'original';
      format?: 'webp' | 'jpeg' | 'png' | 'original';
      lazy?: boolean;
    } = {}
  ): EmbeddedMedia {
    const { size = 'original', format = 'original', lazy = true } = options;

    // Extract the base URL and file info from thumbnail
    const baseUrl = this.extractBaseUrl(thumbnailUrl);
    const fileInfo = this.parseFileInfo(thumbnailUrl);

    if (!baseUrl || !fileInfo) {
      return { url: thumbnailUrl, alt: '', loading: lazy ? 'lazy' : 'eager' };
    }

    // Generate the appropriate URL based on size and format
    const mediaUrl = this.generateMediaUrl(baseUrl, fileInfo, size, format);

    return {
      url: mediaUrl,
      alt: fileInfo.alt || fileInfo.filename || '',
      loading: lazy ? 'lazy' : 'eager',
      thumbnail: thumbnailUrl,
      original: this.generateMediaUrl(baseUrl, fileInfo, 'original', 'original'),
      metadata: {
        filename: fileInfo.filename,
        size: fileInfo.size,
        type: fileInfo.type,
      },
    };
  }

  /**
   * Generate responsive image sources for different screen sizes
   */
  generateResponsiveSources(thumbnailUrl: string): ResponsiveImageSources {
    const baseUrl = this.extractBaseUrl(thumbnailUrl);
    const fileInfo = this.parseFileInfo(thumbnailUrl);

    if (!baseUrl || !fileInfo) {
      return { default: thumbnailUrl, sources: [], fallback: thumbnailUrl };
    }

    return {
      default: this.generateMediaUrl(baseUrl, fileInfo, 'medium', 'webp'),
      sources: [
        {
          media: '(max-width: 640px)',
          srcset: this.generateMediaUrl(baseUrl, fileInfo, 'thumbnail', 'webp'),
          type: 'image/webp',
        },
        {
          media: '(max-width: 1024px)',
          srcset: this.generateMediaUrl(baseUrl, fileInfo, 'medium', 'webp'),
          type: 'image/webp',
        },
        {
          media: '(min-width: 1025px)',
          srcset: this.generateMediaUrl(baseUrl, fileInfo, 'large', 'webp'),
          type: 'image/webp',
        },
      ],
      fallback: this.generateMediaUrl(baseUrl, fileInfo, 'medium', 'jpeg'),
    };
  }

  /**
   * Process rich text content to automatically embed media
   */
  processRichTextContent(htmlContent: string): string {
    // Replace image tags with embedded media
    return htmlContent.replace(
      /<img\s+([^>]*?)src="([^"]*?)"([^>]*?)>/gi,
      (match, beforeSrc, src, afterSrc) => {
        if (this.isGitCMSMediaUrl(src)) {
          const embedded = this.embedMedia(src, { lazy: true });
          const responsive = this.generateResponsiveSources(src);

          // Generate a picture element with responsive sources
          const pictureElement = `
            <picture>
              ${responsive.sources
                .map(
                  source =>
                    `<source media="${source.media}" srcset="${source.srcset}" type="${source.type}">`
                )
                .join('')}
              <img ${beforeSrc}src="${embedded.url}" alt="${embedded.alt}" loading="${embedded.loading}"${afterSrc}>
            </picture>
          `.trim();

          return pictureElement;
        }
        return match;
      }
    );
  }

  /**
   * Extract video embed information
   */
  embedVideo(
    videoUrl: string,
    options: {
      autoplay?: boolean;
      controls?: boolean;
      muted?: boolean;
      loop?: boolean;
      poster?: string;
    } = {}
  ): EmbeddedVideo {
    const { autoplay = false, controls = true, muted = false, loop = false, poster } = options;

    return {
      url: videoUrl,
      autoplay,
      controls,
      muted,
      loop,
      poster,
      type: this.getVideoType(videoUrl),
    };
  }

  private extractBaseUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return null;
    }
  }

  private parseFileInfo(url: string): FileInfo | null {
    try {
      // Extract filename and metadata from URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const filename = pathParts[pathParts.length - 1];

      // Try to extract metadata from query parameters or path
      const searchParams = urlObj.searchParams;

      return {
        filename: decodeURIComponent(filename),
        alt: searchParams.get('alt') || '',
        size: searchParams.get('size') || 'unknown',
        type: this.getFileType(filename),
      };
    } catch {
      return null;
    }
  }

  private generateMediaUrl(
    baseUrl: string,
    fileInfo: FileInfo,
    size: string,
    format: string
  ): string {
    if (size === 'original' && format === 'original') {
      return `${baseUrl}/media/${fileInfo.filename}`;
    }

    const formatSuffix = format === 'original' ? '' : `.${format}`;
    const sizeSuffix = size === 'original' ? '' : `_${size}`;

    const filenameParts = fileInfo.filename.split('.');
    const name = filenameParts.slice(0, -1).join('.');
    const ext = filenameParts[filenameParts.length - 1];

    return `${baseUrl}/media/${name}${sizeSuffix}${formatSuffix || `.${ext}`}`;
  }

  private isGitCMSMediaUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.startsWith('/media/') || urlObj.pathname.includes('gitcms');
    } catch {
      return false;
    }
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return 'unknown';

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExts = ['mp4', 'webm', 'ogg', 'avi', 'mov'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    return 'document';
  }

  private getVideoType(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
        return 'video/ogg';
      default:
        return 'video/mp4';
    }
  }
}

interface FileInfo {
  filename: string;
  alt: string;
  size: string;
  type: string;
}
