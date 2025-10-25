import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GitHubApiClient, GitLFSManager } from '@git-cms/core';

// POST /api/lfs/patterns - Add LFS pattern
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, pattern, description } = body;

    if (!owner || !repo || !pattern) {
      return NextResponse.json({ error: 'Owner, repo, and pattern are required' }, { status: 400 });
    }

    // Create GitHub client and LFS manager
    const githubClient = new GitHubApiClient(session.accessToken, owner, repo);
    const lfsManager = new GitLFSManager(githubClient, owner, repo);

    // Add LFS pattern
    await lfsManager.addLFSPattern(pattern, description);

    return NextResponse.json({
      success: true,
      message: `LFS pattern ${pattern} added successfully`,
    });
  } catch (error) {
    console.error('Error adding LFS pattern:', error);
    return NextResponse.json(
      {
        error: 'Failed to add LFS pattern',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/lfs/patterns - Remove LFS pattern
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, pattern } = body;

    if (!owner || !repo || !pattern) {
      return NextResponse.json({ error: 'Owner, repo, and pattern are required' }, { status: 400 });
    }

    // Create GitHub client and LFS manager
    const githubClient = new GitHubApiClient(session.accessToken, owner, repo);
    const lfsManager = new GitLFSManager(githubClient, owner, repo);

    // Remove LFS pattern
    await lfsManager.removeLFSPattern(pattern);

    return NextResponse.json({
      success: true,
      message: `LFS pattern ${pattern} removed successfully`,
    });
  } catch (error) {
    console.error('Error removing LFS pattern:', error);
    return NextResponse.json(
      {
        error: 'Failed to remove LFS pattern',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
