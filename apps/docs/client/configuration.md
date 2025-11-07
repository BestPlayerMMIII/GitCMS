# Configuration

Configure the GitCMS Client SDK for your use case.

## GitCMSConfig

```typescript
interface GitCMSConfig {
  repository: string; // Required: 'owner/repo'
  branch?: string; // Optional: default 'main'
  token?: string; // Optional: for private repos
  apiEndpoint?: string; // Optional: for media proxying
  transport?: 'public' | 'authenticated'; // Optional: force mode
}
```

## Basic Configuration

### Public Repository

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
});
```

### Private Repository

For private repositories, you need a GitHub Personal Access Token:

```typescript
const cms = new GitCMS({
  repository: 'username/private-blog',
  token: process.env.GITHUB_TOKEN, // Server-side only!
});
```

::: tip How to Get a GitHub Token 📚

**Need a token?** Follow our [complete GitHub Token guide](/admin/github-token)
for step-by-step instructions on creating a secure token with the right
permissions.

**Quick version:**

1. GitHub Settings → Developer settings → Fine-grained tokens
2. Generate new token with **Contents: Read and write**
3. Store in environment variables

:::

::: warning Security Warning

**Never expose tokens in client-side code!** Only use tokens in server-side
code, API routes, or build-time scripts.

:::

### Custom Branch

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  branch: 'production',
});
```

## Transport Modes

GitCMS automatically selects the transport mode based on your config.

### Public Mode

- No token required
- 60 requests/hour per IP
- Best for: Public repos, client-side apps

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  // No token = public mode
});
```

### Authenticated Mode

- Token required
- 5,000 requests/hour
- Best for: Private repos, server-side apps

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
});
```

## Environment Variables

Store sensitive data like GitHub tokens in environment variables:

```bash
# .env.local
GITHUB_TOKEN=github_pat_11AAAAAAA0AAAAAAAAAAAA_XXX
GITHUB_REPO=username/my-blog
```

```typescript
const cms = new GitCMS({
  repository: process.env.GITHUB_REPO!,
  token: process.env.GITHUB_TOKEN,
});
```

::: tip Token Setup Guide

New to GitHub tokens? Check our [GitHub Token Guide](/admin/github-token) for:

- Step-by-step token creation
- Security best practices
- Troubleshooting common issues
- Platform-specific setup (Vercel, Netlify, etc.)

:::

## Rate Limit Monitoring

```typescript
const rateLimit = await cms.getRateLimit();

if (rateLimit) {
  console.log(`Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);
  console.log(`Resets at: ${rateLimit.reset}`);
}
```

## Transport Mode Check

```typescript
console.log(cms.getTransportMode()); // 'public' | 'authenticated'
console.log(cms.isPublicMode()); // true | false
```

## Next Steps

::: info Continue Learning

- [Basic Queries](/client/basic-queries) - Fetch content
- [Security](/client/security) - Best practices

:::
