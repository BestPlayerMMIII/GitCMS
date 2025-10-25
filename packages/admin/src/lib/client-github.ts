/**
 * Client-Side GitHub API Client
 *
 * This class provides secure, client-side access to GitHub APIs without
 * exposing tokens or requiring backend bandwidth for file operations.
 *
 * Security model:
 * - Tokens are fetched on-demand from a secure endpoint
 * - Tokens are never stored in localStorage/sessionStorage
 * - Each request gets a fresh token (with internal caching for performance)
 * - All file uploads/downloads go directly to GitHub (no backend proxy)
 *
 * @example
 * ```ts
 * const github = new ClientGitHubApi('owner', 'repo');
 * const file = await github.getFile('path/to/file.json');
 * await github.uploadFile('path/to/image.png', base64Content, 'Add image');
 * ```
 */

import { Octokit } from '@octokit/rest';
import type { GitHubFileContent, GitHubCommitResponse, Repository, User } from '@git-cms/core';

// ============================================================================
// Global Token Cache (shared across all instances)
// ============================================================================

interface TokenCache {
  token: string;
  expiresAt: number;
}

// Single global cache shared by all ClientGitHubApi instances
let globalTokenCache: TokenCache | null = null;
// GitHub OAuth tokens don't expire automatically, so we can cache longer
// We'll refresh every 30 minutes to detect revocations faster
const TOKEN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get the GitHub access token from the secure endpoint
 * Uses global caching to minimize server requests across ALL instances
 */
async function getGlobalAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (globalTokenCache && globalTokenCache.expiresAt > Date.now()) {
    return globalTokenCache.token;
  }

  // Fetch fresh token from secure endpoint
  const response = await fetch('/api/auth/token', {
    method: 'GET',
    credentials: 'include', // Include session cookies
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Not authenticated. Please sign in.');
    }
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.accessToken) {
    throw new Error('No access token in response');
  }

  // Cache the token globally
  globalTokenCache = {
    token: data.accessToken,
    expiresAt: Date.now() + TOKEN_CACHE_TTL,
  };

  return data.accessToken;
}

/**
 * Clear the global token cache (useful after auth changes)
 */
export function clearGlobalTokenCache(): void {
  globalTokenCache = null;
}

// ============================================================================
// Client GitHub API Class
// ============================================================================

export class ClientGitHubApi {
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(owner: string, repo: string, branch: string = 'main') {
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  /**
   * Get the GitHub access token (uses global cache)
   */
  async getAccessToken(): Promise<string> {
    return getGlobalAccessToken();
  }

  /**
   * Get an authenticated Octokit instance
   */
  private async getOctokit(): Promise<Octokit> {
    const token = await this.getAccessToken();
    return new Octokit({ auth: token });
  }

  /**
   * Clear the token cache (useful after auth changes)
   * @deprecated Use clearGlobalTokenCache() instead
   */
  public clearTokenCache(): void {
    clearGlobalTokenCache();
  }

  // ============================================================================
  // User & Repository Methods
  // ============================================================================

  /**
   * Get authenticated user information
   */
  async getUser(): Promise<User> {
    const octokit = await this.getOctokit();
    const { data } = await octokit.rest.users.getAuthenticated();

    return {
      id: data.id,
      login: data.login,
      name: data.name || undefined,
      email: data.email || undefined,
      avatar_url: data.avatar_url,
    };
  }

  /**
   * Get list of user's repositories
   */
  async getRepositories(): Promise<Repository[]> {
    const octokit = await this.getOctokit();
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
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
  }

  /**
   * Get repository information
   */
  async getRepository(): Promise<Repository> {
    const octokit = await this.getOctokit();
    const { data } = await octokit.rest.repos.get({
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
  }

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Get file content from repository
   */
  async getFile(path: string): Promise<GitHubFileContent> {
    const octokit = await this.getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref: this.branch,
    });

    if (Array.isArray(data)) {
      throw new Error('Path is a directory, not a file');
    }

    return data as GitHubFileContent;
  }

  /**
   * Get directory contents from repository
   */
  async getDirectory(path: string = ''): Promise<GitHubFileContent[]> {
    const octokit = await this.getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref: this.branch,
    });

