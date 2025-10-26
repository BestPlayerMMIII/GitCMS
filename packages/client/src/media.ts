import { Octokit } from '@octokit/rest';
import {
  getThumbnailPath,
  getThumbnailUrl,
  getDefaultThumbnail,
  getMediaTypeFromFilename,
} from '@git-cms/core';
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
   * Returns embedded data URL, GitHub thumbnail URL, or default placeholder
   */
  getThumbnail(reference: MediaReference): string {
    // Priority 1: Use embedded data-thumbnail if it's a valid data URL
    if (reference.thumbnail) {
      // Check if it's a valid data URL (starts with "data:")
      if (reference.thumbnail.startsWith('data:')) {
        return reference.thumbnail;
      }
      // If it's a GitHub URL, return it as-is
      if (reference.thumbnail.startsWith('http')) {
        return reference.thumbnail;
      }
    }

    // Priority 2: Try to build GitHub thumbnail URL (for public repos or when baseUrl is configured)
    if (this.config.repository) {
      const [owner, repo] = this.config.repository.split('/');
      const branch = this.config.branch || 'main';

      // Only use raw.githubusercontent.com for public repos or when explicitly configured
      // For private repos, this won't work without auth, so fall back to default
      if (this.config.baseUrl || !this.config.token) {
        try {
          return getThumbnailUrl(owner, repo, reference.path, branch);
        } catch (error) {
          console.warn('Failed to generate thumbnail URL:', error);
        }
      }
    }

    // Priority 3: Return a default placeholder based on media type
    // Map '3d' to 'other' since core package doesn't have a '3d' type
    const coreMediaType = reference.mediaType === '3d' ? 'other' : reference.mediaType || 'image';
    return getDefaultThumbnail(coreMediaType);
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
   * Uses thumbnails for fast initial render (for images) or placeholders (for videos/docs)
   */
  renderFast(html: string): string {
    const references = this.extractFromHTML(html);
    let result = html;

    references.forEach(ref => {
      const thumbnail = this.getThumbnail(ref);

      // For videos and documents, we need a different approach:
      // - Images: use thumbnail as src
      // - Videos/Audio: use thumbnail as poster, actual media needs fetchFull
      // - Documents: use thumbnail as placeholder, link to download
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
   * Remove a specific item from cache
   */
  removeCacheItem(path: string): void {
    this.cache.delete(path);
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

    const fileData = response.data as any;
    const downloadUrl = fileData.download_url;

    // Check if it's an LFS pointer
    if (options.resolveLFS && fileData.content && this.isLFSPointer(fileData.content)) {
      // For LFS files, use the download URL directly
      const fullData: FullMediaData = {
        reference,
        url: downloadUrl,
        downloadUrl,
        size: fileData.size,
      };
      this.cache.set(reference.path, fullData);
      return fullData;
    }

    // Strategy for different media types:
    // - Small images (< 1MB): use base64 data URL for inline embedding
    // - Videos, audio, documents: ALWAYS use download URL (too large for base64)
    // - Large files (> 1MB): use download URL

    const shouldUseDownloadUrl =
      reference.mediaType === 'video' ||
      reference.mediaType === 'audio' ||
      reference.mediaType === 'document' ||
      reference.mediaType === '3d' ||
      fileData.size > 1024 * 1024; // > 1MB

    if (shouldUseDownloadUrl) {
      // Use download URL directly for large files and non-image media
      if (!downloadUrl) {
        throw new Error('No download URL available for file');
      }

      const fullData: FullMediaData = {
        reference,
        url: downloadUrl,
        downloadUrl,
        size: fileData.size,
      };

      this.cache.set(reference.path, fullData);
      return fullData;
    }

    // For small images, try to use base64 data URL
    if (fileData.content) {
      try {
        // GitHub returns content with newlines removed already, but just in case
        const cleanContent = fileData.content.replace(/\n/g, '');
        const mimeType = reference.mimeType || 'application/octet-stream';
        const dataUrl = `data:${mimeType};base64,${cleanContent}`;

        const fullData: FullMediaData = {
          reference,
          url: dataUrl,
          size: fileData.size,
          downloadUrl,
        };

        this.cache.set(reference.path, fullData);
        return fullData;
      } catch (error) {
        console.warn('Failed to process base64 content, falling back to download URL');
      }
    }

    // Fallback to download URL
    if (!downloadUrl) {
      throw new Error('No download URL available for file');
    }

    const fullData: FullMediaData = {
      reference,
      url: downloadUrl,
      downloadUrl,
      size: fileData.size,
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

    // Add data-path attribute to enable progressive enhancement
    const pathAttr = ` data-gitcms-path="${this.escapeHTML(reference.path)}"`;

    switch (reference.mediaType) {
      case 'image':
        // Images: use the URL directly (can be thumbnail or full)
        return `<img src="${url}" alt="${alt}"${title}${dataAttr}${pathAttr} loading="lazy" />`;

      case 'video':
        if (isThumbnail) {
          // Fast render: show placeholder with thumbnail as poster
          // The thumbnail is an image preview, not the actual video
          return `<div class="gitcms-video-placeholder"${dataAttr}${pathAttr} data-filename="${this.escapeHTML(reference.filename)}">
  <img src="${url}" alt="${alt}"${title} class="gitcms-video-poster" />
  <div class="gitcms-video-overlay">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="white" style="opacity: 0.9">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <p style="color: white; margin-top: 8px; font-size: 14px;">Click to load video</p>
  </div>
</div>`;
        } else {
          // Full render: actual video element with proper source
          return `<video controls${title}${pathAttr} preload="metadata" style="max-width: 100%; height: auto;">
  <source src="${url}" type="${reference.mimeType || 'video/mp4'}">
  Your browser does not support the video tag.
</video>`;
        }

      case 'audio':
        if (isThumbnail) {
          // Fast render: show placeholder with waveform icon
          return `<div class="gitcms-audio-placeholder"${dataAttr}${pathAttr} data-filename="${this.escapeHTML(reference.filename)}">
  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
  <p style="margin-top: 8px; font-size: 14px; color: #374151;">${alt}</p>
  <p style="margin-top: 4px; font-size: 12px; color: #6b7280;">Click to load audio</p>
</div>`;
        } else {
          // Full render: actual audio element
          return `<audio controls${title}${pathAttr} preload="metadata" style="max-width: 100%;">
  <source src="${url}" type="${reference.mimeType || 'audio/mpeg'}">
  Your browser does not support the audio tag.
</audio>`;
        }

      case 'document':
        if (isThumbnail) {
          // Fast render: show document preview with thumbnail
          return `<div class="gitcms-document-placeholder"${dataAttr}${pathAttr} data-filename="${this.escapeHTML(reference.filename)}">
  <img src="${url}" alt="${alt}" class="gitcms-document-thumbnail" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;" />
  <div style="margin-top: 12px;">
    <p style="font-weight: 500; font-size: 14px; color: #111827;">${alt}</p>
    <p style="margin-top: 4px; font-size: 12px; color: #6b7280;">Click to download</p>
  </div>
</div>`;
        } else {
          // Full render: download link with proper URL
          return `<a href="${url}" download="${reference.filename}"${title}${pathAttr} class="gitcms-document-link" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 16px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; text-decoration: none; color: #111827; transition: all 0.2s;">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
  </svg>
  <span style="font-weight: 500;">${alt}</span>
</a>`;
        }

      case '3d':
        // For 3D models, show a download link
        if (isThumbnail) {
          return `<div class="gitcms-3d-placeholder"${dataAttr}${pathAttr} data-filename="${this.escapeHTML(reference.filename)}">
  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
    <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z"/>
  </svg>
  <p style="margin-top: 8px; font-size: 14px; color: #374151;">${alt} (3D Model)</p>
  <p style="margin-top: 4px; font-size: 12px; color: #6b7280;">Click to download</p>
</div>`;
        } else {
          return `<a href="${url}" download="${reference.filename}"${title}${pathAttr} class="gitcms-3d-model">
  📦 ${alt} (3D Model)
</a>`;
        }

      default:
        // Other file types: show as download link
        return `<a href="${url}" download="${reference.filename}"${title}${dataAttr}${pathAttr} class="gitcms-media-file">
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
    // Use the centralized utility from @git-cms/core
    return getMediaTypeFromFilename(filename) as MediaReference['mediaType'];
  }

  private getPlaceholder(mediaType?: MediaReference['mediaType']): string {
    // Use the centralized default thumbnails from @git-cms/core
    // Map '3d' to 'other' since core package doesn't have a '3d' type
    const coreMediaType = mediaType === '3d' ? 'other' : mediaType || 'image';
    return getDefaultThumbnail(coreMediaType);
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
