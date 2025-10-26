# Video and Document Embedding Implementation Summary

## Problem Statement

Previously, when inserting videos and documents in the rich-text editor:

1. The thumbnail (a small preview image) was being embedded as base64 data URL
2. This thumbnail was used as the `src` for `<video>` and `<a>` tags
3. **Result**: Videos didn't play (wrong source), documents were corrupted (only
   160 bytes of thumbnail data instead of 3MB PDF)

## Root Cause

The client's `generateHTMLElement()` method was treating thumbnails as the
actual media content for all media types. This works for images (where thumbnail
IS an image), but fails for:

- **Videos**: Thumbnail is a poster image, not the video file
- **Audio**: Thumbnail is a waveform icon, not the audio file
- **Documents**: Thumbnail is a preview image, not the PDF/DOCX

## Solution Architecture

### 1. Two-Stage Rendering

**Stage 1: Fast Render (Thumbnails)**

- Shows lightweight placeholders immediately
- No API calls required
- Uses embedded base64 thumbnails from editor

**Stage 2: Full Render (Progressive)**

- Loads actual media files from GitHub
- Uses download URLs for videos/documents
- On-demand or automatic loading

### 2. Media Type Strategy

| Media Type   | Fast Render        | Full Render       | Data Source           |
| ------------ | ------------------ | ----------------- | --------------------- |
| **Image**    | Thumbnail image    | Full-res image    | Base64 (< 1MB) or URL |
| **Video**    | Poster + play icon | `<video>` element | GitHub download URL   |
| **Audio**    | Icon placeholder   | `<audio>` element | GitHub download URL   |
| **Document** | Preview thumbnail  | Download link     | GitHub download URL   |

### 3. Key Changes

#### A. Client Package (`packages/client/src/media.ts`)

**Updated `generateHTMLElement()`:**

- Added `isThumbnail` parameter to distinguish fast vs full render
- For videos: Fast render shows poster image with play overlay
- For documents: Fast render shows thumbnail with "click to download" prompt
- For audio: Fast render shows audio icon placeholder
- Full render uses actual GitHub download URLs, not thumbnails

**Updated `fetchViaGitHub()`:**

- Smart strategy: videos/audio/documents ALWAYS use download URLs
- Small images (< 1MB) can use base64 data URLs
- Large files (> 1MB) use download URLs
- Prevents corrupted media from base64 encoding

**Updated `renderFast()`:**

- Added documentation explaining thumbnail vs actual media
- Ensures proper placeholder generation

#### B. New Media Styles Module (`packages/client/src/media-styles.ts`)

Created comprehensive styling system:

- CSS classes for all placeholder types
- Hover effects and transitions
- Responsive design
- Loading states
- `injectMediaStyles()` function for easy setup

**Features:**

- Video placeholder with centered play button overlay
- Document placeholder with thumbnail and download prompt
- Audio placeholder with waveform icon
- Progressive loading indicators

#### C. Progressive Enhancement Module

Added `enableProgressiveMediaLoading()` function:

- Adds click handlers to placeholders
- Automatically upgrades to full media on interaction
- Handles videos, audio, and documents
- Shows loading states during fetch

### 4. Admin Package (No Changes Required)

The rich-text editor
(`packages/admin/src/components/content/rich-text-editor.tsx`) was already
correctly implemented:

- Embeds `data-path` attribute (reference to actual media)
- Embeds `data-thumbnail` attribute (base64 preview)
- Both attributes are properly used by the client

## Implementation Details

### Video Rendering

**Before (Broken):**

```html
<video controls>
  <source src="data:image/webp;base64,..." type="video/mp4" />
  <!-- ^ This is a THUMBNAIL IMAGE, not a video! -->
</video>
```

**After (Fixed):**

Fast render:

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
    <!-- Play button icon -->
  </div>
</div>
```

Full render:

```html
<video controls data-gitcms-path=".gitcms/media/video.mp4">
  <source
    src="https://raw.githubusercontent.com/owner/repo/main/.gitcms/media/video.mp4"
    type="video/mp4"
  />
  <!-- ^ Actual video URL, supports streaming -->
</video>
```

### Document Rendering

**Before (Broken):**

```html
<a href="data:image/svg+xml,..." download="doc.pdf"> 📎 doc.pdf </a>
<!-- ^ Downloads a tiny SVG placeholder, not the PDF! -->
```

**After (Fixed):**

Fast render:

```html
<div
  class="gitcms-document-placeholder"
  data-gitcms-path=".gitcms/media/doc.pdf"
>
  <img src="data:image/svg+xml,..." class="gitcms-document-thumbnail" />
  <p>doc.pdf</p>
  <p>Click to download</p>
</div>
```

Full render:

```html
<a
  href="https://raw.githubusercontent.com/owner/repo/main/.gitcms/media/doc.pdf"
  download="doc.pdf"
  class="gitcms-document-link"
>
  <svg><!-- Document icon --></svg>
  <span>doc.pdf</span>
