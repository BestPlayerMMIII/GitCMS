# Building GitCMS: A Git-Powered Content Management Revolution

## The Origin Story: From Portfolio Problems to Universal Solution

What started as a simple question—"How do I manage content for my
portfolio?"—evolved into something much bigger. I wanted to build a magical
portfolio showcasing my projects, blog posts, work-in-progress experiments, and
collaborations. But I ran into a fundamental problem that every developer faces:
**choosing the right content management solution**.

The requirements seemed simple enough:

- Flexible content structure (not all content is the same)
- Easy to manage and update
- Scalable and maintainable
- Cost-effective (preferably free)
- Version controlled (because why wouldn't you version your content?)
- No vendor lock-in

But as I evaluated the options, each had significant drawbacks that made me
uncomfortable.

## The Great Database Dilemma

### The Contenders

I evaluated every major solution:

**1. Supabase** - The modern PostgreSQL powerhouse with auto-generated APIs,
real-time updates, and beautiful TypeScript support. But vendor lock-in, scaling
costs, and infrastructure complexity made me pause. Did I really want my
portfolio dependent on a third-party service?

**2. MongoDB/Firebase** - Fantastic developer experience and NoSQL flexibility.
But again, vendor lock-in, query limitations, and the potential for spiraling
costs as the project grows.

**3. Self-Hosted PostgreSQL + Prisma** - Ultimate control and power. But also
ultimate responsibility: managing servers, backups, migrations, and scaling. I
wanted to build a portfolio, not become a database administrator.

**4. Notion API** - Beautiful UI, perfect for collaboration, loved by everyone.
But the API is rigid, rate-limited, and you're at the mercy of Notion's changes
and limitations.

**5. File System + Git** - The old-school approach. Markdown and JSON files,
versioned by Git, completely free, zero vendor lock-in, total control. The
problem? Editing raw JSON files is intimidating for non-developers, and there's
no visual interface.

### The Revelation

Then it hit me: **What if I could have both?**

What if I could combine the **control and flexibility of file-based content**
with the **user-friendliness of modern CMS interfaces**? What if I could use
**GitHub as the database** and build a beautiful admin panel on top of it?

That's when GitCMS was born.

## The Vision: GitHub as a Universal CMS

GitCMS is a **universal, GitHub-based Content Management System** that provides
a beautiful, intuitive web interface for managing any type of structured content
stored as files in GitHub repositories.

### Core Principles

1. **Universal by Design**: One admin panel works for ANY GitHub repository -
   whether it's a blog, portfolio, documentation site, mobile app content, or
   anything else.

2. **File-First Philosophy**: All content is stored as structured files (JSON,
   Markdown) in your GitHub repository. No database, no vendor lock-in, complete
   ownership.

3. **Git-Powered**: Every change is a Git commit. Full version history,
   branching, and all the power of Git for your content.

4. **Developer-Friendly SDK**: A published npm package (`@git-cms/client`) that
   developers can install in any project to fetch content with full TypeScript
   support.

5. **Zero Configuration**: Auto-detect content structure or use an easy setup
   wizard. No complex configurations needed.

## Architectural Decisions: The "Why" Behind the "How"

### 1. Monorepo Architecture with Turborepo

**Decision**: Use a monorepo structure with separate packages for `admin`,
`client`, `core`, and future extensions.

**Why**:

- Share common utilities and types across packages
- Manage dependencies centrally
- Build and deploy packages independently
- Easier to maintain consistency across the ecosystem

**Structure**:

```
packages/
  admin/    # Next.js admin interface
  client/   # TypeScript SDK (will be published to npm)
  core/     # Shared utilities, types, GitHub integration
```

### 2. Next.js 14+ with App Router for Admin Panel

**Decision**: Use Next.js 14 with the new App Router for the admin interface.

**Why**:

- Server Components for better performance
- Built-in API routes for backend logic
- Excellent TypeScript support
- Easy deployment to Vercel
- React Server Actions for seamless data mutations

### 3. GitHub OAuth for Authentication

**Decision**: Use NextAuth.js with GitHub OAuth as the sole authentication
method.

**Why**:

- Users already have GitHub accounts (our target audience)
- Automatic repository access permissions
- No need to manage separate user databases
- Secure token management built-in
- Users authenticate directly with the source of truth

### 4. Direct Client-to-GitHub Communication

**The Breakthrough Decision**

Early in development, the architecture had a critical flaw: all file operations
went through the backend server:

```
User uploads 10MB file
  ↓
Browser → Backend API (10MB)
  ↓
Backend → GitHub (10MB)

Total: 20MB bandwidth on Vercel
```

For a free-tier Vercel deployment, this was unsustainable. Large media files
would quickly exhaust bandwidth quotas.

**Solution**: Refactor to enable **direct client-to-GitHub communication**.

**New Architecture**:

```
User uploads 10MB file
  ↓
Browser → /api/auth/token (<1KB)
  ↓
Browser → GitHub API (10MB directly)

Total: <1KB bandwidth on Vercel ✅
```

**How It Works**:

1. **Token Endpoint** (`/api/auth/token`): The ONLY backend endpoint needed
   - Returns user's GitHub access token
   - Requires valid NextAuth session
   - Rate-limited (100 requests/minute/user)
   - CORS-restricted to same origin

2. **Client GitHub API** (`ClientGitHubApi`): Client-side GitHub wrapper
   - Fetches tokens on-demand
   - Never stores tokens in localStorage
   - 30-minute in-memory cache to reduce requests
   - Handles all GitHub operations directly from browser

**Why This Is Secure**:

- ✅ Tokens are only exchanged, never stored client-side
- ✅ Requires authenticated NextAuth session (httpOnly cookies)
- ✅ Rate limiting prevents abuse
- ✅ Same-origin policy prevents CSRF
- ✅ Tokens cached in memory (lost on page refresh)
- ✅ 30-minute cache window limits exposure if compromised

**Benefits**:

- 🚀 Zero backend bandwidth for file operations
- 💰 Free tier sustainable even with large files
- ⚡ Faster uploads (no backend proxy)
- 🔒 Still secure (no token exposure)
- 📈 Infinitely scalable

### 5. Schema-Driven Content Management

**Decision**: Use JSON Schema-based content type definitions with a visual
schema designer.

**Why**:

- Dynamic form generation based on schemas
- Real-time validation
- Type-safe content
- Easy to add/modify content types through UI
- Schemas stored in `.gitcms/schemas/` as JSON files

**Field Types Supported**:

- Basic: string, text, number, boolean, date, datetime
- Advanced: array, object, media, rich-text, select, color
- Each with customizable validation rules

### 6. Automatic Index Maintenance

**The Problem**: The client SDK needs to list all content items of a type. But
GitHub's API doesn't provide a direct way to list file contents efficiently for
public repositories.

**Solution**: Automatic `.metadata/index.json` files.

**How It Works**:

1. Every content folder has a `.metadata/index.json` file
2. Lists all content files in that folder: `["post-1.json", "post-2.json"]`
3. **Automatically maintained** by the admin panel:
   - Creating content → adds to index
   - Deleting content → removes from index
   - Renaming content → updates index
   - Schema rename → migrates index to new location

**Why**:

- Enables public mode (no GitHub token required)
- Fast content listing without scanning directories
- Single source of truth for what content exists
- Works seamlessly with Git (just another JSON file)

### 7. Thumbnail System for Media

**Decision**: Generate and store thumbnails alongside original files in GitHub.

**Implementation**:

```
.gitcms/media/
  image.jpg              # Original
  thumbnails/image.jpg   # Thumbnail (300x300, WebP)
```

**Why**:

- Fast loading in admin interface
- Reduced bandwidth for previews
- Browser caching of thumbnails
- Thumbnails versioned with originals
- No runtime generation needed

**Benefits Over Runtime Generation**:

- No client-side processing overhead
- Consistent thumbnail URLs
- CDN-friendly (can be cached)
- Works in `<img>` tags directly

### 8. Git LFS Support for Large Files

**Decision**: Automatic Git LFS (Large File Storage) support for files >50MB.

**Why**:

- GitHub has a 100MB file size limit
- Files >50MB should use LFS per GitHub recommendations
- Automatic fallback to Git Data API if LFS unavailable
- Handles large media files gracefully

**Smart Upload Strategy**:

1. Files ≤1MB → Simple GitHub API
2. Files 1-50MB → Git Data API (blob creation)
3. Files 50-100MB → Attempt LFS, fallback to Git Data API
4. Files >100MB → Error with helpful message

### 9. Three Transport Modes in Client SDK

**Decision**: Support three distinct transport modes in the published client
package.

**1. Public Mode** (Default)

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  // No token needed!
});
```

- For public repositories
- No authentication required
- 60 requests/hour per IP
- Perfect for static sites

**2. Authenticated Mode** (Server-side)

```typescript
const cms = new GitCMS({
  repository: 'username/private-blog',
  token: process.env.GITHUB_TOKEN,
});
```

- For private repositories
- 5,000 requests/hour
- Server-side only (never expose token client-side)

**3. Proxy Mode** (Custom Backend)

```typescript
const cms = new GitCMS({
  repository: 'username/blog',
  baseUrl: 'https://api.mysite.com',
});
```

- Route through your custom API
- Add caching, rate limiting, custom logic
- Full control over content delivery

**Why Three Modes**:

- Flexibility for different use cases
- Start simple (public), scale up (proxy)
- Never force unnecessary complexity
- Each mode optimized for its purpose

### 10. Rich Text Editor with Custom Media Embedding

**Decision**: Use TipTap editor with custom GitCMS media embedding.

**Custom `<gitcms-media>` Element**:

```html
<gitcms-media
  data-path=".gitcms/media/video.mp4"
  data-type="video"
  data-thumbnail="https://github.com/.../thumbnail.jpg"
