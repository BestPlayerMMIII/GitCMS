# GitCMS Admin Panel Guide

**Last Updated:** November 6, 2025

Complete guide for content creators using the GitCMS Admin Panel to manage
content in their GitHub repositories.

## 🎯 What is the Admin Panel?

The **GitCMS Admin Panel** is a universal web application that provides a visual
interface for managing content stored in GitHub repositories. Think of it as
WordPress, but for GitHub files.

**Key Benefits:**

- No technical knowledge required
- Visual content editor
- Automatic GitHub commits
- Media upload and management
- Works with any GitHub repository

**Access:** https://gitcms-admin.bestplayer.dev

## 👤 Who Should Use This?

- **Bloggers** - Manage blog posts without touching code
- **Content Writers** - Create and edit content visually
- **Marketing Teams** - Update website content independently
- **Documentation Teams** - Maintain docs with version control
- **Anyone** - Who prefers a visual interface over editing raw files

## 🚀 Getting Started

### Step 1: Sign In with GitHub

1. Visit https://gitcms-admin.bestplayer.dev
2. Click **"Sign in with GitHub"**
3. Authorize the GitCMS Admin Panel
4. You'll be redirected to the dashboard

**What Permissions Are Required?**

- **Repositories (Public and Private):** This application needs permission to
  read and write data from all your public and private repositories.

- **Email and Profile Information:** Used only to identify your account and
  personalize your experience.

These permissions ensure seamless access to your repositories without requiring
you to adjust settings each time you use the application.

### Step 2: Connect Your Repository

1. From the dashboard, click **"Connect Repository"**
2. Select a repository from the list, or create a new one
3. Choose the branch (default: `main`)
4. Click **"Connect"**

**First Time Setup:** If this is your first time using GitCMS with this repo,
the setup wizard will:

- Create `.gitcms/` folder with configuration
- Create `content` and `media` folder for your contents and media
- Set up initial schemas (optional)

### Step 3: Define Content Schemas

**What is a Schema?** A schema defines the structure of your content type (like
a blueprint). For example:

**Blog Post Schema:**

- Title (text)
- Content (markdown)
- Featured Image (media)
- Published Date (date)
- Tags (array of strings)

**How to Create a Schema:**

1. Navigate to **"Schemas"** in the navigation bar
2. Click **"Create New Schema"**
3. Fill in the schema details:
   - **Name (ID):** `blog-post` (URL-friendly, lowercase)
   - **Display Name:** `Blog Post`
   - **Description:** Content type for blog articles
4. Add fields:
   - Click **"Add Field"**
   - Choose field type
   - Set field properties (name, required, etc.)
5. Click **"Save Schema"**

**Available Field Types:**

- **String** - Short text (titles, names)
- **Text** - Long text (descriptions)
- **Markdown** - Rich text content with formatting
- **Number** - Integers or decimals
- **Boolean** - True/false checkboxes
- **Date** - Date picker
- **DateTime** - Date and time picker
- **Media** - Images, videos, documents
- **Array** - List of items (tags, categories)
- **Object** - Nested data structure

### Step 4: Create Content

1. Navigate to **"Content"** in the navigation bar
2. Click **"Create New"**
3. Select a schema type (e.g., "Blog Post")
4. Fill in the form:
   - **Title:** Enter your title
   - **Content:** Use the rich text editor
   - **Featured Image:** Upload or select media
   - **Published Date:** Pick a date
   - **Tags:** Add tags
5. Click **"Save as Draft"**

### **Draft, Published and Archived**

After creating content, you can publish it, and later archive it when no longer
needed.  
These three statuses are available through the client SDK as `metadata.status`,
which can be `'draft'`, `'published'` or `'archived'`, allowing you to create
custom filters and workflows within your projects.

## 📝 Content Editor

### Rich Text Editor Features

The GitCMS editor (powered by TipTap) provides:

**Formatting:**

- Bold, italic, underline, strikethrough
- Headings (H1-H6)
- Lists (ordered, unordered)
- Blockquotes
- Code blocks with syntax highlighting
- Tables

**Media:**

- Insert images (drag & drop or upload)
- Embed videos
- Link to documents

**Advanced:**

- Links (internal and external)
- Text alignment
- Horizontal rules
- Character count

