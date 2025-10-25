import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GitHubApiClient, GitLFSManager } from '@git-cms/core';

// GET /api/lfs/status - Get LFS status for repository
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

    // Create GitHub client and LFS manager
    const githubClient = new GitHubApiClient(session.accessToken, owner, repo);
    const lfsManager = new GitLFSManager(githubClient, owner, repo);

    // Analyze LFS requirements
    const status = await lfsManager.analyzeLFSRequirements();

    // Calculate additional stats
    const stats = {
      totalRules: status.rules.length,
      trackedExtensions: status.rules.map(rule => rule.pattern.replace('*.', '')),
      estimatedSavings: 0, // Would need to calculate based on tracked files
      recentFiles: [], // Would need to get from recent uploads
    };

    return NextResponse.json({
      success: true,
      status,
      stats,
      suggestedFiles: status.suggestedFiles,
    });
  } catch (error) {
    console.error('Error getting LFS status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get LFS status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/lfs/status - Initialize LFS in repository
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, customRules } = body;

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    // Create GitHub client and LFS manager
    const githubClient = new GitHubApiClient(session.accessToken, owner, repo);
    const lfsManager = new GitLFSManager(githubClient, owner, repo);

    // Initialize LFS
    await lfsManager.initializeLFS(customRules);

    // Get updated status
    const status = await lfsManager.analyzeLFSRequirements();

    return NextResponse.json({
      success: true,
      message: 'LFS initialized successfully',
      status,
    });
  } catch (error) {
    console.error('Error initializing LFS:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize LFS',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
