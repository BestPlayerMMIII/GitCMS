'use client';

import {
  GitCMSRepositoryConfig,
  DEFAULT_GITCMS_PATHS,
  getUserSchemaId,
  getSystemSchemaId,
  updateSchemaIdMapping,
  createSchemaIdMapping,
} from '@git-cms/core';

/**
 * Schema ID Mapping Service
 * Manages the mapping between user-defined and system-defined schema IDs
 */
class SchemaIdMappingService {
  private cache: Map<string, GitCMSRepositoryConfig> = new Map();
  private pendingRequests: Map<string, Promise<GitCMSRepositoryConfig | null>> = new Map();

  /**
   * Get cache key for repository
   */
  private getCacheKey(owner: string, repo: string): string {
    return `${owner}/${repo}`;
  }

  /**
   * Load schema mapping configuration from repository
   */
  async loadMapping(owner: string, repo: string): Promise<GitCMSRepositoryConfig | null> {
    const cacheKey = this.getCacheKey(owner, repo);

    // Return cached version if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Avoid duplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const request = this.fetchMappingFromGitHub(owner, repo);
    this.pendingRequests.set(cacheKey, request);

    try {
      const config = await request;
      if (config) {
        this.cache.set(cacheKey, config);
      }
      return config;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch mapping configuration from GitHub
   */
  private async fetchMappingFromGitHub(
    owner: string,
    repo: string
  ): Promise<GitCMSRepositoryConfig | null> {
    try {
      // First try to load the main config
      const configResponse = await fetch(
        `/api/github/config?owner=${owner}&repo=${repo}&path=${DEFAULT_GITCMS_PATHS.configFile}`
      );
      let config: Partial<GitCMSRepositoryConfig> = {};

      if (configResponse.ok) {
        const configData = await configResponse.json();
        if (configData.content) {
          config = JSON.parse(configData.content);
        }
      }

      // Then try to load the schema ID mapping
      const mappingResponse = await fetch(
        `/api/github/config?owner=${owner}&repo=${repo}&path=${DEFAULT_GITCMS_PATHS.schemaIdMappingFile}`
      );
      if (mappingResponse.ok) {
        const mappingData = await mappingResponse.json();
        if (mappingData.content) {
          const mapping = JSON.parse(mappingData.content);
          config.schemaIdMapping = mapping;
        }
      }

      return {
        version: '1.0.0',
        contentPath: 'content',
        mediaPath: 'media',
        collections: [],
        schemas: {},
        schemaIdMapping: {},
        createdAt: new Date().toISOString(),
        ...config,
      } as GitCMSRepositoryConfig;
    } catch (error) {
      console.warn('Failed to load schema mapping:', error);
      return null;
    }
  }

  /**
   * Save schema mapping to GitHub
   */
  async saveMapping(owner: string, repo: string, config: GitCMSRepositoryConfig): Promise<void> {
    try {
      // Save the mapping to GitHub
      const response = await fetch(`/api/github/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          repo,
          path: DEFAULT_GITCMS_PATHS.schemaIdMappingFile,
          content: JSON.stringify(config.schemaIdMapping || {}, null, 2),
          message: 'Update schema ID mapping',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save schema mapping');
      }

      // Update cache
      const cacheKey = this.getCacheKey(owner, repo);
      this.cache.set(cacheKey, config);
    } catch (error) {
      console.error('Failed to save schema mapping:', error);
      throw error;
    }
  }

  /**
   * Get user-defined schema ID from system ID
   */
  async getUserSchemaId(owner: string, repo: string, systemId: string): Promise<string> {
    const config = await this.loadMapping(owner, repo);
    return getUserSchemaId(systemId, config);
  }

  /**
   * Get system schema ID from user-defined ID
   */
  async getSystemSchemaId(owner: string, repo: string, userDefinedId: string): Promise<string> {
    const config = await this.loadMapping(owner, repo);
    return getSystemSchemaId(userDefinedId, config);
  }

  /**
   * Create a new schema mapping
   */
  async createSchemaMapping(
    owner: string,
    repo: string,
    userDefinedId: string,
    systemId?: string
  ): Promise<{ systemId: string; userDefinedId: string }> {
    const config = await this.loadMapping(owner, repo);
    const currentConfig = config || {
      version: '1.0.0',
      contentPath: 'content',
      mediaPath: 'media',
      collections: [],
      schemas: {},
      schemaIdMapping: {},
      createdAt: new Date().toISOString(),
    };

    const { systemId: finalSystemId, updatedConfig } = createSchemaIdMapping(
      userDefinedId,
      currentConfig,
      systemId
    );

    await this.saveMapping(owner, repo, updatedConfig);

    return { systemId: finalSystemId, userDefinedId };
  }

  /**
   * Update an existing schema mapping
   */
  async updateSchemaMapping(
    owner: string,
    repo: string,
    systemId: string,
    newUserDefinedId: string
  ): Promise<void> {
    const config = await this.loadMapping(owner, repo);
    if (!config) {
      throw new Error('No configuration found');
    }

    const updatedConfig = updateSchemaIdMapping(systemId, newUserDefinedId, config);
    await this.saveMapping(owner, repo, updatedConfig);
  }

  /**
   * Remove a schema mapping
   */
  async removeSchemaMapping(owner: string, repo: string, systemId: string): Promise<void> {
    const config = await this.loadMapping(owner, repo);
    if (!config || !config.schemaIdMapping) {
      return;
    }

    const updatedMapping = { ...config.schemaIdMapping };
    delete updatedMapping[systemId];

    const updatedConfig = {
      ...config,
      schemaIdMapping: updatedMapping,
    };

    await this.saveMapping(owner, repo, updatedConfig);
  }

  /**
   * Get all schema mappings for a repository
   */
  async getAllMappings(owner: string, repo: string): Promise<Record<string, string>> {
    const config = await this.loadMapping(owner, repo);
    return config?.schemaIdMapping || {};
  }

  /**
   * Clear cache for a repository
   */
  clearCache(owner: string, repo: string): void {
    const cacheKey = this.getCacheKey(owner, repo);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const schemaIdMappingService = new SchemaIdMappingService();
export default schemaIdMappingService;