**Keyboard Shortcuts:**

- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + K` - Insert link
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo

### Markdown Mode

If you prefer Markdown:

1. Toggle to **"Markdown Mode"** (switch at top-right)
2. Edit raw Markdown
3. Toggle back to see visual preview

**Example Markdown:**

```markdown
# My Blog Post

This is **bold** and this is _italic_.

## Section

- List item 1
- List item 2

[Link to GitHub](https://github.com)
```

## 🖼️ Media Management

### Uploading Media

**Method 1: Drag & Drop**

1. Drag files from your computer
2. Drop them in the media library "Upload" tab
3. Files are uploaded to the configured `media` folder in your repo

**Method 2: Upload Button**

1. Click **"Upload Media"** button
2. Select files from your computer
3. Confirm upload

**Supported Formats:**

- **Images:** JPG, PNG, GIF, WebP, SVG
- **Videos:** MP4, WebM, MOV
- **Audio:** MP3, WAV, OGG
- **Documents:** PDF, DOC, DOCX, TXT
- **3D Models:** GLB, GLTF, OBJ
- **and more...**

### Organizing Media

Media is automatically organized by type:

```
content/
└── media/
    ├── images/
    ├── videos/
    ├── audio/
    ├── documents/
    └── models/
```

**Best Practices:**

- Use descriptive filenames
- Optimize images before uploading (< 2MB recommended)
- Use videos sparingly (large file sizes)
- Consider Git LFS for very large files

### Inserting Media in Content

1. Click **"Insert Image/Video"** in editor
2. Select from media library or upload new
3. Media is embedded with proper syntax
4. Preview immediately in editor

## 📋 Content Management

### Viewing All Content

1. Navigate to **"Content"** in navigation bar
2. See list of all content items
3. Filter by:
   - Schema type
   - Status (draft, published)
   - Date created/modified
   - Search by title

### Editing Existing Content

1. Click on content item in list
2. Make your changes
3. Click **"Save"** to update
4. Changes are committed to GitHub

### Deleting Content

1. Open content item
2. Click **"Delete"** button (bottom-left)
3. Confirm deletion
4. File is removed from GitHub

**Note:** Deleted files can be recovered from Git history if needed.

### Content History (Version Control)

Every change is tracked by Git:

1. Open content item
2. Click **"View History"** tab
3. See all commits for this file
4. Click any commit to see changes
5. (Optional) Revert to previous version

## 🔧 Repository Settings

### Schema Management

**View All Schemas:**

- Navigate to **"Schemas"**
- See all defined content types
- Edit, duplicate, or delete

**Edit Schema:**

1. Click schema name
2. Modify fields (add, edit, remove)
3. Save changes
4. Existing content is validated against new schema

**Delete Schema:**

1. Click **"Delete Schema"**
2. Confirm deletion
3. **Warning:** Content using this schema becomes orphaned

### User Permissions (Coming Soon)

Future feature to manage team access:

- Admin (full access)
- Editor (create/edit content)
- Viewer (read-only)

## 🎯 Workflows

### Workflow 1: Writing a Blog Post

```
1. Sign in to Admin Panel
2. Navigate to "Content" → "Create New"
3. Select "Blog Post" schema
4. Fill in:
   - Title: "10 Tips for Better Code"
   - Content: Write your post in rich text editor
   - Featured Image: Upload hero image
   - Tags: ["coding", "tips", "tutorial"]
   - Published Date: Today
5. Click "Publish"
6. Done! Content is on GitHub
7. Your website/app fetches it via @git-cms/client
```

### Workflow 2: Managing Portfolio Projects

```
1. Create "Project" schema with fields:
   - Title, Description, Image, URL, Tech Stack
2. For each project:
   - Create new "Project" content
   - Upload project screenshots
   - Add project details
   - Publish
3. Your portfolio site displays all projects
```

### Workflow 3: App Configuration

```
1. Create "App Config" schema with fields:
   - Feature flags (boolean)
   - Announcements (array)
   - API endpoints (object)
2. Create single config document
3. Update as needed
4. Mobile/web app fetches config on launch
5. No app update required to change settings
```

## 💡 Tips & Best Practices

### Content Writing

**Do:**

- ✅ Use descriptive titles
- ✅ Add meta descriptions for SEO
- ✅ Tag content appropriately
- ✅ Preview before publishing
- ✅ Use headings for structure

**Don't:**

- ❌ Use special characters in file names
- ❌ Forget to add alt text for images
- ❌ Upload very large media files (> 10MB)
- ❌ Delete schemas with existing content

### Media Optimization

**Images:**

- Resize to appropriate dimensions (e.g., 1920px max width)
- Compress before upload (TinyPNG, ImageOptim)
- Use WebP format when possible
- Add descriptive alt text

**Videos:**

- Consider hosting on YouTube/Vimeo and embedding
- If uploading: compress and use H.264/H.265 codecs
- Keep file size < 50MB (Git limits)
- Use Git LFS for larger files

### Repository Organization

**Recommended Structure:**

```
repository/
├── .gitcms/
│   ├── config.json
│   ├── schemas/
│   │   ├── blog-post.json
│   │   ├── project.json
│   │   └── page.json
│   ├── content/
│   │   ├── blog-post/
│   │   │   ├── 2025-11-06-my-first-post.md
│   │   │   └── 2025-11-07-second-post.md
│   │   ├── project/
│   │   │   ├── project-one.json
│   │   │   └── project-two.json
│   │   └── page/
│   │       ├── about.md
│   │       └── contact.json
│   └── media/
│       ├── image.png
│       └── video.mp4
└── [your code files (if needed)]
```

## 🔧 Troubleshooting

### Content Not Saving

**Problem:** Click "Save" but nothing happens

**Solutions:**

1. Check internet connection
2. Verify GitHub permissions (Settings → GitHub OAuth)
3. Check if repository is archived (cannot modify)
4. Try signing out and back in

### Media Upload Failing

**Problem:** Media files won't upload

**Solutions:**

1. Check file size (< 25MB per file)
2. Verify file type is supported
3. Check repository isn't full (GitHub limits)
4. Try smaller batch (upload fewer files at once)

### Schema Changes Not Reflecting

**Problem:** Updated schema but form looks the same

**Solutions:**

1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Sign out and back in

### Can't See My Content

**Problem:** Created content but can't find it

**Solutions:**

1. Check correct repository is connected
2. Verify correct branch is selected
3. Check content status (draft vs. published)
4. Use search feature to find by title

## 📞 Getting Help

### Documentation

- **Main Docs:** [docs/README.md](./README.md)
- **Architecture:** [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Client SDK:** [docs/CLIENT-SDK-GUIDE.md](./CLIENT-SDK-GUIDE.md)

### Support Channels

- **GitHub Issues:**
  [BestPlayerMMIII/GitCMS/issues](https://github.com/BestPlayerMMIII/GitCMS/issues)
- **Email:** Via GitHub profile

### FAQs

**Q: Is my GitHub token secure?** A: Yes! Tokens are stored server-side only,
encrypted in session cookies, and never exposed to the browser.

**Q: Can multiple people edit the same repo?** A: Yes! Each person signs in with
their own GitHub account. GitHub handles conflict resolution like normal Git
operations.

**Q: Can I use GitCMS with private repos?** A: Yes! Because you granted private
repository access during GitHub OAuth.

**Q: How do I backup my content?** A: It's already backed up! Your content is in
GitHub with full version history. You can clone your repository anytime.

**Q: Can I export my content?** A: Yes! Your content is just files in your
GitHub repo. Clone it, download as ZIP, or access via GitHub API.

**Q: What happens if GitCMS shuts down?** A: Your content is safe in your GitHub
repository. You can access it directly or build your own admin interface.

## 🎓 Next Steps

Now that you know how to use the Admin Panel:

1. **Try it out** - Create your first content
2. **Learn the SDK** - Read [Client SDK Guide](./CLIENT-SDK-GUIDE.md)
3. **Build your project** - Integrate GitCMS into your website/app
4. **Share feedback** - Open issues or contribute

## 📖 Related Documentation

- **[Client SDK Guide](./CLIENT-SDK-GUIDE.md)** - Fetch and display contents for
  your projects

---

**Questions or feedback?** Open an issue on
[GitHub](https://github.com/BestPlayerMMIII/GitCMS/issues).

---

**Made with ❤️ by [Manuel Maiuolo](https://github.com/BestPlayerMMIII)**
