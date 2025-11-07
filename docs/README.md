# GitCMS Documentation

Welcome to GitCMS - a powerful, universal content management system built on top
of GitHub.

## 📚 Documentation

- **[Admin Panel Guide](./ADMIN-PANEL-GUIDE.md)** - For content creators
- **[Client SDK Guide](./CLIENT-SDK-GUIDE.md)** - For developers

## 🎯 What is GitCMS?

GitCMS transforms your GitHub repository into a powerful content management
system. It provides a beautiful web interface for managing content while storing
everything as files in GitHub - no database required.

### Key Features

- **No Database** - All content stored as files in GitHub
- **Version Control** - Every change tracked with Git
- **Universal Admin Panel** - One interface for all users
- **TypeScript SDK** - Type-safe content fetching
- **Framework Agnostic** - Works with React, Vue, Next.js, etc.

## 🚀 Quick Start

### For Content Creators

Use the admin panel to manage your content visually:

1. Visit [gitcms-admin.bestplayer.dev](https://gitcms-admin.bestplayer.dev)
2. Sign in with GitHub
3. Connect your repository
4. Define content schemas
5. Start creating!

**[Read the Admin Panel Guide →](./ADMIN-PANEL-GUIDE.md)**

### For Developers

Install the SDK to fetch content in your projects:

```bash
npm install @git-cms/client
```

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/my-blog',
});

const posts = await cms.from('posts').get();
```

**[Read the Client SDK Guide →](./CLIENT-SDK-GUIDE.md)**

## 🏗️ How It Works

```
Admin Panel (Web UI)
        ↓ commits via GitHub API
GitHub Repository (your content)
        ↑ reads via GitHub API
Client SDK (in your app)
```

GitCMS uses GitHub as the storage backend. The admin panel writes content to
your repository, and the client SDK reads it back. Everything is
version-controlled and backed by GitHub's infrastructure.

## 📦 Packages

- **[@git-cms/client](https://npmjs.com/package/@git-cms/client)** - NPM SDK for
  developers
- **[@git-cms/core](https://npmjs.com/package/@git-cms/core)** - Core utilities
  (internal)
- **@git-cms/admin** - Admin panel (hosted service)

## 💡 Use Cases

- **Blogs** - Manage posts with rich text, images, tags
- **Portfolios** - Showcase projects with media
- **Documentation** - Team collaboration with version control
- **E-commerce** - Product catalogs and content
- **Mobile Apps** - Content management for apps

## 🤝 Contributing

Contributions welcome! See the [main README](../README.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](../LICENSE)
