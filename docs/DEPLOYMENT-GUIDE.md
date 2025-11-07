# GitCMS Deployment Guide

**Last Updated:** November 6, 2025

Complete guide to deploying the GitCMS admin panel and documentation website
with custom domains.

## 🎯 Deployment Overview

You'll be deploying:

1. **Admin Panel** (`packages/admin`) → `gitcms.bestplayer.dev/admin` or
   `gitcms-admin.bestplayer.dev`
2. **Documentation Site** (optional) → `gitcms.bestplayer.dev/docs` or
   `gitcms-docs.bestplayer.dev`

**Platform:** Vercel (recommended)  
**DNS:** Cloudflare  
**Domain:** bestplayer.dev

## 🏗️ Architecture Options

### Option 1: Separate Subdomains (Recommended)

```
gitcms-admin.bestplayer.dev  →  Admin Panel (Vercel Project 1)
gitcms-docs.bestplayer.dev   →  Documentation (Vercel Project 2)
```

**Pros:**

- ✅ Independent deployments
- ✅ Simpler routing
- ✅ Different frameworks possible
- ✅ Separate analytics

**Cons:**

- ❌ Two Vercel projects
- ❌ Two deployment workflows

### Option 2: Path-Based Routing

```
gitcms.bestplayer.dev        →  Landing page
gitcms.bestplayer.dev/admin  →  Admin Panel
gitcms.bestplayer.dev/docs   →  Documentation
```

**Pros:**

- ✅ Single domain
- ✅ Unified branding
- ✅ One project

**Cons:**

- ❌ More complex routing
- ❌ Next.js configuration required
- ❌ All deployed together

### 📋 Recommendation

**Use Option 1 (Separate Subdomains)** for:

- Simpler setup
- Independent deployments
- Different tech stacks

**Use Option 2 (Path-Based)** for:

- Single unified site
- Simpler DNS
- Better SEO (one domain)

**For this guide, I'll cover both options.**

---

## 🚀 Part 1: Deploy Admin Panel

### Prerequisites

1. **GitHub Repository**
   - GitCMS code pushed to GitHub
   - Repository can be public or private

2. **Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Connect your GitHub account

3. **GitHub OAuth App**
   - Required for authentication
   - We'll create this in Step 3

4. **Cloudflare Account**
   - Your domain `bestplayer.dev` managed by Cloudflare

### Step 1: Create GitHub OAuth App

1. Go to
   [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)

2. Click **"New OAuth App"**

3. Fill in details:

   ```
   Application name: GitCMS Admin Panel
   Homepage URL: https://gitcms-admin.bestplayer.dev
   Authorization callback URL: https://gitcms-admin.bestplayer.dev/api/auth/callback/github
   ```

4. Click **"Register application"**

