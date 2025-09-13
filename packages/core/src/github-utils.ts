import { GitHubApiClient } from './github';

/**
 * Create a GitHub API client from a session access token
 */
export function createGitHubClient(
  accessToken: string,
  owner: string,
  repo: string,
  branch?: string
): GitHubApiClient {
  return new GitHubApiClient(accessToken, owner, repo, branch);
}

/**
 * Parse repository full name into owner and repo
 */
export function parseRepositoryFullName(fullName: string): { owner: string; repo: string } {
  const parts = fullName.split('/');
  if (parts.length !== 2) {
    throw new Error('Invalid repository full name format. Expected: owner/repo');
  }
  return {
    owner: parts[0],
    repo: parts[1],
  };
}

/**
 * Validate GitHub repository access
 */
export async function validateRepositoryAccess(
  accessToken: string,
  owner: string,
  repo: string
): Promise<boolean> {
  try {
    const client = createGitHubClient(accessToken, owner, repo);
    await client.testConnection();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get GitCMS configuration from repository
 */
export async function getGitCMSConfig(
  accessToken: string,
  owner: string,
  repo: string
): Promise<any | null> {
  try {
    const client = createGitHubClient(accessToken, owner, repo);
    const configContent = await client.getFileContent('.gitcms/config.json');
    return JSON.parse(configContent);
  } catch (error) {
    return null;
  }
}

/**
 * Initialize GitCMS in a repository
 */
export async function initializeGitCMS(
  accessToken: string,
  owner: string,
  repo: string,
  config: any
): Promise<void> {
  const client = createGitHubClient(accessToken, owner, repo);

  const files = [
    {
      path: '.gitcms/config.json',
      content: JSON.stringify(config, null, 2),
    },
    {
      path: '.gitcms/README.md',
      content: `# GitCMS Configuration

This directory contains the GitCMS configuration for this repository.

- \`config.json\`: Main configuration file
- \`schemas/\`: Content type schemas
- \`collections/\`: Collection definitions

Do not modify these files manually unless you know what you're doing.
`,
    },
  ];

  await client.createMultipleFiles(files, 'Initialize GitCMS configuration');
}
