# GitCMS - Universal GitHub-Based Content Management System

**Version:** 0.1.0  
**License:** MIT  
**Status:** Production Ready

> Transform your GitHub repository into a powerful, user-friendly content
> management system.

[![npm version](https://img.shields.io/npm/v/@git-cms/client)](https://www.npmjs.com/package/@git-cms/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

## 🌟 What is GitCMS?

**GitCMS** is a universal, GitHub-based Content Management System that provides
a beautiful web interface for managing content stored as files in GitHub
repositories. It combines the reliability of Git version control with the
usability of modern CMS interfaces.

### Key Features

- 🚀 **No Database Required** - All content stored as files in GitHub
- 🎨 **Universal Admin Panel** - One hosted interface for all users
- 📝 **Visual Content Editor** - Rich text editing with TipTap
- 🔐 **GitHub OAuth** - Secure authentication
- 🖼️ **Media Management** - Upload and organize images, videos, documents
- 📦 **TypeScript SDK** - Full type-safety for developers
- ⚡ **Framework Agnostic** - Works with React, Vue, Next.js, etc.
- 🌐 **Public & Private Repos** - Supports both access modes

---

## 🎯 Who Is This For?

### Content Creators (Your Users)

Use the **Admin Panel** to manage content visually without touching code.

**Perfect for:**

- Bloggers managing blog posts
- Teams managing documentation
- Developers managing app configuration
- Anyone preferring visual interfaces over file editing

**Get Started:** [Admin Panel Guide](./docs/ADMIN-PANEL-GUIDE.md) |
[Live Admin Panel](https://gitcms-admin.bestplayer.dev)

### Developers (Your Users)

Use the **@git-cms/client SDK** to fetch content from GitHub in your projects.

**Perfect for:**

- Next.js websites
- React/Vue applications
- Mobile apps
- Static site generators
- Any project needing GitHub-based content

**Get Started:** [Client SDK Guide](./docs/CLIENT-SDK-GUIDE.md) |
[NPM Package](https://www.npmjs.com/package/@git-cms/client)

---

## 📦 Packages

This monorepo contains three packages:

### [@git-cms/client](./packages/client) [![npm](https://img.shields.io/npm/v/@git-cms/client)](https://www.npmjs.com/package/@git-cms/client)

TypeScript SDK for developers to integrate GitCMS into their projects.

```bash
npm install @git-cms/client
```

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
});

const posts = await cms.from('posts').get();
```

**[📖 Full Documentation](./docs/CLIENT-SDK-GUIDE.md)**

### [@git-cms/core](./packages/core) [![npm](https://img.shields.io/npm/v/@git-cms/core)](https://www.npmjs.com/package/@git-cms/core)

Core utilities and types used by both admin and client packages. Internal
dependency.

### [@git-cms/admin](./packages/admin)

Universal admin panel for content management. Not published to NPM - deployed as
a hosted service.

**[🔗 Live Admin Panel](https://gitcms-admin.bestplayer.dev)** |
**[📖 Admin Guide](./docs/ADMIN-PANEL-GUIDE.md)**

---

## 🚀 Quick Start

### For Content Creators

1. Visit the **[Admin Panel](https://gitcms-admin.bestplayer.dev)**
2. Sign in with GitHub
3. Connect your repository
4. Define content schemas
5. Start creating content!

**[📖 Read the Admin Panel Guide](./docs/ADMIN-PANEL-GUIDE.md)**

### For Developers

1. **Install the SDK:**

   ```bash
   npm install @git-cms/client
   ```

2. **Use in your project:**

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

   // Fetch single post
   const post = await cms.from('posts').where('id', '==', 'my-post').get();
   ```

3. **Display content:**
   ```typescript
   posts.forEach(post => {
     console.log(post.title, post.content);
   });
   ```

**[📖 Read the Client SDK Guide](./docs/CLIENT-SDK-GUIDE.md)**

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

- **[Overview & Getting Started](./docs/README.md)** - Introduction to GitCMS
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and technical
  details
- **[Admin Panel Guide](./docs/ADMIN-PANEL-GUIDE.md)** - For content creators
- **[Client SDK Guide](./docs/CLIENT-SDK-GUIDE.md)** - For developers
- **[Deployment Guide](./docs/DEPLOYMENT-GUIDE.md)** - Deploy admin panel and
  docs
- **[Repository Privacy](./docs/REPOSITORY-PRIVACY-ANALYSIS.md)** - Public vs
  private repo decision

**[🌐 Visit Documentation Website](https://gitcms-docs.bestplayer.dev)**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           GitCMS Ecosystem                  │
├─────────────────────────────────────────────┤
│                                             │
│  Admin Panel (hosted)                       │
│  ↓ commits via GitHub API                   │
│  GitHub Repository (user's content)         │
│  ↑ reads via GitHub API                     │
│  @git-cms/client SDK (in user's app)        │
│                                             │
└─────────────────────────────────────────────┘
```

**Key Concepts:**

1. **Admin Panel** - Universal web app hosted once for all users
2. **User's GitHub Repo** - Content stored as JSON/Markdown files
3. **Client SDK** - NPM package to fetch content in user's projects

**[📖 Read Full Architecture Guide](./docs/ARCHITECTURE.md)**

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

---

## 🛠️ Development

This is a Turborepo monorepo with npm workspaces.

### Prerequisites

- Node.js 18+
- npm 10+

### Setup

```bash
# Clone repository
git clone https://github.com/BestPlayerMMIII/GitCMS.git
cd GitCMS

# Install dependencies
npm install

# Build all packages
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Development Servers

```bash
# Run all dev servers (uses Turborepo)
npm run dev

# Or run individually:
cd packages/admin && npm run dev   # Admin panel (port 3001)
cd packages/client && npm run dev  # Client SDK (watch mode)
cd packages/core && npm run dev    # Core package (watch mode)
```

### Project Structure

```
GitCMS/
├── packages/
│   ├── admin/          # Next.js admin panel
│   ├── client/         # Client SDK (published)
│   └── core/           # Core utilities (published)
├── docs/               # Documentation
├── docs-legacy/        # Historical documentation
├── ignore/             # Private notes
├── package.json        # Root package with workspaces
├── turbo.json          # Turborepo configuration
├── tsconfig.json       # Root TypeScript config
└── README.md           # This file
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Test specific package
cd packages/client && npm test
```

---

## 🚢 Deployment

### Admin Panel

Deploy to Vercel (recommended):

1. Connect GitHub repository
2. Set root directory to `packages/admin`
3. Configure environment variables
4. Deploy!

**[📖 Full Deployment Guide](./docs/DEPLOYMENT-GUIDE.md)**

### NPM Packages

Packages are already published:

- [@git-cms/client](https://www.npmjs.com/package/@git-cms/client) - v0.1.0
- [@git-cms/core](https://www.npmjs.com/package/@git-cms/core) - v0.1.1

To publish updates:

```bash
# Build packages
npm run build

# Publish (must be logged in to npm)
cd packages/core && npm publish
cd packages/client && npm publish
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write TypeScript (no plain JS)
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure `npm run type-check` passes
- Ensure `npm run lint` passes

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

Copyright (c) 2025 GitCMS

---

## 🔗 Links

- **Admin Panel:** https://gitcms-admin.bestplayer.dev
- **Documentation:** https://gitcms-docs.bestplayer.dev
- **NPM Package:**
  [@git-cms/client](https://www.npmjs.com/package/@git-cms/client)
- **GitHub:**
  [BestPlayerMMIII/GitCMS](https://github.com/BestPlayerMMIII/GitCMS)
- **Issues:** [GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)

---

## 🌟 Features Roadmap

### ✅ Completed (v0.1.0)

- [x] GitHub OAuth authentication
- [x] Repository connection
- [x] Schema designer
- [x] Rich text editor (TipTap)
- [x] Media upload and management
- [x] TypeScript SDK
- [x] Public and authenticated modes
- [x] Nested field access
- [x] Progressive media loading

### 🔄 In Progress

- [ ] Search functionality
- [ ] Multi-user collaboration
- [ ] Content versioning UI
- [ ] Branch-based workflows

### 📋 Planned (v0.2.0+)

- [ ] GraphQL API
- [ ] Caching layer with webhooks
- [ ] Real-time collaboration
- [ ] Content approval workflows
- [ ] Analytics and insights
- [ ] Custom domains for API
- [ ] White-label solutions

---

## 💬 Community & Support

- **Issues:** [GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)
- **Discussions:**
  [GitHub Discussions](https://github.com/BestPlayerMMIII/GitCMS/discussions)
- **Email:** Contact via GitHub profile

---

## 🙏 Acknowledgments

Built with:

- [Next.js](https://nextjs.org/) - React framework
- [TipTap](https://tiptap.dev/) - Rich text editor
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API client
- [Zod](https://zod.dev/) - Schema validation
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Turborepo](https://turbo.build/) - Monorepo management

Special thanks to the open-source community for inspiration and tools.

---

## 📊 Project Stats

- **Lines of Code:** ~15,000+
- **Packages:** 3 (2 published, 1 private)
- **Dependencies:** Carefully curated for minimal bundle size
- **TypeScript:** 100% type coverage
- **License:** MIT (completely open)

---

**Made with ❤️ by [Manuel Maiuolo](https://github.com/BestPlayerMMIII)**

---

## 🎯 Next Steps

1. **Try the Admin Panel:**
   [gitcms-admin.bestplayer.dev](https://gitcms-admin.bestplayer.dev)
2. **Install the SDK:** `npm install @git-cms/client`
3. **Read the Docs:** [docs/README.md](./docs/README.md)
4. **Star on GitHub:** Help spread the word! ⭐
5. **Share Feedback:** Open an issue or discussion

**Welcome to GitCMS! 🚀**
