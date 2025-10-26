# Video & Document Embedding - Quick Start

## Problem Fixed ✅

Previously:

- ❌ Videos didn't play (thumbnail image used as video source)
- ❌ Documents were corrupted (160 bytes instead of 3MB)
- ❌ No distinction between thumbnail and actual media

Now:

- ✅ Videos play correctly with streaming support
- ✅ Documents download with full content
- ✅ Smart rendering strategy per media type
- ✅ Progressive enhancement for optimal performance

## Usage

### 1. Basic Setup

```typescript
import { injectMediaStyles, MediaManager } from '@git-cms/client';

// Inject styles once
injectMediaStyles();

// Create manager
const mediaManager = new MediaManager({
  repository: 'owner/repo',
  token: 'your-github-token',
  branch: 'main',
});
```

### 2. Fast Render (Recommended)

```typescript
// Shows thumbnails/placeholders immediately
const html = mediaManager.renderFast(content);
document.getElementById('content').innerHTML = html;
```

### 3. Progressive Enhancement

```typescript
import { enableProgressiveMediaLoading } from '@git-cms/client';

// 1. Show thumbnails
const html = mediaManager.renderFast(content);
const container = document.getElementById('content');
container.innerHTML = html;

// 2. Enable click-to-load
enableProgressiveMediaLoading(container, mediaManager);
```

### 4. Full Render

```typescript
// Loads all actual media files
const html = await mediaManager.renderFull(content, {
  onProgress: (current, total, ref) => {
    console.log(`Loading ${current}/${total}: ${ref.filename}`);
  },
});
document.getElementById('content').innerHTML = html;
```

## How It Works

### Images

- **Fast**: Thumbnail image → **Full**: High-res image
- Uses base64 for small images, URLs for large

### Videos

- **Fast**: Poster image + play button → **Full**: `<video>` element
- Always uses GitHub download URLs (supports streaming)

### Audio

- **Fast**: Icon placeholder → **Full**: `<audio>` element
- Uses download URLs for efficient streaming

### Documents

- **Fast**: Preview thumbnail → **Full**: Download link
- Uses download URLs (prevents corruption)

## Complete Documentation

- 📖 [Video & Document Embedding Guide](./VIDEO-DOCUMENT-EMBEDDING.md) -
  Complete guide
- 💻 [Code Examples](./video-examples.ts) - 12 practical examples
- 🎨 [Interactive Demo](./video-demo.html) - Visual demo
- 📚 [Media API Reference](./MEDIA-QUICK-REFERENCE.md) - Quick reference
- 🔧 [Implementation Summary](../../docs/enhance-admin/VIDEO-DOCUMENT-FIX.md) -
  Technical details

## Key Benefits

1. **Performance**: Instant thumbnails, load media on-demand
2. **Correctness**: Videos play, documents download properly
3. **UX**: Visual feedback, click-to-load, loading indicators
4. **DX**: Simple API, TypeScript support, comprehensive docs

## Migration

No breaking changes! Existing code works better automatically.

Optional enhancements:

```typescript
// Add this for optimal performance
injectMediaStyles();
enableProgressiveMediaLoading(container, mediaManager);
```

## Need Help?

- Check [VIDEO-DOCUMENT-EMBEDDING.md](./VIDEO-DOCUMENT-EMBEDDING.md) for
  detailed guide
- See [video-examples.ts](./video-examples.ts) for code examples
- Open [video-demo.html](./video-demo.html) for interactive demo
