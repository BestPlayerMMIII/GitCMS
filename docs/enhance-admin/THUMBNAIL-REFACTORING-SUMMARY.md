# Thumbnail System Refactoring Summary

## Overview

Consolidated and improved thumbnail handling across the entire GitCMS codebase,
eliminating duplicated code and implementing a consistent, efficient thumbnail
system.

## Key Changes

### 1. **New Centralized Thumbnail Utilities** (`packages/core/src/thumbnail.ts`)

Created a comprehensive thumbnail management system with:

#### Path Management

- `getThumbnailPath(originalPath)` - Generate thumbnail path from original
  (stores in `thumbnails/` subfolder)
- `getOriginalPathFromThumbnail(thumbnailPath)` - Reverse operation
- `getThumbnailUrl(owner, repo, originalPath)` - Generate GitHub raw URL for
  thumbnail
- `isThumbnailPath(path)` - Check if path is a thumbnail

#### Thumbnail Generation (Browser-side)

- `generateThumbnailBlob(file, options)` - Generate thumbnail as Blob for upload
- `generateThumbnailDataUrl(file, options)` - Generate thumbnail as data URL for
  immediate display
- `thumbnailBlobToFile(blob, originalFilename)` - Convert blob to File for
  upload

#### Default Placeholders

- `DEFAULT_THUMBNAILS` - SVG placeholders for all media types (image, video,
  audio, document, other)
- `getDefaultThumbnail(mediaType)` - Get placeholder for specific media type
- `getMediaTypeFromFilename(filename)` - Infer media type from extension

#### Authentication Support

- `fetchAuthenticatedThumbnail(owner, repo, path, token)` - Fetch thumbnail with
  auth for private repos
- `buildAuthenticatedThumbnailUrl(owner, repo, path)` - Build API URL for
  authenticated fetch

### 2. **Upload Flow Enhancement** (`packages/admin/src/lib/data/media.data.ts`)

Modified `handleUploadMedia` to:

1. Upload the original image/file
2. **Generate thumbnail** (300x300, WebP, quality 0.8)
3. **Upload thumbnail** to GitHub in `thumbnails/` subfolder alongside original
4. Set `thumbnailUrl` in media metadata

Example path structure:

```
.gitcms/media/image.jpg           # Original
.gitcms/media/thumbnails/image.jpg # Thumbnail
```

### 3. **Rich Text Editor Update** (`packages/admin/src/components/content/rich-text-editor.tsx`)

Changed from:

```tsx
// OLD: Generated and embedded base64 thumbnail in content
const thumbnailDataUrl = await getThumbnail(media.path);
const mediaEmbed = `<gitcms-media data-thumbnail="${thumbnailDataUrl}" ...>`;
```

To:

```tsx
// NEW: Use GitHub URL of pre-generated thumbnail
const thumbnailUrl = media.thumbnailUrl || media.url;
const mediaEmbed = `<gitcms-media data-thumbnail="${thumbnailUrl}" ...>`;
```

**Benefits:**

- No more large base64 strings in content
- Faster content serialization
- Leverages browser caching
- Uses CDN/GitHub's infrastructure

### 4. **Client Package Update** (`packages/client/src/media.ts`)

Enhanced `MediaManager.getThumbnail()`:

- Accepts GitHub thumbnail URLs (from `thumbnailUrl` field)
- Falls back to default SVG placeholders for non-image types
- Backwards compatible with data URLs

### 5. **Core Media Storage** (`packages/core/src/media.ts`)

Updated `GitHubMediaStorage.uploadFile()`:

- Sets `thumbnailUrl` automatically for images
- Uses `getThumbnailUrl()` utility for consistent URL generation

## File Organization

### New Files

- `packages/core/src/thumbnail.ts` - All thumbnail utilities

### Modified Files

- `packages/core/src/index.ts` - Export thumbnail utilities
- `packages/core/src/media.ts` - Set thumbnailUrl in uploadFile
- `packages/admin/src/lib/data/media.data.ts` - Generate & upload thumbnails
- `packages/admin/src/components/content/rich-text-editor.tsx` - Use GitHub
  thumbnail URLs
- `packages/client/src/media.ts` - Updated getThumbnail method

