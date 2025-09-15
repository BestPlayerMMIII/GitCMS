import { NextRequest, NextResponse } from 'next/server';

// GET /api/github/pages - Check GitHub Pages status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    // Check if GitHub Pages is enabled
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 404) {
      return NextResponse.json({
        enabled: false,
        message: 'GitHub Pages is not enabled for this repository',
      });
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const pagesData = await response.json();

    return NextResponse.json({
      enabled: true,
      url: pagesData.html_url,
      source: pagesData.source,
      status: pagesData.status,
      customDomain: pagesData.cname,
    });
  } catch (error) {
    console.error('Error checking GitHub Pages status:', error);
    return NextResponse.json({ error: 'Failed to check GitHub Pages status' }, { status: 500 });
  }
}

// POST /api/github/pages - Enable GitHub Pages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, source = 'main' } = body;

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    // Enable GitHub Pages
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          branch: source,
          path: '/',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
    }

    const pagesData = await response.json();

    return NextResponse.json({
      success: true,
      url: pagesData.html_url,
      source: pagesData.source,
      status: pagesData.status,
    });
  } catch (error) {
    console.error('Error enabling GitHub Pages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable GitHub Pages',
      },
      { status: 500 }
    );
  }
}

// PUT /api/github/pages - Update GitHub Pages settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, source, customDomain } = body;

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    // Update GitHub Pages settings
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: source
          ? {
              branch: source,
              path: '/',
            }
          : undefined,
        cname: customDomain || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating GitHub Pages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update GitHub Pages',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/github/pages - Disable GitHub Pages
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    // Disable GitHub Pages
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disabling GitHub Pages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable GitHub Pages',
      },
      { status: 500 }
    );
  }
}
