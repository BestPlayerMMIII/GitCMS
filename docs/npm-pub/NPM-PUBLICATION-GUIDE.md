# Complete NPM Publication Guide for GitCMS

## Analysis Summary

### Dependencies Overview

```
@git-cms/client (what users install)
    ↓ depends on
@git-cms/core (internal utilities)
```

**Answer: YES, you need to publish BOTH packages to NPM.**

### Current Issues Found

#### 1. ❌ Core Package Has Ignored Dependency

```typescript
// packages/core/src/network-monitor.ts
import networkTestData from './ignore/network-test.json';
```

**Problem:** The `ignore/` folder is in `.gitignore`, so this file won't be
published to NPM. The package will fail when users try to use network monitoring
features.

**Solutions:**

- **Option A (Recommended):** Move `network-test.json` out of `ignore/` folder
- **Option B:** Remove network monitoring from core (if not essential for
  client)
- **Option C:** Make network monitoring optional with fallback

#### 2. ⚠️ Client Package Docs Not Optimized

The `packages/client/docs/` folder has many files. You want to consolidate into
a comprehensive README.

### Publishing Strategy

You'll publish TWO packages:

1. `@git-cms/core` - Internal utilities (users don't install directly)
2. `@git-cms/client` - Main SDK (what users install)

---

## Step-by-Step Publication Guide

### Phase 1: Fix Issues (Required Before Publishing)

#### Step 1.1: Fix Network Monitor Dependency

**Choose ONE solution:**

##### Solution A: Move Out of Ignore (Recommended)

```powershell
# Navigate to core package
cd packages\core\src

# Create a data folder if it doesn't exist
mkdir data -ErrorAction SilentlyContinue

# Move the file (if it exists)
if (Test-Path "ignore\network-test.json") {
    Move-Item "ignore\network-test.json" "data\network-test.json"
}
```

Then update the import in `packages/core/src/network-monitor.ts`:

```typescript
// Change this:
import networkTestData from './ignore/network-test.json';

// To this:
import networkTestData from './data/network-test.json';
```

##### Solution B: Remove Network Monitoring (If Not Needed)

If network monitoring isn't used by the client package:

1. Remove `network-monitor.ts` from core
2. Remove exports from `packages/core/src/index.ts`:

```typescript
// Remove these lines:
export * from './network-monitor';
export {
  NetworkMonitor,
  UploadProgressSimulator,
  NetworkUtils,
  // ... etc
} from './network-monitor';
```

##### Solution C: Make It Optional with Try-Catch

```typescript
// packages/core/src/network-monitor.ts
let networkTestData: { url: string; size: number }[] = [];

try {
  networkTestData = require('./ignore/network-test.json');
} catch {
  // Fallback data for NPM users
  networkTestData = [
    { url: 'https://via.placeholder.com/150', size: 5000 },
    { url: 'https://via.placeholder.com/350', size: 50000 },
  ];
}

const networkTest = networkTestData;
```

#### Step 1.2: Check Network Test File Existence

```powershell
# Check if the file exists
Test-Path "packages\core\src\ignore\network-test.json"
```

If it doesn't exist, you need to create it or use Solution B/C above.

**Sample `network-test.json`** (if you choose Solution A):

```json
[
  {
    "url": "https://via.placeholder.com/150",
    "size": 5000
  },
  {
    "url": "https://via.placeholder.com/350",
    "size": 50000
  }
]
```

---

### Phase 2: Build Comprehensive README for Client Package

#### Step 2.1: Create Consolidated README

```powershell
# Navigate to project root
cd c:\Users\Utente\Desktop\Coding\JS-TS\progetti\GitCMS
```

Create `packages/client/README-NEW.md` with consolidated content:

````markdown
# @git-cms/client

> TypeScript SDK for GitCMS - Use GitHub as a Headless CMS

## Features

- 🚀 **Zero Backend** - Use GitHub as your CMS
- 🔐 **Secure** - Built-in authentication and media proxying
- 📦 **TypeScript** - Full type safety
- 🎨 **Rich Media** - Images, videos, documents with thumbnails
- 🔍 **Advanced Queries** - Filter, sort, and search content
- 🌐 **Two Modes** - Public repos or private with API proxy

## Installation

\`\`\`bash npm install @git-cms/client

# or

yarn add @git-cms/client

# or

pnpm add @git-cms/client \`\`\`

## Quick Start

### Public Repository

\`\`\`typescript import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({ repository: 'username/my-blog', // No token needed for
public repos! });

// Fetch content const posts = await cms.from('posts').get(); \`\`\`

### Private Repository with API Proxy

\`\`\`typescript // Client-side const cms = new GitCMS({ repository:
'username/private-blog', apiEndpoint: '/api/media', transport: 'authenticated',
});

// Server-side (Next.js API route example) // app/api/media/[mediaId]/route.ts
import { NextResponse } from 'next/server'; import { GitCMS } from
'@git-cms/client';

const cmsServer = new GitCMS({ repository: 'username/private-blog', token:
process.env.GITHUB_TOKEN, apiEndpoint: '/api/media', });

export async function GET(req, { params }) { const mapping =
cmsServer.media.getMediaMapping(params.mediaId);

if (!mapping) { return NextResponse.json({ error: 'Not found' }, { status: 404
}); }

const response = await fetch(mapping.githubUrl, { headers: { Authorization:
\`token \${process.env.GITHUB_TOKEN}\` }, });

const buffer = await response.arrayBuffer(); return new NextResponse(buffer, {
headers: { 'Content-Type': response.headers.get('content-type') ||
'application/octet-stream', 'Cache-Control': 'public, max-age=31536000,
immutable', }, }); } \`\`\`

## Core Concepts

### Transport Modes

- **Public Mode**: Direct GitHub access for public repositories
- **Authenticated Mode**: Token-based access with API proxy for security

### Querying Content

\`\`\`typescript // Simple query const posts = await cms.from('posts').get();

// With filters const published = await cms.from('posts') .where('status', '==',
'published') .orderBy('date', 'desc') .limit(10) .get();

// Search const results = await cms.from('posts') .search('typescript') .get();
\`\`\`

### Working with Media

\`\`\`typescript // Extract media from HTML content const references =
cms.media.extractFromHTML(post.content);

// Render with thumbnails (fast) const html =
cms.media.renderFast(post.content);

// Render with full resolution (async) const fullHtml = await
cms.media.renderFull(post.content); \`\`\`

## Configuration Options

\`\`\`typescript interface GitCMSConfig { repository: string; // 'owner/repo'
branch?: string; // default: 'main' token?: string; // GitHub token (server-side
only!) apiEndpoint?: string; // For media proxying transport?: 'public' |
'authenticated'; } \`\`\`

## API Reference

### GitCMS Class

- \`from(schema: string)\` - Query content from a schema
- \`media\` - Media manager instance
- \`contentMedia\` - Content media helper
- \`getRateLimit()\` - Get GitHub API rate limit info
- \`getTransportMode()\` - Get current transport mode
- \`isPublicMode()\` - Check if using public mode

### SchemaRef Class

- \`get()\` - Fetch all items
- \`where(field, operator, value)\` - Filter items
- \`orderBy(field, direction)\` - Sort items
- \`limit(count)\` - Limit results
- \`search(query)\` - Search content
- \`first()\` - Get first matching item
- \`count()\` - Count matching items
- \`exists()\` - Check if any items exist

### MediaManager Class

- \`extractFromHTML(html)\` - Extract media references
- \`getThumbnail(reference)\` - Get thumbnail URL
- \`fetchFull(reference)\` - Fetch full resolution media
- \`renderFast(html)\` - Render with thumbnails
- \`renderFull(html)\` - Render with full resolution
- \`getMediaMapping(mediaId)\` - Get media mapping for API
- \`getAllMediaMappings()\` - Get all media mappings

## Examples

See
[EXAMPLES.md](https://github.com/BestPlayerMMIII/GitCMS/blob/main/packages/client/docs/EXAMPLES.md)
for detailed examples.

## Documentation

- [Transport Modes Guide](https://github.com/BestPlayerMMIII/GitCMS/blob/main/packages/client/docs/TRANSPORT-MODES.md)
- [Media Guide](https://github.com/BestPlayerMMIII/GitCMS/blob/main/packages/client/docs/MEDIA-QUICK-REFERENCE.md)
- [Migration Guide](https://github.com/BestPlayerMMIII/GitCMS/blob/main/packages/client/docs/MIGRATION-GUIDE.md)
- [Nested Fields Guide](https://github.com/BestPlayerMMIII/GitCMS/blob/main/packages/client/docs/NESTED-FIELDS-GUIDE.md)

## Requirements

- Node.js >= 18
- TypeScript >= 5.0 (for TypeScript projects)

## License

MIT

## Support

- [GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues)
- [Documentation](https://github.com/BestPlayerMMIII/GitCMS)

## Contributing

Contributions welcome! See
[CONTRIBUTING.md](https://github.com/BestPlayerMMIII/GitCMS/blob/main/CONTRIBUTING.md)
\`\`\`

After creating this, replace the old README:

\`\`\`powershell cd packages\client Move-Item README.md README-OLD.md Move-Item
README-NEW.md README.md \`\`\`

---

### Phase 3: Update Package Configuration

#### Step 3.1: Update Core Package.json

\`\`\`powershell cd packages\core \`\`\`

Check if `data/network-test.json` needs to be included in published files:

```json
{
  "files": [
    "dist",
    "README.md",
    "src/data/**/*.json" // Add this if you used Solution A
  ]
}
```
````

#### Step 3.2: Update Client Package.json

```powershell
cd ..\client
```

Update the `files` array to exclude docs:

```json
{
  "files": ["dist", "README.md"]
}
```

The docs will be available on GitHub, linked from README.

#### Step 3.3: Verify Version Numbers

Both packages should have the same version:

```json
// packages/core/package.json
{
  "version": "1.0.0"
}

// packages/client/package.json
{
  "version": "1.0.0",
  "dependencies": {
    "@git-cms/core": "^1.0.0"
  }
}
```

---

### Phase 4: Build and Test Packages

#### Step 4.1: Clean and Build Core

```powershell
cd c:\Users\Utente\Desktop\Coding\JS-TS\progetti\GitCMS\packages\core

# Clean previous builds
npm run clean

# Build
npm run build

# Check build output
ls dist
```

You should see:

- `index.js` (CommonJS)
- `index.mjs` (ES Modules)
- `index.d.ts` (TypeScript types)

#### Step 4.2: Clean and Build Client

```powershell
cd ..\client

# Clean previous builds
npm run clean

# Build
npm run build

# Check build output
ls dist
```

Same files should be present.

#### Step 4.3: Test Locally with npm link

```powershell
# Link core package
cd ..\core
npm link

# Link client package and use linked core
cd ..\client
npm link @git-cms/core
npm link

# Test in another project
cd c:\path\to\test-project
npm link @git-cms/client
```

Test that it works:

```typescript
// test.ts
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'test/repo',
});

