export * from './types';
export * from './utils';
export * from './github';
export * from './github-utils';
export * from './content-parser';
export * from './media';
export * from './image-optimization';
export * from './cdn';
export * from './media-organization';
export * from './config';
export * from './network-monitor';
export * from './git-lfs';

// Additional GitHub types export
export type { GitHubFileContent, GitHubCommitResponse } from './github';

// Network monitoring exports
export {
  NetworkMonitor,
  UploadProgressSimulator,
  NetworkUtils,
  type NetworkStats,
  type UploadProgressSimulation,
  type ProgressSimulationConfig,
} from './network-monitor';

// Git LFS exports
export {
  GitLFSManager,
  LFSUtils,
  DEFAULT_LFS_CONFIG,
  COMMON_LFS_RULES,
  type LFSConfig,
  type LFSStatus,
  type LFSRule,
  type LFSFileAnalysis,
} from './git-lfs';

// Schema system exports
export {
  // Types
  type GitCMSSchema,
  type FieldDefinition,
  type FieldType as SchemaFieldType,
  type ValidationRule as SchemaValidationRule,
  type SchemaMetadata,
  type SchemaConfig,
  type StringField,
  type NumberField,
  type DateField,
  type ArrayField,
  type ObjectField,
  type MediaField,
  type ReferenceField,
  type RichTextField,
  type SelectField,
  type BaseField,
  type FieldOption,

  // Schemas
  blogPostSchema,
  projectSchema,
  productSchema,
  pageSchema,
  defaultSchemas,

  // Utils
  SchemaUtils,
  gitCMSSchemaSchema,
} from './schemas';

// Validation system exports
export {
  // Types
  type ValidationError,
  type ValidationResult,
  type ValidationContext,
  type CustomValidator,

  // Classes and functions
  ValidationEngine,
  defaultValidationEngine,
  createValidationEngine,
  customValidators,
  validateContentAdvanced,

  // Legacy exports
  validateContent,
  FieldTypeSchema,
  ValidationRuleSchema,
  SchemaFieldSchema,
  ContentSchemaSchema,
  GitCMSConfigSchema,
  ContentItemSchema,
} from './validation';

// Schema dependency checking exports
export {
  type DependencyGraph,
  buildDependencyGraph,
  extractSchemaReferences,
  wouldCreateCircularDependency,
  getCircularDependencyPath,
  getSafeSchemaReferences,
} from './schema-dependency-checker';

// Registry system exports
export {
  // Types
  type SchemaRegistrationOptions,
  type SchemaSearchOptions,
  type SchemaExport,
  type InheritanceChain,

  // Classes and functions
  ContentTypeRegistry,
  RegistryError,
  defaultRegistry,
  registerSchema,
  getSchema,
  getResolvedSchema,
  listSchemas,
  validateContent as validateContentWithRegistry,
} from './registry';

export {
  // Types
  type Operator,

  // Classes and functions
  applyOperator,
} from './query';
