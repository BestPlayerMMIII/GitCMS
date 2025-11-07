# Deploying Documentation to GitHub Pages

This guide walks you through deploying the GitCMS documentation website to
GitHub Pages.

## Prerequisites

- GitHub repository with the GitCMS documentation
- Push access to the repository
- GitHub Actions enabled (default for most repos)

## Method 1: Automatic Deployment (Recommended)

The documentation is configured to deploy automatically when you push to the
`main` branch.

### Setup Steps

#### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select **GitHub Actions**

   ![GitHub Pages Settings](https://docs.github.com/assets/cb-47267/mw-1440/images/help/pages/configure-github-actions-as-source.webp)

#### 2. Push Your Changes

```bash
# Make sure you're on the main branch
git checkout main

# Add all documentation files
git add .

# Commit
git commit -m "Add GitCMS documentation"

# Push to main
git push origin main
```

#### 3. Watch the Deployment

1. Go to the **Actions** tab in your repository
2. You should see a workflow running: "Deploy Documentation to GitHub Pages"
3. Wait for it to complete (usually 1-3 minutes)

#### 4. Access Your Documentation

Once deployed, your documentation will be available at:

```
https://USERNAME.github.io/REPO-NAME/
```

For example:

- If your username is `BestPlayerMMIII`
- And your repo is `GitCMS`
- Your docs will be at: https://bestplayermmiii.github.io/GitCMS/

## Method 2: Manual Deployment

You can also trigger deployment manually from GitHub.

### Steps

1. Go to the **Actions** tab
2. Select **"Deploy Documentation to GitHub Pages"** from the left sidebar
3. Click **"Run workflow"** button (right side)
4. Select the branch (usually `main`)
5. Click **"Run workflow"**

The deployment will start immediately.

## Verification

### Check Deployment Status

1. **Actions Tab**: See if the workflow completed successfully
2. **Settings → Pages**: Should show "Your site is live at..."
3. **Visit URL**: Open the documentation URL in your browser

### Troubleshooting

#### Deployment Failed

If the GitHub Action fails:

1. Check the **Actions** tab for error logs
2. Common issues:
   - **Build errors**: Check the build step logs
   - **Permissions**: Ensure GitHub Actions has Pages write permissions
   - **Branch**: Make sure you're pushing to the correct branch

#### 404 Page Not Found

If you get a 404 error:

1. **Check base URL**: In `.vitepress/config.mts`, verify:

   ```typescript
   base: '/REPO-NAME/',  // Must match your repository name
   ```

2. **Wait a few minutes**: Initial deployment can take 5-10 minutes

3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)

#### Changes Not Showing

If your updates don't appear:

1. **Check GitHub Actions**: Verify the latest workflow completed
2. **Clear CDN cache**: GitHub Pages uses a CDN, wait 1-2 minutes
3. **Hard refresh**: Ctrl+Shift+R in your browser

## Configuration

### Base URL

The documentation is configured with a base URL in `.vitepress/config.mts`:

```typescript
export default defineConfig({
  base: '/GitCMS/', // Change to your repo name
  // ...
});
```

**Important**: The base must match your repository name!

### Custom Domain (Optional)

To use a custom domain (e.g., `docs.example.com`):

#### 1. Add CNAME File

Create `apps/docs/public/CNAME`:

```
docs.example.com
```

#### 2. Configure DNS

Add a CNAME record in your DNS provider:

```
CNAME  docs  USERNAME.github.io
```

#### 3. Update Config

In `.vitepress/config.mts`:

```typescript
export default defineConfig({
  base: '/', // Remove base for custom domain
  // ...
});
```

#### 4. Enable in GitHub

1. Go to Settings → Pages
2. Under "Custom domain", enter your domain
3. Check "Enforce HTTPS"

## Workflow File

The deployment is handled by `.github/workflows/deploy-docs.yml`:

```yaml
name: Deploy Documentation to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:
# ... (see full file)
```

### Customization

You can modify the workflow to:

- Deploy from a different branch
- Add additional build steps
- Run tests before deployment
- Deploy to a different environment

## Build Locally

To test the build before deploying:

```bash
# Navigate to docs
cd apps/docs

# Install dependencies
npm install

# Build
npm run build

# Preview
npm run preview
```

The preview server will start at http://localhost:4173

## Continuous Deployment

Every push to `main` triggers automatic deployment:

```bash
# Make changes
vim apps/docs/guide/introduction.md

# Commit and push
git add .
git commit -m "Update introduction"
git push origin main

# Deployment starts automatically!
```

You can watch the progress in the Actions tab.

## Best Practices

### 1. Test Locally First

Always build and preview locally before pushing:

```bash
npm run build
npm run preview
```

### 2. Use Feature Branches

For major changes:

```bash
git checkout -b docs/update-guide
# Make changes
git push origin docs/update-guide
# Create PR, review, then merge to main
```

### 3. Check Build Logs

If deployment fails, check the Actions tab for detailed error messages.

### 4. Monitor Site

After deployment, verify:

- All pages load correctly
- Navigation works
- Images display
- Search functions properly

## Multiple Environments (Advanced)

You can set up separate environments for staging and production.

### Staging Environment

1. Create a `develop` branch
2. Modify the workflow to deploy on `develop` pushes
3. Use a different base URL or subdomain

### Example Workflow

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: ['develop']
# Deploy to staging environment
```

## FAQs

**Q: How long does deployment take?**  
A: Usually 1-3 minutes, but initial deployment can take up to 10 minutes.

**Q: Can I deploy from a branch other than main?**  
A: Yes, modify the workflow file to change the branch.

**Q: What if I want to unpublish the docs?**  
A: Go to Settings → Pages and select "None" as the source.

**Q: Can I use a monorepo structure?**  
A: Yes, the workflow already supports this (builds from `apps/docs`).

**Q: How do I add a custom 404 page?**  
A: Create `apps/docs/public/404.html`.

## Next Steps

Now that your documentation is deployed:

1. **Share the URL** with your users
2. **Add a link** to the README
3. **Keep it updated** with new features
4. **Monitor analytics** (if enabled)

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [VitePress Deployment Guide](https://vitepress.dev/guide/deploy)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Questions?** Open an issue or discussion on GitHub!
