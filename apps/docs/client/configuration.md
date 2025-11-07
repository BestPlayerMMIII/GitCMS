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

```typescript
const cms = new GitCMS({
  repository: 'username/private-blog',
  token: process.env.GITHUB_TOKEN, // Server-side only!
});
```

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

Store sensitive data in environment variables:

```bash
# .env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_REPO=username/my-blog
```

```typescript
const cms = new GitCMS({
  repository: process.env.GITHUB_REPO!,
  token: process.env.GITHUB_TOKEN,
});
```

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
