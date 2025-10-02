import { NextRequest, NextResponse } from 'next/server';
import {
  GitHubApiClient,
  getGitCMSConfig,
  getContentPath as getCentralizedContentPath,
  Operator,
  applyOperator,
} from '@git-cms/core';

function getAuthToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  return token || null;
}

async function getContentPath(owner: string, repo: string, token: string | null): Promise<string> {
  try {
    const config = token ? await getGitCMSConfig(token, owner, repo) : null;
    return getCentralizedContentPath(config);
  } catch {
    return getCentralizedContentPath(null);
  }
}

function applyQuery(items: any[], url: URL): any[] {
  let result = items.slice();

  const whereParam = url.searchParams.get('where');
  if (whereParam) {
    try {
      const filters = JSON.parse(whereParam) as { field: string; operator: Operator; value: any }[];
      result = result.filter(item => {
        return filters.every(filter => {
          const { field, operator, value } = filter;
          const itemValue = item.data?.[field] ?? item[field];
          return applyOperator(itemValue, operator, value);
        });
      });
    } catch {}
  }

  const orderBy = url.searchParams.get('orderBy');
  const order = (url.searchParams.get('order') as 'asc' | 'desc') || 'asc';
  if (orderBy) {
    result.sort((a, b) => {
      const av = a.data?.[orderBy] ?? a[orderBy];
      const bv = b.data?.[orderBy] ?? b[orderBy];
      if (av == null && bv == null) return 0;
      if (av == null) return order === 'asc' ? -1 : 1;
      if (bv == null) return order === 'asc' ? 1 : -1;
      if (av < bv) return order === 'asc' ? -1 : 1;
      if (av > bv) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const offset = Number(url.searchParams.get('offset') || 0);
  const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined;
  if (offset || limit != null) {
    const start = Math.max(0, offset);
    const end = limit != null ? start + Math.max(0, limit) : undefined;
    result = result.slice(start, end);
  }

  return result;
}

export async function GET(
  request: NextRequest,
  context: { params: { owner: string; repo: string; schema: string } }
) {
  try {
    const { owner, repo, schema } = context.params;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const branch = url.searchParams.get('branch') || 'main';
    const token = getAuthToken(request);

    // For private repos, token is required
    if (!token) {
      // Allow unauthenticated for public repos; GitHub will enforce perms
    }

    const github = new GitHubApiClient(token || '', owner, repo, branch);
    const contentPath = await getContentPath(owner, repo, token);

    if (id) {
      const filePath = `${contentPath}/${schema}/${id}.json`;
      try {
        const content = await github.getFileContent(filePath);
        const data = JSON.parse(content);
        return NextResponse.json({
          success: true,
          content: {
            id,
            schemaId: data.schemaId || schema,
            data: data.data || {},
            metadata: data.metadata || {},
          },
        });
      } catch (e) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    }

    // List
    let items: any[] = [];
    try {
      const files = await github.getDirectory(`${contentPath}/${schema}`);
      for (const file of files) {
        if (file.type === 'file' && file.name.endsWith('.json')) {
          try {
            const raw = await github.getFileContent(file.path);
            const parsed = JSON.parse(raw);
            const contentId = file.name.replace(/\.json$/, '');
            items.push({
              id: contentId,
              schemaId: parsed.schemaId || schema,
              data: parsed.data || {},
              metadata: parsed.metadata || {},
            });
          } catch {}
        }
      }
    } catch {}

    items = applyQuery(items, url);

    return NextResponse.json({ success: true, items, total: items.length });
  } catch (error) {
    console.error('Public content GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
