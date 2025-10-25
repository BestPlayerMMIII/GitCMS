import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GitHubApiClient, GitLFSManager } from '@git-cms/core';

// POST /api/lfs/initialize - Initialize LFS in repository
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