console.log('GitCMS loaded successfully!');
```

#### Step 4.4: Test Package Contents

```powershell
cd c:\Users\Utente\Desktop\Coding\JS-TS\progetti\GitCMS\packages\core

# Simulate what will be published (creates a .tgz file)
npm pack

# Extract and inspect
tar -xzf git-cms-core-1.0.0.tgz
ls package
```

Check that:

- ✅ `dist/` folder exists with all files
- ✅ `README.md` exists
- ✅ No `ignore/` folder (if you moved the file)
- ✅ `package.json` is present

Repeat for client:

```powershell
cd ..\client
npm pack
tar -xzf git-cms-client-1.0.0.tgz
ls package
```

Clean up test files:

```powershell
rm git-cms-core-1.0.0.tgz
rm -r package
cd ..\client
rm git-cms-client-1.0.0.tgz
rm -r package
```

---

### Phase 5: NPM Account Setup

#### Step 5.1: Create NPM Account (if you don't have one)

1. Go to https://www.npmjs.com/signup
2. Create account
3. Verify email

#### Step 5.2: Login to NPM

```powershell
npm login
```

Enter:

- Username
- Password
- Email
- One-time password (if 2FA enabled)

Verify login:

```powershell
npm whoami
```

Should show your username.

#### Step 5.3: Enable 2FA (Recommended)

```powershell
npm profile enable-2fa auth-and-writes
```

This protects your account and packages.

---

### Phase 6: Publish to NPM

#### Step 6.1: Publish Core Package FIRST

```powershell
cd c:\Users\Utente\Desktop\Coding\JS-TS\progetti\GitCMS\packages\core

