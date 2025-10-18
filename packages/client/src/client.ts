import { Octokit } from '@octokit/rest';
import type { GitCMSConfig, SchemaGroup, ContentItem } from './types';
import { SchemaRef } from './contents';
import { MediaManager, ContentMediaHelper } from './media';

export class GitCMS {
  private octokit: Octokit;
  private config: GitCMSConfig;
  private transport: 'github' | 'http';
  private _mediaManager: MediaManager;
  private _contentMediaHelper: ContentMediaHelper;

  constructor(config: GitCMSConfig) {
    this.config = {
      branch: 'main',
      ...config,
    };

    this.transport = config.baseUrl ? 'http' : 'github';

    this.octokit = new Octokit({
      auth: config.token,
    });

    this._mediaManager = new MediaManager(this.config);
    this._contentMediaHelper = new ContentMediaHelper(this.config);
  }

  /**
   * Access the media manager for working with GitCMS media
   * Provides methods for extracting, rendering, and fetching media
   */
  get media(): MediaManager {
    return this._mediaManager;
  }

  /**
   * Access content media helper for convenient media operations on content items
   */
  get contentMedia(): ContentMediaHelper {
    return this._contentMediaHelper;
  }

  /**
   * Get content from a schema (SQL-like FROM syntax)
   */
  from(schemaName: string): SchemaRef {
    return new SchemaRef(schemaName, this.octokit, this.config);
  }

  /**
   * Get a single document by path
   */
  async doc(path: string): Promise<ContentItem | null> {
    if (this.transport === 'http' && this.config.baseUrl) {
      const [owner, repo] = this.config.repository.split('/');
      const id = path.includes('/') ? path.split('/').pop()! : path;
      const schema = path.includes('/') ? path.split('/')[0] : '';
      const url = new URL(`${this.config.baseUrl}/api/content/${owner}/${repo}/${schema}`);
      url.searchParams.set('id', id);
      url.searchParams.set('branch', this.config.branch || 'main');
      const res = await fetch(url.toString(), {
        headers: this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {},
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitCMS HTTP error ${res.status}`);
      const json = await res.json();
      return json.content as ContentItem;
    } else {
      try {
        const [owner, repo] = this.config.repository.split('/');
        const response = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: `content/${path}.json`,
          ref: this.config.branch,
        });

        if ('content' in response.data) {
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          return JSON.parse(content);
        }

        return null;
      } catch (error) {
        if ((error as any).status === 404) {
          return null;
        }
        throw error;
      }
    }
  }

  /**
   * Get all schema groups in the repository
   */
  async getSchemas(): Promise<SchemaGroup[]> {
    try {
      const [owner, repo] = this.config.repository.split('/');
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'content',
        ref: this.config.branch,
      });

      if (Array.isArray(response.data)) {
        const schemaGroups: SchemaGroup[] = [];

        for (const item of response.data) {
          if (item.type === 'dir') {
            const schemaRef = await this.from(item.name);
            const schemaData = await schemaRef.get();
            schemaGroups.push({
              name: item.name,
              schema: await this.getSchema(item.name),
              items: schemaData,
            });
          }
        }

        return schemaGroups;
      }

      return [];
    } catch (error) {
      console.error('Error fetching schemas:', error);
      return [];
    }
  }

  /**
   * Get schema for a content type
   */
  private async getSchema(contentType: string): Promise<any> {
    try {
      const [owner, repo] = this.config.repository.split('/');
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: `.gitcms/schemas/${contentType}.json`,
        ref: this.config.branch,
      });

      if ('content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
      }

      return null;
    } catch (error) {
      return {
        name: contentType,
        displayName: contentType,
        fields: [],
      };
    }
  }
}
