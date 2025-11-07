# GitCMS Architecture

**Last Updated:** November 6, 2025

This document provides a comprehensive overview of GitCMS's architecture, design
decisions, and how all components work together.

## 🎯 Design Philosophy

GitCMS is built on three core principles:

1. **Separation of Concerns** - Admin panel, SDK, and core utilities are
   independent
2. **Universal Access** - One admin panel serves all users worldwide
3. **Developer Freedom** - SDK works with any framework, no vendor lock-in

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        GitCMS Ecosystem                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐      ┌──────────────┐                   │
│  │  Admin Panel   │──────│   GitHub     │                   │
│  │  (Next.js)     │      │   OAuth      │                   │
│  │  Hosted Once   │      │              │                   │
│  └────────────────┘      └──────────────┘                   │
│         │                       │                            │
│         │                       │                            │
│         ▼                       ▼                            │
│  ┌────────────────────────────────────────────┐             │
│  │         GitHub Repository (User's)         │             │
│  │  ┌──────────────┐  ┌─────────────────┐   │             │
│  │  │   .gitcms/   │  │    content/     │   │             │
│  │  │   schemas    │  │  posts/         │   │             │
│  │  │   config     │  │  pages/         │   │             │
│  │  └──────────────┘  │  media/         │   │             │
│  │                     └─────────────────┘   │             │
│  └────────────────────────────────────────────┘             │
│                       │                                      │
│                       │ Reads via GitHub API                │
│                       ▼                                      │
│  ┌────────────────────────────────────────────┐             │
│  │         @git-cms/client (NPM SDK)          │             │
│  │  ┌────────────────────────────────────┐   │             │
│  │  │  User's Next.js / React / Vue App  │   │             │
│  │  │  or Mobile App or Static Site      │   │             │
│  │  └────────────────────────────────────┘   │             │
│  └────────────────────────────────────────────┘             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Package Structure

### Monorepo Layout

```
GitCMS/
├── packages/
│   ├── admin/          # Universal admin panel (Next.js)
│   ├── client/         # NPM SDK for developers
│   └── core/           # Shared utilities
├── docs/               # Documentation (this folder)
├── docs-legacy/        # Historical documentation
├── ignore/             # Private notes and planning
└── [config files]      # package.json, turbo.json, etc.
```

### Package Dependencies

```
┌─────────────────┐
│  packages/admin │
│  (Next.js app)  │
│                 │
│  Depends on:    │
│  - @git-cms/core│
└─────────────────┘
        │
        │
        ▼
┌─────────────────┐      ┌──────────────────┐
│ packages/client │      │  packages/core   │
│ (NPM package)   │─────▶│  (NPM package)   │
│                 │      │                  │
│ Depends on:     │      │  Pure utilities  │
│ - @git-cms/core │      │  No dependencies │
└─────────────────┘      │  on admin/client │
                         └──────────────────┘
```

### Why This Structure?

1. **Admin is Private** - You deploy it once for all users
2. **Client is Public** - Published to NPM for developers
3. **Core is Public** - Published to NPM, used by both admin and client
4. **Independence** - Client works without admin, admin works without client

## 🎨 Admin Panel (`packages/admin`)

### Purpose

Provide a **universal web interface** where any GitHub user can manage content
in their repositories without cloning your code.

### Key Features

- GitHub OAuth authentication
- Repository connection wizard
- Visual schema designer
- Rich text content editor (TipTap)
- Media upload and management
- Content preview
- Multi-repository support per user

### Technology Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 18, TailwindCSS
- **Editor:** TipTap (rich text)
- **Auth:** NextAuth.js with GitHub provider
- **API:** Octokit (GitHub API)

### User Flow

```
1. User visits https://gitcms-admin.bestplayer.dev
2. Clicks "Sign in with GitHub"
3. Authorizes GitCMS Admin Panel
4. Selects or connects repository
5. (First time) Runs setup wizard
6. Defines content schemas
7. Creates/edits content
8. Admin panel commits to GitHub
9. Content is available via GitHub API
```

### Deployment Strategy

- **Hosted Once** by you (the creator)
- **URL:** Custom domain (e.g., `gitcms-admin.bestplayer.dev`)
- **Platform:** Vercel (recommended)
- **Environment Variables:**
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`

### Why Not Published to NPM?

The admin panel is a **hosted service**, not a library:

- Users don't run it locally
- No need for them to deploy their own instance
- Reduces complexity for non-technical users
- You control updates and features
- Single source of truth

## 📚 Client SDK (`packages/client`)

### Purpose

Provide a **TypeScript SDK** that developers install to fetch content from their
GitHub repositories into their projects.

### Key Features

- Public and authenticated modes
- SQL-like query interface
- Nested field access with dot notation
- Progressive media loading
- Type-safe TypeScript API
- Framework agnostic
- Rate limit monitoring

### Technology Stack

- **Language:** TypeScript
- **Build:** tsup (dual ESM/CJS)
- **API:** Octokit (GitHub API)
- **Dependencies:** @git-cms/core, @octokit/rest

### Usage Patterns

#### 1. Client-Side (Public Repos)

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/blog',
  // No token - safe for browsers
});

const posts = await cms.from('posts').get();
```

#### 2. Server-Side (Private Repos)

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'company/private-content',
  token: process.env.GITHUB_TOKEN, // Server only!
});

