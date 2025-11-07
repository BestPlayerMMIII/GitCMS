# GitCMS Documentation

This directory contains the GitCMS documentation website built with
[VitePress](https://vitepress.dev/).

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The dev server will start at http://localhost:5173

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
apps/docs/
├── .vitepress/
│   ├── config.mts          # VitePress configuration
│   └── dist/               # Build output
├── public/                 # Static assets
│   └── logo.svg
├── guide/                  # General guides
│   ├── introduction.md
│   ├── getting-started.md
│   ├── how-it-works.md
│   └── use-cases.md
├── admin/                  # Admin panel documentation
│   ├── overview.md
│   ├── getting-started.md
│   ├── schemas.md
│   └── ...
├── client/                 # Client SDK documentation
│   ├── overview.md
│   ├── installation.md
│   ├── quick-start.md
│   └── ...
├── index.md                # Homepage
├── changelog.md
├── contributing.md
└── package.json
```

## 🌐 GitHub Pages Deployment

The documentation is automatically deployed to GitHub Pages when changes are
pushed to the `main` branch.

### Setup (First Time)

1. **Enable GitHub Pages** in your repository:
   - Go to Settings → Pages
   - Source: GitHub Actions

2. **Push to main branch**:

   ```bash
   git add .
   git commit -m "Add documentation"
   git push origin main
   ```

3. **GitHub Actions will automatically**:
   - Build the documentation
   - Deploy to GitHub Pages
   - Available at: `https://USERNAME.github.io/REPO-NAME/`

### Manual Deployment

You can also trigger deployment manually:

- Go to Actions tab
- Select "Deploy Documentation to GitHub Pages"
- Click "Run workflow"

## 📝 Adding Content

### New Page

1. Create a new `.md` file in the appropriate directory
2. Add frontmatter if needed:
   ```markdown
   ---
   title: Page Title
   description: Page description
   ---
   ```
3. Add the page to navigation in `.vitepress/config.mts`

### Update Navigation

Edit `.vitepress/config.mts`:

```typescript
sidebar: {
  '/guide/': [
    {
      text: 'Section Name',
      items: [
        { text: 'Page Title', link: '/guide/page' }
      ]
    }
  ]
}
```

## 🎨 Customization

### Theme

VitePress uses a default theme that can be customized in
`.vitepress/config.mts`:

- Colors
- Logo
- Navigation
- Footer
- Search

### Assets

Place static files in `public/`:

- Images: `public/images/`
- Styles: `public/styles/`

Reference in markdown:

```markdown
![Alt text](/images/screenshot.png)
```

## 📚 Documentation

- [VitePress Guide](https://vitepress.dev/guide/what-is-vitepress)
- [Markdown Extensions](https://vitepress.dev/guide/markdown)
- [Frontmatter](https://vitepress.dev/reference/frontmatter-config)

## 🤝 Contributing

See the main [Contributing Guide](/contributing) for guidelines.

## 📄 License

MIT - see LICENSE file for details.
