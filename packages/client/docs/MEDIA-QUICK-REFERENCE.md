# GitCMS Media API - Quick Reference

## Setup

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'owner/repo',
  token: 'github_token',
  branch: 'main',
});
```

## Core API

### Extract Media

```typescript
// From HTML (<gitcms-media> tags)
const mediaRefs = cms.media.extractFromHTML(html);

// From schema fields
const ref = cms.media.extractFromField(value); // Single
const refs = cms.media.extractFromField(array); // Multiple
```

### Fast Access (Thumbnails)

```typescript
// Get thumbnail (instant, no API call)
const thumbnail = cms.media.getThumbnail(mediaRef);
// Returns: base64 data URL or placeholder
```

### Full Resolution (Async)

```typescript
// Single media
const full = await cms.media.fetchFull(mediaRef);
console.log(full.url, full.size, full.downloadUrl);

// Multiple media (with concurrency)
const fullMedia = await cms.media.fetchMultiple(mediaRefs, {
  concurrency: 3,
  resolveLFS: true,
  timeout: 30000,
});
```

### Render HTML

```typescript
// Fast (thumbnails)
const fastHtml = cms.media.renderFast(htmlContent);

// Full (async, high-res)
const fullHtml = await cms.media.renderFull(htmlContent, {
  onProgress: (current, total, ref) => {
    console.log(`${current}/${total}: ${ref.filename}`);
  },
});
```

### Content Helper

```typescript
// Extract all media (HTML + fields)
const allMedia = cms.contentMedia.extractAll(contentItem);

// Get all thumbnails
const thumbnails = cms.contentMedia.getThumbnails(contentItem);

// Preload all
const fullDataMap = await cms.contentMedia.preloadAll(contentItem);

// Render content item
const fast = cms.contentMedia.renderFast(contentItem);
const full = await cms.contentMedia.renderFull(contentItem);
```

### Cache Management

```typescript
// Clear cache
cms.media.clearCache();

// Get stats
const { size, keys } = cms.media.getCacheStats();
```

## Common Patterns

### Pattern: Progressive Enhancement

```typescript
// 1. Show thumbnails immediately
const fastHtml = cms.media.renderFast(post.content);
displayContent(fastHtml);

// 2. Load full resolution in background
const fullHtml = await cms.media.renderFull(post.content);
updateContent(fullHtml);
```

### Pattern: Image Gallery

```typescript
const gallery = await cms.from('galleries').doc('photos').get();
const images = cms.media.extractFromField(gallery.data.images);

// Show thumbnails
images.forEach(img => {
  showThumbnail(cms.media.getThumbnail(img));
});

// Load full on click
async function onClick(img) {
  const full = await cms.media.fetchFull(img);
  showLightbox(full.url);
}
```

### Pattern: React Component

```typescript
function Post({ postId }: { postId: string }) {
  const [content, setContent] = useState('');

  useEffect(() => {
    (async () => {
      const post = await cms.from('posts').doc(postId).get();

      // Fast
      setContent(cms.media.renderFast(post.content));

      // Full
      const full = await cms.media.renderFull(post.content);
      setContent(full);
    })();
  }, [postId]);

  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
```

### Pattern: 3D Model

```typescript
const model = cms.media.extractFromField(product.data.model3d);

if (model?.mediaType === '3d') {
  const data = await cms.media.fetchFull(model, { resolveLFS: true });
  const blob = new Blob([data.content!], { type: 'model/gltf-binary' });
  loadInto3DViewer(URL.createObjectURL(blob));
}
```

## Types

```typescript
interface MediaReference {
  id: string;
  path: string; // "media/images/photo.jpg"
  filename: string; // "photo.jpg"
  thumbnail?: string; // "data:image/webp;base64,..."
  alt?: string;
  title?: string;
  mimeType?: string; // "image/jpeg"
  mediaType?: 'image' | 'video' | 'audio' | 'document' | '3d' | 'other';
}

interface FullMediaData {
  reference: MediaReference;
  url: string; // Full resolution URL
  content?: ArrayBuffer; // Raw content
  size?: number; // Bytes
  downloadUrl?: string; // GitHub download URL
}

interface MediaFetchOptions {
  resolveLFS?: boolean; // Handle LFS files
  timeout?: number; // Milliseconds
  onProgress?: (loaded: number, total: number) => void;
}
```

## Media Types

| Type     | Extensions               | Output         |
| -------- | ------------------------ | -------------- |
| Image    | jpg, png, gif, webp, svg | `<img>`        |
| Video    | mp4, webm, mov           | `<video>`      |
| Audio    | mp3, wav, ogg            | `<audio>`      |
| 3D Model | glb, gltf, obj           | `<a>` download |
| Document | pdf, doc, docx           | `<a>` download |

## Error Handling

```typescript
try {
  const full = await cms.media.fetchFull(ref, { timeout: 10000 });
} catch (error) {
  console.error('Failed to load media:', error);
  // Fallback to thumbnail
  const thumbnail = cms.media.getThumbnail(ref);
  displayFallback(thumbnail);
}
```

## Performance Tips

✅ **DO**: Show thumbnails first, load full resolution later ✅ **DO**: Use
concurrency control for multiple media ✅ **DO**: Enable LFS for large files
(videos, 3D models) ✅ **DO**: Cache is automatic, trust it ✅ **DO**: Use
`onProgress` for user feedback

❌ **DON'T**: Fetch all full-res media at once ❌ **DON'T**: Skip thumbnails and
load full directly ❌ **DON'T**: Ignore error handling ❌ **DON'T**: Forget
timeout for large files

## Quick Command Reference

```typescript
// Extract
cms.media.extractFromHTML(html)
cms.media.extractFromField(value)

// Thumbnail (fast)
cms.media.getThumbnail(ref)

// Full (async)
cms.media.fetchFull(ref, options?)
cms.media.fetchMultiple(refs, options?)

// Render
cms.media.renderFast(html)
cms.media.renderFull(html, options?)

// Content helper
cms.contentMedia.extractAll(item)
cms.contentMedia.getThumbnails(item)
cms.contentMedia.preloadAll(item, options?)
cms.contentMedia.renderFast(item)
cms.contentMedia.renderFull(item, options?)

// Cache
cms.media.clearCache()
cms.media.getCacheStats()
```

## Full Documentation

For complete documentation with detailed examples:

- [MEDIA-API.md](./MEDIA-API.md) - Complete API reference
- [media-examples.ts](./media-examples.ts) - 10 practical examples
- [EXAMPLES.md](./EXAMPLES.md) - General client examples
