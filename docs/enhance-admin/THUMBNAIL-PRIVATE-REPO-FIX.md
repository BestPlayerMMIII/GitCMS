# Thumbnail System - Private Repository Fix

## Issue

The initial implementation had two problems for **private repositories**:

1. Rich text editor was embedding `raw.githubusercontent.com` URLs which don't
   work for private repos (requires authentication)
2. The old thumbnail generator was adding checkered backgrounds to PNGs

## Solution

### 1. Rich Text Editor - Fetch & Embed Base64 Thumbnails

**File:** `packages/admin/src/components/content/rich-text-editor.tsx`

Changed approach:

- **Before:** Embedded raw GitHub URL in `data-thumbnail`
- **After:** Fetch thumbnail with OAuth, convert to base64, embed as data URL

```tsx
// Fetch thumbnail with authentication
const fetchThumbnailAsDataUrl = async (mediaPath: string): Promise<string> => {
  const thumbnailPath = getThumbnailPath(mediaPath); // .gitcms/media/thumbnails/...

  // Fetch with OAuth token
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.raw',
    },
  });

  const blob = await response.blob();
  // Convert to base64 data URL
  return readBlobAsDataUrl(blob);
};

// Embed in content
const mediaEmbed = `<gitcms-media 
  data-path="${media.path}" 
  data-filename="${media.filename}" 
  data-thumbnail="${thumbnailDataUrl}"   // ← base64 data URL, works everywhere!
  alt="${media.metadata.alt}"
></gitcms-media>`;
```

**Benefits:**

- ✅ Works for private repositories (authenticated fetch)
- ✅ Self-contained content (no external dependencies)
- ✅ Renders immediately (no additional fetch needed)
- ✅ Content is portable (can be exported/imported)

### 2. Authenticated Image Component - Direct Thumbnail Fetch

**File:** `packages/admin/src/components/media/authenticated-image.tsx`

Simplified to fetch pre-generated thumbnails directly:

```tsx
// Determine which file to fetch
const filePath = useThumbnail
  ? getThumbnailPath(path) // .gitcms/media/thumbnails/image.jpg
  : path; // .gitcms/media/image.jpg

// Fetch with OAuth
const response = await fetch(apiUrl, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.raw',
  },
});

const blob = await response.blob();
const objectUrl = URL.createObjectURL(blob); // Efficient for display
```

**Removed:**

- ❌ Old `generateThumbnail()` with checkered background
- ❌ Thumbnail caching (not needed, uses pre-generated ones)
- ❌ `thumbnailOptions` parameter
- ❌ `onThumbnailGenerated` callback

**Benefits:**

- ✅ No checkered background artifacts
- ✅ Uses pre-generated thumbnails (faster)
- ✅ Simpler code, easier to maintain
- ✅ Works for private repos with OAuth

### 3. Updated Media Library & Field Components

**Files:**

- `packages/admin/src/components/media/media-library.tsx`
- `packages/admin/src/components/content/field-components.tsx`

Removed old `thumbnailOptions` parameter:

```tsx
// Before
<AuthenticatedImage
  useThumbnail={!media.thumbnailUrl}
  thumbnailOptions={{ maxWidth: 200, maxHeight: 200, quality: 0.7 }}
/>

// After
<AuthenticatedImage
  useThumbnail={true}  // Always use thumbnail in library/previews
/>
```

## How It Works Now

### Upload Flow

1. User uploads `image.jpg`
2. System uploads to `.gitcms/media/image-123.jpg`
3. System generates thumbnail (300x300 WebP)
4. System uploads to `.gitcms/media/thumbnails/image-123.jpg`

### Rich Text Editor Flow

1. User selects image from media library
2. Editor fetches `.gitcms/media/thumbnails/image-123.jpg` **with OAuth**
3. Editor converts to base64 data URL
4. Editor embeds:
   `<gitcms-media data-thumbnail="data:image/webp;base64,..."></gitcms-media>`
5. Content is self-contained and portable!

### Media Library Display

1. Component receives `media.thumbnailUrl` (GitHub raw URL)
2. If `thumbnailUrl` exists, tries to display it
3. If fails (private repo), falls back to authenticated fetch from `thumbnails/`
   folder
4. Creates object URL for efficient display

### Client Rendering

1. Parser extracts `data-thumbnail` from gitcms-media tag
2. Uses base64 data URL directly (fast!)
3. Optionally lazy-loads full resolution in background

## File Structure

```
.gitcms/media/
├── image-1234567.jpg           # Original (5MB)
└── thumbnails/
    └── image-1234567.jpg       # Thumbnail (50KB, 300x300 WebP)
```

## Content Structure

```html
<!-- Embedded in rich text -->
<gitcms-media
  data-path=".gitcms/media/image-1234567.jpg"
  data-filename="image-1234567.jpg"
  data-thumbnail="data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBg..."
  alt="My photo"
></gitcms-media>
```

## Public vs Private Repositories

### Public Repositories

- Can use raw.githubusercontent.com URLs directly
- Faster (CDN cached)
- No authentication needed

### Private Repositories

- **Cannot** use raw.githubusercontent.com (returns 404)
- **Must** use authenticated API fetch
- Convert to base64 or object URLs
- ✅ **This implementation handles both!**

## Trade-offs

### Base64 in Content

**Pros:**

- ✅ Self-contained, portable content
- ✅ Works for private repos
- ✅ No external dependencies
- ✅ Immediate rendering

**Cons:**

- ❌ Larger content size (~33% overhead)
- ❌ Not browser-cacheable

### Mitigation

- Only embed thumbnails (300x300, ~50KB → ~66KB base64)
- Original full-res images lazy-loaded separately
- Content still manageable and git-friendly

## Alternative Approach (Future)

For very large sites, consider:

1. Publish thumbnails to a separate public repo/CDN
2. Use signed URLs with expiration
3. Server-side thumbnail proxy with caching
4. Client-side service worker for thumbnail caching

But for most use cases, base64 thumbnails work great!

## Testing Checklist

- [x] Upload image to private repo → thumbnail generated
- [x] Insert image in rich text editor → base64 thumbnail embedded
- [x] Save content → content contains data URL
- [x] View content → thumbnail displays correctly
- [x] Media library → thumbnails display without checkered background
- [x] No TypeScript errors
- [x] No console errors

---

**Result:** Thumbnail system now works perfectly for both public and private
repositories! 🎉
