/**
 * Public Schema Fetching API
 *
 * Fetches schemas from public GitHub repositories without authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import type { GitCMSSchema } from '@git-cms/core';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    return handleFetchPublicSchemas(owner, repo, branch);
  } catch (error) {
    console.error('Public schema API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Fetch schemas from a public repository
 */
async function handleFetchPublicSchemas(owner: string, repo: string, branch: string) {
  try {
    const schemasPath = '.gitcms/schemas';

    // First, check if the repository exists and is public
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitCMS-Admin',
      },
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return NextResponse.json({ error: 'Repository not found or not public' }, { status: 404 });
      }
      throw new Error(`GitHub API error: ${repoResponse.statusText}`);
    }

    const repoData = await repoResponse.json();

    // Check if repository is public
    if (repoData.private) {
      return NextResponse.json(
        { error: 'Repository is private. Only public repositories are supported.' },
        { status: 403 }
      );
    }

    // Try to get the contents of the schemas directory
    const contentsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${schemasPath}?ref=${branch}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'GitCMS-Admin',
        },
      }
    );

    if (!contentsResponse.ok) {
      if (contentsResponse.status === 404) {
        return NextResponse.json({
          schemas: [],
          total: 0,
          message: 'No .gitcms/schemas directory found in this repository',
        });
      }
      throw new Error(`GitHub API error: ${contentsResponse.statusText}`);
    }

    const contents = await contentsResponse.json();

    if (!Array.isArray(contents)) {
      return NextResponse.json({
        schemas: [],
        total: 0,
        message: '.gitcms/schemas is not a directory',
      });
    }

    // Filter for JSON files
    const schemaFiles = contents.filter(
      (item: any) => item.type === 'file' && item.name.endsWith('.json')
    );

    if (schemaFiles.length === 0) {
      return NextResponse.json({
        schemas: [],
        total: 0,
        message: 'No schema files (.json) found in .gitcms/schemas directory',
      });
    }

    // Fetch each schema file content
    const schemas: GitCMSSchema[] = [];
    const errors: string[] = [];

    for (const file of schemaFiles) {
      try {
        const fileResponse = await fetch(file.download_url, {
          headers: {
            'User-Agent': 'GitCMS-Admin',
          },
        });

        if (!fileResponse.ok) {
          errors.push(`Failed to fetch ${file.name}: ${fileResponse.statusText}`);
          continue;
        }

        const content = await fileResponse.text();
        const schema = JSON.parse(content);

        // Basic validation to ensure it's a GitCMS schema
        if (schema && typeof schema === 'object' && schema.id && schema.fields) {
          schemas.push(schema);
        } else {
          errors.push(`Invalid schema format in ${file.name}`);
        }
      } catch (error) {
        errors.push(
          `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      schemas,
      total: schemas.length,
      repository: {
        owner,
        repo,
        branch,
        url: repoData.html_url,
        description: repoData.description,
      },
      ...(errors.length > 0 && { warnings: errors }),
    });
  } catch (error) {
    console.error('Failed to fetch public schemas:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch schemas from repository',
        schemas: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}
