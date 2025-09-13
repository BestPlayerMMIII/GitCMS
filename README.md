# GitCMS - Universal GitHub-Based Content Management System

A revolutionary approach to content management that combines the reliability of Git with the usability of modern CMS interfaces.

## 🚀 Features

- **Universal Web Interface**: One admin panel works for any GitHub repository
- **Visual Content Editor**: Rich text editor, form-based editing, drag & drop
- **Zero Configuration**: Auto-detect content structure or easy setup wizard
- **Integrated Media CDN**: GitHub-based asset management with CDN delivery
- **Dynamic Schema**: Add/modify content types through the UI
- **Collaboration Tools**: User management, approval workflows, real-time editing

## 🏗️ Architecture

This is a monorepo containing:

- **packages/admin**: Next.js admin interface
- **packages/client**: TypeScript SDK for consumer projects
- **packages/core**: Shared utilities and types
- **packages/cli**: Command line tools
- **apps/web**: Marketing website
- **apps/docs**: Documentation site
- **examples/**: Example implementations

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build all packages
npm run build

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## 📦 Packages

### @gitcms/admin
The main admin interface for managing content through a web UI.

### @gitcms/client
TypeScript SDK for integrating GitCMS with consumer projects.

### @gitcms/core
Shared utilities, types, and schemas used across the GitCMS ecosystem.

### @gitcms/cli
Command line tools for setup, migration, and management.

## 🎯 Getting Started

1. **Set up your repository**: Connect your GitHub repository
2. **Define content types**: Create schemas for your content
3. **Start creating**: Use the admin interface to manage content
4. **Integrate**: Use the client SDK in your projects

## 📖 Documentation

Visit our [documentation site](./apps/docs) for detailed guides and API references.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for more information.

## 📄 License

MIT License - see LICENSE file for details.