5. **Save these values** (you'll need them):
   - Client ID: `Ov23liXXXXXXXXXXXXXX`
   - Click "Generate a new client secret"
   - Client Secret: `ghp_XXXXXXXXXXXXXXXX` (save immediately, shown once)

### Step 2: Deploy to Vercel

1. **Visit Vercel Dashboard**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **"Add New..." → "Project"**

2. **Import Repository**
   - Select **"Import Git Repository"**
   - Choose `BestPlayerMMIII/GitCMS`
   - Click **"Import"**

3. **Configure Project**

   **Framework Preset:** Next.js  
   **Root Directory:** `packages/admin`  
   **Build Command:** (leave default) `next build`  
   **Output Directory:** (leave default) `.next`  
   **Install Command:** `npm install`

   **Environment Variables:**

   Click **"Environment Variables"** and add:

   ```env
   GITHUB_CLIENT_ID=Ov23liXXXXXXXXXXXXXX
   GITHUB_CLIENT_SECRET=ghp_XXXXXXXXXXXXXXXX
   NEXTAUTH_URL=https://gitcms-admin.bestplayer.dev
   NEXTAUTH_SECRET=your-random-secret-here
   ```

   **Generate NEXTAUTH_SECRET:**

   ```bash
   # Run in terminal:
   openssl rand -base64 32
   ```

   Copy the output and use as `NEXTAUTH_SECRET`

4. **Deploy**
   - Click **"Deploy"**
   - Wait for deployment (2-3 minutes)
   - You'll get a URL like: `gitcms-admin-xxx.vercel.app`

5. **Test Default Domain**
   - Visit `https://gitcms-admin-xxx.vercel.app`
   - Should see GitCMS admin panel
   - Try signing in with GitHub

### Step 3: Configure Custom Domain (Subdomain Approach)

1. **Add Domain in Vercel**
   - In Vercel project, go to **"Settings" → "Domains"**
   - Click **"Add Domain"**
   - Enter: `gitcms-admin.bestplayer.dev`
   - Click **"Add"**

2. **Vercel Shows DNS Records**
   - Vercel will show required DNS records:
     ```
     Type: CNAME
     Name: gitcms-admin
     Value: cname.vercel-dns.com
     ```

3. **Configure DNS in Cloudflare**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Select domain **"bestplayer.dev"**
   - Go to **"DNS" → "Records"**

   **Add CNAME Record:**

   ```
   Type: CNAME
   Name: gitcms-admin
   Target: cname.vercel-dns.com
   Proxy status: Proxied (orange cloud)
   TTL: Auto
   ```

   Click **"Save"**

4. **Wait for Propagation**
   - DNS changes take 1-30 minutes
   - Vercel will auto-detect and issue SSL certificate

5. **Verify**
   - Visit `https://gitcms-admin.bestplayer.dev`
   - Should work with HTTPS
   - Try signing in

6. **Update GitHub OAuth App**
   - Go back to your
     [GitHub OAuth App settings](https://github.com/settings/developers)
   - Update URLs:
     ```
     Homepage URL: https://gitcms-admin.bestplayer.dev
     Authorization callback URL: https://gitcms-admin.bestplayer.dev/api/auth/callback/github
     ```
   - Click **"Update application"**

7. **Update Vercel Environment Variable**
   - In Vercel project: **"Settings" → "Environment Variables"**
   - Edit `NEXTAUTH_URL`:
     ```
     NEXTAUTH_URL=https://gitcms-admin.bestplayer.dev
     ```
   - **Important:** Redeploy for changes to take effect
   - Go to **"Deployments"** → Click latest deployment → **"Redeploy"**

### Step 4: Test Admin Panel

1. Visit `https://gitcms-admin.bestplayer.dev`
2. Click **"Sign in with GitHub"**
3. Authorize app
4. You should be redirected back and signed in
5. Test core features:
   - Connect a repository
   - Create a schema
   - Create content
   - Upload media

**If authentication fails:**

- Check NEXTAUTH_URL matches exactly
- Verify GitHub OAuth callback URL is correct
- Check browser console for errors
- Try in incognito mode

---

## 📚 Part 2: Create Documentation Website

### Option A: Use Existing Docs in `/docs` Folder

Your current docs are in `docs/` as Markdown files. You need a static site
generator to display them.

**Recommended Tools:**

- **Next.js** - Full framework, matches admin panel
- **Astro** - Fastest, best for docs
- **Docusaurus** - Facebook's doc tool
- **VitePress** - Vue-based, very fast

**I recommend Astro for docs** (fast, simple, great DX).

### Option B: Simple Next.js Docs Site

Let's create a simple Next.js app for your documentation.

### Step 1: Create Docs App

**Navigate to your GitCMS repository:**

```bash
cd c:\Users\Utente\Desktop\Coding\JS-TS\progetti\GitCMS
```

**Create new Next.js app:**

```bash
# Create apps directory if it doesn't exist
mkdir apps
cd apps

# Create docs app
npx create-next-app@latest docs
```

**Configuration prompts:**

```
✔ Would you like to use TypeScript? … Yes
✔ Would you like to use ESLint? … Yes
✔ Would you like to use Tailwind CSS? … Yes
✔ Would you like to use `src/` directory? … No
✔ Would you like to use App Router? … Yes
✔ Would you like to customize the default import alias? … No
```

### Step 2: Structure Docs App

```bash
cd docs
```

**Create this structure:**

```
apps/docs/
├── app/
│   ├── layout.tsx          # Main layout
│   ├── page.tsx            # Home page
│   ├── docs/
│   │   ├── page.tsx        # Docs index
│   │   ├── architecture/
│   │   │   └── page.tsx
│   │   ├── admin-guide/
│   │   │   └── page.tsx
│   │   ├── client-sdk/
│   │   │   └── page.tsx
│   │   └── deployment/
│   │       └── page.tsx
│   └── api/                # Optional API routes
├── components/
│   ├── Sidebar.tsx         # Navigation sidebar
│   ├── TableOfContents.tsx # TOC component
│   └── MarkdownContent.tsx # Markdown renderer
├── public/
│   └── docs/               # Copy your docs here
│       ├── README.md
│       ├── ARCHITECTURE.md
│       └── ...
└── package.json
```

### Step 3: Install Dependencies

```bash
npm install react-markdown remark-gfm gray-matter
```

### Step 4: Create Simple Docs Layout

**app/layout.tsx:**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitCMS Documentation',
  description: 'Complete guide to using GitCMS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <a href="/" className="text-2xl font-bold">
                GitCMS Docs
              </a>
              <div className="space-x-4">
                <a href="/docs" className="hover:underline">Documentation</a>
                <a href="https://gitcms-admin.bestplayer.dev" className="hover:underline">
                  Admin Panel
                </a>
                <a href="https://github.com/BestPlayerMMIII/GitCMS" className="hover:underline">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

**app/page.tsx:**

```typescript
import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6">
          GitCMS Documentation
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Universal GitHub-Based Content Management System
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/docs"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Read Documentation
          </Link>
          <Link
            href="https://gitcms-admin.bestplayer.dev"
            className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
          >
            Open Admin Panel
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-2">For Content Creators</h3>
          <p className="text-gray-600 mb-4">
            Use the admin panel to manage content visually
          </p>
          <Link href="/docs/admin-guide" className="text-blue-600 hover:underline">
            Admin Panel Guide →
          </Link>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-2">For Developers</h3>
          <p className="text-gray-600 mb-4">
            Integrate the SDK into your projects
          </p>
          <Link href="/docs/client-sdk" className="text-blue-600 hover:underline">
            Client SDK Guide →
          </Link>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-2">Architecture</h3>
          <p className="text-gray-600 mb-4">
            Understand how GitCMS works
          </p>
          <Link href="/docs/architecture" className="text-blue-600 hover:underline">
            Architecture Overview →
          </Link>
        </div>
      </div>
    </main>
  );
}
```

**app/docs/page.tsx:**

```typescript
import Link from 'next/link';

export default function DocsIndex() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Documentation</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/docs/overview" className="text-blue-600 hover:underline">
                Overview
              </Link>
              <p className="text-gray-600">What is GitCMS and how it works</p>
            </li>
            <li>
              <Link href="/docs/admin-guide" className="text-blue-600 hover:underline">
                Admin Panel Guide
              </Link>
              <p className="text-gray-600">Complete guide for content creators</p>
            </li>
            <li>
              <Link href="/docs/client-sdk" className="text-blue-600 hover:underline">
                Client SDK Guide
              </Link>
              <p className="text-gray-600">Developer guide for integrating the SDK</p>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Advanced</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/docs/architecture" className="text-blue-600 hover:underline">
                Architecture
              </Link>
              <p className="text-gray-600">System design and technical details</p>
            </li>
            <li>
              <Link href="/docs/deployment" className="text-blue-600 hover:underline">
                Deployment Guide
              </Link>
              <p className="text-gray-600">Deploy admin panel and docs</p>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
```

### Step 5: Add Markdown Pages

For each doc (architecture, admin-guide, etc.), create a page that renders the
Markdown:

**app/docs/architecture/page.tsx:**

```typescript
import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default async function ArchitecturePage() {
  // Read markdown file from root docs/
  const filePath = path.join(process.cwd(), '../../docs/ARCHITECTURE.md');
  const markdown = fs.readFileSync(filePath, 'utf-8');

  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <article className="prose prose-lg max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </article>
    </main>
  );
}
```

Repeat for other pages (admin-guide, client-sdk, deployment).

### Step 6: Update package.json

**apps/docs/package.json:**

Add to workspace:

```json
{
  "name": "@gitcms/docs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3002",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Step 7: Update Root package.json

**Add workspace:**

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

### Step 8: Deploy Docs to Vercel

1. **Create New Vercel Project**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **"Add New..." → "Project"**
   - Import `BestPlayerMMIII/GitCMS` again

2. **Configure Project**

   ```
   Framework Preset: Next.js
   Root Directory: apps/docs
   Build Command: next build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Deploy**
   - Click **"Deploy"**
   - Wait for deployment

4. **Add Custom Domain**
   - Go to **"Settings" → "Domains"**
   - Add: `gitcms-docs.bestplayer.dev`

5. **Configure DNS in Cloudflare**

   ```
   Type: CNAME
   Name: gitcms-docs
   Target: cname.vercel-dns.com
   Proxy status: Proxied
   ```

6. **Verify**
   - Visit `https://gitcms-docs.bestplayer.dev`
   - Should show your docs site

---

## 🔗 Part 3: Path-Based Routing (Alternative)

If you want `gitcms.bestplayer.dev/admin` and `gitcms.bestplayer.dev/docs`:

### Step 1: Create Monolithic Next.js App

Create `apps/web/` with:

- `/` → Landing page
- `/admin/*` → Admin panel (proxy or rewrite)
- `/docs/*` → Documentation

**This is complex** and requires:

- Next.js rewrites configuration
- Separate builds for admin
- Possible CORS issues

**Recommendation:** Stick with separate subdomains (simpler, better).

---

## 🎨 Part 4: Professional Setup

### Add Landing Page (Optional)

Create `gitcms.bestplayer.dev` (root domain) as a marketing site:

1. Create `apps/web/` (Next.js)
2. Hero section
3. Features
4. Pricing (if applicable)
5. Links to admin and docs

**DNS:**

```
Type: CNAME
Name: gitcms
Target: cname.vercel-dns.com
```

**Result:**

```
gitcms.bestplayer.dev              → Landing page
gitcms-admin.bestplayer.dev        → Admin panel
gitcms-docs.bestplayer.dev         → Documentation
```

### Add SSL & Security Headers

Vercel handles SSL automatically, but you can add security headers:

**vercel.json** (in admin app):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Setup Analytics (Optional)

**Vercel Analytics:**

1. In Vercel project → **"Analytics" tab**
2. Enable analytics
3. Free for hobby plan

**Or use Google Analytics:**

```typescript
// app/layout.tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
  strategy="afterInteractive"
/>
```

---

## 🧪 Testing Checklist

### Admin Panel

- [ ] `https://gitcms-admin.bestplayer.dev` loads
- [ ] HTTPS works (no warnings)
- [ ] Sign in with GitHub works
- [ ] Repository connection works
- [ ] Content creation works
- [ ] Media upload works
- [ ] Responsive design works (mobile/tablet)

### Documentation

- [ ] `https://gitcms-docs.bestplayer.dev` loads
- [ ] HTTPS works
- [ ] All documentation pages load
- [ ] Links work
- [ ] Search functionality (if added)
- [ ] Responsive design works

### DNS

- [ ] Both domains resolve correctly
- [ ] SSL certificates valid
- [ ] Redirects work (if configured)

---

## 🔧 Troubleshooting

### Admin Panel Authentication Fails

**Problem:** GitHub OAuth redirects but doesn't sign in

**Solutions:**

1. Check `NEXTAUTH_URL` matches exactly (including https)
2. Verify GitHub OAuth callback URL is correct
3. Check `NEXTAUTH_SECRET` is set
4. Try incognito mode (clear cookies)
5. Check Vercel logs for errors

### Domain Not Working

**Problem:** Domain shows "DNS_PROBE_FINISHED_NXDOMAIN"

**Solutions:**

1. Wait longer (DNS can take 24 hours)
2. Check CNAME is correct in Cloudflare
3. Verify Cloudflare domain is active
4. Try `dig gitcms-admin.bestplayer.dev` to check DNS
5. Check Vercel shows "Valid Configuration"

### SSL Certificate Issues

**Problem:** "Not Secure" warning or SSL error

**Solutions:**

1. Wait for Vercel to issue certificate (can take 30 minutes)
2. Check domain is verified in Vercel
3. In Cloudflare: Set SSL/TLS mode to "Full"
4. Disable Cloudflare proxy temporarily (gray cloud) to test

### Build Failures

**Problem:** Vercel build fails

**Solutions:**

1. Check build logs in Vercel
2. Verify `Root Directory` is correct
3. Check dependencies in `package.json`
4. Try building locally: `npm run build`
5. Check Node.js version matches

---

## 📊 Monitoring & Maintenance

### Vercel Dashboard

Monitor:

- Deployment status
- Build times
- Function logs
- Analytics
- Bandwidth usage

### Cloudflare Dashboard

Monitor:

- DNS records
- SSL/TLS settings
- Analytics
- Firewall rules

### GitHub

Monitor:

- Repository deployments (Vercel integration)
- Issues from users
- Pull requests

---

## 🚀 Next Steps

1. **Deploy Admin Panel** ✅
   - Vercel project created
   - Custom domain configured
   - GitHub OAuth working

2. **Deploy Documentation** ✅
   - Docs site created
   - Custom domain configured
   - Content accessible

3. **Make Repository Public** (recommended)
   - See [REPOSITORY-PRIVACY-ANALYSIS.md](./REPOSITORY-PRIVACY-ANALYSIS.md)

4. **Announce Launch**
   - Twitter/X
   - Reddit (r/opensource, r/javascript)
   - Product Hunt
   - Hacker News (Show HN)
   - Dev.to

5. **Monitor & Iterate**
   - Gather user feedback
   - Fix bugs
   - Add features
   - Update documentation

---

## 📚 Summary

You now have:

- ✅ Admin Panel deployed at `https://gitcms-admin.bestplayer.dev`
- ✅ Documentation at `https://gitcms-docs.bestplayer.dev`
- ✅ Custom domains with SSL
- ✅ GitHub OAuth configured
- ✅ Production-ready setup

**Professional Result:**

```
https://gitcms-admin.bestplayer.dev   →  Universal Admin Panel
https://gitcms-docs.bestplayer.dev    →  Complete Documentation
https://npmjs.com/package/@git-cms/client  →  SDK for Developers
```

---

**Need help?** Open an issue on
[GitHub](https://github.com/BestPlayerMMIII/GitCMS/issues) or contact via GitHub
profile.

**Congratulations! 🎉 Your GitCMS is now live!**
