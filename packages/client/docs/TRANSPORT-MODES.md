# GitCMS Transport Modes Guide

## Overview

GitCMS supports three distinct transport modes to accommodate different use
cases and deployment scenarios. The client automatically selects the optimal
mode based on your configuration, but you can also explicitly specify which mode
to use.

## Transport Modes

### 1. Public Mode 🌐

Access public GitHub repositories without authentication.

**Key Features:**

- ✅ No token required
- ✅ Safe for client-side applications
- ✅ Zero configuration
- ✅ Direct GitHub API access
- ⚠️ 60 requests/hour rate limit per IP

**When to Use:**

- Public repositories
- Client-side React/Vue/Next.js apps
- Static site generators
- Development and testing
- Low-traffic applications

**Example:**

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
  // No token needed!
});

// Fetch content
const posts = await cms.from('posts').get();
```

**Architecture:**

```
Browser → GitHub API → Public Repository → Content
```

### 2. Authenticated Mode 🔐

Access private repositories or get higher rate limits with a GitHub token.

**Key Features:**

- ✅ Access to private repositories
- ✅ 5,000 requests/hour rate limit
- ✅ Direct GitHub API access
- ⚠️ Token must be server-side only
- ⚠️ Security risk if exposed client-side

**When to Use:**

- Private repositories
- Server-side applications
- API routes/endpoints
- Higher traffic requirements
- Need for authenticated features

**Example:**

```typescript
import { GitCMS } from '@git-cms/client';

// Server-side only!
const cms = new GitCMS({
  repository: 'company/private-docs',
  token: process.env.GITHUB_TOKEN, // From environment
});

const docs = await cms.from('documentation').get();
```

**Architecture:**

```
Server → GitHub API (with token) → Private/Public Repository → Content
```

### 3. Proxy Mode 🔄

Route requests through your custom API endpoint.

**Key Features:**

- ✅ Full control over caching
- ✅ Custom rate limiting
- ✅ Additional processing/transformation
- ✅ Security isolation
- ✅ Custom authentication
- ⚠️ Requires custom backend

**When to Use:**

- High-traffic applications
- Complex caching requirements
- Additional content processing
- Multi-tenant applications
- Custom business logic

**Example:**

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://api.mysite.com',
  token: 'optional-api-key', // For your API
});

const posts = await cms.from('posts').get();
```

**Architecture:**

```
Client → Your API → GitHub API → Repository → Your API → Client
                ↓
           Cache/Process
```

## Auto-Detection

GitCMS automatically selects the optimal transport mode:

```typescript
// No config → Public mode
new GitCMS({ repository: 'user/repo' });
// → transport: 'public'

// With token → Authenticated mode
new GitCMS({ repository: 'user/repo', token: 'ghp_xxx' });
// → transport: 'authenticated'

// With baseUrl → Proxy mode
new GitCMS({ repository: 'user/repo', baseUrl: 'https://api.com' });
// → transport: 'proxy'
```

## Explicit Mode Selection

Override auto-detection by specifying the transport mode:

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxx', // Present but won't be used
  transport: 'public', // Explicitly use public mode
});
```

## Comparing Transport Modes

| Feature               | Public | Authenticated | Proxy    |
| --------------------- | ------ | ------------- | -------- |
| **Rate Limit**        | 60/hr  | 5,000/hr      | Custom   |
| **Private Repos**     | ❌     | ✅            | ✅       |
| **Client-Side Safe**  | ✅     | ❌            | ✅       |
| **Requires Token**    | ❌     | ✅            | Optional |
| **Requires Backend**  | ❌     | ❌            | ✅       |
| **Caching Control**   | ❌     | ❌            | ✅       |
| **Custom Processing** | ❌     | ❌            | ✅       |
| **Setup Complexity**  | Low    | Low           | High     |

## Rate Limit Handling

### Checking Rate Limits

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
});

const rateLimit = await cms.getRateLimit();

if (rateLimit) {
  console.log(`Used: ${rateLimit.used}/${rateLimit.limit}`);
  console.log(`Remaining: ${rateLimit.remaining}`);
  console.log(`Resets at: ${rateLimit.reset}`);

  // Warn if approaching limit
  if (rateLimit.remaining < 100) {
    console.warn('⚠️ Approaching rate limit!');
  }
}
```

### Rate Limit Strategies

#### Strategy 1: Static Generation (Recommended)

```typescript
// Build time only - no runtime API calls
const cms = new GitCMS({
  repository: 'username/blog',
});

// Fetch at build time
const posts = await cms.from('posts').get();
// Write to static files
await fs.writeFile('data/posts.json', JSON.stringify(posts));
```

#### Strategy 2: Server-Side Caching

