# Thumbnail 404 Error Fix

## Issue

When inserting videos or documents in the rich-text editor, the application was
throwing 404 errors:

```
GET https://api.github.com/repos/.../contents/media/thumbnails/video.mp4 404 (Not Found)
GET https://api.github.com/repos/.../contents/media/thumbnails/document.pdf 404 (Not Found)
```

**Error**: `Failed to fetch thumbnail: Error: Failed to fetch thumbnail: 404`

## Root Cause

The `fetchThumbnailAsDataUrl` function in the rich-text editor was trying to
fetch thumbnails for **all media types** from the `thumbnails/` subdirectory.
However:

- **Thumbnails are only generated for images** during upload
- **Videos, audio files, and documents do NOT have thumbnails** in the
  repository
- The function was attempting to fetch non-existent files, causing 404 errors

## Solution

Updated `fetchThumbnailAsDataUrl` to be **media-type aware**:

### Before (Broken)

```typescript
const fetchThumbnailAsDataUrl = async (mediaPath: string) => {
  // Always tries to fetch from thumbnails/ subfolder
  const thumbnailPath = getThumbnailPath(mediaPath);
  const response = await fetch(`.../${thumbnailPath}`);
  // 404 for videos/documents!
};
```

### After (Fixed)

```typescript
const fetchThumbnailAsDataUrl = async (mediaPath: string, filename: string) => {
  // Determine media type
  const mediaType = getMediaTypeFromFilename(filename);

  // For non-image types, return placeholder immediately
  if (mediaType !== 'image') {
    return getDefaultThumbnail(mediaType);
  }

  // Only fetch actual thumbnail for images
  const thumbnailPath = getThumbnailPath(mediaPath);
  const response = await fetch(`.../${thumbnailPath}`);
  // ...
};
```

## Changes Made

### 1. Import Additional Utilities

```typescript
import {
  type GitCMSMediaFile,
  getThumbnailPath,
  getDefaultThumbnail, // NEW
  getMediaTypeFromFilename, // NEW
} from '@git-cms/core';
```

### 2. Updated Function Signature

```typescript
// Before
const fetchThumbnailAsDataUrl = async (mediaPath: string): Promise<string>

// After
const fetchThumbnailAsDataUrl = async (mediaPath: string, filename: string): Promise<string>
```

### 3. Added Media Type Check

```typescript
// Determine media type from filename
const mediaType = getMediaTypeFromFilename(filename);

// For non-image media types, return default placeholder immediately
if (mediaType !== 'image') {
  return getDefaultThumbnail(mediaType);
}

// Only fetch actual thumbnail for images
// ...
```

### 4. Updated Function Call

```typescript
// Before
const thumbnailDataUrl = await fetchThumbnailAsDataUrl(media.path);

// After
const thumbnailDataUrl = await fetchThumbnailAsDataUrl(
  media.path,
  media.filename
);
```

### 5. Improved Error Handling

```typescript
catch (error) {
  console.error('Failed to fetch thumbnail:', error);
  // Return appropriate placeholder based on media type
  const mediaType = getMediaTypeFromFilename(filename);
  return getDefaultThumbnail(mediaType);
}
```

## Behavior by Media Type

| Media Type   | Behavior                     | Thumbnail Source              |
| ------------ | ---------------------------- | ----------------------------- |
| **Image**    | Fetches actual thumbnail     | `media/thumbnails/{filename}` |
| **Video**    | Returns video placeholder    | SVG data URL (play icon)      |
| **Audio**    | Returns audio placeholder    | SVG data URL (audio icon)     |
| **Document** | Returns document placeholder | SVG data URL (document icon)  |
| **Other**    | Returns generic placeholder  | SVG data URL (file icon)      |

## Default Placeholders

The `getDefaultThumbnail()` function from `@git-cms/core` provides optimized SVG
placeholders:

- **Video**: Gray background with play button icon
- **Audio**: Gray background with audio wave icon
- **Document**: Gray background with document/page icon
- **Other**: Gray background with generic file icon

These are small, inline SVG data URLs that:

- Load instantly (no network request)
- Work in private repositories
- Provide visual feedback about media type
- Consistent with the overall design

## Testing

✅ **Videos**: Placeholder shows immediately, no 404 errors  
✅ **Documents**: Placeholder shows immediately, no 404 errors  
✅ **Audio**: Placeholder shows immediately, no 404 errors  
✅ **Images**: Actual thumbnails still fetch correctly  
✅ **Error handling**: Falls back to placeholder if thumbnail fetch fails

## Result

- ✅ No more 404 errors for videos/documents
- ✅ Faster insertion (no unnecessary API calls)
- ✅ Consistent user experience with appropriate placeholders
- ✅ Images continue to work with actual thumbnails
- ✅ Proper error handling with fallbacks

## Files Modified

- `packages/admin/src/components/content/rich-text-editor.tsx`
  - Updated imports
  - Modified `fetchThumbnailAsDataUrl` function
  - Updated `handleMediaSelect` callback

## Related Documentation

- [Video & Document Embedding Guide](../../packages/client/docs/VIDEO-DOCUMENT-EMBEDDING.md)
- [Thumbnail System](./THUMBNAIL-REFACTORING-SUMMARY.md)
- [Media API Reference](../../packages/client/docs/MEDIA-QUICK-REFERENCE.md)
