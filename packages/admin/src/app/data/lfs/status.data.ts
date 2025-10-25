import { createGitHubClient } from '@/lib/client-github';
import { GitHubApiClient, GitLFSManager } from '@git-cms/core';

/**
 * Get LFS status for repository (client-callable)
 */
export async function lfsStatusGET(owner: string, repo: string) {
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();

  const githubClient = new GitHubApiClient(token, owner, repo);
  const lfsManager = new GitLFSManager(githubClient, owner, repo);

  const status = await lfsManager.analyzeLFSRequirements();

  const stats = {
    totalRules: status.rules.length,
    trackedExtensions: status.rules.map(rule => rule.pattern.replace('*.', '')),
    estimatedSavings: 0,
    recentFiles: [],
  };

  return {
    success: true,
    status,
    stats,
    suggestedFiles: status.suggestedFiles,
  };
}

/**
 * Initialize LFS in repository (client-callable)
 */
export async function lfsStatusPOST(owner: string, repo: string, body: { customRules?: any }) {
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