    if (!Array.isArray(data)) {
      throw new Error('Path is a file, not a directory');
    }

    return data as GitHubFileContent[];
  }

  /**
   * Get file content as string
   */
  async getFileContent(path: string): Promise<string> {
    const file = await this.getFile(path);

    if (!file.content || !file.encoding) {
      throw new Error('File content is not available');
    }

    if (file.encoding === 'base64') {
      return Buffer.from(file.content, 'base64').toString('utf-8');
    }

    return file.content;
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
   * Create or update a file in the repository
   */
  async updateFile(
    path: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<GitHubCommitResponse> {
    const octokit = await this.getOctokit();
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      sha,
      branch: this.branch,
    });

    return data.commit;
  }

  /**
   * Upload a binary file (already base64 encoded) to the repository
   * For files > 1MB, uses Git Data API to bypass size limits
   */
  async uploadBinaryFile(
    path: string,
    base64Content: string,
    message: string,
    sha?: string
  ): Promise<GitHubCommitResponse> {
    const fileSizeBytes = (base64Content.length * 3) / 4;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);

    // For files larger than 1MB, use Git Data API
    if (fileSizeMB > 1) {
      console.log(`Large file detected (${fileSizeMB.toFixed(1)}MB). Using Git Data API...`);
      return await this.uploadLargeFile(path, base64Content, message);
    }

    // For small files, use the simple API
    const octokit = await this.getOctokit();
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: base64Content,
      sha,
      branch: this.branch,
    });

    return data.commit;
  }

  /**
   * Upload a large file using Git Data API (for files > 1MB)
   * This bypasses the 1MB limit of createOrUpdateFileContents
   */
  private async uploadLargeFile(
    path: string,
    base64Content: string,
    message: string
  ): Promise<GitHubCommitResponse> {
    const octokit = await this.getOctokit();
    const token = await this.getAccessToken();
    const fileSizeMB = (base64Content.length * 0.75) / (1024 * 1024);

    console.log(`Uploading large file: ${path} (${fileSizeMB.toFixed(1)}MB)`);

    // Step 1: Get the current branch reference
    const { data: refData } = await octokit.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.branch}`,
    });
    const currentCommitSha = refData.object.sha;

    // Step 2: Get the current commit
    const { data: commitData } = await octokit.rest.git.getCommit({
      owner: this.owner,
      repo: this.repo,
      commit_sha: currentCommitSha,
    });
    const currentTreeSha = commitData.tree.sha;

    // Step 3: Create a blob with the file content
    let blobData;
    if (fileSizeMB > 10) {
      // For very large files, use direct fetch with no timeout
      const response = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/blobs`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            content: base64Content,
            encoding: 'base64',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error (${response.status}): ${JSON.stringify(errorData)}`);
      }

      blobData = await response.json();
    } else {
      const createBlobResponse = await octokit.rest.git.createBlob({
        owner: this.owner,
        repo: this.repo,
        content: base64Content,
        encoding: 'base64',
      });
      blobData = createBlobResponse.data;
    }

    // Step 4: Create a new tree with the file
    const { data: newTreeData } = await octokit.rest.git.createTree({
      owner: this.owner,
      repo: this.repo,
      base_tree: currentTreeSha,
      tree: [
        {
          path: path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        },
      ],
    });

    // Step 5: Create a new commit
    const { data: newCommitData } = await octokit.rest.git.createCommit({
      owner: this.owner,
      repo: this.repo,
      message: message,
      tree: newTreeData.sha,
      parents: [currentCommitSha],
    });

    // Step 6: Update the branch reference
    await octokit.rest.git.updateRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.branch}`,
      sha: newCommitData.sha,
    });

    return {
      sha: newCommitData.sha,
      url: newCommitData.url,
      author: newCommitData.author,
      committer: newCommitData.committer,
      message: newCommitData.message,
    };
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(path: string, message: string, sha: string): Promise<GitHubCommitResponse> {
    const octokit = await this.getOctokit();
    const { data } = await octokit.rest.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      sha,
      branch: this.branch,
    });

    return data.commit;
  }

  /**
   * Create multiple files in a single commit
   * This is atomic - either all files are created or none
   */
  async createMultipleFiles(
    files: Array<{ path: string; content: string }>,
    message: string
  ): Promise<void> {
    const octokit = await this.getOctokit();

    // Get the current commit SHA
    const { data: ref } = await octokit.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.branch}`,
    });

    // Get the commit tree
    const { data: commit } = await octokit.rest.git.getCommit({
      owner: this.owner,
      repo: this.repo,
      commit_sha: ref.object.sha,
    });

    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async file => {
        const { data: blob } = await octokit.rest.git.createBlob({
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
    const { data: tree } = await octokit.rest.git.createTree({
      owner: this.owner,
      repo: this.repo,
      base_tree: commit.tree.sha,
      tree: blobs,
    });

    // Create a new commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: this.owner,
      repo: this.repo,
      message,
      tree: tree.sha,
      parents: [ref.object.sha],
    });

    // Update the reference
    await octokit.rest.git.updateRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${this.branch}`,
      sha: newCommit.sha,
    });
  }

  /**
   * Test connection to GitHub and repository access
   */
  async testConnection(): Promise<{ user: User; repository: Repository }> {
    const [user, repository] = await Promise.all([this.getUser(), this.getRepository()]);

    return { user, repository };
  }

  // ============================================================================
  // Git LFS Support
  // ============================================================================

  /**
   * Upload a file using Git LFS
   * Note: LFS operations from browser have limitations due to CORS
   */
  async uploadWithLFS(
    path: string,
    fileBuffer: Buffer,
    message: string
  ): Promise<GitHubCommitResponse> {
    const octokit = await this.getOctokit();
    const token = await this.getAccessToken();
    const fileSizeMB = fileBuffer.length / (1024 * 1024);

    console.log(`Uploading with Git LFS: ${path} (${fileSizeMB.toFixed(1)}MB)`);

    // Calculate SHA256 hash
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileSize = fileBuffer.length;

    // Request upload URL from GitHub LFS API
    const lfsServerUrl = `https://github.com/${this.owner}/${this.repo}.git/info/lfs`;

    const batchResponse = await fetch(`${lfsServerUrl}/objects/batch`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.git-lfs+json',
        'Content-Type': 'application/vnd.git-lfs+json',
        Authorization: `token ${token}`,
      },
      body: JSON.stringify({
        operation: 'upload',
        transfers: ['basic'],
        ref: { name: `refs/heads/${this.branch}` },
        objects: [{ oid: hash, size: fileSize }],
      }),
    });

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      throw new Error(`LFS Batch API request failed: ${errorText}`);
    }

    const batchData = await batchResponse.json();
    const lfsObject = batchData.objects[0];

    // Upload file content to LFS storage
    if (lfsObject.actions?.upload) {
      const uploadResponse = await fetch(lfsObject.actions.upload.href, {
        method: 'PUT',
        headers: lfsObject.actions.upload.header || {},
        body: new Uint8Array(fileBuffer),
      });

      if (!uploadResponse.ok) {
        throw new Error('LFS content upload failed');
      }
    }

    // Create LFS pointer file
    const lfsPointer = [
      'version https://git-lfs.github.com/spec/v1',
      `oid sha256:${hash}`,
      `size ${fileSize}`,
      '',
    ].join('\n');

    const pointerBase64 = Buffer.from(lfsPointer, 'utf-8').toString('base64');

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: pointerBase64,
      branch: this.branch,
    });

    return data.commit;
  }
}

/**
 * Factory function to create ClientGitHubApi instances
 * Use this instead of direct instantiation for better typing
 */
export function createGitHubClient(owner: string, repo: string, branch?: string): ClientGitHubApi {
  return new ClientGitHubApi(owner, repo, branch);
}