const data = await cms.from('products').get();
```

#### 3. Next.js Server Actions

```typescript
'use server';

export async function getPosts() {
  const cms = new GitCMS({
    repository: 'username/blog',
    token: process.env.GITHUB_TOKEN,
  });
  return await cms.from('posts').get();
}
```

### Transport Modes

| Mode              | Token Required | Rate Limit     | Use Case                   |
| ----------------- | -------------- | -------------- | -------------------------- |
| **Public**        | ❌ No          | 60/hour per IP | Public repos, client-side  |
| **Authenticated** | ✅ Yes         | 5,000/hour     | Private repos, server-side |

### Why Published to NPM?

Developers need to **install** the SDK in their projects:

- Standard package installation workflow
- Dependency management via npm/yarn/pnpm
- Semantic versioning
- Wide distribution
- TypeScript definitions included

## 🔧 Core Package (`packages/core`)

### Purpose

Shared utilities, types, and GitHub integration logic used by both admin panel
and client SDK.

### Key Components

- **GitHub API wrappers** - Simplified Octokit operations
- **Content parser** - Parse JSON/Markdown with frontmatter
- **Schema validation** - Zod schemas for content types
- **Media utilities** - Image optimization, CDN URLs
- **Query engine** - SQL-like filtering and sorting
- **Type definitions** - Shared TypeScript types

### Technology Stack

- **Language:** TypeScript
- **Build:** tsup (dual ESM/CJS)
- **Validation:** Zod
- **Dependencies:** @octokit/rest, gray-matter, yaml

### Why Published to NPM?

- Client SDK depends on it (`@git-cms/core`)
- Users might install client SDK separately
- Enables independent versioning
- Professional package structure

### Why Users Don't Install It Directly?

It's a **dependency**, not a standalone tool:

- Automatically installed via `@git-cms/client`
- No direct user-facing API
- Internal implementation details

## 🔐 Authentication & Security

### Admin Panel Authentication

```
1. User clicks "Sign in with GitHub"
2. Redirects to GitHub OAuth flow
3. GitHub returns authorization code
4. NextAuth exchanges code for access token
5. Token stored in encrypted session cookie
6. Admin uses token for GitHub API calls
```

**Security Measures:**

- OAuth tokens stored server-side only
- Session cookies encrypted
- HTTPS enforced
- Token never exposed to client
- Scopes limited to necessary permissions

### Client SDK Authentication

#### Public Mode (No Token)

- Uses GitHub's public API
- No authentication required
- 60 requests/hour per IP
- Safe for client-side use

#### Authenticated Mode (With Token)

- Requires personal access token or GitHub App token
- 5,000 requests/hour
- **Server-side only** (never expose token in browser)
- Higher rate limits

### Best Practices

```typescript
// ✅ GOOD: Server-side only
// Next.js API Route
export async function GET() {
  const cms = new GitCMS({
    repository: 'username/repo',
    token: process.env.GITHUB_TOKEN, // Server env var
  });
  return Response.json(await cms.from('posts').get());
}

// ❌ BAD: Never do this
// Client component
const cms = new GitCMS({
  repository: 'username/repo',
  token: 'ghp_xxxxx', // EXPOSED IN BROWSER!
});
```

## 📊 Data Flow

### Content Creation Flow

```
┌──────────────────┐
│  Content Creator │
│  (Your User)     │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  GitCMS Admin Panel                 │
│  - Rich text editor                 │
│  - Form fields based on schema      │
│  - Media upload                     │
└────────┬────────────────────────────┘
         │ Commits via GitHub API
         ▼
