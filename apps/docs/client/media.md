# Media Management

Handle images, videos, and documents with progressive loading.

## Overview

GitCMS provides a powerful media API for working with embedded media:

- **Fast thumbnails**: Instant display with embedded base64 data
- **Async loading**: Progressive enhancement for full resolution
- **Smart caching**: Automatic caching of fetched media
- **Multiple formats**: Images, videos, audio, documents, 3D models

## Quick Example

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'owner/repo',
  token: process.env.GITHUB_TOKEN,
});

// Get post with media
const post = await cms.from('posts').doc('my-post').get();

// Extract media references
const mediaRefs = cms.media.extractFromHTML(post.content);

// Get thumbnails (instant)
const thumbnail = cms.media.getThumbnail(mediaRefs[0]);

// Fetch full resolution (async)
const fullMedia = await cms.media.fetchFull(mediaRefs[0]);
```

## Progressive Enhancement

Two-stage loading for optimal performance:

```typescript
// 1. Fast render with thumbnails
const fastHtml = cms.media.renderFast(post.content);
container.innerHTML = fastHtml;

// 2. Load full resolution asynchronously
const fullHtml = await cms.media.renderFull(post.content, {
  onProgress: (current, total, ref) => {
    console.log(`Loading ${current}/${total}: ${ref.filename}`);
  },
});
container.innerHTML = fullHtml;
```

## Content Media Helpers

For entire content items:

```typescript
// Extract ALL media (rich-text + fields)
const allMedia = cms.contentMedia.extractAll(post);

// Get all thumbnails
const thumbnails = cms.contentMedia.getThumbnails(post);

// Preload all media
const fullMediaMap = await cms.contentMedia.preloadAll(post);

// Render entire content item
const fastPost = cms.contentMedia.renderFast(post);
const fullPost = await cms.contentMedia.renderFull(post);
```

## Supported Media Types

- **Images**: JPG, PNG, GIF, WebP, SVG
- **Videos**: MP4, WebM, MOV
- **Audio**: MP3, WAV, OGG
- **Documents**: PDF, DOC, DOCX, TXT
- **3D Models**: GLB, GLTF, OBJ

## Next Steps

::: info Learn More

- [Progressive Loading](/client/progressive-loading) - Detailed guide
- [Video & Documents](/client/video-documents) - Embedding
- [Framework Integration](/client/nextjs) - Use in apps

:::
