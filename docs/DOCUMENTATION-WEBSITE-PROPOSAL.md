# Documentation Website Proposal

**Last Updated:** November 6, 2025

This document outlines the proposal for creating a professional documentation
website for GitCMS.

## 🎯 Goals

1. **Comprehensive** - Cover all aspects of GitCMS
2. **User-Friendly** - Easy navigation and search
3. **Professional** - Modern design, fast loading
4. **Maintainable** - Easy to update and deploy
5. **SEO-Optimized** - Good search engine visibility

## 🏗️ Technology Stack Recommendations

### Option 1: Astro (⭐ Recommended)

**Why Astro?**

- ✅ **Fastest** - Static site generation, minimal JS
- ✅ **Markdown-first** - Perfect for docs
- ✅ **Component Islands** - Add React/Vue where needed
- ✅ **Built-in Features** - Syntax highlighting, MDX support
- ✅ **Great DX** - Fast dev server, hot reload
- ✅ **SEO-Friendly** - Static HTML, great performance

**Template:** [Astro Starlight](https://starlight.astro.build/) - Official docs
template

```bash
npm create astro@latest -- --template starlight
```

**Features:**

- Sidebar navigation (auto-generated)
- Table of contents
- Search (Pagefind)
- Dark mode
- Syntax highlighting
- Mobile responsive
- Fast (~90KB JS bundle)

### Option 2: Next.js with Nextra

**Why Nextra?**

- ✅ Built on Next.js (same as admin panel)
- ✅ MDX support
- ✅ Good documentation framework
- ✅ Active development

**Template:** [Nextra](https://nextra.site/)

```bash
npx create-next-app --example with-nextra my-docs
```

**Features:**

- Sidebar navigation
- Search (FlexSearch)
- Dark mode
- Code syntax highlighting
- I18n support

### Option 3: Docusaurus

**Why Docusaurus?**

- ✅ Facebook-backed, very mature
- ✅ Feature-rich
- ✅ Great for large projects

**But:**

- ❌ Heavier bundle size
- ❌ React-only
- ❌ More complex than Astro

### Option 4: VitePress

**Why VitePress?**

- ✅ Vue-based
- ✅ Very fast
- ✅ Simple

**But:**

- ❌ Less feature-rich than Astro Starlight
- ❌ Vue ecosystem (different from your React stack)

## 📋 Recommendation

**Use Astro with Starlight template** because:

1. Fastest performance (critical for docs)
2. Best developer experience
3. Markdown-first (your docs are already Markdown)
4. Professional out-of-the-box design
5. Growing ecosystem

## 🎨 Proposed Structure

```
apps/docs/
├── src/
│   ├── content/
│   │   └── docs/
│   │       ├── index.mdx              # Home
│   │       ├── getting-started/
│   │       │   ├── overview.md
│   │       │   ├── quick-start.md
│   │       │   └── installation.md
│   │       ├── admin-panel/
│   │       │   ├── index.md
│   │       │   ├── connecting-repo.md
│   │       │   ├── creating-schemas.md
│   │       │   ├── creating-content.md
│   │       │   ├── media-management.md
│   │       │   └── troubleshooting.md
│   │       ├── client-sdk/
│   │       │   ├── index.md
│   │       │   ├── installation.md
│   │       │   ├── configuration.md
│   │       │   ├── querying.md
│   │       │   ├── media.md
│   │       │   ├── typescript.md
│   │       │   └── examples/
│   │       │       ├── nextjs.md
│   │       │       ├── react.md
│   │       │       ├── vue.md
│   │       │       └── astro.md
│   │       ├── architecture/
│   │       │   ├── index.md
│   │       │   ├── packages.md
│   │       │   ├── data-flow.md
│   │       │   └── security.md
│   │       ├── deployment/
│   │       │   ├── admin-panel.md
│   │       │   ├── docs-site.md
│   │       │   └── custom-domains.md
│   │       ├── guides/
│   │       │   ├── blog-setup.md
│   │       │   ├── portfolio-setup.md
│   │       │   ├── ecommerce-setup.md
│   │       │   └── app-config.md
│   │       └── api/
│   │           ├── client-api.md
│   │           ├── types.md
│   │           └── utilities.md
│   └── components/
│       ├── Demo.astro
│       ├── CodeExample.astro
│       └── ApiReference.astro
├── public/
│   ├── images/
│   └── screenshots/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## 📄 Content Organization

### Navigation Structure

```
Home
│
├── Getting Started
│   ├── Overview
│   ├── Quick Start
│   └── Installation
│
├── Admin Panel Guide
│   ├── Introduction
│   ├── Connecting Repository
│   ├── Creating Schemas
│   ├── Creating Content
│   ├── Media Management
│   └── Troubleshooting
│
├── Client SDK Guide
│   ├── Introduction
│   ├── Installation
│   ├── Configuration
│   ├── Querying Content
│   ├── Working with Media
│   ├── TypeScript Support
│   └── Framework Examples
│       ├── Next.js
│       ├── React
│       ├── Vue
│       └── Astro
│
├── Architecture
│   ├── Overview
│   ├── Packages
│   ├── Data Flow
│   └── Security
│
├── Deployment
│   ├── Admin Panel
│   ├── Documentation Site
│   └── Custom Domains
│
├── Guides & Tutorials
│   ├── Blog Setup
│   ├── Portfolio Setup
│   ├── E-commerce Setup
│   └── App Configuration
│
└── API Reference
    ├── Client API
    ├── Types
    └── Utilities
```

## 🚀 Implementation Steps

### Step 1: Create Astro Project

```bash
# Navigate to apps directory
cd apps

# Create docs site with Starlight template
npm create astro@latest docs -- --template starlight --typescript strict
```

### Step 2: Configure Starlight

**astro.config.mjs:**

```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'GitCMS Docs',
      description: 'Complete guide to using GitCMS',
      logo: {
        src: './public/logo.svg',
      },
      social: {
        github: 'https://github.com/BestPlayerMMIII/GitCMS',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', link: '/getting-started/overview/' },
            { label: 'Quick Start', link: '/getting-started/quick-start/' },
            { label: 'Installation', link: '/getting-started/installation/' },
          ],
        },
        {
          label: 'Admin Panel',
          autogenerate: { directory: 'admin-panel' },
        },
        {
          label: 'Client SDK',
          autogenerate: { directory: 'client-sdk' },
        },
        {
          label: 'Architecture',
          autogenerate: { directory: 'architecture' },
        },
        {
          label: 'Deployment',
          autogenerate: { directory: 'deployment' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'api' },
        },
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        // Override default components if needed
        Head: './src/components/Head.astro',
      },
    }),
  ],
});
```

### Step 3: Copy Existing Documentation

Convert your existing docs from `../../docs/` to Astro format:

```bash
# Script to copy and convert docs
cp ../../docs/README.md src/content/docs/getting-started/overview.md
cp ../../docs/ARCHITECTURE.md src/content/docs/architecture/index.md
cp ../../docs/ADMIN-PANEL-GUIDE.md src/content/docs/admin-panel/index.md
cp ../../docs/CLIENT-SDK-GUIDE.md src/content/docs/client-sdk/index.md
cp ../../docs/DEPLOYMENT-GUIDE.md src/content/docs/deployment/index.md
```

### Step 4: Add Frontmatter

Each Markdown file needs frontmatter for Starlight:

```markdown
---
title: Admin Panel Guide
description: Complete guide for content creators using GitCMS Admin Panel
---

