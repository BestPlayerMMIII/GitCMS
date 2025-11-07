# Admin Panel — Getting Started

This guide walks you through signing in, connecting a repository, and creating
your first content.

## 1. Sign in with GitHub

1. Visit the Admin Panel: https://gitcms-admin.bestplayer.dev
2. Click "Sign in with GitHub".
3. Authorize the application.

Permissions required:

- Repositories (read/write)
- Email and profile information

## 2. Connect a Repository

1. From the dashboard, click "Connect Repository".
2. Choose a repository or create a new one.
3. Select the branch (default: `main`).
4. Click "Connect".

The Admin Panel will create a `.gitcms/` folder and optional initial content.

## 3. Create a Schema

1. Go to "Schemas".
2. Click "Create New Schema".
3. Enter ID (e.g., `blog-post`) and display name (e.g., `Blog Post`).
4. Add fields (title, content, featured image, publishedAt, tags).
5. Save schema.

## 4. Create Content

1. Go to "Content" → "Create New".
2. Select the schema you created.
3. Fill fields and add media.
4. Save as draft or publish.

## 5. Media Upload

- Drag & drop files into Media Library or use Upload button.
- Supported formats: images, video, audio, documents.
- Recommended image size: < 2MB.

## 6. Publishing

- When you publish, Admin Panel commits the content to the connected repository.
- You can view the commit in your repository.

## Troubleshooting

If you can't connect:

- Verify GitHub OAuth permissions.
- Check network connectivity.
- Make sure the repository isn't archived.

## What's Next?

- [Schemas](/admin/schemas)
- [Creating Content](/admin/creating-content)
- [Media Management](/admin/media-management)
