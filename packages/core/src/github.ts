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
  private accessToken: string;
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(token: string, owner: string, repo: string, branch: string = 'main') {
    this.octokit = new Octokit({
      auth: token,
    });
    this.accessToken = token;
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
   * Upload a binary file (already base64 encoded) to the repository
   * Automatically uses Git LFS for files > 1MB (recommended approach)
   * Falls back to Git Data API if LFS is not available
   */
  async uploadBinaryFile(
    path: string,
    base64Content: string,
    message: string,
    sha?: string
  ): Promise<GitHubCommitResponse> {
    try {
      // Calculate file size from base64 content
      const fileSizeBytes = (base64Content.length * 3) / 4;
      const fileSizeMB = fileSizeBytes / (1024 * 1024);

      // For files larger than 1MB, try Git LFS first
      if (fileSizeMB > 1) {
        console.log(
          `Large file detected (${fileSizeMB.toFixed(1)}MB). Attempting Git LFS upload...`
        );

        try {
          // Convert base64 to Buffer for LFS upload
          const fileBuffer = Buffer.from(base64Content, 'base64');
          return await this.uploadWithLFS(path, fileBuffer, message);
        } catch (lfsError: any) {
          // LFS failed, log the reason and fall back to Git Data API
          console.warn(`LFS upload failed: ${lfsError.message}. Falling back to Git Data API...`);

          // Fall back to Git Data API for large files
          console.log(`Using Git Data API for large file: ${path} (${fileSizeMB.toFixed(1)}MB)`);
          return await this.uploadLargeFile(path, base64Content, message);
        }
      }

      // For small files (≤1MB), use the simple API
      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: base64Content,
        sha,
        branch: this.branch,
      });

      return data.commit;
    } catch (error) {
      throw this.handleError(error, `Failed to upload binary file: ${path}`);
    }
  }

  /**
   * Upload a large file using Git Data API (for files > 1MB)
   * This bypasses the 1MB limit of createOrUpdateFileContents
   * For files > 10MB, uses a timeout-resistant approach
   */
  private async uploadLargeFile(
    path: string,
    base64Content: string,
    message: string
  ): Promise<GitHubCommitResponse> {
    try {
      const fileSizeMB = (base64Content.length * 0.75) / (1024 * 1024); // Convert base64 to actual size
      console.log(`Starting Git Data API upload for ${path} (${fileSizeMB.toFixed(1)}MB)`);

      // Step 1: Get the current branch reference
      console.log('Step 1/6: Getting branch reference...');
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${this.branch}`,
      });
      const currentCommitSha = refData.object.sha;

      // Step 2: Get the current commit
      console.log('Step 2/6: Getting current commit...');
      const { data: commitData } = await this.octokit.rest.git.getCommit({
        owner: this.owner,
        repo: this.repo,
        commit_sha: currentCommitSha,
      });
      const currentTreeSha = commitData.tree.sha;

      // Step 3: Create a blob with the file content (this is the slow part for large files)
      console.log(
        `Step 3/6: Creating blob (this may take a while for ${fileSizeMB.toFixed(1)}MB)...`
      );
      let blobData;
      try {
        // For very large files, use a custom fetch with longer timeout
        if (fileSizeMB > 10) {
          console.log('Using direct API call with extended timeout for large file...');
          const response = await fetch(
            `https://api.github.com/repos/${this.owner}/${this.repo}/git/blobs`,
            {
              method: 'POST',
              headers: {
                Authorization: `token ${this.accessToken}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
              body: JSON.stringify({
                content: base64Content,
                encoding: 'base64',
              }),
              // No timeout - let it take as long as needed
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`GitHub API error (${response.status}): ${JSON.stringify(errorData)}`);
          }

          blobData = await response.json();
          console.log(`Blob created successfully: ${blobData.sha}`);
        } else {
          // For smaller large files (1-10MB), use regular Octokit
          const createBlobResponse = await this.octokit.rest.git.createBlob({
            owner: this.owner,
            repo: this.repo,
            content: base64Content,
            encoding: 'base64',
          });
          blobData = createBlobResponse.data;
          console.log(`Blob created successfully: ${blobData.sha}`);
        }
      } catch (blobError: any) {
        // Enhanced error handling for blob creation
        console.error('Blob creation failed:', {
          status: blobError.status,
          message: blobError.message,
          response: blobError.response?.data,
        });

        // Check if it's a permission issue
        if (blobError.status === 401 || blobError.status === 403) {
          throw new Error(
            `GitHub API permission error: The access token does not have sufficient permissions to upload files using Git Data API. ` +
              `Please ensure your GitHub App or OAuth token has 'Contents: Read and write' permission enabled. ` +
              `Status: ${blobError.status}, Details: ${blobError.message}`
          );
        }

        // Check if it's likely a timeout
        if (
          blobError.message?.includes('timeout') ||
          blobError.code === 'ETIMEDOUT' ||
          blobError.code === 'ECONNRESET'
        ) {
          throw new Error(
            `Upload timeout: The file is too large to upload in a single request (${fileSizeMB.toFixed(1)}MB). ` +
              `For files larger than 10MB, please enable Git LFS in your repository for better performance.`
          );
        }

        throw blobError;
      }

      // Step 4: Create a new tree with the file
      console.log('Step 4/6: Creating tree...');
      const { data: newTreeData } = await this.octokit.rest.git.createTree({
        owner: this.owner,
        repo: this.repo,
        base_tree: currentTreeSha,
        tree: [
          {
            path: path,
            mode: '100644', // Regular file
            type: 'blob',
            sha: blobData.sha,
          },
        ],
      });

      // Step 5: Create a new commit
      console.log('Step 5/6: Creating commit...');
      const { data: newCommitData } = await this.octokit.rest.git.createCommit({
        owner: this.owner,
        repo: this.repo,
        message: message,
        tree: newTreeData.sha,
        parents: [currentCommitSha],
      });

      // Step 6: Update the branch reference
      console.log('Step 6/6: Updating branch reference...');
      await this.octokit.rest.git.updateRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${this.branch}`,
        sha: newCommitData.sha,
      });

      console.log(`Upload complete! Commit SHA: ${newCommitData.sha}`);

      return {
        sha: newCommitData.sha,
        url: newCommitData.url,
        author: newCommitData.author,
        committer: newCommitData.committer,
        message: newCommitData.message,
      };
    } catch (error) {
      throw this.handleError(error, `Failed to upload large file using Git Data API: ${path}`);
    }
  }

  /**
   * Upload a file using Git LFS
   * Implements the complete LFS protocol: upload to LFS storage, then create pointer
   * This is the recommended approach for files > 1MB
   */
  async uploadWithLFS(
    path: string,
    fileBuffer: Buffer,
    message: string
  ): Promise<GitHubCommitResponse> {
    try {
      const fileSizeMB = fileBuffer.length / (1024 * 1024);
      console.log(`Uploading with Git LFS: ${path} (${fileSizeMB.toFixed(1)}MB)`);

      // Step 1: Calculate SHA256 hash of the file (required for LFS)
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const fileSize = fileBuffer.length;

      console.log(`File hash (SHA256): ${hash}`);
      console.log(`File size: ${fileSize} bytes`);

      // Step 2: Request upload URL from GitHub LFS API (Batch API)
      const lfsServerUrl = `https://github.com/${this.owner}/${this.repo}.git/info/lfs`;
      console.log(`Requesting LFS upload URL from: ${lfsServerUrl}`);

      const batchRequest = {
        operation: 'upload',
        transfers: ['basic'],
        ref: { name: `refs/heads/${this.branch}` },
        objects: [
          {
            oid: hash,
            size: fileSize,
          },
        ],
      };

      const batchResponse = await fetch(`${lfsServerUrl}/objects/batch`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.git-lfs+json',
          'Content-Type': 'application/vnd.git-lfs+json',
          Authorization: `token ${this.accessToken}`,
        },
        body: JSON.stringify(batchRequest),
      });

      if (!batchResponse.ok) {
        const errorText = await batchResponse.text();
        throw new Error(
          `LFS Batch API request failed (${batchResponse.status}): ${errorText}. ` +
            `This might mean Git LFS is not enabled on this repository. ` +
            `Please enable LFS by running 'git lfs install' and configuring .gitattributes.`
        );
      }

      const batchData = await batchResponse.json();
      console.log(`LFS batch response:`, JSON.stringify(batchData, null, 2));

      if (!batchData.objects || batchData.objects.length === 0) {
        throw new Error('LFS batch response did not include upload information');
      }

      const lfsObject = batchData.objects[0];

      // Step 3: Upload the actual file content to LFS storage
      if (lfsObject.actions && lfsObject.actions.upload) {
        const uploadAction = lfsObject.actions.upload;
        console.log(`Uploading file content to LFS storage: ${uploadAction.href}`);

        const uploadResponse = await fetch(uploadAction.href, {
          method: 'PUT',
          headers: uploadAction.header || {},
          body: new Uint8Array(fileBuffer),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`LFS content upload failed (${uploadResponse.status}): ${errorText}`);
        }

        console.log('File content uploaded to LFS storage successfully');

        // Step 4: Verify the upload (if verify action is provided)
        if (lfsObject.actions.verify) {
          const verifyAction = lfsObject.actions.verify;
          console.log(`Verifying LFS upload: ${verifyAction.href}`);

          const verifyResponse = await fetch(verifyAction.href, {
            method: 'POST',
            headers: {
              Accept: 'application/vnd.git-lfs+json',
              'Content-Type': 'application/vnd.git-lfs+json',
              ...(verifyAction.header || {}),
            },
            body: JSON.stringify({
              oid: hash,
              size: fileSize,
            }),
          });

          if (!verifyResponse.ok) {
            console.warn(`LFS verify failed (${verifyResponse.status}), but continuing...`);
          } else {
            console.log('LFS upload verified successfully');
          }
        }
      } else {
        // Object already exists in LFS storage
        console.log('File already exists in LFS storage, skipping upload');
      }

      // Step 5: Create LFS pointer file in the repository
      const lfsPointer = [
        'version https://git-lfs.github.com/spec/v1',
        `oid sha256:${hash}`,
        `size ${fileSize}`,
        '', // Empty line at the end
      ].join('\n');

      console.log(`Creating LFS pointer file in repository: ${path}`);

      // Upload the LFS pointer file (not the actual content)
      const pointerBase64 = Buffer.from(lfsPointer, 'utf-8').toString('base64');

      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: pointerBase64,
        branch: this.branch,
      });

      console.log(`LFS upload complete! File stored in LFS, pointer committed to repository`);

      return data.commit;
    } catch (error) {
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          throw new Error(
            `Git LFS is not enabled on this repository. ` +
              `Please enable LFS first by running 'git lfs install' in your repository.`
          );
        }
      }
      throw this.handleError(error, `Failed to upload file with LFS: ${path}`);
    }
  }

  /**
   * Parse Git LFS pointer file content to extract metadata
   * LFS pointer format:
   * version https://git-lfs.github.com/spec/v1
   * oid sha256:abc123...
   * size 12345678
   */
  static parseLFSPointer(content: string): { isLFS: boolean; size?: number; oid?: string } {
    const lines = content.trim().split('\n');

    // Check if this is an LFS pointer file
    if (!lines[0] || !lines[0].includes('git-lfs.github.com/spec')) {
      return { isLFS: false };
    }

    let size: number | undefined;
    let oid: string | undefined;

    for (const line of lines) {
      if (line.startsWith('size ')) {
        size = parseInt(line.substring(5).trim(), 10);
      } else if (line.startsWith('oid sha256:')) {
        oid = line.substring(11).trim();
      }
    }

    return {
      isLFS: true,
      size,
      oid,
    };
  }

  /**
   * Get file content and check if it's an LFS pointer
   * Returns the actual file size for LFS files
   */
  async getFileWithLFSInfo(path: string): Promise<GitHubFileContent & { lfsSize?: number }> {
    try {
      const fileData = await this.getFile(path);

      // If file has content, check if it's an LFS pointer
      if (fileData.content) {
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const lfsInfo = GitHubApiClient.parseLFSPointer(decodedContent);

        if (lfsInfo.isLFS && lfsInfo.size) {
          return {
            ...fileData,
            lfsSize: lfsInfo.size,
          };
        }
      }

      return fileData;
    } catch (error) {
      throw this.handleError(error, `Failed to get file with LFS info: ${path}`);
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
