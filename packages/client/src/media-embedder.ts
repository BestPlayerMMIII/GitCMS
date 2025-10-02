import { Octokit } from '@octokit/rest';
import type { GitCMSConfig } from './types';

/**
 * Simple media embedder for GitCMS tags
 * Handles conversion from thumbnail data to full resolution images
 */
export class MediaEmbedder {
  private html: string;
  private config: GitCMSConfig;
  private octokit: Octokit;
  private tagCounter = 0;

  constructor(config: GitCMSConfig, html: string) {
    this.config = {
      branch: 'main',
      ...config,
    };

    this.html = html;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * Get HTML with thumbnails immediately (fast)
   * Replaces <gitcms-media> tags with <img> tags using thumbnail data
   */
  getFast(): string {
    return this.html.replace(/<gitcms-media\s+([^>]*?)><\/gitcms-media>/gi, (match, attributes) => {
      this.tagCounter++;
      const id = `gitcms-media-${this.tagCounter}`;
      const thumbnail = this.extractAttribute(attributes, 'data-thumbnail');
      const alt = this.extractAttribute(attributes, 'alt') || '';
      const title = this.extractAttribute(attributes, 'title') || '';

      if (thumbnail) {
        return `<img id="${id}" src="${thumbnail}" alt="${alt}" title="${title}" data-gitcms-placeholder="true">`;
      }

      // Fallback if no thumbnail
      return `<div id="${id}" data-gitcms-placeholder="true" style="background: #f0f0f0; padding: 20px; text-align: center; border: 1px solid #ddd;">Loading media...</div>`;
    });
  }

  /**
   * Get full resolution images asynchronously
   * Processes each <gitcms-media> tag sequentially and calls listener with updated HTML
   */
  async getFull(listener: (newHtml: string) => void): Promise<void> {
    let currentHtml = this.getFast(); // Start with fast version
    const mediaMatches = [...this.html.matchAll(/<gitcms-media\s+([^>]*?)><\/gitcms-media>/gi)];

    let tagIndex = 0;

    for (const match of mediaMatches) {
      tagIndex++;
      const id = `gitcms-media-${tagIndex}`;
      const attributes = match[1];
      const dataPath = this.extractAttribute(attributes, 'data-path');

      if (dataPath) {
        try {
          // Get full resolution image blob from GitHub
          const blob = await this.getImageBlob(dataPath);
          const blobUrl = URL.createObjectURL(blob);

          // Replace the placeholder with full resolution image
          currentHtml = currentHtml.replace(
            new RegExp(`<(img|div)[^>]*id="${id}"[^>]*>`, 'i'),
            imgMatch => {
              // Extract alt and title from original attributes
              const alt = this.extractAttribute(attributes, 'alt') || '';
              const title = this.extractAttribute(attributes, 'title') || '';

              return `<img id="${id}" src="${blobUrl}" alt="${alt}" title="${title}" data-gitcms-full="true">`;
            }
          );

          // Call listener with updated HTML
          listener(currentHtml);
        } catch (error) {
          console.warn(`Failed to load full resolution for ${dataPath}:`, error);
          // Continue with next image on error
        }
      }
    }
  }

  /**
   * Get image blob from GitHub repository
   */
  private async getImageBlob(path: string): Promise<Blob> {
    const [owner, repo] = this.config.repository.split('/');

    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path: path.startsWith('/') ? path.substring(1) : path,
        ref: this.config.branch || 'main',
      });

      // Handle file content
      if ('content' in response.data && response.data.content) {
        // Decode base64 content
        const content = atob(response.data.content.replace(/\s/g, ''));
        const bytes = new Uint8Array(content.length);

        for (let i = 0; i < content.length; i++) {
          bytes[i] = content.charCodeAt(i);
        }

        // Determine content type from file extension
        const contentType = this.getContentType(path);
        return new Blob([bytes], { type: contentType });
      }

      throw new Error('No content found');
    } catch (error) {
      throw new Error(`Failed to fetch image: ${error}`);
    }
  }

  /**
   * Extract attribute value from HTML attributes string
   */
  private extractAttribute(attributeString: string, attributeName: string): string | null {
    const regex = new RegExp(`${attributeName}=["']([^"']*?)["']`, 'i');
    const match = attributeString.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Get content type from file extension
   */
  private getContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/jpeg';
    }
  }
}