### Files to Deprecate (After Core Rebuild)

- `packages/admin/src/lib/thumbnail-generator.ts` - Replaced by core utilities
- `packages/admin/src/hooks/use-media-thumbnail.ts` - Replaced by core utilities
- Old thumbnail generation in `media.data.ts` - Replaced

## Default Thumbnails for Non-Image Types

Implemented beautiful SVG placeholders for:

- **Image** - Picture icon with frame
- **Video** - Play button icon
- **Audio** - Speaker/waveform icon
- **Document** - Document/file icon
- **Other** - Generic file icon

These are used when:

- No thumbnail exists
- Image failed to load
- File type doesn't support thumbnails

## Authentication Support

For **private repositories**, the system:

1. Uses OAuth token from existing Octokit implementation
2. Fetches thumbnails via GitHub API with authentication
3. Falls back to default placeholders on failure

Example:

```typescript
const thumbnail = await fetchAuthenticatedThumbnail(owner, repo, path, token);
```

## Migration Path

### Immediate (Done)

✅ Created centralized utilities in core  
✅ Updated upload flow to generate & push thumbnails  
✅ Updated rich-text editor to use GitHub URLs  
✅ Updated client package for thumbnail handling

### Next Steps

1. **Rebuild `packages/core`** to export new utilities

   ```bash
   cd packages/core
   npm run build
   ```

2. **Update imports** in admin package after core rebuild

   ```typescript
   import {
     generateThumbnailBlob,
     getThumbnailPath,
     getDefaultThumbnail,
   } from '@git-cms/core';
   ```

3. **Remove deprecated files**
   - `packages/admin/src/lib/thumbnail-generator.ts`
   - `packages/admin/src/hooks/use-media-thumbnail.ts`
   - Cleanup old thumbnail code in `media.data.ts`

4. **Test thoroughly**
   - Upload new images (thumbnails should be created)
   - Insert images in rich-text editor (should use GitHub URLs)
   - View content in client (should load thumbnails)
   - Test private repositories (authentication)

## Performance Benefits

### Before

- Thumbnails generated client-side on every view
- Large base64 strings embedded in content
- No caching possible
- Heavy memory usage

### After

- Thumbnails generated once during upload
- Stored in GitHub (leverages CDN)
- Browser can cache thumbnails
- Minimal content size
- Better performance for private repos (single auth fetch)

## Example Usage

### Upload (Automatic)

```typescript
// User uploads image.jpg
// System automatically:
// 1. Uploads .gitcms/media/image-123456.jpg
// 2. Generates thumbnail
// 3. Uploads .gitcms/media/thumbnails/image-123456.jpg
// 4. Sets mediaFile.thumbnailUrl
```

### Rich Text Editor

```tsx
<gitcms-media
  data-path=".gitcms/media/image-123456.jpg"
  data-filename="image-123456.jpg"
  data-thumbnail="https://raw.githubusercontent.com/user/repo/main/.gitcms/media/thumbnails/image-123456.jpg"
  alt="My image"
/>
```

### Client Rendering

```typescript
const mediaManager = new MediaManager(config);
const thumbnail = mediaManager.getThumbnail(reference);
// Returns GitHub URL or default placeholder
```

## Backwards Compatibility

The system maintains backwards compatibility:

- Existing content with base64 thumbnails continues to work
- Missing thumbnails fall back to default placeholders
- Old and new systems can coexist during migration

## Configuration

Default configuration (can be customized):

```typescript
{
  subdirectory: 'thumbnails',
  sizes: {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 }
  },
  quality: 0.8,
  format: 'image/webp'
}
```

## Security Considerations

- Thumbnails respect repository privacy (use OAuth for private repos)
- No sensitive data in thumbnail filenames
- Thumbnails use same access control as original files
- Fallback placeholders for auth failures

## Future Enhancements

Potential improvements:

- [ ] Multiple thumbnail sizes (small, medium, large)
- [ ] Lazy thumbnail generation (on-demand)
- [ ] Thumbnail cache management
- [ ] Video thumbnail extraction
- [ ] PDF first page thumbnails
- [ ] Responsive image sets (srcset)
- [ ] Progressive image loading

---

**Status:** Implementation complete, pending core package rebuild and final
cleanup.
