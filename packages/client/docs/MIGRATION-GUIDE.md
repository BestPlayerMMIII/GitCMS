# GitCMS Client Migration Guide

## Overview

GitCMS client has been enhanced to support **three transport modes** instead of
requiring tokens for all use cases. This provides a better developer experience
and removes the need for custom API endpoints for public repositories.

## What Changed?

### Before (Old Behavior)

- Token was **always** passed to Octokit, even if not needed
- Users had to create API endpoints for client-side apps with public repos
- No clear distinction between public and private repository access

### After (New Behavior)

- **Three transport modes**: `public`, `authenticated`, and `proxy`
- **Auto-detection** of the best transport based on configuration
- **No token required** for public repositories
- Better developer experience with clear security guidelines

## Migration Steps

### For Public Repositories

#### Before ❌

```typescript
// You might have been doing this:
const cms = new GitCMS({
  repository: 'username/blog',
  token: undefined, // Or leaving it empty
});

// Or creating unnecessary API endpoints
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://my-api.com/cms',
});
```

#### After ✅

```typescript
// Simply omit the token - it's cleaner and more explicit
const cms = new GitCMS({
  repository: 'username/blog',
  // No token needed for public repos!
});

// The client automatically uses public mode
console.log(cms.isPublicMode()); // true
```

### For Private Repositories

#### Before ❌

```typescript
const cms = new GitCMS({
  repository: 'username/private-blog',
  token: 'ghp_xxxxx',
});
```

#### After ✅

```typescript
// Same syntax, but now explicitly using authenticated mode
const cms = new GitCMS({
  repository: 'username/private-blog',
  token: process.env.GITHUB_TOKEN, // Server-side only!
});

// Verify you're in authenticated mode
console.log(cms.getTransportMode()); // 'authenticated'
```

### For Custom API Endpoints

#### Before ❌

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://my-api.com',
  token: 'optional-token',
});
```

#### After ✅

```typescript
// Same syntax, now explicitly using proxy mode
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://my-api.com',
  token: 'optional-token', // For API authentication
});

// Verify you're in proxy mode
console.log(cms.getTransportMode()); // 'proxy'
```

## Breaking Changes

### None! 🎉

This update is **100% backward compatible**. Your existing code will continue to
work exactly as before.

### What's Different Internally?

1. **Transport detection**: Automatically chooses the best mode
2. **Octokit initialization**: Only uses auth when needed (authenticated mode)
3. **Rate limit handling**: Better support for public API limits
4. **Type safety**: New `TransportMode` type for clarity

## New Features

### 1. Transport Mode Checking

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
});

// Check current mode
if (cms.isPublicMode()) {
  console.log('Using public mode - 60 req/hr limit');
}

const mode = cms.getTransportMode();
// Returns: 'public' | 'authenticated' | 'proxy'
```

### 2. Rate Limit Monitoring

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
});

// Monitor rate limits (public & authenticated modes only)
const rateLimit = await cms.getRateLimit();
if (rateLimit) {
  console.log(`${rateLimit.remaining}/${rateLimit.limit} requests remaining`);
  console.log(`Resets at: ${rateLimit.reset}`);

  if (rateLimit.remaining < 10) {
    console.warn('Rate limit nearly exhausted!');
  }
}
```

### 3. Explicit Transport Mode

```typescript
// Force a specific transport mode
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxx',
  transport: 'public', // Override auto-detection
});
```

## Updated Best Practices

### ✅ DO: Use Public Mode for Client-Side Apps

```typescript
// In your React/Vue/Next.js app (client-side)
import { GitCMS } from '@git-cms/client';

export const cms = new GitCMS({
  repository: 'username/blog-content',
  // No token - safe for browsers
});
```

### ✅ DO: Use Authenticated Mode Server-Side Only

```typescript
// In your API routes or server components
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/private-content',
  token: process.env.GITHUB_TOKEN, // Never expose to client!
});
```

### ✅ DO: Use Proxy Mode for Advanced Caching

```typescript
// Your custom API endpoint
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
});

// Add Redis caching, rate limiting, etc.
const data = await cms.from('posts').get();
await cache.set('posts', data, { ttl: 300 });
```

### ❌ DON'T: Expose Tokens Client-Side

```typescript
// NEVER DO THIS!
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxxxxxxxxxxxx', // Exposed in browser = security risk!
});
```

### ❌ DON'T: Create Unnecessary API Endpoints

```typescript
// Before: You might have created an API just to hide the token
// /api/posts endpoint -> calls GitCMS with token -> returns data

