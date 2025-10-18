import { Octokit } from '@octokit/rest';
import type { GitCMSConfig } from './types';

/**
 * Represents a media item extracted from content
 */
export interface MediaReference {
  /** Unique identifier for this media reference */
  id: string;
  /** Path to the media file in the repository */
  path: string;
  /** Original filename */
  filename: string;
  /** Embedded thumbnail as base64 data URL (fast to access) */
  thumbnail?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Title attribute */
  title?: string;
  /** MIME type if determinable */
  mimeType?: string;
  /** Media type category */
  mediaType?: 'image' | 'video' | 'audio' | 'document' | '3d' | 'other';
}

/**
 * Full resolution media data fetched from GitHub
 */
export interface FullMediaData {
  /** The media reference this data belongs to */
  reference: MediaReference;
  /** Full resolution content as base64 data URL or blob URL */
  url: string;
  /** Raw content buffer */
  content?: ArrayBuffer;
  /** Size in bytes */
  size?: number;
  /** GitHub download URL */
  downloadUrl?: string;
}

/**
 * Options for media fetching
 */
export interface MediaFetchOptions {
  /** Whether to use LFS pointer resolution for large files */
  resolveLFS?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Progress callback for downloads */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Media manager for GitCMS content
 * Provides fast thumbnail access and async full resolution loading
 */
export class MediaManager {
  private octokit: Octokit;
  private config: GitCMSConfig;
  private cache: Map<string, FullMediaData> = new Map();