```typescript
// Next.js App Router with caching
import { unstable_cache } from 'next/cache';

const getCachedPosts = unstable_cache(
  async () => {
    const cms = new GitCMS({
      repository: 'username/blog',
      token: process.env.GITHUB_TOKEN,
    });
    return await cms.from('posts').get();
  },
  ['posts'],
  { revalidate: 3600 } // Cache for 1 hour
);
```

#### Strategy 3: Proxy with Redis

```typescript
// Custom API endpoint with Redis
export async function GET() {
  const cached = await redis.get('posts');
  if (cached) return Response.json(cached);

  const cms = new GitCMS({
    repository: 'username/blog',
    token: process.env.GITHUB_TOKEN,
  });

  const posts = await cms.from('posts').get();
  await redis.set('posts', posts, { ex: 300 });

  return Response.json(posts);
}
```

## Security Considerations

### ✅ Public Mode Security

```typescript
// Safe for client-side - no credentials
const cms = new GitCMS({
  repository: 'username/blog',
});

// Can be used in browser without risk
```

### ⚠️ Authenticated Mode Security

```typescript
// NEVER expose token in client-side code!

// ❌ BAD - Token exposed in browser
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxxxxxxxxxxxx', // Visible in network tab!
});

// ✅ GOOD - Token in environment variable, server-side only
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN, // Never sent to client
});
```

### 🔒 Proxy Mode Security

```typescript
// Your API controls authentication
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://api.mysite.com',
  token: 'custom-api-key', // Your API's auth, not GitHub
});

// Token is hidden in your backend
```

## Common Patterns

### Pattern 1: Hybrid Next.js App

Use public mode for client-side, authenticated for server-side:

```typescript
// lib/cms-client.ts (client-side)
export const cms = new GitCMS({
  repository: 'username/blog',
  // Public mode - safe for browser
});

// lib/cms-server.ts (server-side)
export const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
  // Authenticated mode - server only
});
```

### Pattern 2: Progressive Enhancement

Fast initial load with public mode, then fetch more with proxy:

```typescript
// 1. Initial load (public mode)
const cms = new GitCMS({ repository: 'user/blog' });
const recentPosts = await cms.from('posts').limit(5).get();

// 2. Load more via proxy (with caching)
const cmsProxy = new GitCMS({
  repository: 'user/blog',
  baseUrl: '/api/cms',
});
const allPosts = await cmsProxy.from('posts').get();
```

### Pattern 3: Multi-Tenant Proxy

```typescript
// Proxy mode with tenant isolation
const cms = new GitCMS({
  repository: `${tenantId}/content`,
  baseUrl: 'https://api.saas.com',
  token: tenantApiKey,
});
```

## Troubleshooting

### Issue: Rate Limit Exceeded

```typescript
// Check current usage
const rateLimit = await cms.getRateLimit();
console.log(rateLimit);

// Solutions:
// 1. Use authenticated mode (5000 req/hr vs 60 req/hr)
// 2. Implement caching
// 3. Use static generation
// 4. Use proxy mode with custom rate limiting
```

### Issue: 403 Forbidden

```typescript
// Public mode trying to access private repo
const cms = new GitCMS({
  repository: 'user/private-repo',
  // Missing token!
});

// Fix: Use authenticated mode
const cms = new GitCMS({
  repository: 'user/private-repo',
  token: process.env.GITHUB_TOKEN, // Add token
});
```

### Issue: CORS Errors

```typescript
// Client-side direct GitHub API access
// Browser blocks due to CORS

// Solution 1: Use proxy mode
const cms = new GitCMS({
  repository: 'user/blog',
  baseUrl: '/api/cms', // Your CORS-enabled API
});

// Solution 2: Use server-side rendering
// Fetch on server, send to client
```

## Performance Tips

### 1. Use Appropriate Transport

- **Low traffic, public repo**: Public mode
- **High traffic, public repo**: Authenticated mode + caching
- **Very high traffic**: Proxy mode with Redis
- **Private repo**: Authenticated mode (server-side)

### 2. Implement Caching

```typescript
// Cache at different levels
// - Static generation (best)
// - Server-side cache (good)
// - Proxy cache (good)
// - Client-side cache (limited)
```

### 3. Batch Requests

```typescript
// Instead of multiple calls:
const posts = await cms.from('posts').get();
const pages = await cms.from('pages').get();
const config = await cms.doc('config').get();

// Consider proxy mode with batch endpoint
const data = await fetch('/api/cms/batch', {
  method: 'POST',
  body: JSON.stringify({
    posts: { schema: 'posts' },
    pages: { schema: 'pages' },
    config: { doc: 'config' },
  }),
});
```

## Conclusion

Choose the right transport mode for your use case:

- 🌐 **Public mode**: Simple, client-side, public repos
- 🔐 **Authenticated mode**: Server-side, private repos, higher limits
- 🔄 **Proxy mode**: Advanced, high-traffic, custom logic

All modes use the same API, making it easy to switch as your needs evolve.
