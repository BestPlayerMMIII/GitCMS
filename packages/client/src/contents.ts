import { Octokit } from '@octokit/rest';
import type { GitCMSConfig, ContentItem, TransportMode } from './types';
import { Operator, applyOperator } from '@git-cms/core';

export class SchemaRef {
  constructor(
    private name: string,
    private octokit: Octokit,
    private config: GitCMSConfig,
    private transport: TransportMode
  ) {}

  /**
   * Get all items from this schema
   * @param debug active <===> true <===> want console error when failing
   * @returns contents that match the query
   */
  async get(debug: boolean = true): Promise<ContentItem[]> {
    if (this.config.baseUrl) {
      // Proxy mode: use custom API endpoint
      const [owner, repo] = this.config.repository.split('/');
      const url = new URL(`${this.config.baseUrl}/api/content/${owner}/${repo}/${this.name}`);
      url.searchParams.set('branch', this.config.branch || 'main');
      const res = await fetch(url.toString(), {
        headers: this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {},
      });
      if (!res.ok) throw new Error(`GitCMS HTTP error ${res.status}`);
      const json = await res.json();
      return json.items as ContentItem[];
    }

    // Public mode: use raw.githubusercontent.com (no auth required)
    if (this.transport === 'public') {
      try {
        const [owner, repo] = this.config.repository.split('/');
        const branch = this.config.branch || 'main';

        // For public mode, we need to try fetching the index file from .metadata directory

        const items: ContentItem[] = [];

        // Try to fetch an index file from .metadata directory
        const indexUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/content/${this.name}/.metadata/index.json`;
        try {
          const indexResponse = await fetch(indexUrl);
          if (indexResponse.ok) {
            const indexData = await indexResponse.json();
            if (Array.isArray(indexData)) {
              // Index file contains list of file names
              for (const fileName of indexData) {
                try {
                  const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/content/${this.name}/${fileName}`;
                  const fileResponse = await fetch(fileUrl);

                  if (fileResponse.ok) {
                    const content = await fileResponse.text();

                    if (fileName.endsWith('.json')) {
                      items.push(JSON.parse(content));
                    } else if (fileName.endsWith('.md')) {
                      const item = this.parseMarkdown(content, fileName);
                      items.push(item);
                    }
                  }
                } catch (fileError) {
                  if (debug) console.error(`Error fetching file ${fileName}:`, fileError);
                }
              }
              return items;
            }
          }
        } catch (indexError) {
          // Index file doesn't exist
        }

        // If everything fails, return empty array
        if (debug) {
          console.warn(
            `GitCMS Public Mode: Unable to list files in schema "${this.name}". ` +
              `For public repositories, consider:\n` +
              `1. Creating a content/${this.name}/index.json file with an array of file names\n` +
              `2. Using authenticated mode with a token (server-side only)\n` +
              `3. Using proxy mode with a custom API endpoint`
          );
        }
        return items;
      } catch (error) {
        if (debug) console.error(`Error fetching content from schema ${this.name}:`, error);
        return [];
      }
    }

    // Authenticated mode: use GitHub API with token
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
      if (debug) console.error(`Error fetching content from schema ${this.name}:`, error);
      return [];
    }
  }

  /**
   * Query content with filters
   */
  where(field: string, operator: Operator, value: any): SchemaQuery {
    return new SchemaQuery(this.name, this.octokit, this.config, this.transport).where(
      field,
      operator,
      value
    );
  }

  /**
   * Order content results
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): SchemaQuery {
    return new SchemaQuery(this.name, this.octokit, this.config, this.transport).orderBy(
      field,
      direction
    );
  }

  /**
   * Limit content results
   */
  limit(count: number): SchemaQuery {
    return new SchemaQuery(this.name, this.octokit, this.config, this.transport).limit(count);
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

    const markdownContent =
      frontmatterEnd > 0 ? lines.slice(frontmatterEnd + 1).join('\n') : content;

    return {
      id: filename.replace(/\.(md|json)$/, ''),
      content: markdownContent,
      ...frontmatter,
    };
  }
}

export class SchemaQuery {
  private filters: Record<string, any> = {};
  private orderings: { field: string; direction: 'asc' | 'desc' }[] = [];
  private limitCount: number | null = null;
  private debugActive: boolean = true;

  constructor(
    private schemaName: string,
    private octokit: Octokit,
    private config: GitCMSConfig,
    private transport: TransportMode
  ) {}

