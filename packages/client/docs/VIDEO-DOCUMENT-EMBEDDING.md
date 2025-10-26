# Video and Document Embedding in GitCMS

This guide explains how GitCMS handles video, audio, and document embedding with
optimal performance and progressive enhancement.

## Overview

GitCMS uses a two-stage rendering approach for media files:

1. **Fast Render (Thumbnails)**: Shows lightweight thumbnails/placeholders
   immediately
2. **Full Render (Progressive)**: Loads actual media files on-demand or
   automatically

This approach ensures fast page loads while maintaining full media
functionality.

## Media Types

### Images

- **Fast render**: Thumbnail image
- **Full render**: Full-resolution image
- **Best for**: All image formats (JPG, PNG, WebP, SVG, etc.)

### Videos

- **Fast render**: Poster image with play button overlay
- **Full render**: Actual video element with controls
- **Best for**: MP4, WebM, MOV
- **Note**: Videos are NEVER embedded as base64 due to size; GitHub download
  URLs are used

### Audio

- **Fast render**: Audio icon placeholder
- **Full render**: Audio player with controls
- **Best for**: MP3, WAV, OGG, AAC
- **Note**: Uses download URLs for efficient streaming

### Documents

- **Fast render**: Document thumbnail preview
- **Full render**: Download link with icon
- **Best for**: PDF, DOC, DOCX, TXT
- **Note**: Documents are downloaded, not embedded inline

## Usage

### Basic Setup

```typescript
import { MediaManager, injectMediaStyles } from '@git-cms/client';

// 1. Inject CSS styles (once in your app)
injectMediaStyles();

// 2. Create MediaManager
const mediaManager = new MediaManager({
  repository: 'owner/repo',
  token: 'your-github-token', // For private repos
  branch: 'main',
});
```

### Fast Rendering (Thumbnails Only)

```typescript
// Extract content with embedded media
const content = contentItem.content; // Contains <gitcms-media> tags

// Render with thumbnails (fast, immediate)
const htmlWithThumbnails = mediaManager.renderFast(content);

// Display in your app
document.getElementById('content').innerHTML = htmlWithThumbnails;
```

**Output for video:**

```html
<div
  class="gitcms-video-placeholder"
  data-gitcms-path=".gitcms/media/video.mp4"
>
  <img
    src="data:image/webp;base64,..."
    alt="Video"
    class="gitcms-video-poster"
  />
  <div class="gitcms-video-overlay">
    <svg><!-- Play icon --></svg>
    <p>Click to load video</p>
  </div>
</div>
```

**Output for document:**

```html
<div
  class="gitcms-document-placeholder"
  data-gitcms-path=".gitcms/media/doc.pdf"
>
  <img
    src="data:image/svg+xml,..."
    alt="Document"
    class="gitcms-document-thumbnail"
  />
  <div>
    <p>document.pdf</p>
    <p>Click to download</p>
  </div>
</div>
```

### Full Rendering (Progressive Enhancement)

```typescript
// Render with full media (async, loads actual files)
const htmlWithFullMedia = await mediaManager.renderFull(content, {
  onProgress: (current, total, reference) => {
    console.log(`Loading ${current}/${total}: ${reference.filename}`);
  },
});

document.getElementById('content').innerHTML = htmlWithFullMedia;
```

**Output for video:**

```html
<video controls data-gitcms-path=".gitcms/media/video.mp4" preload="metadata">
  <source
    src="https://raw.githubusercontent.com/owner/repo/main/.gitcms/media/video.mp4"
    type="video/mp4"
  />
  Your browser does not support the video tag.
</video>
```

**Output for document:**

```html
<a
  href="https://raw.githubusercontent.com/owner/repo/main/.gitcms/media/doc.pdf"
  download="document.pdf"
  class="gitcms-document-link"
>
  <svg><!-- Document icon --></svg>
  <span>document.pdf</span>
</a>
```

### Progressive Enhancement (Click-to-Load)

For optimal performance, render thumbnails first and upgrade on user
interaction:

```typescript
import { enableProgressiveMediaLoading } from '@git-cms/client';

// 1. Render fast (thumbnails)
const html = mediaManager.renderFast(content);
const container = document.getElementById('content');
container.innerHTML = html;

// 2. Enable click-to-load for media
enableProgressiveMediaLoading(container, mediaManager);
```

Now when users click on video/audio/document placeholders, they automatically
upgrade to full media.

## Media Tag Structure

GitCMS uses custom `<gitcms-media>` tags in the editor:

