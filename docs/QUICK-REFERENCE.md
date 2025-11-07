# GitCMS Quick Reference

**Last Updated:** November 6, 2025

Quick commands and checklists for common tasks.

---

## 🚀 Deployment Commands

### Deploy Admin Panel to Vercel

```bash
# 1. Generate NEXTAUTH_SECRET
openssl rand -base64 32

# 2. Environment variables needed:
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=ghp_...
NEXTAUTH_URL=https://gitcms-admin.bestplayer.dev
NEXTAUTH_SECRET=<generated-secret>

# 3. Vercel settings:
Framework: Next.js
Root Directory: packages/admin
Build Command: next build
Output Directory: .next
Install Command: npm install
```

### Create Documentation Website

```bash
# Navigate to apps directory
cd apps

# Create Astro project with Starlight
npm create astro@latest docs -- --template starlight --typescript strict

# Install and run
cd docs
npm install
npm run dev

# Deploy to Vercel:
Framework: Astro
Root Directory: apps/docs
Build Command: npm run build
Output Directory: dist
```

---

## 🌐 DNS Configuration

### Cloudflare DNS Records

**For Admin Panel:**

```
Type: CNAME
Name: gitcms-admin
Target: cname.vercel-dns.com
Proxy: Enabled (orange cloud)
TTL: Auto
```

**For Documentation:**

```
Type: CNAME
Name: gitcms-docs
Target: cname.vercel-dns.com
Proxy: Enabled (orange cloud)
TTL: Auto
```

**For Root Domain (optional landing page):**

```
Type: CNAME
Name: gitcms
Target: cname.vercel-dns.com
Proxy: Enabled (orange cloud)
TTL: Auto
```

---

## 📦 NPM Package Commands

### Build Packages

```bash
# Build all packages
npm run build

# Build specific package
cd packages/client && npm run build
cd packages/core && npm run build
```

### Publish to NPM

```bash
# Login to NPM (one time)
npm login

# Publish core (first, as client depends on it)
cd packages/core
npm publish --access public

# Publish client
cd ../client
npm publish --access public
```

### Update Package Version

```bash
# Update version in package.json
cd packages/client
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.1 → 0.2.0
npm version major  # 0.2.0 → 1.0.0

# Then publish
npm publish --access public
```

---

## 🛠️ Development Commands

### Start Development Servers

```bash
# All services (Turborepo)
npm run dev

# Individual services
cd packages/admin && npm run dev   # Port 3001
cd packages/client && npm run dev  # Watch mode
cd packages/core && npm run dev    # Watch mode
cd apps/docs && npm run dev        # Port 3002
```

### Type Checking

```bash
# All packages
npm run type-check

# Specific package
cd packages/admin && npm run type-check
```

### Linting

```bash
# All packages
npm run lint

# Specific package
cd packages/client && npm run lint
```

### Clean Build Artifacts

```bash
# All packages
npm run clean

# Manual cleanup
rm -rf packages/*/dist
rm -rf packages/*/.next
rm -rf node_modules
```

---

## 🔐 GitHub OAuth Setup

### Create OAuth App

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** GitCMS Admin Panel
   - **Homepage URL:** https://gitcms-admin.bestplayer.dev
   - **Authorization callback URL:**
     https://gitcms-admin.bestplayer.dev/api/auth/callback/github
4. Click "Register application"
5. Save Client ID
6. Generate and save Client Secret

### Update OAuth App (After Domain Change)

1. Go to: https://github.com/settings/developers
2. Click your app
3. Update URLs to match new domain
4. Click "Update application"

---

## 📊 Repository Management

### Make Repository Public

```bash
# Via GitHub Web UI:
1. Go to: https://github.com/BestPlayerMMIII/GitCMS
2. Click "Settings"
3. Scroll to "Danger Zone"
4. Click "Change repository visibility"
5. Select "Make public"
6. Type repository name to confirm
7. Click "I understand, make this repository public"
```

