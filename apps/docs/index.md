---
layout: home

hero:
  name: GitCMS
  text: Universal GitHub-Based CMS
  tagline:
    Transform your GitHub repository into a powerful content management system
  image:
    src: /logo.svg
    alt: GitCMS
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/BestPlayerMMIII/GitCMS
    - theme: alt
      text: Admin Panel
      link: https://gitcms-admin.bestplayer.dev

features:
  - icon: 🚀
    title: No Database Required
    details:
      All content stored in GitHub - version controlled, backed up, and
      accessible anywhere.

  - icon: 🎨
    title: Universal Admin Panel
    details:
      Beautiful web interface for managing content. One hosted interface for all
      users.

  - icon: 📝
    title: Visual Content Editor
    details:
      Rich text editing with TipTap - format content without touching code.

  - icon: 🔐
    title: GitHub OAuth
    details:
      Secure authentication with GitHub. Works with public and private
      repositories.

  - icon: 🖼️
    title: Media Management
    details:
      Upload and organize images, videos, documents with progressive loading.

  - icon: 📦
    title: TypeScript SDK
    details:
      Full type-safety for developers. Works with React, Vue, Next.js, and more.

  - icon: ⚡
    title: Framework Agnostic
    details:
      Use with any framework - Next.js, React, Vue, Astro, or vanilla
      JavaScript.

  - icon: 🌐
    title: Zero Backend
    details:
      For public repos, no backend needed. Direct client-side access to GitHub.

  - icon: 🔍
    title: Powerful Queries
    details:
      SQL-like query interface with filtering, sorting, and nested field access.
---

## Quick Start

### For Content Creators

Visit the [Admin Panel](https://gitcms-admin.bestplayer.dev) to start managing
your content visually:

1. Sign in with GitHub
2. Connect your repository
3. Define content schemas
4. Create and publish content

[Learn More →](/admin/getting-started)

### For Developers

Install the SDK and start fetching content in minutes:

```bash
npm install @git-cms/client
```

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/my-blog',
});

// Fetch published posts
const posts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.publishedAt', 'desc')
  .get();
```

[Learn More →](/client/quick-start)

## How It Works

```mermaid
graph LR
    A[Admin Panel] -->|commits via API| B[GitHub Repository]
    B -->|reads via API| C[Client SDK]
    C --> D[Your Website/App]
```

GitCMS uses GitHub as the storage backend. The admin panel writes content to
your repository, and the client SDK reads it back. Everything is
version-controlled and backed by GitHub's infrastructure.

## Use Cases

::: info Blog Management

Perfect for managing blog posts with a visual editor, media uploads, and
built-in version control.

:::

::: info Documentation Sites

Keep documentation current with an easy editor, Markdown support, and structured
content workflows.

:::

::: info Portfolio Projects

Showcase your work with rich media, flexible content schemas, and customizable
layouts.

:::

::: info App Configuration

Manage app settings, feature flags, and announcements from the dashboard — no
deployments required.

:::

## What Makes GitCMS Different?

- **No Infrastructure** - No databases, no servers to maintain
- **Git-Powered** - Full version history, branches, and collaboration
- **Universal** - One admin panel for all users and repositories
- **Developer-Friendly** - Type-safe SDK with excellent DX
- **Open Source** - MIT licensed, fully transparent

## Ready to Start?

<div class="vp-doc" style="margin-top: 2rem;">
  <a href="/guide/getting-started" class="vp-button brand" style="margin-right: 1rem;">Get Started</a>
  <a href="/admin/overview" class="vp-button alt" style="margin-right: 1rem;">Admin Guide</a>
  <a href="/client/overview" class="vp-button alt">SDK Guide</a>
</div>
