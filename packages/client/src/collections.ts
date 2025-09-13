import { Octokit } from '@octokit/rest';
import type { GitCMSConfig, ContentItem, QueryOptions } from './types';

export class CollectionRef {
  constructor(
    private name: string,
    private octokit: Octokit,
    private config: GitCMSConfig
  ) {}

  /**
   * Get all items in the collection
   */
  async get(): Promise<ContentItem[]> {
    try {
      const [owner, repo] = this.config.repository.split('/');
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: `content/${this.name}`,
        ref: this.config.branch,
      });

      if (Array.isArray(response.data)) {
        const items: ContentItem[] = [];
        
        for (const file of response.data) {
          if (file.type === 'file' && (file.name.endsWith('.json') || file.name.endsWith('.md'))) {
            const fileResponse = await this.octokit.rest.repos.getContent({
              owner,
              repo,
              path: file.path,
              ref: this.config.branch,
            });

            if ('content' in fileResponse.data) {
              const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
              
              if (file.name.endsWith('.json')) {
                items.push(JSON.parse(content));
              } else if (file.name.endsWith('.md')) {
                // Parse markdown frontmatter
                const item = this.parseMarkdown(content, file.name);
                items.push(item);
              }
            }
          }
        }

        return items;
      }

      return [];
    } catch (error) {
      console.error(`Error fetching collection ${this.name}:`, error);
      return [];
    }
  }

  /**
   * Get a single document by ID
   */
  async doc(id: string): Promise<DocumentRef> {
    return new DocumentRef(id, this.name, this.octokit, this.config);
  }

  /**
   * Query collection with filters
   */
  where(field: string, value: any): CollectionQuery {
    return new CollectionQuery(this.name, this.octokit, this.config).where(field, value);
  }

  /**
   * Order collection results
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): CollectionQuery {
    return new CollectionQuery(this.name, this.octokit, this.config).orderBy(field, direction);
  }

  /**
   * Limit collection results
   */
  limit(count: number): CollectionQuery {
    return new CollectionQuery(this.name, this.octokit, this.config).limit(count);
  }

  /**
   * Parse markdown file with frontmatter
   */
  private parseMarkdown(content: string, filename: string): ContentItem {
    const lines = content.split('\n');
    let frontmatterEnd = -1;
    let frontmatter = {};

    // Check for frontmatter
    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          frontmatterEnd = i;
          break;
        }
      }

      if (frontmatterEnd > 0) {
        const frontmatterContent = lines.slice(1, frontmatterEnd).join('\n');
        try {
          // Simple YAML-like parsing (would use a proper YAML parser in production)
          frontmatterContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              const value = valueParts.join(':').trim();
              (frontmatter as any)[key.trim()] = value.replace(/^['"]|['"]$/g, '');
            }
          });
        } catch (error) {
          console.error('Error parsing frontmatter:', error);
        }
      }
    }

    const markdownContent = frontmatterEnd > 0 
      ? lines.slice(frontmatterEnd + 1).join('\n') 
      : content;

    return {
      id: filename.replace(/\.(md|json)$/, ''),
      content: markdownContent,
      ...frontmatter,
    };
  }
}

export class CollectionQuery {
  private filters: Record<string, any> = {};
  private ordering: { field: string; direction: 'asc' | 'desc' } | null = null;
  private limitCount: number | null = null;

  constructor(
    private collectionName: string,
    private octokit: Octokit,
    private config: GitCMSConfig
  ) {}

  where(field: string, value: any): CollectionQuery {
    this.filters[field] = value;
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): CollectionQuery {
    this.ordering = { field, direction };
    return this;
  }

  limit(count: number): CollectionQuery {
    this.limitCount = count;
    return this;
  }

  async get(): Promise<ContentItem[]> {
    const collection = new CollectionRef(this.collectionName, this.octokit, this.config);
    let items = await collection.get();

    // Apply filters
    Object.entries(this.filters).forEach(([field, value]) => {
      items = items.filter(item => item[field] === value);
    });

    // Apply ordering
    if (this.ordering) {
      items.sort((a, b) => {
        const aVal = a[this.ordering!.field];
        const bVal = b[this.ordering!.field];
        
        if (aVal < bVal) return this.ordering!.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.ordering!.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount) {
      items = items.slice(0, this.limitCount);
    }

    return items;
  }
}

export class DocumentRef {
  constructor(
    private id: string,
    private collectionName: string,
    private octokit: Octokit,
    private config: GitCMSConfig
  ) {}

  async get(): Promise<ContentItem | null> {
    try {
      const [owner, repo] = this.config.repository.split('/');
      
      // Try JSON first, then Markdown
      const extensions = ['json', 'md'];
      
      for (const ext of extensions) {
        try {
          const response = await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: `content/${this.collectionName}/${this.id}.${ext}`,
            ref: this.config.branch,
          });

          if ('content' in response.data) {
            const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
            
            if (ext === 'json') {
              return JSON.parse(content);
            } else {
              // Parse markdown (simplified version)
              return {
                id: this.id,
                content,
              };
            }
          }
        } catch (error) {
          // Continue to next extension if file not found
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching document ${this.id}:`, error);
      return null;
    }
  }
}