  debug(active: boolean): SchemaQuery {
    this.debugActive = active;
    return this;
  }

  where(field: string, operator: Operator, value: any): SchemaQuery {
    if (!this.filters._where) {
      this.filters._where = [];
    }
    this.filters._where.push({ field, operator, value });
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): SchemaQuery {
    this.orderings.push({ field, direction });
    return this;
  }

  limit(count: number): SchemaQuery {
    this.limitCount = count;
    return this;
  }

  /**
   * Get the count of documents that match the current query
   */
  async count(): Promise<number> {
    const items = await this.get();
    return items.length;
  }

  /**
   * Check if any documents exist that match the current query
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  /**
   * Get the first document that matches the query
   */
  async first(): Promise<ContentItem | null> {
    const originalLimit = this.limitCount;
    this.limitCount = 1;
    const items = await this.get();
    this.limitCount = originalLimit; // Restore original limit
    return items.length > 0 ? items[0] : null;
  }

  /**
   * Search in content text
   */
  search(query: string): SchemaQuery {
    this.filters._search = query;
    return this;
  }

  /**
   * Get nested field value from an item using dot notation
   * Supports: 'field', 'data.field', 'metadata.status', 'nested.deep.property'
   * @private
   */
  private getNestedFieldValue(item: any, fieldPath: string): any {
    // Split the path by dots to handle nested properties
    const pathParts = fieldPath.split('.');

    // Try to get the value following the path
    let value = item;
    for (const part of pathParts) {
      if (value === null || value === undefined) {
        break;
      }
      value = value[part];
    }

    // If we found a value, return it
    if (value !== undefined) {
      return value;
    }

    // Fallback: try looking in 'data' object if the direct path didn't work
    // This maintains backward compatibility with data.field access
    if (!fieldPath.startsWith('data.')) {
      return this.getNestedFieldValue(item, 'data.' + fieldPath);
    } else return undefined;
  }

  async get(): Promise<ContentItem[]> {
    if (this.config.baseUrl) {
      // Proxy mode: use custom API endpoint
      const [owner, repo] = this.config.repository.split('/');
      const url = new URL(`${this.config.baseUrl}/api/content/${owner}/${repo}/${this.schemaName}`);
      url.searchParams.set('branch', this.config.branch || 'main');

      // Enhanced filtering support
      if (Object.keys(this.filters).length) {
        if (this.filters._where) {
          url.searchParams.set('where', JSON.stringify(this.filters._where));
        }
        if (this.filters._search) {
          url.searchParams.set('search', this.filters._search);
        }
      }

      if (this.orderings.length > 0) {
        // For API calls, send all orderings
        url.searchParams.set('orderBy', JSON.stringify(this.orderings));
      }
      if (this.limitCount != null) url.searchParams.set('limit', String(this.limitCount));

      const res = await fetch(url.toString(), {
        headers: this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {},
      });
      if (!res.ok) throw new Error(`GitCMS HTTP error ${res.status}`);
      const json = await res.json();
      return json.items as ContentItem[];
    }

    // Direct GitHub API fallback (public or authenticated mode)
    const schemaRef = new SchemaRef(this.schemaName, this.octokit, this.config, this.transport);
    let items = await schemaRef.get(this.debugActive);

    // Apply where filters
    if (this.filters._where) {
      this.filters._where.forEach((filter: any) => {
        items = items.filter(item => {
          const fieldValue = this.getNestedFieldValue(item, filter.field);
          return applyOperator(fieldValue, filter.operator, filter.value);
        });
      });
    }

    // Apply search
    if (this.filters._search) {
      const searchLower = this.filters._search.toLowerCase();
      items = items.filter(item => {
        const content = item.content?.toLowerCase() || '';
        const dataStr = JSON.stringify(item.data || {}).toLowerCase();
        return content.includes(searchLower) || dataStr.includes(searchLower);
      });
    }

    // Apply ordering (with multiple sort criteria)
    if (this.orderings.length > 0) {
      items.sort((a, b) => {
        // Compare items by each ordering criterion in sequence
        for (const ordering of this.orderings) {
          const aVal = this.getNestedFieldValue(a, ordering.field);
          const bVal = this.getNestedFieldValue(b, ordering.field);

          if (aVal < bVal) return ordering.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return ordering.direction === 'asc' ? 1 : -1;
          // If equal, continue to next ordering criterion
        }
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
