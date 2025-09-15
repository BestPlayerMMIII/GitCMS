import { NextRequest, NextResponse } from 'next/server';
import { CDN_PROVIDERS, CDNUrlGenerator, createCDNConfig } from '@gitcms/core';

// POST /api/cdn/test - Test CDN provider performance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, testImagePath = '.gitcms/media/test.jpg' } = body;

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    const results = await Promise.all(
      Object.entries(CDN_PROVIDERS).map(async ([providerId, provider]) => {
        const startTime = performance.now();

        try {
          // Create CDN config for this provider
          const config = createCDNConfig(providerId);
          const urlGenerator = new CDNUrlGenerator(config);

          // Generate test URL
          const testUrl = urlGenerator.generateUrl(owner, repo, testImagePath);

          // Test the URL with a HEAD request
          const response = await fetch(testUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });

          const latency = performance.now() - startTime;

          return {
            providerId,
            provider: provider.name,
            latency: Math.round(latency),
            success: response.ok,
            status: response.status,
            url: testUrl,
            headers: {
              'content-type': response.headers.get('content-type'),
              'content-length': response.headers.get('content-length'),
              'cache-control': response.headers.get('cache-control'),
              'last-modified': response.headers.get('last-modified'),
            },
          };
        } catch (error) {
          const latency = performance.now() - startTime;

          return {
            providerId,
            provider: provider.name,
            latency: Math.round(latency),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            url: `Error generating URL for ${provider.name}`,
          };
        }
      })
    );

    // Sort by latency (fastest first) with successful tests prioritized
    const sortedResults = results.sort((a, b) => {
      if (a.success && !b.success) return -1;
      if (!a.success && b.success) return 1;
      return a.latency - b.latency;
    });

    return NextResponse.json({
      success: true,
      results: sortedResults,
      testImagePath,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error testing CDN providers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test CDN providers',
      },
      { status: 500 }
    );
  }
}

// GET /api/cdn/test-image - Check if test image exists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const imagePath = searchParams.get('imagePath') || '.gitcms/media/test.jpg';

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    // Check if the test image exists in the repository
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${imagePath}`;

    const response = await fetch(githubUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 404) {
      return NextResponse.json({
        exists: false,
        message: 'Test image not found',
        suggestion: 'Upload a test image to .gitcms/media/test.jpg for accurate CDN testing',
      });
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const fileData = await response.json();

    return NextResponse.json({
      exists: true,
      path: imagePath,
      size: fileData.size,
      lastModified: fileData.sha,
      downloadUrl: fileData.download_url,
    });
  } catch (error) {
    console.error('Error checking test image:', error);
    return NextResponse.json(
      {
        exists: false,
        error: error instanceof Error ? error.message : 'Failed to check test image',
      },
      { status: 500 }
    );
  }
}
