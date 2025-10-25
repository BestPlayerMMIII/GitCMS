import { GitHubApiClient } from '@git-cms/core';
import { createGitHubClient } from '@/lib/client-github';

export async function gitcmsConfigGET(owner: string, repo: string) {
  try {
    const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
    const token = await (github as any).getAccessToken();
    const githubClient = new GitHubApiClient(token, owner, repo);

    // Check for GitCMS configuration file
    try {
      const configFile = await githubClient.getFile('.gitcms/config.json');
      if (configFile && configFile.content) {
        const configContent = JSON.parse(Buffer.from(configFile.content, 'base64').toString());
        return configContent;
      }
    } catch (error) {
      // Config file doesn't exist or can't be read
    }

    // Check for alternative config locations
    try {
      const packageJson = await githubClient.getFile('package.json');
      if (packageJson && packageJson.content) {
        const packageContent = JSON.parse(Buffer.from(packageJson.content, 'base64').toString());
        if (packageContent.gitcms) {
          return packageContent.gitcms;
        }
      }
    } catch (error) {
      // package.json doesn't exist or doesn't have gitcms config
    }

    // No GitCMS configuration found
    throw new Error('GitCMS configuration not found');
  } catch (error) {
    console.error('Error checking GitCMS config:', error);
    throw new Error('Failed to check GitCMS configuration');
  }
}