>
</gitcms-media>
```

**Why**:

- Clean separation of content and presentation
- Media paths relative to repository
- Thumbnail URLs for fast loading
- Custom styling via CSS
- Works in any HTML context

**Client SDK Auto-Replacement**: The published client package automatically
converts these to proper media elements:

```typescript
await cms.from('posts').where('id', '==', 'hello').get({
  processMedia: true, // Converts gitcms-media tags
});
```

Results in:

- Videos → `<video>` elements with controls
- Images → `<img>` elements with srcset
- Audio → `<audio>` elements
- Documents → Download links

## Publishing to npm: The Client SDK

One of the major goals is **publishing `@git-cms/client` to npm** so any
developer can:

```bash
npm install @git-cms/client
```

And then:

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'myusername/myrepo',
});

const posts = await cms.from('blog-posts').get();
```

**Why This Matters**:

- Easy integration with any JavaScript project
- Full TypeScript support with auto-generated types
- Works with Next.js, React, Vue, Svelte, vanilla JS
- Simple, intuitive API (inspired by Firebase/Supabase)
- Zero backend required for public repositories

**SQL-Like Query Syntax**:

```typescript
// Familiar SQL-like patterns
const posts = await cms
  .from('blog-posts')
  .where('published', '==', true)
  .orderBy('date', 'desc')
  .limit(10)
  .get();

// Single document
const post = await cms
  .from('blog-posts')
  .where('id', '==', 'my-first-post')
  .get();
```

