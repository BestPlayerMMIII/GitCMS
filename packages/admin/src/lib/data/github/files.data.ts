import { GitHubApiClient } from '@git-cms/core';
import { createGitHubClient } from '@/lib/client-github';

export async function githubFilesGET(owner: string, repo: string, path: string = '') {
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();
  const client = new GitHubApiClient(token, owner, repo);

  try {
    // Try to get as directory first
    const contents = await client.getDirectory(path);
    return {
      type: 'directory',
      path,
      contents,
    };
  } catch (error) {
    try {
      // If that fails, try to get as file
      const fileContent = await client.getFile(path);
      const content = await client.getFileContent(path);

      return {
        type: 'file',
        path,
        file: fileContent,
        content: content,
      };
    } catch (fileError) {
      throw new Error('Path not found');
    }
  }
}

export async function githubFilesPOST(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
) {
  if (!path || !content || !message) {
    throw new Error('Path, content, and message are required');
  }

  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();
  const client = new GitHubApiClient(token, owner, repo);

  const result = await client.updateFile(path, content, message, sha);

  return {
    success: true,
    commit: result,
    message: 'File updated successfully',
  };
}

export async function githubFilesDELETE(
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message?: string
) {
  if (!path || !sha) {
    throw new Error('Path and sha parameters are required');
  }

  const deleteMessage = message || `Delete ${path}`;

  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();
  const client = new GitHubApiClient(token, owner, repo);

  const result = await client.deleteFile(path, deleteMessage, sha);

  return {
    success: true,
    commit: result,
    message: 'File deleted successfully',
  };
}