# Admin Panel Guide

Content here...
```

### Step 5: Add Custom Components

**src/components/Demo.astro:**

```astro
---
interface Props {
  title: string;
  code: string;
}
const { title, code } = Astro.props;
---

<div class="demo">
  <h4>{title}</h4>
  <div class="demo-content">
    <pre><code>{code}</code></pre>
  </div>
</div>

<style>
  .demo {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
  }
</style>
```

### Step 6: Add Search

Starlight includes Pagefind search by default. No configuration needed!

### Step 7: Deploy to Vercel

**package.json:**

```json
{
  "name": "@gitcms/docs",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev --port 3002",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  }
}
```

**Vercel Configuration:**

```
Framework: Astro
Root Directory: apps/docs
Build Command: npm run build
Output Directory: dist
```

## 🎨 Design Customization

### Custom Theme

**src/styles/custom.css:**

```css
:root {
  --sl-color-accent-low: #1e40af;
  --sl-color-accent: #3b82f6;
  --sl-color-accent-high: #60a5fa;
  --sl-color-white: #ffffff;
  --sl-color-gray-1: #f8fafc;
  --sl-color-gray-2: #e2e8f0;
  --sl-color-gray-3: #cbd5e1;
  --sl-color-gray-4: #94a3b8;
  --sl-color-gray-5: #64748b;
  --sl-color-gray-6: #475569;
  --sl-color-black: #0f172a;
}