## GitCMS vs. Traditional CMS/Database Solutions

### vs. MongoDB/Supabase/Firebase

| Feature             | GitCMS           | Traditional DB         |
| ------------------- | ---------------- | ---------------------- |
| **Hosting Cost**    | Free (GitHub)    | $$ (scales with usage) |
| **Vendor Lock-in**  | None             | High                   |
| **Version Control** | Built-in (Git)   | Additional setup       |
| **Ownership**       | Full (your repo) | Limited                |
| **Backup**          | Automatic (Git)  | Manual/paid            |
| **Learning Curve**  | Low              | Medium-High            |
| **Scaling Cost**    | Free             | $$ (exponential)       |
| **Query Speed**     | Good             | Excellent              |

### vs. WordPress/Contentful/Strapi

| Feature                  | GitCMS               | Traditional CMS    |
| ------------------------ | -------------------- | ------------------ |
| **Setup Time**           | Minutes              | Hours/Days         |
| **Hosting**              | Static/Edge          | Server required    |
| **Updates**              | Git commit           | Complex migrations |
| **Portability**          | Perfect (just files) | Difficult          |
| **Developer Experience** | Excellent            | Varies             |
| **Non-dev Friendly**     | Very (admin UI)      | Varies             |
| **API**                  | Auto-generated       | Manual setup       |

### Why I Chose This Approach

**Freedom**: Your content lives in your repository. No migration nightmares, no
vendor APIs to learn, no lock-in.

**Simplicity**: GitHub is your database. Git is your version control.
JSON/Markdown is your data format. All familiar tools.

**Cost**: Completely free for most use cases. GitHub provides generous free tier
with unlimited public repositories.

**Reliability**: GitHub's infrastructure is more reliable than anything I could
build or afford.

**Developer Experience**: The client SDK feels like Firebase/Supabase, but
without the vendor lock-in.

**Version Control**: Every content change is a Git commit.

## Technical Challenges Overcome

### 1. Large File Upload Timeouts

**Problem**: Files >10MB would timeout when uploading via standard GitHub API.

**Solution**:

- Implemented custom fetch with no timeout for blob creation
- Extended timeout handling for large files
- Progress feedback to users
- Automatic retry logic

### 2. Private Repository Access

**Problem**: GitHub's raw URLs don't work for private repositories (require
authentication).

**Solution**:

- Authenticated thumbnail fetching via GitHub API
- Token-based media access
- Fallback to default SVG placeholders
- Graceful degradation

### 3. Public Mode Reliability

**Problem**: Public mode needed to list content without authentication, but
GitHub doesn't provide directory listing.

**Solution**:

- Automatic index maintenance (`.metadata/index.json`)
- Updated on every content operation
- Zero manual intervention required
- Enables public SDK mode