</a>
<!-- ^ Downloads actual 3MB PDF file -->
```

## Usage Examples

### Basic Setup

```typescript
import { injectMediaStyles, MediaManager } from '@git-cms/client';

// 1. Inject styles (once)
injectMediaStyles();

// 2. Create manager
const mediaManager = new MediaManager({
  repository: 'owner/repo',
  token: 'github-token',
});
```

### Fast Rendering (Recommended)

```typescript
// Fetch content
const post = await cms.from('posts').doc('video-tutorial').get();

// Render with thumbnails (instant)
const html = mediaManager.renderFast(post.content);
document.getElementById('content').innerHTML = html;

// Enable click-to-load
enableProgressiveMediaLoading(document.getElementById('content'), mediaManager);
```

### Full Rendering

```typescript
// Render with actual media (async)
const html = await mediaManager.renderFull(post.content, {
  onProgress: (current, total, ref) => {
    console.log(`Loading ${current}/${total}: ${ref.filename}`);
  },
});

document.getElementById('content').innerHTML = html;
```

## Benefits

### 1. Performance

- **Fast initial render**: Thumbnails load instantly (embedded as base64)
- **No unnecessary API calls**: Only load full media when needed
- **Streaming support**: Videos/audio use download URLs (HTTP range requests)
- **Progressive loading**: Load media on-demand (click-to-play)

### 2. Correctness

- **Videos play properly**: Use actual video files, not thumbnails
- **Documents download correctly**: Full file size, not corrupted
- **Audio works**: Streaming from GitHub, not base64
- **Type-aware rendering**: Different strategy per media type

### 3. User Experience

- **Visual feedback**: Placeholders with play buttons and icons
- **Click-to-load**: Users control when to load media
- **Loading indicators**: Show progress during fetch
- **Responsive design**: Works on mobile and desktop

### 4. Developer Experience

- **Simple API**: `renderFast()` and `renderFull()`
- **Progressive enhancement**: Start fast, upgrade later
- **TypeScript support**: Full type safety
- **Comprehensive docs**: Examples and guides

## Testing Checklist

- [x] Videos display poster thumbnail in fast render
- [x] Videos load and play correctly after click or full render
- [x] Documents show preview thumbnail in fast render
- [x] Documents download with correct content and file size
- [x] Audio files load and play correctly
- [x] Images continue to work as before
- [x] Private repositories work with authentication
- [x] Large files (> 1MB) use download URLs
- [x] Small files (< 1MB) can use base64 or URLs
- [x] Progressive loading works correctly
- [x] Styles are injected properly
- [x] TypeScript types are correct

## Files Changed

### Modified Files

1. `packages/client/src/media.ts`
   - Updated `generateHTMLElement()` - smart rendering per media type
   - Updated `fetchViaGitHub()` - download URLs for videos/documents
   - Updated `renderFast()` - improved documentation

2. `packages/client/src/index.ts`
   - Added export for `media-styles`

3. `packages/client/docs/MEDIA-QUICK-REFERENCE.md`
   - Added video/document section
   - Reference to new guide

### New Files

1. `packages/client/src/media-styles.ts`
   - CSS styles for placeholders
   - `injectMediaStyles()` function
   - `enableProgressiveMediaLoading()` function

2. `packages/client/docs/VIDEO-DOCUMENT-EMBEDDING.md`
   - Comprehensive guide (100+ lines)
   - Usage examples
   - Architecture explanation
   - Troubleshooting

3. `packages/client/docs/video-examples.ts`
   - 12 practical examples
   - React and Vue components
   - Common patterns

## Migration Guide

### For Existing Users

If you were using the client library before this update:

**Before:**

```typescript
const html = mediaManager.renderFull(content);
// Videos/documents were broken
```

**After:**

```typescript
// Option 1: Fast render with progressive loading (recommended)
injectMediaStyles();
const html = mediaManager.renderFast(content);
container.innerHTML = html;
enableProgressiveMediaLoading(container, mediaManager);

// Option 2: Full render (all media loaded)
injectMediaStyles();
const html = await mediaManager.renderFull(content);
container.innerHTML = html;
```

### Breaking Changes

**None!** The API is fully backward compatible. Existing code will work better
with the fixes.

## Future Enhancements

Potential improvements:

- [ ] Custom video player integration (Video.js, Plyr)
- [ ] PDF inline preview (PDF.js)
- [ ] Video transcoding for multiple formats
- [ ] Adaptive bitrate streaming
- [ ] Media analytics
- [ ] Caption/subtitle support
- [ ] Audio waveform visualization
- [ ] Thumbnail video preview on hover

## Conclusion

This implementation fixes the video and document embedding issues by:

1. Distinguishing between thumbnails (preview) and actual media (content)
2. Using appropriate rendering strategies per media type
3. Leveraging GitHub download URLs for large files
4. Providing progressive enhancement for optimal performance
5. Maintaining backward compatibility with existing code

The modular design allows developers to choose the best rendering strategy for
their use case while ensuring videos play correctly and documents download with
full content.