```html
<gitcms-media
  data-path=".gitcms/media/video.mp4"
  data-filename="my-video.mp4"
  data-thumbnail="data:image/webp;base64,..."
  alt="My Video"
  title="Tutorial Video"
>
</gitcms-media>
```

### Attributes

- **`data-path`**: Required. Path to the media file in the repository
- **`data-filename`**: Required. Original filename
- **`data-thumbnail`**: Optional. Base64-encoded thumbnail for fast display
- **`alt`**: Optional. Alternative text for accessibility
- **`title`**: Optional. Title/tooltip text

## How It Works

### 1. In the Admin Editor

When you insert media via the rich-text editor:

1. Media picker opens
2. User selects video/document
3. Editor fetches the **thumbnail** (small image preview)
4. Embeds `<gitcms-media>` tag with thumbnail as base64 data URL
5. Editor displays thumbnail with visual indicator

### 2. On the Client Side

When rendering content:

**Fast Render:**

- Parses `<gitcms-media>` tags
- Extracts `data-thumbnail` attribute
- For videos: Shows poster image with play button
- For documents: Shows thumbnail with download prompt
- **No API calls, instant display**

**Full Render:**

- Parses `<gitcms-media>` tags
- Fetches actual media file from GitHub
- For videos/audio: Uses GitHub download URL (streaming)
- For documents: Uses download URL (download link)
- **Async, on-demand loading**

### 3. Why Not Base64 for Videos/Documents?

Videos and documents are typically large (MB to GB). Encoding them as base64:

- Increases size by ~33%
- Bloats HTML payload
- Causes browser memory issues
- Prevents streaming playback

Instead, we use **GitHub download URLs** which:

- Support HTTP range requests (streaming)
- Are cached by browsers and CDNs
- Work with video/audio native controls
- Enable progressive download

## Best Practices

### 1. Always Inject Styles

```typescript
import { injectMediaStyles } from '@git-cms/client';

// In your app initialization
injectMediaStyles();
```

### 2. Use Progressive Enhancement for Blogs/Articles

```typescript
// Fast initial render
const html = mediaManager.renderFast(content);
container.innerHTML = html;

// Enable on-demand loading
enableProgressiveMediaLoading(container, mediaManager);
```

### 3. Preload Media for Critical Content

```typescript
// If you know media will be needed immediately
const html = await mediaManager.renderFull(content);
container.innerHTML = html;
```

### 4. Handle Private Repositories

For private repos, ensure you provide an authentication token:

```typescript
const mediaManager = new MediaManager({
  repository: 'owner/private-repo',
  token: await getGitHubToken(), // OAuth token
  branch: 'main',
});
```

### 5. Optimize Thumbnails

Thumbnails are automatically generated for images. For videos:

- Upload a custom thumbnail image
- Use the first frame as thumbnail
- GitCMS automatically creates WebP thumbnails (300x300)

## File Size Limits

### GitHub API Limits

- **Files ≤ 1MB**: Content included in API response (can use base64)
- **Files > 1MB**: Only metadata returned (must use download URL)

### GitCMS Strategy

- **Images < 1MB**: Embedded as base64 data URLs
- **Images > 1MB**: Use download URLs
- **Videos/Audio**: ALWAYS use download URLs (too large)
- **Documents**: ALWAYS use download URLs (too large)
- **LFS Files**: Automatically detected and use download URLs

## Styling

GitCMS provides default styles via `injectMediaStyles()`. You can customize:

```css
/* Custom video placeholder */
.gitcms-video-placeholder {
  border-radius: 16px;
  overflow: hidden;
}

/* Custom document link */
.gitcms-document-link {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* Custom play button overlay */
.gitcms-video-overlay svg {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}
```

## API Reference

### `MediaManager.renderFast(html: string): string`

Replaces `<gitcms-media>` tags with thumbnails/placeholders.

- **Fast**: No API calls
- **Returns**: HTML with placeholders
- **Use for**: Initial page load, blogs, articles

### `MediaManager.renderFull(html: string, options?): Promise<string>`

Replaces `<gitcms-media>` tags with actual media elements.

- **Async**: Fetches from GitHub
- **Returns**: Promise<HTML with full media>
- **Use for**: Media galleries, critical videos

### `enableProgressiveMediaLoading(container: HTMLElement, mediaManager: MediaManager): void`

Adds click handlers to upgrade placeholders to full media.

- **Parameters**:
  - `container`: DOM element containing rendered content
  - `mediaManager`: MediaManager instance