// Now: Just use public mode!
const cms = new GitCMS({
  repository: 'username/public-blog',
  // No token, no API needed!
});
```

## Common Migration Scenarios

### Scenario 1: Client-Side Blog (Public Repo)

**Before**: Required creating an API endpoint

```typescript
// pages/api/posts.ts
export default async function handler(req, res) {
  const cms = new GitCMS({
    repository: 'username/blog',
    token: process.env.GITHUB_TOKEN,
  });
  const posts = await cms.from('posts').get();
  res.json(posts);
}

// pages/blog.tsx
const posts = await fetch('/api/posts').then(r => r.json());
```

**After**: Direct client-side access

```typescript
// lib/cms.ts
export const cms = new GitCMS({
  repository: 'username/blog',
  // No token needed!
});

// pages/blog.tsx
import { cms } from '@/lib/cms';

const posts = await cms.from('posts').get();
```

### Scenario 2: Next.js App with Private Content

**Before**: Token in API routes

```typescript
// app/api/content/route.ts
const cms = new GitCMS({
  repository: 'company/private-content',
  token: process.env.GITHUB_TOKEN,
});

export async function GET() {
  const data = await cms.from('products').get();
  return Response.json(data);
}
```

**After**: Use Server Components or Server Actions

```typescript
// app/products/page.tsx (Server Component)
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'company/private-content',
  token: process.env.GITHUB_TOKEN,
});

export default async function ProductsPage() {
  const products = await cms.from('products').get();

  return <ProductList products={products} />;
}
```

### Scenario 3: Static Site Generator

**Before**: Build-time fetching with token

```typescript
// build.js
const cms = new GitCMS({
  repository: 'username/docs',
  token: process.env.GITHUB_TOKEN,
});

const docs = await cms.from('documentation').get();
generateStaticSite(docs);
```

**After**: No token needed for public repos

```typescript
// build.js
const cms = new GitCMS({
  repository: 'username/docs',
  // No token needed - public repo
});

const docs = await cms.from('documentation').get();
generateStaticSite(docs);
```

## Testing Your Migration

### 1. Check Transport Mode

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
});

console.log('Transport:', cms.getTransportMode());
console.log('Is Public:', cms.isPublicMode());
```

### 2. Monitor Rate Limits

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
});

const rateLimit = await cms.getRateLimit();
console.log('Rate Limit:', rateLimit);
```

### 3. Test Queries

```typescript
// Test basic queries work
const posts = await cms.from('posts').get();
console.log(`Fetched ${posts.length} posts`);

// Test filtered queries
const published = await cms
  .from('posts')
  .where('status', '==', 'published')
  .get();
console.log(`${published.length} published posts`);
```

## FAQ

### Q: Will my existing code break?

**A**: No! This update is 100% backward compatible. All existing code will
continue to work.

### Q: Do I need to update my token handling?

**A**: Only if you want to take advantage of public mode for public
repositories. Otherwise, your current code is fine.

### Q: What if I'm using a private repository?

**A**: No changes needed. Keep using the token as before, just make sure it's
server-side only.

### Q: Can I still use custom API endpoints?

**A**: Yes! The proxy mode works exactly as before with `baseUrl`.

### Q: What are the rate limits for each mode?

**A**:

- **Public mode**: 60 requests/hour per IP
- **Authenticated mode**: 5,000 requests/hour
- **Proxy mode**: Depends on your implementation

### Q: Should I migrate my app to use public mode?

**A**: If you're using a public repository and currently creating API endpoints
just to fetch content, yes! Public mode simplifies your architecture.

### Q: How do I monitor rate limits?

**A**: Use the new `getRateLimit()` method (public and authenticated modes
only).

## Support

If you encounter any issues during migration, please:

1. Check the [README](../README.md) for configuration examples
2. Review the [examples](./EXAMPLES.md) for usage patterns
3. Open an issue on GitHub with your specific use case

## Changelog

- ✨ Added support for three transport modes: `public`, `authenticated`, `proxy`
- ✨ Added `getTransportMode()` method
- ✨ Added `isPublicMode()` method
- ✨ Added `getRateLimit()` method
- 🔧 Auto-detection of optimal transport mode
- 🔧 Improved type safety with `TransportMode` type
- 📝 Enhanced documentation with security best practices
- ♻️ Backward compatible with all existing code
