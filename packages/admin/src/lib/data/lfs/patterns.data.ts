import { createGitHubClient } from '@/lib/client-github';
import { GitHubApiClient, GitLFSManager } from '@git-cms/core';

/**
 * Add LFS pattern (client-callable)
 */
export async function lfsPatternsPOST(
  owner: string,
  repo: string,
  body: { pattern: string; description?: string }
) {
  const { pattern, description } = body;

  if (!pattern) {
    throw new Error('Pattern is required');
  }

  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  const githubClient = new GitHubApiClient(token, owner, repo);
  const lfsManager = new GitLFSManager(githubClient, owner, repo);

  await lfsManager.addLFSPattern(pattern, description);

  return {
    success: true,
    message: `LFS pattern ${pattern} added successfully`,
  };
}

/**
 * Remove LFS pattern (client-callable)
 */
export async function lfsPatternsDELETE(owner: string, repo: string, body: { pattern: string }) {
  const { pattern } = body;

  if (!pattern) {
    throw new Error('Pattern is required');
  }

  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  const githubClient = new GitHubApiClient(token, owner, repo);
  const lfsManager = new GitLFSManager(githubClient, owner, repo);

  await lfsManager.removeLFSPattern(pattern);

  return {
    success: true,
    message: `LFS pattern ${pattern} removed successfully`,
  };
}
