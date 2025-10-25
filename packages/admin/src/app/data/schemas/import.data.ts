/**
 * Enhanced Repository Schema Import API
 *
 * Fetches schemas from both public and private GitHub repositories
 * using the user's authentication when available
 */

import { createGitHubClient } from '@/lib/client-github';
import { GitHubApiClient } from '@git-cms/core';
import type { GitCMSSchema } from '@git-cms/core';

/**
 * Import schemas from repository (client-callable)
 */
export async function schemasImportGET(params: {
  owner: string;
  repo: string;
  branch?: string;
  includePrivate?: boolean;
}) {
  const { owner, repo, branch = 'main', includePrivate = false } = params;

  if (!owner || !repo) {
    throw new Error('Owner and repo parameters are required');
  }

  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  return handleEnhancedFetch(owner, repo, branch, token);
}

/**
 * Fetch schemas from public or private repositories
 */
async function handleEnhancedFetch(
  owner: string,
  repo: string,
  branch: string,
  accessToken: string | null
) {
  const schemasPath = '.gitcms/schemas';

  // Use authenticated GitHub client if token available
  if (accessToken) {
    const github = new GitHubApiClient(accessToken, owner, repo);

    try {
      // Check repository access and get metadata
      const repoInfo = await github.getRepository();

      // Get schemas directory contents
      let contents;
      try {
        contents = await github.getDirectory(schemasPath);
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          return {
            schemas: [],
            total: 0,
            repository: {
              owner,
              repo,
              branch,
              fullName: repoInfo.fullName,
              private: repoInfo.private,
            },
            message: 'No .gitcms/schemas directory found in this repository',
          };
        }
        throw error;
      }

      const schemaFiles = contents.filter(
        (item: any) => item.type === 'file' && item.name.endsWith('.json')
      );

      if (schemaFiles.length === 0) {
        return {
          schemas: [],
          total: 0,
          repository: {
            owner,
            repo,
            branch,
            fullName: repoInfo.fullName,
            private: repoInfo.private,
          },
          message: 'No schema files (.json) found in .gitcms/schemas directory',
        };
      }

      // Fetch each schema file content using authenticated API
      const schemas: GitCMSSchema[] = [];
      const errors: string[] = [];

      for (const file of schemaFiles) {
        try {
          const content = await github.getFileContent(file.path);
          const schema = JSON.parse(content);

          // Basic validation to ensure it's a GitCMS schema
          if (schema && typeof schema === 'object' && schema.id && schema.fields) {
            schemas.push(schema);
          } else {
            errors.push(`Invalid schema format in ${file.name}`);
          }
        } catch (error) {
          errors.push(
            `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      return {
        schemas,
        total: schemas.length,
        repository: {
          owner,
          repo,
          branch,
          fullName: repoInfo.fullName,
          private: repoInfo.private,
        },
        ...(errors.length > 0 && { warnings: errors }),
      };
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        throw new Error('Repository not found or no access');
      }
      if (error.code === 'FORBIDDEN') {
        throw new Error('No access to this repository');
      }
      throw error;
    }
  } else {
    // Fall back to public API for unauthenticated requests
    return handlePublicRepositoryFetch(owner, repo, branch);
  }
}

/**
 * Fallback to public repository API (same as existing implementation)
 */
async function handlePublicRepositoryFetch(owner: string, repo: string, branch: string) {
  const schemasPath = '.gitcms/schemas';

  // First, check if the repository exists and is public
  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'GitCMS-Admin',
    },
  });

  if (!repoResponse.ok) {
    if (repoResponse.status === 404) {
      throw new Error('Repository not found or not public');
    }
    throw new Error(`GitHub API error: ${repoResponse.statusText}`);
  }

  const repoData = await repoResponse.json();

  // Check if repository is public
  if (repoData.private) {
    throw new Error('Repository is private. Please authenticate to access private repositories.');
  }

  // Try to get the contents of the schemas directory
  const contentsResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${schemasPath}?ref=${branch}`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitCMS-Admin',
      },
    }
  );

  if (!contentsResponse.ok) {
    if (contentsResponse.status === 404) {
      return {
        schemas: [],
        total: 0,
        repository: {
          owner,
          repo,
          branch,
          url: repoData.html_url,
          description: repoData.description,
          private: repoData.private,
        },
        message: 'No .gitcms/schemas directory found in this repository',
      };
    }
    throw new Error(`GitHub API error: ${contentsResponse.statusText}`);
  }

  const contents = await contentsResponse.json();

  if (!Array.isArray(contents)) {
    return {
      schemas: [],
      total: 0,
      repository: {
        owner,
        repo,
        branch,
        url: repoData.html_url,
        description: repoData.description,
        private: repoData.private,
      },
      message: '.gitcms/schemas is not a directory',
    };
  }

  // Filter for JSON files
  const schemaFiles = contents.filter(
    (item: any) => item.type === 'file' && item.name.endsWith('.json')
  );

  if (schemaFiles.length === 0) {
    return {
      schemas: [],
      total: 0,
      repository: {
        owner,
        repo,
        branch,
        url: repoData.html_url,
        description: repoData.description,
        private: repoData.private,
      },
      message: 'No schema files (.json) found in .gitcms/schemas directory',
    };
  }

  // Fetch each schema file content
  const schemas: GitCMSSchema[] = [];
  const errors: string[] = [];

  for (const file of schemaFiles) {
    try {
      const fileResponse = await fetch(file.download_url, {
        headers: {
          'User-Agent': 'GitCMS-Admin',
        },
      });

      if (!fileResponse.ok) {
        errors.push(`Failed to fetch ${file.name}: ${fileResponse.statusText}`);
        continue;
      }

      const content = await fileResponse.text();
      const schema = JSON.parse(content);

      // Basic validation to ensure it's a GitCMS schema
      if (schema && typeof schema === 'object' && schema.id && schema.fields) {
        schemas.push(schema);
      } else {
        errors.push(`Invalid schema format in ${file.name}`);
      }
    } catch (error) {
      errors.push(
        `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return {
    schemas,
    total: schemas.length,
    repository: {
      owner,
      repo,
      branch,
      url: repoData.html_url,
      description: repoData.description,
      private: repoData.private,
    },
    ...(errors.length > 0 && { warnings: errors }),
  };
}
