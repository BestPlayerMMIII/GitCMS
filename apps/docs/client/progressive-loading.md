# Progressive Loading

Optimize media loading with two-stage rendering.

## Concept

GitCMS uses a two-stage approach for media:

1. **Fast Render**: Show thumbnails immediately (embedded base64)
2. **Full Render**: Load high-resolution asynchronously

## Basic Pattern

```typescript
// Stage 1: Fast render with thumbnails
const fastHtml = cms.media.renderFast(htmlContent);
document.getElementById('content').innerHTML = fastHtml;

// Stage 2: Load full resolution in background
const fullHtml = await cms.media.renderFull(htmlContent, {
  onProgress: (current, total, ref) => {
    console.log(`Loading ${current}/${total}`);
  },
});
document.getElementById('content').innerHTML = fullHtml;
```

## Progress Tracking

```typescript
let loadedImages = 0;
const totalImages = (content.match(/<gitcms-media/g) || []).length;

const fullHtml = await cms.media.renderFull(content, {
  onProgress: (current, total, ref) => {
    loadedImages = current;
    updateProgressBar((current / total) * 100);
  },
});
```

## React Example

```typescript
import { useState, useEffect } from 'react';
import { GitCMS } from '@git-cms/client';

function BlogPost({ post, cms }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show thumbnails immediately
    const fastHtml = cms.media.renderFast(post.content);
    setContent(fastHtml);

    // Load full resolution
    cms.media.renderFull(post.content).then(fullHtml => {
      setContent(fullHtml);
      setLoading(false);
    });
  }, [post.content, cms]);

  return (
    <article>
      <h1>{post.data.title}</h1>
      {loading && <div>Loading images...</div>}
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
}
```

## Next Steps

::: info Continue Learning

- [Video & Documents](/client/video-documents) - Embedding
- [Framework Integration](/client/nextjs) - Use in apps

:::
