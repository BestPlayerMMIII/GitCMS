/**
 * Content Index Manager
 *
 * Maintains .metadata/index.json files for each schema directory
 * These index files enable public mode in the client package by
 * providing a list of content files without requiring GitHub API auth
 */

import type { GitHubApiClient } from '@git-cms/core';

export interface IndexManagerOptions {
  contentPath: string;
  schemaId: string;
}

/**
 * Get the path to the metadata directory for a schema
 */
export function getMetadataDir(contentPath: string, schemaId: string): string {
  return `${contentPath}/${schemaId}/.metadata`;
}

/**
 * Get the path to the index file for a schema
 */
export function getIndexPath(contentPath: string, schemaId: string): string {
  return `${getMetadataDir(contentPath, schemaId)}/index.json`;
}

/**
 * Read the current index file
 */
export async function readIndex(
  github: GitHubApiClient,
  contentPath: string,
  schemaId: string
): Promise<string[]> {
  const indexPath = getIndexPath(contentPath, schemaId);

  try {
    const content = await github.getFileContent(indexPath);
    const index = JSON.parse(content);

    if (Array.isArray(index)) {
      return index;
    }

    console.warn(`Index at ${indexPath} is not an array, returning empty`);
    return [];
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      // Index doesn't exist yet
      return [];
    }
    throw error;
  }
}

/**
 * Scan the schema directory and generate the current index
 */
export async function scanDirectory(
  github: GitHubApiClient,
  contentPath: string,
  schemaId: string
): Promise<string[]> {
  const schemaPath = `${contentPath}/${schemaId}`;

  try {
    const files = await github.getDirectory(schemaPath);

    return files
      .filter(
        file =>
          file.type === 'file' &&
          file.name.endsWith('.json') &&
          !file.name.startsWith('.') && // Ignore hidden files
          file.path !== getIndexPath(contentPath, schemaId) // Don't include index itself
      )
      .map(file => file.name)
      .sort(); // Keep sorted for consistency
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      // Schema directory doesn't exist yet
      return [];
    }
    throw error;
  }
}

/**
 * Write the index file
 */
export async function writeIndex(
  github: GitHubApiClient,
  contentPath: string,
  schemaId: string,
  files: string[]
): Promise<void> {
  const indexPath = getIndexPath(contentPath, schemaId);
  const content = JSON.stringify(files.sort(), null, 2);

  try {
    // Try to get existing file
    const existing = await github.getFile(indexPath);
    await github.updateFile(indexPath, content, `Update index for ${schemaId}`, existing.sha);
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      // Index doesn't exist, create it
      await github.createMultipleFiles(
        [{ path: indexPath, content }],
        `Create index for ${schemaId}`
      );
    } else {
      throw error;
    }
  }
}

/**
 * Ensure metadata directory exists with a .gitkeep file
 */
export async function ensureMetadataDir(
  github: GitHubApiClient,
  contentPath: string,
  schemaId: string
): Promise<void> {
  const gitkeepPath = `${getMetadataDir(contentPath, schemaId)}/.gitkeep`;

  try {
    await github.getFile(gitkeepPath);
    // Directory exists
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      // Create .gitkeep to ensure directory exists
      await github.createMultipleFiles(
        [
          {
            path: gitkeepPath,
            content: '# This directory contains metadata for the schema\n',
          },
        ],
        `Create metadata directory for ${schemaId}`
      );
    } else {
      throw error;
    }
  }
}

/**
 * Update index after adding a file
 */
export async function addToIndex(
  github: GitHubApiClient,
  contentPath: string,
  schemaId: string,
  filename: string
): Promise<void> {
  await ensureMetadataDir(github, contentPath, schemaId);

  const currentIndex = await readIndex(github, contentPath, schemaId);

  if (!currentIndex.includes(filename)) {
    currentIndex.push(filename);
    await writeIndex(github, contentPath, schemaId, currentIndex);
  }
}

/**
 * Update index after removing a file
 */
export async function removeFromIndex(
  github: GitHubApiClient,
  contentPath: string,
  schemaId: string,
  filename: string
): Promise<void> {
  const currentIndex = await readIndex(github, contentPath, schemaId);
  const updatedIndex = currentIndex.filter(f => f !== filename);

  if (updatedIndex.length !== currentIndex.length) {
    await writeIndex(github, contentPath, schemaId, updatedIndex);
  }
}

/**
 * Update index after renaming a file
 */
export async function renameInIndex(
  github: GitHubApiClient,
  contentPath: string,
  schemaId: string,
  oldFilename: string,
  newFilename: string
): Promise<void> {
  const currentIndex = await readIndex(github, contentPath, schemaId);
  const updatedIndex = currentIndex.map(f => (f === oldFilename ? newFilename : f));

  await writeIndex(github, contentPath, schemaId, updatedIndex);
}

/**
 * Rebuild the entire index from scratch by scanning the directory
 */
export async function rebuildIndex(
  github: GitHubApiClient,
  contentPath: string,
  schemaId: string
): Promise<{ added: number; removed: number; total: number }> {
  await ensureMetadataDir(github, contentPath, schemaId);

  const oldIndex = await readIndex(github, contentPath, schemaId);
  const newIndex = await scanDirectory(github, contentPath, schemaId);

  await writeIndex(github, contentPath, schemaId, newIndex);

  const added = newIndex.filter(f => !oldIndex.includes(f)).length;
  const removed = oldIndex.filter(f => !newIndex.includes(f)).length;

  return {
    added,
    removed,
    total: newIndex.length,
  };
}

/**
 * Migrate all content for a schema to a new schema ID
 * This updates the index file location
 */
export async function migrateIndex(
  github: GitHubApiClient,
  contentPath: string,
  oldSchemaId: string,
  newSchemaId: string,
  files: string[]
): Promise<void> {
  // Ensure new metadata directory exists
  await ensureMetadataDir(github, contentPath, newSchemaId);

  // Write index to new location
  await writeIndex(github, contentPath, newSchemaId, files);

  // Delete old index and metadata directory
  try {
    const oldIndexPath = getIndexPath(contentPath, oldSchemaId);
    const oldIndexFile = await github.getFile(oldIndexPath);
    await github.deleteFile(
      oldIndexPath,
      `Remove old index after schema rename: ${oldSchemaId} → ${newSchemaId}`,
      oldIndexFile.sha
    );
  } catch (error: any) {
    if (error.code !== 'NOT_FOUND') {
      console.warn(`Failed to delete old index for ${oldSchemaId}:`, error);
    }
  }

  // Try to delete .gitkeep as well
  try {
    const gitkeepPath = `${getMetadataDir(contentPath, oldSchemaId)}/.gitkeep`;
    const gitkeepFile = await github.getFile(gitkeepPath);
    await github.deleteFile(
      gitkeepPath,
      `Remove old metadata dir after schema rename: ${oldSchemaId} → ${newSchemaId}`,
      gitkeepFile.sha
    );
  } catch (error: any) {
    if (error.code !== 'NOT_FOUND') {
      console.warn(`Failed to delete old .gitkeep for ${oldSchemaId}:`, error);
    }
  }
}