# Final checks
npm run build
npm run type-check

# Publish (dry run first)
npm publish --dry-run

# Review output carefully - check files list

# Actually publish
npm publish --access public
```

You should see:

```
+ @git-cms/core@1.0.0
```

Verify on NPM:

```powershell
# Open in browser
start https://www.npmjs.com/package/@git-cms/core
```

#### Step 6.2: Publish Client Package

```powershell
cd ..\client

# Ensure it uses the published core package (not linked)
npm unlink @git-cms/core
npm install @git-cms/core@^1.0.0

# Final checks
npm run build
npm run type-check

# Publish (dry run first)
npm publish --dry-run

# Review output

# Actually publish
npm publish --access public
```

You should see:

```
+ @git-cms/client@1.0.0
```

Verify:

```powershell
start https://www.npmjs.com/package/@git-cms/client
```

---

### Phase 7: Post-Publication Verification

#### Step 7.1: Test Installation in Fresh Project

```powershell
# Create test folder
mkdir c:\temp\gitcms-test
cd c:\temp\gitcms-test

# Initialize package.json
npm init -y

# Install your package
npm install @git-cms/client

# Check installation
ls node_modules\@git-cms
```

You should see:

- `client/`
- `core/` (installed as dependency)

#### Step 7.2: Test TypeScript Types

```powershell
# Install TypeScript
npm install -D typescript @types/node

# Create test file
# Create test.ts with:
```

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'test/repo',
});

console.log('Types work!', cms.getTransportMode());
```

