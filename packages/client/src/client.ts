import { Octokit } from '@octokit/rest';
import type { GitCMSConfig, Collection, ContentItem, QueryOptions } from './types';
import { CollectionRef } from './collections';

export class GitCMS {
  private octokit: Octokit;
  private config: GitCMSConfig;

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
   * Get a reference to a collection
   */
  collection(name: string): CollectionRef {
    return new CollectionRef(name, this.octokit, this.config);
  }

  /**
   * Get a single document by path
   */
  async doc(path: string): Promise<ContentItem | null> {
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
      // Return default schema if not found
      return {
        name: contentType,
        displayName: contentType,
        fields: [],
      };
    }
  }
}