/* Custom header */
.sl-header {
  background: linear-gradient(to right, #1e40af, #3b82f6);
}

/* Custom code blocks */
pre {
  border-radius: 8px;
}

/* Custom callouts */
.sl-callout {
  border-left: 4px solid var(--sl-color-accent);
}
```

### Add Logo

Place logo in `public/logo.svg` and reference in config.

## 📊 Features to Include

### Interactive Code Examples

```astro
---
import CodeExample from '../../components/CodeExample.astro';
---

<CodeExample
  title="Fetch Blog Posts"
  language="typescript"
  code={`
const cms = new GitCMS({ repository: 'user/blog' });
const posts = await cms.from('posts').get();
  `}
/>
```

### API Reference Tables

```markdown
## GitCMS Constructor

| Parameter  | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| repository | string | Yes      | GitHub repo (owner/repo)   |
| token      | string | No       | GitHub token               |
| branch     | string | No       | Git branch (default: main) |
```

### Expandable Sections

```markdown
:::details Show Advanced Configuration Advanced configuration options... :::
```

### Callouts

```markdown
:::tip Use public mode for client-side apps with public repos! :::

:::warning Never expose GitHub tokens in browser code! :::

:::danger Deleting a schema will orphan existing content! :::
```

## 🔍 SEO Optimization

### Meta Tags

**src/components/Head.astro:**

```astro
---
import { AstroSeo } from '@astrolib/seo';
---

<AstroSeo
  title="GitCMS Documentation - GitHub-Based CMS"
  description="Complete guide to GitCMS, the universal GitHub-based content management system."
  canonical="https://gitcms-docs.bestplayer.dev"
  openGraph={{
    url: 'https://gitcms-docs.bestplayer.dev',
    title: 'GitCMS Documentation',
    description: 'Complete guide to GitCMS',
    images: [
      {
        url: 'https://gitcms-docs.bestplayer.dev/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GitCMS Documentation',
      },
    ],
    site_name: 'GitCMS Docs',
  }}
  twitter={{
    handle: '@yourusername',
    site: '@yourusername',
    cardType: 'summary_large_image',
  }}
/>
```

### Sitemap

Astro generates sitemap automatically:

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://gitcms-docs.bestplayer.dev',
  integrations: [
    starlight({...}),
  ],
});
```

## 📈 Analytics

### Vercel Analytics

```javascript
// astro.config.mjs
import vercel from '@astrojs/vercel/static';

export default defineConfig({
  adapter: vercel({
    analytics: true,
  }),
});
```

### Google Analytics

```astro
---
// src/components/GoogleAnalytics.astro
---
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 🚀 Deployment

### Build & Deploy

```bash
# Build
npm run build

# Preview locally
npm run preview

# Deploy to Vercel (automatic via Git push)
git push origin main
```

### DNS Configuration

```
Type: CNAME
Name: gitcms-docs
Target: cname.vercel-dns.com
Proxy: Enabled (orange cloud)
```

## 📋 Maintenance Plan

### Regular Updates

1. **Version releases** - Update docs when packages are updated
2. **User feedback** - Add FAQs based on common questions
3. **New features** - Document new features immediately
4. **Screenshots** - Keep screenshots up-to-date
5. **Examples** - Add more real-world examples

### Documentation Checklist

- [ ] All pages have proper frontmatter
- [ ] All links work (internal and external)
- [ ] All code examples are tested
- [ ] All screenshots are current
- [ ] Search functionality works
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Syntax highlighting works
- [ ] Table of contents accurate
- [ ] SEO meta tags complete

## 🎯 Summary

**Recommended Stack:**

- Framework: Astro with Starlight
- Hosting: Vercel
- Domain: gitcms-docs.bestplayer.dev
- Search: Pagefind (built-in)
- Analytics: Vercel Analytics

**Estimated Setup Time:** 4-6 hours

**Benefits:**

- ✅ Professional documentation site
- ✅ Fast performance (static)
- ✅ Easy to maintain (Markdown)
- ✅ Great SEO
- ✅ Built-in search
- ✅ Mobile responsive
- ✅ Dark mode

**Next Steps:**

1. Create Astro project with Starlight
2. Copy and convert existing docs
3. Add custom components
4. Deploy to Vercel
5. Configure DNS
6. Announce to users

---

**Ready to build?** Follow the [Deployment Guide](./DEPLOYMENT-GUIDE.md) to get
started!
