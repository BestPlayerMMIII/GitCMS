import { Octokit } from '@octokit/rest';
import type { GitCMSConfig, Collection, ContentItem, QueryOptions } from './types';
import { CollectionRef } from './collections';

export class GitCMS {
  private octokit: Octokit;
  private config: GitCMSConfig;
  private transport: 'github' | 'http';

  constructor(config: GitCMSConfig) {
    this.config = {
      branch: 'main',
      ...config,
    };

    this.transport = config.baseUrl ? 'http' : 'github';

    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * Get a reference to a collection
   */
  collection(name: string): CollectionRef {
    return new CollectionRef(name, this.octokit, this.config);
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
   * Get all collections in the repository
   */
  async getCollections(): Promise<Collection[]> {
    try {
      const [owner, repo] = this.config.repository.split('/');
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'content',
        ref: this.config.branch,
      });

      if (Array.isArray(response.data)) {
        const collections: Collection[] = [];

        for (const item of response.data) {
          if (item.type === 'dir') {
            const collectionData = await this.collection(item.name).get();
            collections.push({
              name: item.name,
              schema: await this.getSchema(item.name),
              items: collectionData,
            });
          }
        }

        return collections;
      }

      return [];
    } catch (error) {
      console.error('Error fetching collections:', error);
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
