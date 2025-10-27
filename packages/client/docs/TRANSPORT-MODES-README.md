# GitCMS Client Transport Modes Enhancement

## 🎯 What's New

GitCMS client now supports **three transport modes** that automatically adapt to
your use case, eliminating the need for custom API endpoints for public
repositories.

## 🚀 Quick Start

### Public Repository (New! No token required)

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
  // That's it! No token, no API, no backend needed
});

const posts = await cms.from('posts').get();
```

### Private Repository

```typescript
const cms = new GitCMS({
  repository: 'username/private-blog',
  token: process.env.GITHUB_TOKEN, // Server-side only
});
```

### Custom API Proxy

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://api.mysite.com',
});
```

## 📚 Documentation

- **[README](../README.md)** - Main documentation with configuration options
- **[Migration Guide](./MIGRATION-GUIDE.md)** - How to upgrade (100% backward
  compatible)
- **[Transport Modes](./TRANSPORT-MODES.md)** - Detailed guide for each mode
- **[Enhancement Summary](./ENHANCEMENT-SUMMARY.md)** - Complete implementation
  details
- **[Examples](./examples/transport-modes.ts.example)** - Code examples for all
  scenarios

## 🎨 Three Transport Modes

| Mode                 | Use Case                   | Rate Limit | Client-Side Safe |
| -------------------- | -------------------------- | ---------- | ---------------- |
| **Public** 🌐        | Public repos, simple apps  | 60/hr      | ✅ Yes           |
| **Authenticated** 🔐 | Private repos, server-side | 5,000/hr   | ❌ No            |
| **Proxy** 🔄         | High traffic, custom logic | Custom     | ✅ Yes           |

## ✨ Key Features

### Auto-Detection

```typescript
// Automatically chooses the right mode
new GitCMS({ repository: 'user/repo' }); // → public
new GitCMS({ repository: 'user/repo', token: 'xxx' }); // → authenticated
new GitCMS({ repository: 'user/repo', baseUrl: 'url' }); // → proxy
```

### Mode Checking

```typescript
const cms = new GitCMS({ repository: 'user/repo' });

console.log(cms.getTransportMode()); // 'public'
console.log(cms.isPublicMode()); // true
```

### Rate Limit Monitoring

```typescript
const rateLimit = await cms.getRateLimit();
console.log(`${rateLimit.remaining}/${rateLimit.limit} remaining`);
```

## 🔒 Security Best Practices

### ✅ DO: Use public mode for client-side

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  // No token - safe for browsers
});
```

### ❌ DON'T: Expose tokens client-side

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxx', // NEVER IN BROWSER!
});
```

### ✅ DO: Keep tokens server-side

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN, // Server only
});
```

## 📦 Backward Compatibility

**100% compatible!** All existing code continues to work without changes.

```typescript
// Old code still works
const cms = new GitCMS({
  repository: 'username/blog',
  token: 'ghp_xxx',
});

// New features are opt-in
const mode = cms.getTransportMode();
```

## 🎯 Use Cases

### Client-Side Blog

```typescript
// No backend needed!
const cms = new GitCMS({
  repository: 'username/blog',
});

export default async function BlogPage() {
  const posts = await cms.from('posts').get();
  return <PostList posts={posts} />;
}
```

### Server-Side App

```typescript
// Server component/action
const cms = new GitCMS({
  repository: 'company/private',
  token: process.env.GITHUB_TOKEN,
});

const data = await cms.from('products').get();
```

### High-Traffic Site

```typescript
// Custom API with caching
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://api.mysite.com',
});
```

## 🚀 Getting Started

1. **Update your package**:

   ```bash
   npm install @git-cms/client@latest
   ```

2. **Choose your mode**:
   - Public repo? Remove token, use public mode
   - Private repo? Keep token server-side
   - High traffic? Use proxy mode

3. **Check the docs**:
   - [README](../README.md) for configuration
   - [Migration Guide](./MIGRATION-GUIDE.md) for upgrading
   - [Transport Modes](./TRANSPORT-MODES.md) for details

## 💡 Examples

See [examples/transport-modes.ts.example](./examples/transport-modes.ts.example)
for:

- ✅ 10+ working examples
- ✅ Best practices
- ✅ Common patterns
- ✅ Anti-patterns to avoid

## 📊 Performance Tips

### For Low Traffic (< 60 requests/hour)

```typescript
// Use public mode
const cms = new GitCMS({
  repository: 'username/blog',
});
```

### For Medium Traffic (< 5,000 requests/hour)

```typescript
// Use authenticated mode with caching
const cms = new GitCMS({
  repository: 'username/blog',
  token: process.env.GITHUB_TOKEN,
});

// Add Next.js cache
export const revalidate = 3600; // 1 hour
```

### For High Traffic (> 5,000 requests/hour)

```typescript
// Use proxy mode with Redis
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: '/api/cms',
});

// Your API adds caching layer
```

## 🆘 Troubleshooting

### Rate Limit Exceeded

```typescript
const rateLimit = await cms.getRateLimit();
if (rateLimit.remaining < 10) {
  console.warn('Rate limit low!');
  // Switch to proxy mode or add caching
}
```

### 403 Forbidden

```typescript
// Private repo without token
// ❌ This will fail:
const cms = new GitCMS({
  repository: 'user/private',
});

// ✅ Add token (server-side only):
const cms = new GitCMS({
  repository: 'user/private',
  token: process.env.GITHUB_TOKEN,
});
```

### CORS Errors

```typescript
// Client-side GitHub API = CORS issues
// Solution: Use proxy mode
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: '/api/cms', // Your CORS-enabled API
});
```

## 🤝 Contributing

Found a bug or have a suggestion? Please open an issue!

## 📝 License

Same as GitCMS project.

---

**Made with ❤️ for better developer experience**
