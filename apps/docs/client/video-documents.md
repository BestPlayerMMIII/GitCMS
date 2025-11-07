# Video & Document Embedding

Embed videos and documents with click-to-load functionality.

## Setup

```typescript
import {
  injectMediaStyles,
  enableProgressiveMediaLoading,
} from '@git-cms/client';

// 1. Inject styles (once)
injectMediaStyles();

// 2. Render content with media
const html = cms.media.renderFast(content);
container.innerHTML = html;

// 3. Enable click-to-load
enableProgressiveMediaLoading(container, cms.media);
```

## How It Works

- **Videos**: Thumbnail with play button → Click to load video player
- **Documents**: Thumbnail preview → Click to download
- **Images**: Thumbnail → Async load full resolution
- **Audio**: Icon → Click to load player

## Example

```typescript
import {
  GitCMS,
  injectMediaStyles,
  enableProgressiveMediaLoading,
} from '@git-cms/client';

const cms = new GitCMS({ repository: 'username/repo' });

async function renderPost(postId) {
  const post = await cms.from('posts').doc(postId).get();

  // Inject styles once
  injectMediaStyles();

  // Render with thumbnails
  const html = cms.media.renderFast(post.content);
  const container = document.getElementById('content');
  container.innerHTML = html;

  // Enable progressive loading
  enableProgressiveMediaLoading(container, cms.media);
}
```

## Next Steps

::: info Continue Learning

- [Framework Integration](/client/nextjs) - Use in apps
- [Security](/client/security) - Best practices

:::
