# Thumbnail System - Quick Start Guide

## What Changed?

Your GitCMS now has a **unified thumbnail system** that:

- ✅ Generates thumbnails during upload (not on-the-fly)
- ✅ Stores thumbnails in GitHub alongside media
- ✅ Uses GitHub URLs instead of base64 in content
- ✅ Provides beautiful default thumbnails for all file types
- ✅ Works with private repositories (OAuth authentication)

## For Developers

### Uploading Media (Automatic)

When you upload an image, the system now:

```typescript
// 1. Upload original
Upload: .gitcms/media/photo-1234567.jpg

// 2. Auto-generate & upload thumbnail
Upload: .gitcms/media/thumbnails/photo-1234567.jpg
       (300x300, WebP, quality 0.8)

// 3. Set thumbnailUrl in metadata
mediaFile.thumbnailUrl = "https://raw.githubusercontent.com/..."
```

No code changes needed - it's automatic!

### Using Thumbnails in Code

#### In Admin (Rich Text Editor)

```tsx
// OLD way - DON'T do this anymore
const dataUrl = await generateThumbnailFromImage(media.path);

// NEW way - Just use the thumbnailUrl
const thumbnailUrl = media.thumbnailUrl || media.url;
```

#### In Client (Content Rendering)

```typescript
import { MediaManager } from '@git-cms/client';

const manager = new MediaManager(config);
const thumbnail = manager.getThumbnail(reference);
// Returns: GitHub URL or default SVG placeholder
```

#### Default Thumbnails

```typescript
import { getDefaultThumbnail } from '@git-cms/core';

// Get placeholder for any media type
const videoPlaceholder = getDefaultThumbnail('video');
const docPlaceholder = getDefaultThumbnail('document');
```

### Utility Functions

All in `@git-cms/core`:

```typescript
import {
  // Path utilities
  getThumbnailPath,
  getThumbnailUrl,
  getOriginalPathFromThumbnail,

  // Generation (browser only)
  generateThumbnailBlob,
  generateThumbnailDataUrl,

  // Defaults
  getDefaultThumbnail,
  DEFAULT_THUMBNAILS,

  // Auth (private repos)
  fetchAuthenticatedThumbnail,
} from '@git-cms/core';

// Get thumbnail path
const thumbPath = getThumbnailPath('.gitcms/media/image.jpg');
// → '.gitcms/media/thumbnails/image.jpg'

// Get GitHub URL
const thumbUrl = getThumbnailUrl('user', 'repo', '.gitcms/media/image.jpg');
// → 'https://raw.githubusercontent.com/user/repo/main/.gitcms/media/thumbnails/image.jpg'

// Generate thumbnail blob for upload
const blob = await generateThumbnailBlob(file, {
  maxWidth: 300,
  maxHeight: 300,
  quality: 0.8,
  format: 'image/webp',
});
```

## For Content Authors

### Uploading Images

1. **Upload as usual** - Thumbnails are created automatically
2. **Insert in editor** - Click the image icon, select your image
3. **Fast loading** - Content uses optimized thumbnails

### What You'll See

#### In Rich Text Content

```html
<!-- Old format (still works) -->
<gitcms-media
  data-path="..."
  data-thumbnail="data:image/png;base64,iVBOR..."
></gitcms-media>

<!-- New format (better) -->
<gitcms-media
  data-path="..."
  data-thumbnail="https://raw.githubusercontent.com/..."
></gitcms-media>
```

The new format:

- ✅ Smaller content size
- ✅ Faster loading
- ✅ Better caching
- ✅ CDN-friendly

## Migrating Existing Content

### Option 1: Gradual Migration (Recommended)

- Leave existing content as-is (still works!)
- New uploads use the new system
- Re-upload images if you want thumbnails

### Option 2: Bulk Migration

If you want to regenerate all thumbnails:

```typescript
// For each media file:
// 1. Download original
// 2. Generate thumbnail
// 3. Upload to thumbnails/ folder
// 4. Update content to use new URL

// This would be a custom script - contact if needed
```

## File Structure

```
your-repo/
└── .gitcms/
    └── media/
        ├── photo-1.jpg          # Original image
        ├── video-1.mp4          # Original video
        ├── document.pdf         # Original document
        └── thumbnails/          # Thumbnail subfolder
            ├── photo-1.jpg      # Image thumbnail (300x300 WebP)
            ├── video-1.jpg      # Video thumbnail (future)
            └── document.jpg     # Document thumbnail (future)
```

## Configuration

Default settings (can be customized in code):

```typescript
{
  subdirectory: 'thumbnails',
  sizes: {
    small: 150x150,
    medium: 300x300,  // Currently used
    large: 600x600
  },
  quality: 0.8,
  format: 'webp'
}
```

## Troubleshooting

### Thumbnails not showing?

1. Check if thumbnail file exists in GitHub (`.gitcms/media/thumbnails/`)
2. Verify `media.thumbnailUrl` is set
3. For private repos, ensure OAuth is working

### Old base64 thumbnails still in content?

- That's fine! They still work
- New uploads will use GitHub URLs
- No migration needed unless you want it

### Want to customize thumbnail size?

```typescript
// In upload code
const thumbnail = await generateThumbnailBlob(file, {
  maxWidth: 500, // Custom size
  maxHeight: 500,
  quality: 0.9, // Higher quality
});
```

## Performance Impact

### Before Refactoring

- ❌ Generate thumbnails on every page view
- ❌ Large base64 in content (bloated)
- ❌ No caching possible
- ❌ Slow for private repos

### After Refactoring

- ✅ Generate once during upload
- ✅ Small GitHub URLs in content
- ✅ Browser caching works
- ✅ Fast for private repos (single auth)

## Need Help?

See the full technical documentation:

- `docs/enhance-admin/THUMBNAIL-REFACTORING-SUMMARY.md`

Or check the source:

- `packages/core/src/thumbnail.ts` - All utilities
- `packages/admin/src/lib/data/media.data.ts` - Upload logic
- `packages/client/src/media.ts` - Client rendering

---

**Enjoy faster, more efficient media handling! 🚀**
