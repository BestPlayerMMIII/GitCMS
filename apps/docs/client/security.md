# Security Best Practices

Keep your GitCMS implementation secure.

## ⚠️ Never Expose Tokens Client-Side

```typescript
// ❌ BAD: Token in client-side code
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxxxxxxxxxxxx', // NEVER DO THIS!
});

// ✅ GOOD: Use public mode for client-side
const cms = new GitCMS({
  repository: 'username/blog',
  // No token - safe for browsers
});

// ✅ GOOD: Token in server environment
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN, // Server-only
});
```

## Environment Variables

```bash
# .env.local (never commit this file!)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_REPO=username/my-blog
```

```typescript
// Use environment variables
const cms = new GitCMS({
  repository: process.env.GITHUB_REPO!,
  token: process.env.GITHUB_TOKEN,
});
```

## Rate Limiting

| Mode          | Rate Limit | Use Case                   |
| ------------- | ---------- | -------------------------- |
| Public        | 60/hour    | Public repos, client-side  |
| Authenticated | 5,000/hour | Private repos, server-side |

## Best Practices

✅ **Do**:

- Use public mode for client-side apps with public repos
- Use authenticated mode server-side only
- Store tokens in environment variables
- Implement caching to reduce API calls
- Use static generation when possible

❌ **Don't**:

- Expose tokens in client-side code
- Commit tokens to Git
- Use authenticated mode in browsers
- Make excessive API calls