### 4. Content Type Flexibility

**Problem**: Different projects need different content structures.

**Solution**:

- Schema designer in admin UI
- JSON Schema-based validation
- Dynamic form generation
- Pre-built templates for common use cases

## What Makes GitCMS Special

### 1. **It's Truly Universal**

One admin panel works for:

- Personal blogs
- Portfolio sites
- Documentation
- Mobile app content
- Product catalogs
- Any structured data

### 2. **Zero Infrastructure**

No databases to manage, no servers to maintain, no backups to schedule. GitHub
handles everything.

### 3. **Version Control Native**

Every change is versioned. Want to see what your blog looked like 6 months ago?
`git checkout`. Want to create a draft? Create a branch. Want team review? Open
a PR.

### 4. **Developer + Non-Developer Friendly**

Developers get a beautiful TypeScript SDK. Non-developers get a WordPress-like
admin interface. Everyone's happy.

### 5. **Completely Free**

GitHub free tier includes:

- Unlimited public repositories
- 500MB storage per repository
- Git LFS for large files
- GitHub Actions for automation
- GitHub Pages for hosting

For most projects, you'll never pay a cent.

## The Road Ahead

GitCMS is still evolving. Here's what's coming:

- **npm Package Publication**: Publish `@git-cms/client` to npm
- **Drag-and-Drop Field Ordering**: Customize schema field order visually
- **Content Versioning UI**: Browse and restore previous versions

## For Developers: Getting Started

### Setup

1. **Go to GitCMS Admin**
   - https://gitcms.bestplayer.dev/

2. **Connect your GitHub Account**

3. **Follow the Admin procedure**
   - connect repository
   - create your schemas
   - create contents based on your schemas

### Use the Client SDK (Once Published)

```bash
npm install @git-cms/client
```

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize
const cms = new GitCMS({
  repository: 'yourusername/your-content-repo',
});

// Fetch content
const posts = await cms.from('blog-posts').get();

// Get single item
const post = await cms
  .from('blog-posts')
  .where('id', '==', 'hello-world')
  .get();

// Process embedded media
const processedPost = await cms
  .from('blog-posts')
  .where('id', '==', 'hello-world')
  .get({ processMedia: true });
```

## Lessons Learned

### 1. **Simplicity Wins**

Focusing on GitHub exclusively made everything simpler and better.

### 2. **Security Can Be Simple**

The token-exchange pattern (`/api/auth/token`) is elegant and secure. No
complicated OAuth flows client-side, no token storage, just on-demand fetching
with caching.

### 3. **Git Is Underutilized**

We treat Git as a developer tool, but it's an incredible database for content.
Version control, branching, merging, collaboration... all built-in!

### 4. **Bandwidth Matters**

The refactoring to direct client-to-GitHub communication was crucial. It
transformed the project from "interesting experiment" to "actually deployable on
free tier."

### 5. **Developer Experience Is Everything**

The client SDK needs to feel familiar. That's why we use SQL-like `from()`, and
chainable queries. Developers should feel at home immediately.

## Conclusion

GitCMS started as a way to avoid database headaches for my portfolio. It became
a mission: **make content management as simple and flexible as possible, powered
by Git, for everyone.**

The best database is sometimes the one you already have: your file system,
supercharged by Git, with a beautiful interface on top.

Whether you're building a blog, portfolio, documentation site, or mobile app,
GitCMS offers a refreshing alternative to traditional databases and CMS
platforms:

- ✅ **Free** (GitHub's infrastructure)
- ✅ **Portable** (just files in a repo)
- ✅ **Version controlled** (every change is a commit)
- ✅ **Scalable** (GitHub handles it)
- ✅ **Developer-friendly** (TypeScript SDK)
- ✅ **Non-developer-friendly** (beautiful admin UI)
- ✅ **No vendor lock-in** (you own your data)

The revolution will be versioned. 🚀

---

**Fun Fact**: This blog post was written and managed through the GitCMS admin
panel running on my localhost, stored as a JSON file in the GitHub repository,
and will be accessible via the `@git-cms/client` SDK once published to npm!

---

### Project Status

- ✅ Core authentication and GitHub integration
- ✅ Repository connection and file operations
- ✅ Schema system and content types
- ✅ Content management interface
- ✅ Media management with thumbnails
- ✅ Rich text editor with custom media embedding
- ✅ Direct client-to-GitHub architecture
- ✅ Automatic index maintenance
- ✅ Client SDK with public transport mode
- 🚧 Client SDK with authenticated transport mode (coming soon)
- 🚧 Publishing to npm (coming soon)
- 🚧 Improve Admin panel, catching some bugs and making experience even better