- **Use for**: Click-to-play videos, on-demand loading

### `injectMediaStyles(): void`

Injects GitCMS media styles into document.

- **Call once**: During app initialization
- **Safe to call multiple times**: Checks if already injected

## Troubleshooting

### Videos Not Playing

**Problem**: Video shows placeholder but doesn't load **Solution**:

1. Check browser console for errors
2. Verify GitHub token is valid for private repos
3. Ensure video file exists at `data-path`
4. Check video format is supported (use MP4 for best compatibility)

### Documents Corrupted

**Problem**: Downloaded document is corrupted/empty **Solution**:

- Don't use base64 for documents
- Ensure `renderFull()` is called, not just `renderFast()`
- Verify the download URL is accessible

### Thumbnails Not Showing

**Problem**: Blank placeholders instead of thumbnails **Solution**:

1. Check `data-thumbnail` attribute exists
2. Verify base64 data URL is valid
3. Ensure thumbnail was generated during upload

### Private Repo Access Denied

**Problem**: 403 errors when loading media **Solution**:

1. Provide valid GitHub OAuth token
2. Ensure token has `repo` scope
3. Verify user has access to repository

## Examples

### Example 1: Simple Blog Post

```typescript
import { MediaManager, injectMediaStyles } from '@git-cms/client';

// Setup
injectMediaStyles();
const mediaManager = new MediaManager({
  repository: 'my-blog/content',
  branch: 'main',
});

// Fetch blog post
const post = await client.getContent('posts', 'my-post');

// Render with thumbnails (fast)
const html = mediaManager.renderFast(post.content);
document.getElementById('post').innerHTML = html;
```

### Example 2: Video Gallery with Progressive Loading

```typescript
import {
  MediaManager,
  injectMediaStyles,
  enableProgressiveMediaLoading,
} from '@git-cms/client';

// Setup
injectMediaStyles();
const mediaManager = new MediaManager({
  repository: 'videos/library',
  token: await getToken(),
});

// Fetch video gallery content
const gallery = await client.getContent('galleries', 'tutorials');

// Render thumbnails
const html = mediaManager.renderFast(gallery.content);
const container = document.getElementById('gallery');
container.innerHTML = html;

// Enable click-to-play
enableProgressiveMediaLoading(container, mediaManager);
```

### Example 3: Document Library

```typescript
import { MediaManager, injectMediaStyles } from '@git-cms/client';

injectMediaStyles();
const mediaManager = new MediaManager({
  repository: 'docs/resources',
  token: await getToken(),
});

const docs = await client.getContent('resources', 'downloads');

// For documents, render full immediately (download links)
const html = await mediaManager.renderFull(docs.content, {
  onProgress: (current, total) => {
    console.log(`Loading ${current}/${total} documents`);
  },
});

document.getElementById('resources').innerHTML = html;
```

## Migration from Old Implementation

If you were using the old implementation that embedded videos/documents as
base64:

### Before (Incorrect)

```typescript
// This would corrupt videos/documents
const html = content.replace(/<gitcms-media/g, match => {
  // Used data-thumbnail as video source (wrong!)
  return `<video src="${thumbnailData}">`;
});
```

### After (Correct)

```typescript
// Use MediaManager for proper handling
const mediaManager = new MediaManager(config);
const html = await mediaManager.renderFull(content);
```

## Performance Tips

1. **Lazy Load**: Use `renderFast()` + `enableProgressiveMediaLoading()` for
   long pages
2. **Cache**: MediaManager caches fetched media automatically
3. **Thumbnails**: Always generate thumbnails during upload for best performance
4. **CDN**: For public repos, consider using a CDN for faster media delivery
5. **Preload Critical Media**: Use `renderFull()` for above-the-fold videos

## Security Considerations

1. **Private Repos**: Always use authenticated requests (provide token)
2. **Token Storage**: Store GitHub tokens securely (environment variables, not
   in code)
3. **Content Security Policy**: Allow `data:` URIs for thumbnails, GitHub URLs
   for media
4. **CORS**: GitHub raw URLs are CORS-enabled, works cross-origin

## Future Enhancements

Planned features:

- [ ] Custom video player integration
- [ ] PDF inline preview (PDF.js)
- [ ] Video transcoding for multiple formats
- [ ] Adaptive bitrate streaming
- [ ] Media analytics (view counts, play duration)
- [ ] Caption/subtitle support for videos
- [ ] Audio waveform visualization

---

**Need Help?** Check the [main documentation](./README.md) or open an issue on
GitHub.