### Create GitHub Release

```bash
# Via GitHub Web UI:
1. Go to: https://github.com/BestPlayerMMIII/GitCMS/releases
2. Click "Draft a new release"
3. Choose tag: v0.1.0 (create new)
4. Release title: "GitCMS v0.1.0 - Initial Release"
5. Write release notes
6. Click "Publish release"

# Or via Git:
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

---

## 🧪 Testing Commands

### Test Admin Panel Locally

```bash
cd packages/admin

# Set environment variables (create .env.local)
echo "GITHUB_CLIENT_ID=..." >> .env.local
echo "GITHUB_CLIENT_SECRET=..." >> .env.local
echo "NEXTAUTH_URL=http://localhost:3001" >> .env.local
echo "NEXTAUTH_SECRET=..." >> .env.local

# Run dev server
npm run dev

# Visit: http://localhost:3001
```

### Test Client SDK

```bash
cd packages/client

# Run tests (if configured)
npm test

# Try in Node REPL
node
> const { GitCMS } = require('./dist/index.js');
> const cms = new GitCMS({ repository: 'user/repo' });
> cms.from('posts').get().then(console.log);
```

---

## 📝 Content Management Quick Reference

### Admin Panel URLs

- **Production:** https://gitcms-admin.bestplayer.dev
- **Local dev:** http://localhost:3001

### Common Admin Panel Tasks

1. **Connect Repository:**
   - Dashboard → "Connect Repository" → Select repo → Connect

2. **Create Schema:**
   - Sidebar → "Schemas" → "Create New Schema" → Define fields → Save

3. **Create Content:**
   - Sidebar → "Content" → "Create New" → Select schema → Fill form → Publish

4. **Upload Media:**
   - In editor → "Insert Image" → Upload or drag & drop

### Client SDK Quick Examples

```typescript
// Basic usage
const cms = new GitCMS({ repository: 'user/repo' });

// Get all items
const posts = await cms.from('posts').get();

// Filter and sort
const featured = await cms
  .from('posts')
  .where('featured', true)
  .orderBy('date', 'desc')
  .limit(5)
  .get();

// Get single item
const post = await cms.from('posts').doc('my-post').get();

// Nested fields
const published = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .get();
```

---

## 🔍 Troubleshooting Commands

### Check DNS Propagation

```bash
# Windows
nslookup gitcms-admin.bestplayer.dev

# Mac/Linux
dig gitcms-admin.bestplayer.dev

# Online tool
# Visit: https://dnschecker.org
```

### Check SSL Certificate

```bash
# Online tool
# Visit: https://www.ssllabs.com/ssltest/

# Via browser
# Visit your domain and click lock icon → Certificate
```

### Check Vercel Deployment Logs

```bash
# Via Vercel CLI
vercel logs gitcms-admin-xxx

# Or use Vercel Dashboard:
# https://vercel.com/dashboard → Project → Deployments → Click deployment → View logs
```

### Clear Cloudflare Cache

```bash
# Via Cloudflare Dashboard:
1. Go to: https://dash.cloudflare.com
2. Select domain: bestplayer.dev
3. Go to: Caching → Configuration
4. Click "Purge Everything"
5. Confirm
```

---

## 📊 Monitoring Commands

### Check npm Downloads

```bash
# Via npm
npm info @git-cms/client

# Online
# Visit: https://www.npmjs.com/package/@git-cms/client
```

### GitHub Stats

```bash
# Via GitHub API
curl https://api.github.com/repos/BestPlayerMMIII/GitCMS

