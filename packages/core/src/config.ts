// GitCMS Configuration Management
// Centralized configuration defaults and utilities

export interface GitCMSRepositoryConfig {
  version: string;
  contentPath: string;
  mediaPath: string;
  collections: string[];
  schemas: Record<string, any>;
  createdAt: string;
  [key: string]: any;
}

/**
 * Default GitCMS configuration
 */
export const DEFAULT_GITCMS_CONFIG: Partial<GitCMSRepositoryConfig> = {
  version: '1.0.0',
  contentPath: 'content',
  mediaPath: 'media',
  collections: [],
  schemas: {},
} as const;

/**
 * Default paths for GitCMS configuration files
 */
export const DEFAULT_GITCMS_PATHS = {
  configDir: '.gitcms',
  schemasDir: '.gitcms/schemas',
  metadataDir: '.gitcms/schemas/.metadata',
  configFile: '.gitcms/config.json',
} as const;

/**
 * Get content path from config or return default
 */
export function getContentPath(config?: Partial<GitCMSRepositoryConfig> | null): string {
  return config?.contentPath || DEFAULT_GITCMS_CONFIG.contentPath!;
}

/**
 * Get media path from config or return default
 */
export function getMediaPath(config?: Partial<GitCMSRepositoryConfig> | null): string {
  return config?.mediaPath || DEFAULT_GITCMS_CONFIG.mediaPath!;
}

/**
 * Create a complete GitCMS configuration with defaults
 */
export function createGitCMSConfig(
  userConfig: Partial<GitCMSRepositoryConfig> = {}
): GitCMSRepositoryConfig {
  return {
    ...DEFAULT_GITCMS_CONFIG,
    ...userConfig,
    createdAt: userConfig.createdAt || new Date().toISOString(),
  } as GitCMSRepositoryConfig;
}

/**
 * Validate GitCMS configuration
 */
export function validateGitCMSConfig(config: any): config is GitCMSRepositoryConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    typeof config.version === 'string' &&
    typeof config.contentPath === 'string' &&
    typeof config.mediaPath === 'string' &&
    Array.isArray(config.collections) &&
    typeof config.schemas === 'object'
  );
}
