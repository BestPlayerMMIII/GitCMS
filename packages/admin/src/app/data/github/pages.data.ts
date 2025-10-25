import { createGitHubClient } from '@/lib/client-github';

// Check GitHub Pages status
export async function githubPagesGET(owner: string, repo: string) {
  if (!owner || !repo) {
    throw new Error('Owner and repo are required');
  }

  const github = createGitHubClient(owner, repo);
  const token = await (github as any).getAccessToken();

  // Check if GitHub Pages is enabled
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (response.status === 404) {
    return {
      enabled: false,
      message: 'GitHub Pages is not enabled for this repository',
    };
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const pagesData = await response.json();

  return {
    enabled: true,
    url: pagesData.html_url,
    source: pagesData.source,
    status: pagesData.status,
    customDomain: pagesData.cname,
  };
}

// Enable or update GitHub Pages
export async function githubPagesPOST(
  owner: string,
  repo: string,
  source: string = 'main',
  customDomain?: string
) {
  if (!owner || !repo) {
    throw new Error('Owner and repo are required');
  }

  const github = createGitHubClient(owner, repo);
  const token = await (github as any).getAccessToken();

  // Enable GitHub Pages
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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

  return {
    success: true,
    url: pagesData.html_url,
    source: pagesData.source,
    status: pagesData.status,
  };
}

// Update GitHub Pages settings
export async function githubPagesPUT(
  owner: string,
  repo: string,
  source?: string,
  customDomain?: string
) {
  if (!owner || !repo) {
    throw new Error('Owner and repo are required');
  }

  const github = createGitHubClient(owner, repo);
  const token = await (github as any).getAccessToken();

  // Update GitHub Pages settings
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
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

  return { success: true };
}

// Disable GitHub Pages
export async function githubPagesDELETE(owner: string, repo: string) {
  if (!owner || !repo) {
    throw new Error('Owner and repo are required');
  }

  const github = createGitHubClient(owner, repo);
  const token = await (github as any).getAccessToken();

  // Disable GitHub Pages
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json();
    throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
  }

  return { success: true };
}
