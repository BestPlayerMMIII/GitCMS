# GitCMS Media API - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitCMS Client                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    GitCMS Class                           │ │
│  │                                                           │ │
│  │  Properties:                                              │ │
│  │  • media: MediaManager                                    │ │
│  │  • contentMedia: ContentMediaHelper                       │ │
│  │  • from(), doc(), getSchemas()                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│         │                           │                           │
│         ▼                           ▼                           │
│  ┌─────────────────┐      ┌─────────────────────────┐          │
│  │  MediaManager   │      │  ContentMediaHelper     │          │
│  │                 │      │                         │          │
│  │ • extract       │      │ • extractAll()          │          │
│  │ • getThumbnail  │      │ • getThumbnails()       │          │
│  │ • fetchFull     │      │ • preloadAll()          │          │
│  │ • renderFast    │      │ • renderFast/Full()     │          │
│  │ • renderFull    │      │                         │          │
│  └─────────────────┘      └─────────────────────────┘          │
│         │                           │                           │
│         └───────────┬───────────────┘                           │
│                     ▼                                           │
│            ┌─────────────────┐                                  │
│            │  Media Cache    │                                  │
│            │  (Map<string,   │                                  │
│            │   FullMediaData>)│                                 │
│            └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │     Data Sources            │
        │                             │
        │  • GitHub API (Octokit)     │
        │  • HTTP API (fetch)         │
        │  • Git LFS URLs             │
        └─────────────────────────────┘
```

## Data Flow

### Fast Path (Thumbnails)

```
Content with <gitcms-media>
        │
        ▼
  extractFromHTML()
        │
        ▼
  MediaReference[]
        │
        ▼
  getThumbnail()
        │
        ├──► Embedded thumbnail (base64) ──► Display
        │
        └──► Placeholder SVG ──────────────► Display
```

### Full Path (High Resolution)

```
MediaReference
        │
        ▼
  fetchFull()
        │
        ├──► Check Cache ──► Found ──► Return cached data
        │
        └──► Not Found
                │
                ▼
        Fetch from GitHub/HTTP
                │
                ├──► Regular file ──► Base64 decode ──► Data URL
                │
                └──► LFS file ────────► Download URL
                        │
                        ▼
                  Store in cache
                        │
                        ▼
                Return FullMediaData
```

## Media Extraction Flow

### From HTML Content

```
HTML String
    │
    ▼
Parse <gitcms-media> tags
    │
    ├──► Extract data-path
    ├──► Extract data-filename
    ├──► Extract data-thumbnail
    ├──► Extract alt
    └──► Extract title
         │
         ▼
   MediaReference
         │
         ├──► Infer media type (from extension)
         ├──► Determine MIME type
         └──► Generate unique ID
```

### From Schema Fields

```
Field Value
    │
    ├──► String (path) ──────────────┐
    │                                │
    ├──► Object { path, filename } ──┤
    │                                │
    └──► Array [...] ────────────────┤
                                     │
                                     ▼
                              MediaReference(s)
```

## Rendering Pipeline

### Fast Rendering

```
HTML with <gitcms-media> tags
        │
        ▼
  extractFromHTML()
        │
        ▼
  For each media:
        │
        ├──► Get thumbnail (instant)
        │
        ├──► Generate HTML element
        │    • <img> for images
        │    • <video> for videos
        │    • <audio> for audio
        │    • <a> for downloads
        │
        └──► Replace <gitcms-media> tag
                │
                ▼
        HTML with standard elements
```

### Full Rendering (Async)

```
HTML with <gitcms-media> tags
        │
        ▼
  extractFromHTML()
        │
        ▼
  For each media:
        │
        ├──► fetchFull() (async)
        │    │
        │    ├──► GitHub API call
        │    └──► Cache result
        │
        ├──► Generate HTML element with full URL
        │
        ├──► Replace <gitcms-media> tag
        │
        └──► Call onProgress callback
                │
                ▼
        HTML with full resolution
```

## Type Hierarchy

```
MediaReference
    ├── id: string
    ├── path: string
    ├── filename: string
    ├── thumbnail?: string
    ├── alt?: string
    ├── title?: string
    ├── mimeType?: string
    └── mediaType?: 'image' | 'video' | 'audio' | 'document' | '3d' | 'other'
         │
         ▼
    Used by getThumbnail(), fetchFull()
         │
         ▼
