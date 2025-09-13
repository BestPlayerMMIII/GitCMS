import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GitHubApiClient } from '@gitcms/core';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    const client = new GitHubApiClient(session.accessToken, owner, repo);

    // Check if .gitcms/config.json exists
    const configExists = await client.fileExists('.gitcms/config.json');

    let config = null;
    let contentStructure = null;

    if (configExists) {
      try {
        const configContent = await client.getFileContent('.gitcms/config.json');
        config = JSON.parse(configContent);
      } catch (error) {
        console.error('Failed to parse GitCMS config:', error);
      }
    }

    // Check for common content directories
    const commonPaths = ['content', 'posts', 'blog', 'data', 'src/content'];
    const detectedPaths = [];

    for (const path of commonPaths) {
      try {
        const dirExists = await client.getDirectory(path);
        if (dirExists && dirExists.length > 0) {
          detectedPaths.push({
            path,
            files: dirExists.filter(item => item.type === 'file').length,
            dirs: dirExists.filter(item => item.type === 'dir').length,
          });
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    contentStructure = {
      detectedPaths,
      suggestedSetup: detectedPaths.length > 0 ? detectedPaths[0].path : 'content',
    };

    return NextResponse.json({
      hasGitCMS: configExists,
      config,
      contentStructure,
      repository: {
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
      },
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json(
      { error: 'Failed to check repository configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, config } = body;

    if (!owner || !repo || !config) {
      return NextResponse.json({ error: 'Owner, repo, and config are required' }, { status: 400 });
    }

    const client = new GitHubApiClient(session.accessToken, owner, repo);

    // Create default GitCMS configuration
    const defaultConfig = {
      version: '1.0.0',
      contentPath: config.contentPath || 'content',
      mediaPath: config.mediaPath || 'public/media',
      collections: config.collections || [],
      schemas: config.schemas || {},
      createdAt: new Date().toISOString(),
      ...config,
    };

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
- \`schemas/\`: Content type schemas  
- \`collections/\`: Collection definitions

## Content Structure

- Content Path: \`${defaultConfig.contentPath}\`
- Media Path: \`${defaultConfig.mediaPath}\`

Generated on ${new Date().toLocaleDateString()}
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

    await client.createMultipleFiles(files, 'Initialize GitCMS configuration');

    return NextResponse.json({
      success: true,
      config: defaultConfig,
      message: 'GitCMS configuration initialized successfully',
    });
  } catch (error) {
    console.error('Failed to initialize GitCMS:', error);
    return NextResponse.json(
      { error: 'Failed to initialize GitCMS configuration' },
      { status: 500 }
    );
  }
}