# Or visit: https://github.com/BestPlayerMMIII/GitCMS
```

### Vercel Analytics

```bash
# Via Vercel Dashboard:
# https://vercel.com/dashboard → Project → Analytics
```

---

## 🎯 Launch Checklist

### Pre-Launch

- [ ] Repository is public
- [ ] All documentation updated
- [ ] README.md polished
- [ ] LICENSE file present
- [ ] Admin panel deployed
- [ ] Documentation website deployed
- [ ] Custom domains configured
- [ ] SSL certificates valid
- [ ] GitHub OAuth working
- [ ] All links tested

### Launch

- [ ] Create GitHub release (v0.1.0)
- [ ] Announce on Twitter/X
- [ ] Post on Reddit (r/opensource, r/javascript, r/webdev)
- [ ] Submit to Product Hunt
- [ ] Post on Hacker News (Show HN)
- [ ] Write launch article on Dev.to
- [ ] Share on LinkedIn

### Post-Launch

- [ ] Monitor GitHub issues
- [ ] Monitor Vercel logs
- [ ] Check npm download stats
- [ ] Respond to feedback
- [ ] Update documentation based on questions
- [ ] Plan next features

---

## 📞 Support Resources

### Documentation

- **Overview:** [docs/README.md](./README.md)
- **Architecture:** [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Admin Guide:** [docs/ADMIN-PANEL-GUIDE.md](./ADMIN-PANEL-GUIDE.md)
- **Client SDK:** [docs/CLIENT-SDK-GUIDE.md](./CLIENT-SDK-GUIDE.md)
- **Deployment:** [docs/DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
- **Summary:** [docs/PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md)

### External Links

- **Admin Panel:** https://gitcms-admin.bestplayer.dev
- **Docs Site:** https://gitcms-docs.bestplayer.dev
- **NPM Package:** https://www.npmjs.com/package/@git-cms/client
- **GitHub Repo:** https://github.com/BestPlayerMMIII/GitCMS
- **GitHub Issues:** https://github.com/BestPlayerMMIII/GitCMS/issues

### Tools

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **npm Account:** https://www.npmjs.com/~your-username
- **GitHub Settings:** https://github.com/settings

---

## 🎓 Common Workflows

### Workflow: Add New Feature

```bash
# 1. Create branch
git checkout -b feature/new-feature

# 2. Make changes
# ... code ...

# 3. Test locally
npm run dev
npm run type-check
npm run lint

# 4. Commit
git add .
git commit -m "feat: add new feature"

# 5. Push
git push origin feature/new-feature

# 6. Create PR on GitHub
# 7. Merge after review
# 8. Deploy (automatic via Vercel)
```

### Workflow: Update NPM Package

```bash
# 1. Make changes to client package
cd packages/client

# 2. Update version
npm version patch

# 3. Build
npm run build

# 4. Test
npm pack --dry-run

# 5. Publish
npm publish --access public

# 6. Update documentation
cd ../../docs
# Update version numbers in docs

# 7. Commit
git add .
git commit -m "chore: publish @git-cms/client v0.1.1"
git push
```

### Workflow: Fix Bug

```bash
# 1. Create branch
git checkout -b fix/bug-description

# 2. Fix bug
# ... code ...

# 3. Test
npm run dev
# Verify fix works

# 4. Commit
git add .
git commit -m "fix: resolve bug description"

# 5. Push and PR
git push origin fix/bug-description
# Create PR on GitHub

# 6. Deploy after merge
```

---

## 💡 Pro Tips

### Environment Variables

```bash
# Keep in .env.local (never commit)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=...

# Reference in code
const clientId = process.env.GITHUB_CLIENT_ID;
```

### Git Best Practices

```bash
# Meaningful commit messages
git commit -m "feat: add search functionality"
git commit -m "fix: resolve auth redirect issue"
git commit -m "docs: update deployment guide"

# Use conventional commits
# Types: feat, fix, docs, style, refactor, test, chore
```

### Vercel CLI (Optional)

```bash
# Install
npm i -g vercel

# Login
vercel login

# Deploy manually
vercel --prod

# View logs
vercel logs
```

---

**Bookmark this page for quick reference! 📌**