FullMediaData
    ├── reference: MediaReference
    ├── url: string (full resolution)
    ├── content?: ArrayBuffer
    ├── size?: number
    └── downloadUrl?: string
```

## Usage Patterns

### Pattern 1: Progressive Enhancement

```
User Request
    │
    ▼
Fetch Content
    │
    ▼
renderFast() ──► Display thumbnails (instant)
    │
    │ (User sees content)
    │
    ▼
renderFull() ──► Fetch from GitHub (async)
    │
    ▼
Update display ──► Show full resolution
```

### Pattern 2: Preload Everything

```
User Request
    │
    ▼
Fetch Content
    │
    ▼
extractAll()
    │
    ▼
fetchMultiple() ──► Concurrent fetch with limit
    │                 (e.g., 3 at a time)
    ▼
All media loaded ──► Display full content
```

### Pattern 3: On-Demand Loading

```
Display thumbnails
    │
    ▼
User clicks image
    │
    ▼
fetchFull() for clicked item
    │
    ▼
Show lightbox with full resolution
```

## Media Type Detection

```
Filename Extension
        │
        ▼
    Parse extension
        │
        ├──► jpg, png, gif, webp ──► image
        ├──► mp4, webm, mov ──────► video
        ├──► mp3, wav, ogg ───────► audio
        ├──► glb, gltf, obj ──────► 3d
        ├──► pdf, doc, docx ──────► document
        └──► unknown ─────────────► other
                │
                ▼
        Set mimeType & mediaType
```

## Cache Strategy

```
┌─────────────────────────────────────┐
│        Cache (in-memory Map)        │
│                                     │
│  Key: media path (string)           │
│  Value: FullMediaData               │
│                                     │
│  • Automatic caching on fetch       │
│  • Keyed by path                    │
│  • Cleared manually or on destroy   │
│  • Stats available (size, keys)     │
└─────────────────────────────────────┘
         │
         ▼
fetchFull() checks cache first
         │
         ├──► Hit: Return cached
         └──► Miss: Fetch & cache
```

## API Surface Summary

```
GitCMS
  ├── media (MediaManager)
  │   ├── extractFromHTML(html)
  │   ├── extractFromField(value)
  │   ├── getThumbnail(ref)
  │   ├── fetchFull(ref, options)
  │   ├── fetchMultiple(refs, options)
  │   ├── renderFast(html)
  │   ├── renderFull(html, options)
  │   ├── clearCache()
  │   └── getCacheStats()
  │
  └── contentMedia (ContentMediaHelper)
      ├── extractAll(item)
      ├── getThumbnails(item)
      ├── preloadAll(item, options)
      ├── renderFast(item)
      └── renderFull(item, options)
```

## Performance Characteristics

| Operation          | Speed   | API Calls | Use Case                   |
| ------------------ | ------- | --------- | -------------------------- |
| `extractFromHTML`  | Instant | 0         | Find media in content      |
| `extractFromField` | Instant | 0         | Find media in fields       |
| `getThumbnail`     | Instant | 0         | Show placeholder/thumbnail |
| `fetchFull`        | Slow    | 1         | Get high-resolution        |
| `fetchMultiple`    | Slow    | N         | Batch load media           |
| `renderFast`       | Instant | 0         | Quick display              |
| `renderFull`       | Slow    | N         | Full quality display       |

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                   Your Application                       │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │   React    │  │   Vue.js   │  │  Vanilla   │        │
│  │ Components │  │ Components │  │     JS     │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│         │               │               │               │
│         └───────────────┼───────────────┘               │
│                         ▼                               │
│              ┌──────────────────────┐                   │
│              │   GitCMS Client      │                   │
│              │   • media            │                   │
│              │   • contentMedia     │                   │
│              └──────────────────────┘                   │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  GitHub / HTTP   │
                │     Backend      │
                └──────────────────┘
```

## Error Handling Flow

```
fetchFull()
    │
    ├──► Success ──────────────────────────► Return FullMediaData
    │
    └──► Error
         │
         ├──► 404 Not Found ──────────────► Throw error
         ├──► Timeout ─────────────────────► Throw error
         ├──► Network Error ───────────────► Throw error
         └──► API Rate Limit ──────────────► Throw error
                │
                ▼
         Catch in user code
                │
                ├──► Fallback to thumbnail
                ├──► Show error message
                └──► Log error
```

This architecture provides a clean separation of concerns while maintaining
simplicity and performance!
