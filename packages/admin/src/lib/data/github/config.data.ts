import { createGitHubClient } from '@/lib/client-github';
import {
  GitHubApiClient,
  defaultSchemas,
  createGitCMSConfig,
  DEFAULT_GITCMS_CONFIG,
} from '@git-cms/core';

/**
 * Get GitHub repository config (client-callable)
 */
export async function githubConfigGET(
  owner: string,
  repo: string,
  params: {
    path?: string;
    branch?: string;
  }
) {
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();
  const client = new GitHubApiClient(token, owner, repo);

  // If path is specified, return just that file
  if (params.path) {
    const fileExists = await client.fileExists(params.path);
    if (!fileExists) {
      throw new Error('File not found');
    }

    const content = await client.getFileContent(params.path);
    return {
      path: params.path,
      content,
      exists: true,
    };
  }

  // Original logic for repository setup check
  const configExists = await client.fileExists('.gitcms/config.json');

  let config = null;

  if (configExists) {
    try {
      const configContent = await client.getFileContent('.gitcms/config.json');
      config = JSON.parse(configContent);
    } catch (error) {
      console.error('Failed to parse GitCMS config:', error);
    }
  }

  const contentStructure = {
    detectedPaths: [],
    suggestedSetup: {
      contentPath: config?.contentPath || DEFAULT_GITCMS_CONFIG.contentPath,
      mediaPath: config?.mediaPath || DEFAULT_GITCMS_CONFIG.mediaPath,
    },
  };

  const repository = {
    owner,
    name: repo,
    fullName: `${owner}/${repo}`,
  };

  return {
    hasGitCMS: configExists,
    config,
    contentStructure,
    repository,
  };
}

/**
 * Create or update GitHub repository config (client-callable)
 */
export async function githubConfigPOST(
  owner: string,
  repo: string,
  body: {
    path?: string;
    content?: string;
    message?: string;
    config?: any;
  }
) {
  const github = createGitHubClient(owner, repo) as any as GitHubApiClient;
  const token = await (github as any).getAccessToken();
  const client = new GitHubApiClient(token, owner, repo);

  // If path and content are specified, create/update individual file
  if (body.path && body.content !== undefined) {
    const commitMessage = body.message || `Update ${body.path}`;

    let existingSha: string | undefined;
    try {
      const existing = await client.getFile(body.path);
      existingSha = existing.sha;
    } catch (error) {
      // File doesn't exist, that's fine for creation
    }

    const result = await client.updateFile(body.path, body.content, commitMessage, existingSha);

    return {
      success: true,
      path: body.path,
      message: existingSha ? 'File updated successfully' : 'File created successfully',
      commit: result,
    };
  }

  // Original logic for repository setup
  if (!body.config) {
    throw new Error('Config is required for setup');
  }

  const defaultConfig = createGitCMSConfig(body.config);

  const files = [
    {
      path: '.gitcms/config.json',
      content: JSON.stringify(defaultConfig, null, 2),
    },
    {
      path: '.gitcms/README.md',
      content: `# GitCMS Configuration

This directory contains the GitCMS configuration for this repository.

## Files

- \`config.json\`: Main configuration file
- \`schemas/\`: Content type schemas${body.config.includeDefaultSchemas ? ` (${Object.keys(defaultSchemas).length} default schemas included)` : ''}
- \`collections/\`: Collection definitions

## Content Structure

- Content Path: \`${defaultConfig.contentPath}\`
- Media Path: \`${defaultConfig.mediaPath}\`

${
  body.config.includeDefaultSchemas
    ? `

## Default Schemas

The following schemas have been created for you:

${Object.entries(defaultSchemas)
  .map(
    ([id, schema]) =>
      `- **${schema.metadata?.name || id}** (\`${id}\`): ${schema.metadata?.description || 'No description'}`
  )
  .join('\n')}

You can edit these schemas or create new ones through the GitCMS admin interface.`
    : ''
}

Generated on ${new Date().toLocaleDateString()} by GitCMS
`,
    },
  ];

  // Create content directory if it doesn't exist
  if (defaultConfig.contentPath) {
    files.push({
      path: `${defaultConfig.contentPath}/.gitkeep`,
      content: '# This file ensures the content directory is tracked by Git\n',
    });
  }

  // Create media directory if it doesn't exist
  if (defaultConfig.mediaPath) {
    files.push({
      path: `${defaultConfig.mediaPath}/.gitkeep`,
      content: '# This file ensures the media directory is tracked by Git\n',
    });
  }

  // Create schemas directory
  files.push({
    path: '.gitcms/schemas/.gitkeep',
    content:
      '# GitCMS Schemas Directory\n\nThis directory contains content type schema definitions.\n',
  });

  // Create collections directory
  files.push({
    path: '.gitcms/collections/.gitkeep',
    content:
      '# GitCMS Collections Directory\n\nThis directory contains content type collection definitions.\n',
  });

  // Create default schemas if requested
  if (body.config.includeDefaultSchemas) {
    for (const [schemaId, schema] of Object.entries(defaultSchemas)) {
      files.push({
        path: `.gitcms/schemas/${schemaId}.json`,
        content: JSON.stringify(schema, null, 2),
      });
    }
  }

  await client.createMultipleFiles(
    files,
    body.config.includeDefaultSchemas
      ? 'Initialize GitCMS configuration with default schemas'
      : 'Initialize GitCMS configuration'
  );

  return {
    success: true,
    config: defaultConfig,
    message: body.config.includeDefaultSchemas
      ? `GitCMS configuration initialized successfully with ${Object.keys(defaultSchemas).length} default schemas`
      : 'GitCMS configuration initialized successfully',
    schemas: body.config.includeDefaultSchemas ? Object.keys(defaultSchemas) : [],
    files: files.map(f => f.path),
  };
}
