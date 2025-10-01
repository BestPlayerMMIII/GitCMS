// GitCMS Configuration Management
// Centralized configuration defaults and utilities

export interface GitCMSRepositoryConfig {
  version: string;
  contentPath: string;
  mediaPath: string;
  collections: string[];
  schemas: Record<string, any>;
  schemaIdMapping?: Record<string, string>; // system-defined-id: user-defined-id
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
  schemaIdMapping: {},
} as const;

/**
 * Default paths for GitCMS configuration files
 */
export const DEFAULT_GITCMS_PATHS = {
  configDir: '.gitcms',
  schemasDir: '.gitcms/schemas',
  metadataDir: '.gitcms/schemas/.metadata',
  configFile: '.gitcms/config.json',
  schemaIdMappingFile: '.gitcms/schemas/.metadata/id-mapping.json',
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

/**
 * Generate a system-defined schema ID (UUID-like but shorter)
 */
export function generateSystemSchemaId(): string {
  return `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get system schema ID from user-defined ID using mapping
 */
export function getSystemSchemaId(
  userDefinedId: string,
  config?: Partial<GitCMSRepositoryConfig> | null
): string {
  const mapping = config?.schemaIdMapping || {};

  // Find the system ID that maps to this user ID
  for (const [systemId, userId] of Object.entries(mapping)) {
    if (userId === userDefinedId) {
      return systemId;
    }
  }

  // If no mapping exists, return the user ID (for backward compatibility)
  return userDefinedId;
}

/**
 * Get user-defined schema ID from system ID using mapping
 */
export function getUserSchemaId(
  systemId: string,
  config?: Partial<GitCMSRepositoryConfig> | null
): string {
  const mapping = config?.schemaIdMapping || {};
  return mapping[systemId] || systemId;
}

/**
 * Update schema ID mapping when a schema ID changes
 */
export function updateSchemaIdMapping(
  systemId: string,
  newUserDefinedId: string,
  config: Partial<GitCMSRepositoryConfig>
): GitCMSRepositoryConfig {
  const updatedConfig = { ...config };
  if (!updatedConfig.schemaIdMapping) {
    updatedConfig.schemaIdMapping = {};
  }

  updatedConfig.schemaIdMapping[systemId] = newUserDefinedId;

  return updatedConfig as GitCMSRepositoryConfig;
}

/**
 * Create a new schema ID mapping entry
 */
export function createSchemaIdMapping(
  userDefinedId: string,
  config: Partial<GitCMSRepositoryConfig>,
  systemId?: string
): { systemId: string; updatedConfig: GitCMSRepositoryConfig } {
  const finalSystemId = systemId || generateSystemSchemaId();
  const updatedConfig = updateSchemaIdMapping(finalSystemId, userDefinedId, config);

  return { systemId: finalSystemId, updatedConfig };
}