```powershell
# Run TypeScript
npx tsc --noEmit test.ts
```

Should show no errors.

#### Step 7.3: Test Runtime

```powershell
# Create simple test
# test.mjs
```

```javascript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'octocat/Hello-World',
});

console.log('Transport mode:', cms.getTransportMode());
console.log('Is public:', cms.isPublicMode());
```

```powershell
node test.mjs
```

Should output:

```
Transport mode: public
Is public: true
```

---

## Updating and Republishing

### Question: Will Republishing Be Complicated?

**Answer: NO, it's simple!** Just follow these steps:

### Step 1: Make Your Changes

Edit files in `packages/core/` or `packages/client/` as needed.

### Step 2: Update Version Numbers

**IMPORTANT:** Use semantic versioning:

- **Patch** (1.0.0 → 1.0.1): Bug fixes
- **Minor** (1.0.0 → 1.1.0): New features (backward compatible)
- **Major** (1.0.0 → 2.0.0): Breaking changes

Update `package.json` in BOTH packages (if both changed):

```json
{
  "version": "1.0.1" // or 1.1.0, or 2.0.0
}
```

If only client changed, update only client version. But update the core
dependency if needed:

```json
// packages/client/package.json
{
  "version": "1.0.1",
  "dependencies": {
    "@git-cms/core": "^1.0.0" // or update if core changed
  }
}
```

### Step 3: Build and Test

```powershell
# For core (if changed)
cd packages\core
npm run clean
npm run build
npm run type-check

# For client
cd ..\client
npm run clean
npm run build
npm run type-check
```

### Step 4: Publish

**If core changed:**

```powershell
cd packages\core
npm publish
```

**Then publish client:**

```powershell
cd packages\client
npm publish
```

**That's it!** The new version is live on NPM.

### Using npm version Command (Automated)

Easier way:

```powershell
cd packages\core

# Automatically bump version and publish
npm version patch  # or minor, or major
npm publish

cd ..\client
npm version patch
npm publish
```

This automatically:

1. Updates package.json version
2. Creates git commit
3. Creates git tag

---

## Troubleshooting

### Error: "network-test.json not found"

**Solution:** You forgot to fix the network-monitor.ts import. Go back to Phase
1, Step 1.1.

### Error: "You do not have permission to publish"

**Solutions:**

1. Check you're logged in: `npm whoami`
2. Package name might be taken - change in package.json
3. You need to be logged into correct account

### Error: "Version already exists"

**Solution:** You can't republish the same version. Bump the version number.

### Error: "ENEEDAUTH"

**Solution:** Run `npm login` again.

### Package Size Too Large

**Solution:**

1. Check `files` array in package.json
2. Add patterns to `.npmignore`:

```
# .npmignore in packages/client/
docs/
src/
*.test.ts
*.spec.ts
```

### TypeScript Errors After Publishing

**Solution:** Make sure `dist/index.d.ts` is generated:

```powershell
npm run build
ls dist\index.d.ts  # Should exist
```

---

## Quick Reference Commands

```powershell
# Build packages
cd packages\core && npm run build
cd packages\client && npm run build

# Test locally
npm pack                    # Create .tgz file
npm publish --dry-run       # See what will be published

# Publish
npm publish --access public

# Update version
npm version patch           # 1.0.0 → 1.0.1
npm version minor           # 1.0.0 → 1.1.0
npm version major           # 1.0.0 → 2.0.0

# Check published package
npm view @git-cms/client
npm view @git-cms/core

# Unpublish (within 72 hours only)
npm unpublish @git-cms/client@1.0.0
```

---

## Checklist Before Publishing

- [ ] Fixed network-monitor.ts dependency issue
- [ ] Created comprehensive README.md for client package
- [ ] Updated package.json files array
- [ ] Built both packages successfully
- [ ] Tested with `npm pack` and inspected contents
- [ ] Logged into NPM (`npm whoami` works)
- [ ] Version numbers are correct and match
- [ ] No sensitive data in code (tokens, passwords, etc.)
- [ ] License file exists (MIT)
- [ ] Repository URL is correct in package.json
- [ ] Tested locally with `npm link`

---

## Summary

**To publish GitCMS to NPM:**

1. ✅ Fix the network-monitor.ts dependency (move out of ignore/)
2. ✅ Create consolidated README for client package
3. ✅ Build both packages
4. ✅ Test with `npm pack`
5. ✅ Login to NPM
6. ✅ Publish core first: `npm publish --access public`
7. ✅ Publish client second: `npm publish --access public`
8. ✅ Test installation in fresh project

**To update:**

1. Make changes
2. Bump version with `npm version patch/minor/major`
3. Build and test
4. Publish with `npm publish`

Simple! 🚀