┌─────────────────────────────────────┐
│  User's GitHub Repository           │
│  content/posts/my-post.md           │
│  {                                  │
│    "title": "Hello World",          │
│    "content": "...",                │
│    "publishedAt": "2025-11-06"     │
│  }                                  │
└────────┬────────────────────────────┘
         │
         │ Fetches via GitHub API
         ▼
┌─────────────────────────────────────┐
│  @git-cms/client SDK                │
│  const posts = await cms            │
│    .from('posts').get()             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Developer's Application            │
│  (Next.js, React, Vue, Mobile, etc) │
│  - Displays content to end users    │
└─────────────────────────────────────┘
```

### Schema Definition Flow

```
1. User defines schema in Admin Panel
   ↓
2. Admin saves to .gitcms/schemas/post.json
   ↓
3. Schema committed to GitHub
   ↓
4. Admin generates form based on schema
   ↓
5. Content created matches schema structure
   ↓
6. Client SDK validates content against schema
```

## 🎯 Design Decisions

### Why GitHub for Storage?

**Pros:**

- ✅ Free hosting (no database costs)
- ✅ Built-in version control
- ✅ Collaboration features (PRs, issues)
- ✅ CDN for raw file access
- ✅ Familiar to developers
- ✅ Reliable infrastructure
- ✅ API-first design

**Cons:**

- ❌ API rate limits (mitigated with caching)
- ❌ Not suitable for real-time apps (but CMS content is mostly static)
- ❌ Requires GitHub account (acceptable for target users)

### Why One Universal Admin Panel?

**Benefits:**

- Users don't need to deploy anything
- Updates happen automatically for all users
- Reduced support burden
- Professional hosted service
- Lower barrier to entry

**Alternative (Not Chosen):**

- Users clone repo and deploy their own admin
- More complex setup
- Users responsible for updates
- Higher barrier to entry

### Why NPM for Client SDK?

**Benefits:**

- Standard JavaScript package distribution
- Automatic dependency management
- Semantic versioning
- Wide ecosystem compatibility
- TypeScript definitions included

**Alternative (Not Chosen):**

- Users copy SDK code manually
- No versioning
- No dependency management

### Why Next.js for Admin?

**Benefits:**

- Modern React framework
- Server components for security
- Built-in API routes
- Excellent DX (developer experience)
- Easy deployment to Vercel
- NextAuth.js integration

**Alternatives Considered:**

- Remix, Nuxt, SvelteKit (all viable, Next.js chosen for ecosystem)

## 🚀 Scalability

### Rate Limiting Strategy

**GitHub API Limits:**

- Public mode: 60/hour per IP
- Authenticated: 5,000/hour per token
- LFS files: Unlimited (raw content)

**Mitigation:**

- Caching layer (planned)
- Rate limit monitoring
- Progressive enhancement
- Static generation at build time

### Performance Optimization

**Admin Panel:**

- Server components reduce bundle size
- Optimistic UI updates
- Lazy loading for media
- Incremental Static Regeneration

**Client SDK:**

- Minimal dependencies
- Tree-shakeable exports
- Thumbnail pre-loading
- Async full-resolution fetching

## 🔮 Future Architecture Plans

### Planned Features

1. **Caching Layer**
   - Redis/Upstash for content caching
   - Webhook-based invalidation
   - Reduce GitHub API calls

2. **Webhooks Integration**
   - Real-time content updates
   - Automated cache invalidation
   - Build trigger notifications

3. **GraphQL API**
   - Alternative to REST queries
   - Complex relational queries
   - Better performance for some use cases

4. **Content Search**
   - Full-text search with Elasticsearch/Algolia
   - Or client-side search with Fuse.js
   - Search across all content types

5. **Multi-Branch Support**
   - Draft branches
   - Content staging
   - Preview deployments

### Architecture Evolution

**Current (v0.1.0):**

```
Admin Panel → GitHub API → GitHub Repo
Client SDK → GitHub API → GitHub Repo
```

**Planned (v0.2.0):**

```
Admin Panel → GitHub API → GitHub Repo → Webhooks → Cache
Client SDK → Cache API → Cache Layer (Redis)
              ↓ (cache miss)
           GitHub API → GitHub Repo
```

## 📚 Related Documentation

- **[Admin Panel Guide](./ADMIN-PANEL-GUIDE.md)** - How to use the admin
  interface
- **[Client SDK Guide](./CLIENT-SDK-GUIDE.md)** - How to integrate the SDK
- **[Deployment Guide](./DEPLOYMENT-GUIDE.md)** - How to deploy admin panel

---

**Questions or feedback?** Open an issue on
[GitHub](https://github.com/BestPlayerMMIII/GitCMS/issues).
