# GitCMS Documentation

**Version:** 0.1.0  
**Last Updated:** November 6, 2025

Welcome to the GitCMS documentation. This documentation covers the complete
GitCMS ecosystem designed to transform GitHub repositories into powerful,
user-friendly content management systems.

## 📚 Documentation Index

### Essential Guides

1. **[Architecture Overview](./ARCHITECTURE.md)** - System design, packages, and
   how everything works together
2. **[Admin Panel Guide](./ADMIN-PANEL-GUIDE.md)** - Complete guide for content
   creators using the GitCMS Admin Panel
3. **[Client SDK Guide](./CLIENT-SDK-GUIDE.md)** - Developer guide for
   integrating @git-cms/client into your projects
4. **[Deployment Guide](./DEPLOYMENT-GUIDE.md)** - How to deploy the admin panel
   and documentation website

### Additional Resources

5. **[Repository Privacy Analysis](./REPOSITORY-PRIVACY-ANALYSIS.md)** - Should
   you make the repository public or keep it private?
6. **[Documentation Website Proposal](./DOCUMENTATION-WEBSITE-PROPOSAL.md)** -
   Plan for creating a professional docs website
7. **[Project Summary](./PROJECT-SUMMARY.md)** - Complete overview of what's
   been created and next steps
8. **[Quick Reference](./QUICK-REFERENCE.md)** - Quick commands and checklists
   for common tasks

## 🎯 What is GitCMS?

GitCMS is a **universal GitHub-based Content Management System** that combines
the reliability and version control of Git with the usability of modern CMS
interfaces.

### Key Benefits

- **No Database Required** - All content stored as files in GitHub
- **Version Control Built-in** - Every change is tracked with Git
- **Universal Admin Panel** - One hosted interface for all users
- **Type-Safe SDK** - Full TypeScript support for developers
- **Cost Effective** - Leverages GitHub's infrastructure
- **Framework Agnostic** - Works with any frontend framework

## 🏗️ System Architecture

GitCMS consists of three main components:

### 1. Admin Panel (`packages/admin`)

A Next.js web application that provides a visual interface for managing content.
Users authenticate with GitHub OAuth and can:

- Connect their repositories
- Define content schemas
- Create and edit content
- Upload and manage media
- All without leaving the browser

**Live URL:** `https://gitcms-admin.bestplayer.dev` (or your custom domain)

### 2. Client SDK (`@git-cms/client`)

An NPM package that developers install in their projects to fetch content from
GitHub repositories. Features:

- Works with public and private repositories
- Type-safe TypeScript API
- Progressive media loading
- SQL-like query interface
- Framework agnostic

**NPM:** `npm install @git-cms/client`

### 3. Core Package (`@git-cms/core`)

Shared utilities, types, and GitHub integration used by both admin and client
packages. This is an internal dependency and not directly used by end users.

## 👥 User Roles

### Content Creators (Your Users)

People who use the **GitCMS Admin Panel** to manage content in their GitHub
repositories:

- Bloggers managing their blog content
- Developers managing app configuration
- Teams managing documentation
- Anyone who wants a visual interface for file-based content

### Developers (Your Users)

People who use the **@git-cms/client SDK** in their projects:

- Frontend developers building websites
- Mobile app developers managing app content
- Static site generator users
- Anyone integrating GitHub-based content

### You (GitCMS Creator)

The maintainer of GitCMS who:

- Develops and maintains the packages
- Deploys the universal admin panel
- Publishes updates to NPM
- Provides documentation and support

## 🚀 Quick Start

### For Content Creators

1. Visit the **[GitCMS Admin Panel](https://gitcms-admin.bestplayer.dev)**
2. Sign in with GitHub
3. Connect your repository
4. Define content schemas
5. Start creating content

See **[Admin Panel Guide](./ADMIN-PANEL-GUIDE.md)** for details.

### For Developers

1. Install the client SDK:

   ```bash
   npm install @git-cms/client
   ```

2. Use in your project:

   ```typescript
   import { GitCMS } from '@git-cms/client';

   const cms = new GitCMS({
     repository: 'username/my-repo',
   });

   const posts = await cms.from('posts').get();
   ```

See **[Client SDK Guide](./CLIENT-SDK-GUIDE.md)** for details.

### For Deployment

See **[Deployment Guide](./DEPLOYMENT-GUIDE.md)** to deploy your own instance.

## 📦 NPM Packages

### Published Packages

- **[@git-cms/client](https://www.npmjs.com/package/@git-cms/client)** -
  v0.1.0 - Client SDK for developers
- **[@git-cms/core](https://www.npmjs.com/package/@git-cms/core)** - v0.1.1 -
  Core utilities (internal)

### Private Packages

- **@git-cms/admin** - Universal admin panel (not published to NPM)

## 🔗 Important Links

- **GitHub Repository:**
  [BestPlayerMMIII/GitCMS](https://github.com/BestPlayerMMIII/GitCMS)
- **Admin Panel:** https://gitcms-admin.bestplayer.dev
- **Documentation:** https://gitcms-docs.bestplayer.dev
- **NPM Package:**
  [@git-cms/client](https://www.npmjs.com/package/@git-cms/client)
- **Issues:** [GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)

## 💡 Use Cases

### Blog Management

Manage blog posts in Markdown/JSON with frontmatter, tags, and featured images.
Perfect for static site generators.

### Portfolio Content

Manage projects, case studies, and work samples with rich media support.

### App Configuration

Store feature flags, announcements, and app settings in GitHub for mobile/web
apps.

### Documentation

Create and maintain documentation with version control and team collaboration.

### E-commerce Catalog

Manage product information, images, and metadata for e-commerce sites.

## 🛠️ Technology Stack

- **Frontend:** Next.js 15, React 18, TypeScript
- **Styling:** TailwindCSS
- **Rich Text Editor:** TipTap
- **Authentication:** NextAuth.js with GitHub OAuth
- **API Integration:** Octokit (GitHub API)
- **Monorepo:** Turborepo
- **Package Manager:** NPM

## 📄 License

GitCMS is released under the **MIT License**. See [LICENSE](../LICENSE) for
details.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)
- **Email:** Contact via GitHub profile
- **Documentation:** This documentation site

---

**Made with ❤️ by [Manuel Maiuolo](https://github.com/BestPlayerMMIII)**