  constructor(config: GitCMSConfig) {
    this.config = {
      branch: 'main',
      ...config,
    };
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * Extract media references from HTML content containing <gitcms-media> tags
   * This is a fast operation that only parses the HTML
   */
  extractFromHTML(html: string): MediaReference[] {
    const references: MediaReference[] = [];
    const regex = /<gitcms-media([^>]*)>/gi;
    let match;
    let index = 0;

    while ((match = regex.exec(html)) !== null) {
      const attributes = match[1];
      const path = this.extractAttribute(attributes, 'data-path');
      const filename = this.extractAttribute(attributes, 'data-filename');
      const thumbnail = this.extractAttribute(attributes, 'data-thumbnail');
      const alt = this.extractAttribute(attributes, 'alt');
      const title = this.extractAttribute(attributes, 'title');

      if (path && filename) {
        const mediaType = this.inferMediaType(filename);
        references.push({
          id: `media-${index++}`,
          path,
          filename,
          thumbnail,
          alt,
          title,
          mimeType: this.getMimeType(filename),
          mediaType,
        });
      }
    }

    return references;
  }

  /**
   * Extract media reference from a media field value
   * Media fields store the path directly or as an object
   */
  extractFromField(fieldValue: any): MediaReference | MediaReference[] | null {
    if (!fieldValue) return null;

    // Handle array of media
    if (Array.isArray(fieldValue)) {
      return fieldValue
        .map((item, index) => this.extractSingleFieldValue(item, index))
        .filter((ref): ref is MediaReference => ref !== null);
    }

    // Handle single media
    return this.extractSingleFieldValue(fieldValue, 0);
  }

  private extractSingleFieldValue(value: any, index: number): MediaReference | null {
    let path: string;
    let filename: string;

    // Handle string path
    if (typeof value === 'string') {
      path = value;
      filename = path.split('/').pop() || path;
    }
    // Handle object with path property
    else if (typeof value === 'object' && value.path) {
      path = value.path;
      filename = value.filename || path.split('/').pop() || path;
    } else {
      return null;
    }

    const mediaType = this.inferMediaType(filename);
    return {
      id: `field-media-${index}`,
      path,
      filename,
      thumbnail: value.thumbnail || value.thumbnailUrl || undefined,
      mimeType: this.getMimeType(filename),
      mediaType,
    };
  }

  /**
   * Get thumbnail URL for immediate display
   * Returns embedded thumbnail if available, otherwise returns a placeholder
   */
  getThumbnail(reference: MediaReference): string {
    if (reference.thumbnail) {
      return reference.thumbnail;
    }

    // Return a placeholder based on media type
    return this.getPlaceholder(reference.mediaType);
  }

  /**
   * Fetch full resolution media data from GitHub
   * This is an async operation that may take time for large files
   */
  async fetchFull(
    reference: MediaReference,
    options: MediaFetchOptions = {}
  ): Promise<FullMediaData> {
    // Check cache first
    const cacheKey = `${reference.path}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const [owner, repo] = this.config.repository.split('/');

    try {
      // Use HTTP API if available (faster for public repos or when configured)
      if (this.config.baseUrl) {
        return await this.fetchViaHTTP(reference, owner, repo, options);
      }

      // Fallback to GitHub API
      return await this.fetchViaGitHub(reference, owner, repo, options);
    } catch (error) {
      console.error(`Failed to fetch full media for ${reference.path}:`, error);
      throw new Error(`Failed to fetch media: ${reference.filename}`);
    }
  }

  /**
   * Fetch full resolution for multiple media references
   * Processes them in parallel with optional concurrency limit
   */
  async fetchMultiple(
    references: MediaReference[],
    options: MediaFetchOptions & { concurrency?: number } = {}
  ): Promise<FullMediaData[]> {
    const concurrency = options.concurrency || 3;
    const results: FullMediaData[] = [];

    for (let i = 0; i < references.length; i += concurrency) {
      const batch = references.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch.map(ref => this.fetchFull(ref, options)));

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  /**
   * Replace <gitcms-media> tags with standard <img>, <video>, or appropriate HTML
   * Uses thumbnails for fast initial render
   */
  renderFast(html: string): string {
    const references = this.extractFromHTML(html);
    let result = html;

    references.forEach(ref => {
      const thumbnail = this.getThumbnail(ref);
      const replacement = this.generateHTMLElement(ref, thumbnail, true);

      // Replace the gitcms-media tag with appropriate HTML element
      const regex = new RegExp(
        `<gitcms-media[^>]*data-path="${this.escapeRegex(ref.path)}"[^>]*>\\s*</gitcms-media>`,
        'gi'
      );
      result = result.replace(regex, replacement);
    });

    return result;
  }

  /**
   * Replace <gitcms-media> tags with full resolution media
   * This is async and should be used after renderFast for progressive enhancement
   */
  async renderFull(
    html: string,
    options: MediaFetchOptions & {
      onProgress?: (current: number, total: number, reference: MediaReference) => void;
    } = {}
  ): Promise<string> {
    const references = this.extractFromHTML(html);
    let result = html;

    for (let i = 0; i < references.length; i++) {
      const ref = references[i];

      try {
        const fullData = await this.fetchFull(ref, options);
        const replacement = this.generateHTMLElement(ref, fullData.url, false);

        const regex = new RegExp(
          `<gitcms-media[^>]*data-path="${this.escapeRegex(ref.path)}"[^>]*>\\s*</gitcms-media>`,
          'gi'
        );
        result = result.replace(regex, replacement);

        if (options.onProgress) {
          options.onProgress(i + 1, references.length, ref);
        }
      } catch (error) {
        console.error(`Failed to render full media for ${ref.path}:`, error);
        // Keep thumbnail version on error
      }
    }

    return result;
  }

  /**
   * Clear the media cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Private helper methods

  private async fetchViaHTTP(
    reference: MediaReference,
    owner: string,
    repo: string,
    options: MediaFetchOptions
  ): Promise<FullMediaData> {
    const url = `${this.config.baseUrl}/api/media/${owner}/${repo}?path=${encodeURIComponent(reference.path)}`;

    const response = await fetch(url, {
      headers: this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {},
      signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const mediaFile = data.media[0];

    if (!mediaFile) {
      throw new Error('Media not found');
    }

    const fullData: FullMediaData = {
      reference,
      url: mediaFile.url,
      downloadUrl: mediaFile.url,
      size: mediaFile.size,
    };

    this.cache.set(reference.path, fullData);
    return fullData;
  }

  private async fetchViaGitHub(
    reference: MediaReference,
    owner: string,
    repo: string,
    options: MediaFetchOptions
  ): Promise<FullMediaData> {
    const response = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path: reference.path,
      ref: this.config.branch,
    });

    if (!('content' in response.data)) {
      throw new Error('Invalid response from GitHub');
    }

    // Check if it's an LFS pointer
    if (options.resolveLFS && this.isLFSPointer(response.data.content)) {
      // For LFS files, use the download URL
      const downloadUrl = (response.data as any).download_url;
      const fullData: FullMediaData = {
        reference,
        url: downloadUrl,
        downloadUrl,
        size: response.data.size,
      };
      this.cache.set(reference.path, fullData);
      return fullData;
    }

    // Decode base64 content
    const content = Buffer.from(response.data.content, 'base64');
    const mimeType = reference.mimeType || 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${response.data.content}`;

    const fullData: FullMediaData = {
      reference,
      url: dataUrl,
      content: content.buffer,
      size: content.length,
      downloadUrl: (response.data as any).download_url,
    };

    this.cache.set(reference.path, fullData);
    return fullData;
  }

  private isLFSPointer(content: string): boolean {
    try {
      const decoded = Buffer.from(content, 'base64').toString('utf-8');
      return decoded.includes('version https://git-lfs.github.com/spec/');
    } catch {
      return false;
    }
  }

  private generateHTMLElement(
    reference: MediaReference,
    url: string,
    isThumbnail: boolean
  ): string {
    const alt = this.escapeHTML(reference.alt || reference.filename);
    const title = reference.title ? ` title="${this.escapeHTML(reference.title)}"` : '';
    const dataAttr = isThumbnail ? ' data-gitcms-thumbnail="true"' : '';

    switch (reference.mediaType) {
      case 'image':
        return `<img src="${url}" alt="${alt}"${title}${dataAttr} loading="lazy" />`;

      case 'video':
        return `<video controls${title}${dataAttr} preload="metadata">
  <source src="${url}" type="${reference.mimeType || 'video/mp4'}">
  Your browser does not support the video tag.
</video>`;

      case 'audio':
        return `<audio controls${title}${dataAttr} preload="metadata">
  <source src="${url}" type="${reference.mimeType || 'audio/mpeg'}">
  Your browser does not support the audio tag.
</audio>`;

      case '3d':
        // For 3D models, you might want to use a viewer library
        return `<a href="${url}" download="${reference.filename}"${title}${dataAttr} class="gitcms-3d-model">
  📦 ${alt} (3D Model)
</a>`;

      default:
        return `<a href="${url}" download="${reference.filename}"${title}${dataAttr} class="gitcms-media-file">
  📎 ${alt}
</a>`;
    }
  }

  private extractAttribute(attributeString: string, name: string): string | undefined {
    const regex = new RegExp(`${name}=["']([^"']*)["']`, 'i');
    const match = attributeString.match(regex);
    return match ? match[1] : undefined;
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',

      // Videos
      mp4: 'video/mp4',
      webm: 'video/webm',
      ogv: 'video/ogg',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',

      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      oga: 'audio/ogg',
      m4a: 'audio/mp4',

      // 3D Models
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json',
      obj: 'model/obj',
      fbx: 'application/octet-stream',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private inferMediaType(filename: string): MediaReference['mediaType'] {
    const ext = filename.split('.').pop()?.toLowerCase();

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];
    const modelExts = ['glb', 'gltf', 'obj', 'fbx'];
    const documentExts = ['pdf', 'doc', 'docx', 'txt'];

    if (imageExts.includes(ext || '')) return 'image';
    if (videoExts.includes(ext || '')) return 'video';
    if (audioExts.includes(ext || '')) return 'audio';
    if (modelExts.includes(ext || '')) return '3d';
    if (documentExts.includes(ext || '')) return 'document';

    return 'other';
  }

  private getPlaceholder(mediaType?: MediaReference['mediaType']): string {
    // Return a simple SVG placeholder
    const placeholders: Record<string, string> = {
      image:
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="14"%3EImage%3C/text%3E%3C/svg%3E',
      video:
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="14"%3EVideo%3C/text%3E%3C/svg%3E',
      audio:
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="14"%3EAudio%3C/text%3E%3C/svg%3E',
      '3d': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="14"%3E3D Model%3C/text%3E%3C/svg%3E',
      document:
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="14"%3EDocument%3C/text%3E%3C/svg%3E',
    };

    return placeholders[mediaType || 'other'] || placeholders.image;
  }

  private escapeHTML(str: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Helper class for working with media in content items
 * Provides convenient methods for common media operations
 */
export class ContentMediaHelper {
  private mediaManager: MediaManager;

  constructor(config: GitCMSConfig) {
    this.mediaManager = new MediaManager(config);
  }

  /**
   * Extract all media from a content item (both rich-text and media fields)
   */
  extractAll(contentItem: any): MediaReference[] {
    const references: MediaReference[] = [];

    // Extract from rich-text fields
    if (contentItem.content && typeof contentItem.content === 'string') {
      references.push(...this.mediaManager.extractFromHTML(contentItem.content));
    }

    // Extract from data object
    if (contentItem.data && typeof contentItem.data === 'object') {
      for (const [key, value] of Object.entries(contentItem.data)) {
        const fieldRefs = this.mediaManager.extractFromField(value);
        if (fieldRefs) {
          if (Array.isArray(fieldRefs)) {
            references.push(...fieldRefs);
          } else {
            references.push(fieldRefs);
          }
        }
      }
    }

    return references;
  }

  /**
   * Get thumbnail URLs for all media in a content item
   */
  getThumbnails(contentItem: any): Map<string, string> {
    const references = this.extractAll(contentItem);
    const thumbnails = new Map<string, string>();

    for (const ref of references) {
      thumbnails.set(ref.path, this.mediaManager.getThumbnail(ref));
    }

    return thumbnails;
  }

  /**
   * Preload full media for a content item
   */
  async preloadAll(
    contentItem: any,
    options?: MediaFetchOptions
  ): Promise<Map<string, FullMediaData>> {
    const references = this.extractAll(contentItem);
    const fullData = await this.mediaManager.fetchMultiple(references, options);
    const dataMap = new Map<string, FullMediaData>();

    for (const data of fullData) {
      dataMap.set(data.reference.path, data);
    }

    return dataMap;
  }

  /**
   * Render content with fast thumbnails
   */
  renderFast(contentItem: any): any {
    const result = { ...contentItem };

    if (result.content && typeof result.content === 'string') {
      result.content = this.mediaManager.renderFast(result.content);
    }

    return result;
  }

  /**
   * Render content with full resolution media
   */
  async renderFull(contentItem: any, options?: MediaFetchOptions): Promise<any> {
    const result = { ...contentItem };

    if (result.content && typeof result.content === 'string') {
      result.content = await this.mediaManager.renderFull(result.content, options);
    }

    return result;
  }

  /**
   * Get the underlying MediaManager instance for advanced usage
   */
  getManager(): MediaManager {
    return this.mediaManager;
  }
}
