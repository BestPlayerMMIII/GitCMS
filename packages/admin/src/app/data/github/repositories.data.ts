import { createGitHubClient } from '@/lib/client-github';
import { GitHubApiClient } from '@git-cms/core';

/**
 * Get list of repositories for authenticated user (client-callable)
 */
export async function githubRepositoriesGET() {
  const github = createGitHubClient('', '') as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  const client = new GitHubApiClient(token, '', '');
  const repositories = await client.getRepositories();

  return repositories;
}
