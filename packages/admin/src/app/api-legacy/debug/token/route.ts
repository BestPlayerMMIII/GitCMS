import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Octokit instance with the token
    const octokit = new Octokit({ auth: session.accessToken });

    // Test if we can access the user endpoint
    try {
      const { data: userData } = await octokit.rest.users.getAuthenticated();

      // Try to get the token info (this only works for OAuth apps, not GitHub Apps)
      let scopes: string[] = [];
      try {
        // This endpoint shows what scopes the token has
        const response = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        // GitHub returns scopes in the X-OAuth-Scopes header
        const scopesHeader = response.headers.get('X-OAuth-Scopes');
        if (scopesHeader) {
          scopes = scopesHeader.split(',').map(s => s.trim());
        }
      } catch (scopeError) {
        console.error('Error getting scopes:', scopeError);
      }

      return NextResponse.json({
        user: {
          login: userData.login,
          name: userData.name,
          email: userData.email,
        },
        tokenInfo: {
          scopes: scopes.length > 0 ? scopes : 'Unable to determine (might be a GitHub App token)',
          hasRepo: scopes.includes('repo'),
          hasPublicRepo: scopes.includes('public_repo'),
          tokenPrefix: session.accessToken.substring(0, 4),
          tokenSuffix: session.accessToken.substring(session.accessToken.length - 4),
        },
        message:
          scopes.length > 0
            ? `Token has ${scopes.length} scope(s)`
            : 'Token is valid but scopes could not be determined',
      });
    } catch (apiError: any) {
      return NextResponse.json(
        {
          error: 'API call failed',
          details: apiError.message,
          status: apiError.status,
        },
        { status: apiError.status || 500 }
      );
    }
  } catch (error) {
    console.error('Token debug error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
