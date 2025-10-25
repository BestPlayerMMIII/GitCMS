import { createGitHubClient } from '@/lib/client-github';
import { GitHubApiClient, GitLFSManager } from '@git-cms/core';

/**
 * Initialize LFS in repository (client-callable)
 */
export async function lfsInitializePOST(owner: string, repo: string, body: { customRules?: any }) {
  const { customRules } = body;

  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  const githubClient = new GitHubApiClient(token, owner, repo);
  const lfsManager = new GitLFSManager(githubClient, owner, repo);

  await lfsManager.initializeLFS(customRules);

  const status = await lfsManager.analyzeLFSRequirements();

  return {
    success: true,
    message: 'LFS initialized successfully',
    status,
  };
}
