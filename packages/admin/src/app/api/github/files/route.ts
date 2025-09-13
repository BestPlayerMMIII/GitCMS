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
    const path = searchParams.get('path') || '';

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    const client = new GitHubApiClient(session.accessToken, owner, repo);

    try {
      // Try to get as directory first
      const contents = await client.getDirectory(path);
      return NextResponse.json({
        type: 'directory',
        path,
        contents,
      });
    } catch (error) {
      try {
        // If that fails, try to get as file
        const fileContent = await client.getFile(path);
        const content = await client.getFileContent(path);

        return NextResponse.json({
          type: 'file',
          path,
          file: fileContent,
          content: content,
        });
      } catch (fileError) {
        return NextResponse.json({ error: 'Path not found' }, { status: 404 });
      }
    }
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json({ error: 'Failed to fetch file/directory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, path, content, message, sha } = body;

    if (!owner || !repo || !path || !content || !message) {
      return NextResponse.json(
        { error: 'Owner, repo, path, content, and message are required' },
        { status: 400 }
      );
    }

    const client = new GitHubApiClient(session.accessToken, owner, repo);

    const result = await client.updateFile(path, content, message, sha);

    return NextResponse.json({
      success: true,
      commit: result,
      message: 'File updated successfully',
    });
  } catch (error) {
    console.error('Failed to update file:', error);
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const path = searchParams.get('path');
    const sha = searchParams.get('sha');
    const message = searchParams.get('message') || `Delete ${path}`;

    if (!owner || !repo || !path || !sha) {
      return NextResponse.json(
        { error: 'Owner, repo, path, and sha parameters are required' },
        { status: 400 }
      );
    }

    const client = new GitHubApiClient(session.accessToken, owner, repo);

    const result = await client.deleteFile(path, message, sha);

    return NextResponse.json({
      success: true,
      commit: result,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
