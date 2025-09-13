import { Octokit } from '@octokit/rest';
import type { Repository, User, GitCMSError } from './types';

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface GitHubCommitResponse {
  sha?: string;
  url?: string;
  author?: {
    date?: string;
    name?: string;
    email?: string;
  };
  committer?: {
    date?: string;
    name?: string;
    email?: string;
  };
  message?: string;
}

export class GitHubApiClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(token: string, owner: string, repo: string, branch: string = 'main') {
    this.octokit = new Octokit({
      auth: token,
    });
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  /**
   * Get user information
   */
  async getUser(): Promise<User> {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return {
        id: data.id,
        login: data.login,
        name: data.name || undefined,
        email: data.email || undefined,
        avatar_url: data.avatar_url,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user information');
    }
  }

  /**
   * Get user repositories
   */
  async getRepositories(): Promise<Repository[]> {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        sort: 'updated',
        per_page: 100,
      });

      return data.map(repo => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch || 'main',
      }));
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch repositories');
    }
  }

  /**
   * Get repository information
   */
  async getRepository(): Promise<Repository> {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      return {
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        private: data.private,
        defaultBranch: data.default_branch || 'main',
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch repository information');
    }
  }

  /**
   * Get file content from repository
   */
  async getFile(path: string): Promise<GitHubFileContent> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if (Array.isArray(data)) {
        throw new Error('Path is a directory, not a file');
      }

      return data as GitHubFileContent;
    } catch (error) {
      throw this.handleError(error, `Failed to get file: ${path}`);
    }
  }

  /**
   * Get directory contents from repository
   */
  async getDirectory(path: string = ''): Promise<GitHubFileContent[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if (!Array.isArray(data)) {
        throw new Error('Path is a file, not a directory');
      }

      return data as GitHubFileContent[];
    } catch (error) {
      throw this.handleError(error, `Failed to get directory: ${path}`);
    }
  }

  /**
   * Create or update a file in the repository
   */
  async updateFile(
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<GitHubCommitResponse> {
    try {
      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        sha,
        branch: this.branch,
      });

      return data.commit;
    } catch (error) {
      throw this.handleError(error, `Failed to update file: ${path}`);
    }
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(path: string, message: string, sha: string): Promise<GitHubCommitResponse> {
    try {
      const { data } = await this.octokit.rest.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        sha,
        branch: this.branch,
      });

      return data.commit;
    } catch (error) {
      throw this.handleError(error, `Failed to delete file: ${path}`);
    }
  }

  /**
   * Check if a file exists in the repository
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await this.getFile(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file content as string
   */
  async getFileContent(path: string): Promise<string> {
    try {
      const file = await this.getFile(path);
      if (!file.content || !file.encoding) {
        throw new Error('File content is not available');
      }

      if (file.encoding === 'base64') {
        return Buffer.from(file.content, 'base64').toString('utf-8');
      }

      return file.content;
    } catch (error) {
      throw this.handleError(error, `Failed to get file content: ${path}`);
    }
  }

  /**
   * Create multiple files in a single commit
   */
  async createMultipleFiles(
    files: Array<{ path: string; content: string }>,
    message: string
  ): Promise<void> {
    try {
      console.log('GitHub createMultipleFiles - Starting:', {
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
        fileCount: files.length,
        files: files.map(f => f.path),
      });

      // Get the current commit SHA
      const { data: ref } = await this.octokit.rest.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${this.branch}`,
      });

      console.log('GitHub createMultipleFiles - Got ref:', ref.object.sha);

      // Get the commit tree
      const { data: commit } = await this.octokit.rest.git.getCommit({
        owner: this.owner,
        repo: this.repo,
        commit_sha: ref.object.sha,
      });

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async file => {
          const { data: blob } = await this.octokit.rest.git.createBlob({
            owner: this.owner,
            repo: this.repo,
            content: Buffer.from(file.content, 'utf-8').toString('base64'),
            encoding: 'base64',
          });
          return {
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha,
          };
        })
      );

      // Create a new tree
      const { data: tree } = await this.octokit.rest.git.createTree({
        owner: this.owner,
        repo: this.repo,
        base_tree: commit.tree.sha,
        tree: blobs,
      });

      // Create a new commit
      const { data: newCommit } = await this.octokit.rest.git.createCommit({
        owner: this.owner,
        repo: this.repo,
        message,
        tree: tree.sha,
        parents: [ref.object.sha],
      });

      // Update the reference
      await this.octokit.rest.git.updateRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${this.branch}`,
        sha: newCommit.sha,
      });

      console.log('GitHub createMultipleFiles - Success:', newCommit.sha);
    } catch (error) {
      console.error('GitHub createMultipleFiles - Error:', error);
      throw this.handleError(error, 'Failed to create multiple files');
    }
  }

  /**
   * Handle API errors and convert them to GitCMS errors
   */
  private handleError(error: any, message: string): GitCMSError {
    const gitcmsError: GitCMSError = new Error(message) as GitCMSError;
    gitcmsError.code = 'GITHUB_API_ERROR';

    if (error.status) {
      switch (error.status) {
        case 401:
          gitcmsError.code = 'UNAUTHORIZED';
          gitcmsError.message = 'GitHub authentication failed. Please check your access token.';
          break;
        case 403:
          gitcmsError.code = 'FORBIDDEN';
          gitcmsError.message =
            'Access forbidden. You may not have permission to access this repository.';
          break;
        case 404:
          gitcmsError.code = 'NOT_FOUND';
          gitcmsError.message = 'Repository or file not found.';
          break;
        case 422:
          gitcmsError.code = 'VALIDATION_ERROR';
          gitcmsError.message = 'Invalid request. Please check your parameters.';
          break;
        default:
          gitcmsError.message = `GitHub API error: ${error.message}`;
      }
    }

    gitcmsError.details = {
      originalError: error,
      status: error.status,
      response: error.response?.data,
    };

    return gitcmsError;
  }

  /**
   * Test the connection to GitHub and repository access
   */
  async testConnection(): Promise<{ user: User; repository: Repository }> {
    try {
      const [user, repository] = await Promise.all([this.getUser(), this.getRepository()]);

      return { user, repository };
    } catch (error) {
      throw this.handleError(error, 'Failed to test GitHub connection');
    }
  }
}
