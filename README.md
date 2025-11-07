# GitCMS

**Universal GitHub-Based Content Management System**

[![npm version](https://img.shields.io/npm/v/@git-cms/client)](https://www.npmjs.com/package/@git-cms/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

> Transform your GitHub repository into a powerful content management system.

---

## 🌟 What is GitCMS?

GitCMS is a universal content management system that uses GitHub as its backend.
It provides a beautiful web interface for managing content while storing
everything as files in your GitHub repository - **no database required**.

### Key Features

- 🚀 **No Database Required** - All content stored in GitHub
- 🎨 **Universal Admin Panel** - One hosted interface for all users
- 📝 **Visual Content Editor** - Rich text editing with TipTap
- 🔐 **GitHub OAuth** - Secure authentication
- 🖼️ **Media Management** - Upload and organize images, videos, documents
- 📦 **TypeScript SDK** - Full type-safety for developers
- ⚡ **Framework Agnostic** - Works with React, Vue, Next.js, etc.
- 🌐 **Public & Private Repos** - Supports both access modes

---

## 🎯 Who Is This For?

### Content Creators

Use the **Admin Panel** to manage content visually without touching code.

**Perfect for:**

- Bloggers managing posts
- Teams managing documentation
- Developers managing app configuration
- Anyone preferring visual interfaces

**Get Started:** [Admin Panel Guide](./docs/ADMIN-PANEL-GUIDE.md) |
[Live Demo](https://gitcms-admin.bestplayer.dev)

### Developers

Use the **@git-cms/client SDK** to fetch content from GitHub in your projects.

**Perfect for:**

- Next.js websites
- React/Vue applications
- Mobile apps
- Static site generators
- Any project needing content

**Get Started:** [Client SDK Guide](./docs/CLIENT-SDK-GUIDE.md) |
[NPM Package](https://www.npmjs.com/package/@git-cms/client)

---

## 🚀 Quick Start

### For Content Creators

1. Visit the **[Admin Panel](https://gitcms-admin.bestplayer.dev)**
2. Sign in with GitHub
3. Connect your repository
4. Define content schemas
5. Start creating content!

**[📖 Full Admin Guide →](./docs/ADMIN-PANEL-GUIDE.md)**

### For Developers

**Install the SDK:**

```bash
npm install @git-cms/client
```

**Fetch content in your project:**

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/my-blog',
});

// Fetch blog posts
const posts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.publishedAt', 'desc')
  .get();

// Display content
posts.forEach(post => {
  console.log(post.title, post.content);
});
```

**[📖 Full SDK Guide →](./docs/CLIENT-SDK-GUIDE.md)**

---

## 📦 Packages

### [@git-cms/client](./packages/client) [![npm](https://img.shields.io/npm/v/@git-cms/client)](https://www.npmjs.com/package/@git-cms/client)

TypeScript SDK for developers to integrate GitCMS into their projects.

```bash
npm install @git-cms/client
```

**[📖 Documentation →](./docs/CLIENT-SDK-GUIDE.md)**

### [@git-cms/core](./packages/core) [![npm](https://img.shields.io/npm/v/@git-cms/core)](https://www.npmjs.com/package/@git-cms/core)

Core utilities and types. Internal dependency.

### [@git-cms/admin](./packages/admin)

Universal admin panel for content management. Hosted service, not published to
NPM.

**[🔗 Live Admin Panel →](https://gitcms-admin.bestplayer.dev)**

---

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

---

## 💡 Use Cases

### Blog Management

```typescript
const posts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.publishedAt', 'desc')
  .limit(10)
  .get();
```

### Portfolio Projects

```typescript
const projects = await cms.from('projects').where('featured', true).get();
```

### E-commerce Catalog

```typescript
const products = await cms
  .from('products')
  .where('category', '==', 'electronics')
  .where('inStock', true)
  .get();
```

### Documentation Sites

```typescript
const docs = await cms.from('docs').where('version', '==', 'v1.0').get();
```

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

- **[Overview](./docs/README.md)** - Introduction to GitCMS
- **[Admin Panel Guide](./docs/ADMIN-PANEL-GUIDE.md)** - For content creators
- **[Client SDK Guide](./docs/CLIENT-SDK-GUIDE.md)** - For developers

**Full Documentation** available here:
[GitCMS Docs](https://gitcms-docs.bestplayer.dev)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone repository
git clone https://github.com/BestPlayerMMIII/GitCMS.git
cd GitCMS

# Install dependencies
npm install

# Build all packages
npm run build

# Run development servers
npm run dev
```

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

Copyright (c) 2025 GitCMS

---

## 🔗 Links

- **GitHub:**
  [BestPlayerMMIII/GitCMS](https://github.com/BestPlayerMMIII/GitCMS)
- **NPM Package:**
  [@git-cms/client](https://www.npmjs.com/package/@git-cms/client)
- **Admin Panel**: [GitCMS Admin](https://gitcms-admin.bestplayer.dev)
- **Full Documentation**: [GitCMS Docs](https://gitcms-docs.bestplayer.dev)
- **Issues:** [GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)

---

## 🌟 Features

### ✅ Current Features

- [x] GitHub OAuth authentication
- [x] Repository connection
- [x] Visual schema designer
- [x] Rich text editor (TipTap)
- [x] Media upload and management
- [x] TypeScript SDK
- [x] Public and private repo support
- [x] Nested field access
- [x] Progressive media loading

### Work In Progress

- [ ] Virtual Folders for Media management (like File Explorer!)

### 🔄 Roadmap

- [ ] Full-text search
- [ ] Multi-user collaboration
- [ ] Content versioning UI
- [ ] Branch-based workflows
- [ ] GraphQL API
- [ ] Webhooks integration
- [ ] Real-time collaboration

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)
- **Discussions:**
  [GitHub Discussions](https://github.com/BestPlayerMMIII/GitCMS/discussions)

---

## 🙏 Built With

- [Next.js](https://nextjs.org/) - React framework
- [TipTap](https://tiptap.dev/) - Rich text editor
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API client
- [Zod](https://zod.dev/) - Schema validation
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Turborepo](https://turbo.build/) - Monorepo management

---

**Made with ❤️ by [Manuel Maiuolo](https://github.com/BestPlayerMMIII)**

**Welcome to GitCMS! 🚀**
