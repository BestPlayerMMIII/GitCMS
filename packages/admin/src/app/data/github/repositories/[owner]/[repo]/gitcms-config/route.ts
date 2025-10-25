import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GitHubApiClient } from '@git-cms/core';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { owner, repo } = await params;
    const github = new GitHubApiClient(session.accessToken, owner, repo);

    // Check for GitCMS configuration file
    try {
      const configFile = await github.getFile('.gitcms/config.json');
      if (configFile && configFile.content) {
        const configContent = JSON.parse(Buffer.from(configFile.content, 'base64').toString());
        return NextResponse.json(configContent);
      }
    } catch (error) {
      // Config file doesn't exist or can't be read
    }

    // Check for alternative config locations
    try {
      const packageJson = await github.getFile('package.json');
      if (packageJson && packageJson.content) {
        const packageContent = JSON.parse(Buffer.from(packageJson.content, 'base64').toString());
        if (packageContent.gitcms) {
          return NextResponse.json(packageContent.gitcms);
        }
      }
    } catch (error) {
      // package.json doesn't exist or doesn't have gitcms config
    }

    // No GitCMS configuration found
    return NextResponse.json({ error: 'GitCMS configuration not found' }, { status: 404 });
  } catch (error) {
    console.error('Error checking GitCMS config:', error);
    return NextResponse.json({ error: 'Failed to check GitCMS configuration' }, { status: 500 });
  }
}
