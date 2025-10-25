import { createGitHubClient } from '@/lib/client-github';
import { Octokit } from '@octokit/rest';

/**
 * Debug token information (client-callable)
 */
export async function debugTokenGET() {
  // Get token through client
  const github = createGitHubClient('', '') as any;
  const token = await github.getAccessToken();

  const octokit = new Octokit({ auth: token });

  try {
    const { data: userData } = await octokit.rest.users.getAuthenticated();

    let scopes: string[] = [];
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const scopesHeader = response.headers.get('X-OAuth-Scopes');
      if (scopesHeader) {
        scopes = scopesHeader.split(',').map(s => s.trim());
      }
    } catch (scopeError) {
      console.error('Error getting scopes:', scopeError);
    }

    return {
      user: {
        login: userData.login,
        name: userData.name,
        email: userData.email,
      },
      tokenInfo: {
        scopes: scopes.length > 0 ? scopes : 'Unable to determine (might be a GitHub App token)',
        hasRepo: scopes.includes('repo'),
        hasPublicRepo: scopes.includes('public_repo'),
        tokenPrefix: token.substring(0, 4),
        tokenSuffix: token.substring(token.length - 4),
      },
      message:
        scopes.length > 0
          ? `Token has ${scopes.length} scope(s)`
          : 'Token is valid but scopes could not be determined',
    };
  } catch (apiError: any) {
    throw new Error(`API call failed: ${apiError.message}`);
  }
}
