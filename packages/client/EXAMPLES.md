# Enhanced GitCMS Client Examples

## Advanced Querying

```typescript
import { GitCMSClient } from '@git-cms/client';

const client = new GitCMSClient({
  repository: 'your-username/your-repo',
  token: 'your-github-token',
});

// Get a collection with advanced querying
const posts = client.collection('posts');

// Count total posts
const totalPosts = await posts.count();

// Check if any posts exist
const hasAnyPosts = await posts.exists();

// Get the first post
const firstPost = await posts.first();

// Advanced filtering with operators
const recentPosts = await posts
  .where('publishDate', '>=', '2024-01-01')
  .where('views', '>', 100)
  .where('status', '==', 'published')
  .where('tags', 'contains', 'javascript')
  .orderBy('publishDate', 'desc')
  .limit(10)
  .get();

// Search content
const searchResults = await posts.search('react typescript').limit(5).get();

// Complex filtering
const popularPosts = await posts
  .where('category', 'in', ['tech', 'programming'])
  .where('likes', '>=', 50)
  .exists();
```

## Media Embedding

```typescript
import {
  MediaEmbedder,
  embedMediaUrl,
  generateResponsiveImageSources,
  processRichTextContent,
} from '@git-cms/client';

const config = {
  repository: 'your-username/your-repo',
  token: 'your-github-token',
};

// Create a media embedder
const embedder = new MediaEmbedder(config);

// Embed a single image
const embeddedImage = embedder.embedMedia(
  'https://api.github.com/repos/user/repo/contents/media/thumbnail.jpg',
  {
    size: 'large',
    format: 'webp',
    lazy: true,
  }
);

console.log(embeddedImage);
// {
//   url: 'https://api.github.com/repos/user/repo/contents/media/thumbnail_large.webp',
//   alt: 'thumbnail.jpg',
//   loading: 'lazy',
//   thumbnail: 'https://...',
//   original: 'https://...',
//   metadata: { filename: 'thumbnail.jpg', size: 'large', type: 'image' }
// }

// Generate responsive sources
const responsiveSources = embedder.generateResponsiveSources(thumbnailUrl);

console.log(responsiveSources);
// {
//   default: 'medium.webp',
//   sources: [
//     { media: '(max-width: 640px)', srcset: 'thumbnail.webp', type: 'image/webp' },
//     { media: '(max-width: 1024px)', srcset: 'medium.webp', type: 'image/webp' },
//     { media: '(min-width: 1025px)', srcset: 'large.webp', type: 'image/webp' }
//   ],
//   fallback: 'medium.jpeg'
// }

// Process rich text content with embedded media
const richTextHtml = `
  <h1>My Blog Post</h1>
  <p>Here's an image:</p>
  <img src="https://api.github.com/repos/user/repo/contents/media/hero.jpg" alt="Hero image">
  <p>More content here...</p>
`;

const processedHtml = embedder.processRichTextContent(richTextHtml);
// Returns HTML with <picture> elements and responsive sources
```

## React Integration

```typescript
// For React applications
import React from 'react';
import {
  createUseMediaEmbedder,
  createResponsiveImageComponent,
  createRichTextContentComponent,
  embedMediaUrl
} from '@git-cms/client';

const config = {
  repository: 'your-username/your-repo',
  token: 'your-github-token'
};

// Create hooks and components
const useMediaEmbedder = createUseMediaEmbedder(config);
const ResponsiveImage = createResponsiveImageComponent(config);
const RichTextContent = createRichTextContentComponent(config);

// Use in a React component
function BlogPost({ post }) {
  const { embedMedia, processRichTextContent } = useMediaEmbedder();

  // Embed featured image
  const featuredImage = embedMedia(post.featuredImage, {
    size: 'large',
    format: 'webp'
  });

  return (
    <article>
      <h1>{post.title}</h1>

      {/* Responsive image */}
      <ResponsiveImage
        src={post.featuredImage}
        alt={post.title}
        className="featured-image"
        loading="eager"
      />

      {/* Rich text content with embedded media */}
      <RichTextContent
        content={post.content}
        className="prose"
      />
    </article>
  );
}

// Or use utility functions directly
function SimpleImage({ src, alt }) {
  const embedded = embedMediaUrl(config, src, { size: 'medium', format: 'webp' });

  return (
    <img
      src={embedded.url}
      alt={embedded.alt || alt}
      loading={embedded.loading}
    />
  );
}
```

## Video Embedding

```typescript
// Embed videos
const embeddedVideo = embedder.embedVideo(
  'https://api.github.com/repos/user/repo/contents/media/demo.mp4',
  {
    autoplay: false,
    controls: true,
    muted: true,
    loop: false,
    poster: 'https://api.github.com/repos/user/repo/contents/media/poster.jpg',
  }
);

console.log(embeddedVideo);
// {
//   url: 'https://...',
//   autoplay: false,
//   controls: true,
//   muted: true,
//   loop: false,
//   poster: 'https://...',
//   type: 'video/mp4'
// }
```

## Complete Example: Blog with Media

```typescript
import { GitCMSClient, MediaEmbedder } from '@git-cms/client';

const config = {
  repository: 'my-blog/content',
  token: process.env.GITHUB_TOKEN,
};

const client = new GitCMSClient(config);
const embedder = new MediaEmbedder(config);

async function getBlogData() {
  // Get blog posts with advanced querying
  const posts = await client
    .collection('posts')
    .where('status', '==', 'published')
    .where('publishDate', '<=', new Date().toISOString())
    .orderBy('publishDate', 'desc')
    .limit(10)
    .get();

  // Process each post to embed media
  const processedPosts = posts.map(post => ({
    ...post,
    featuredImage: embedder.embedMedia(post.featuredImage, {
      size: 'large',
      format: 'webp',
    }),
    content: embedder.processRichTextContent(post.content),
    responsiveImage: embedder.generateResponsiveSources(post.featuredImage),
  }));

  // Get blog stats
  const stats = {
    totalPosts: await client.collection('posts').count(),
    publishedPosts: await client
      .collection('posts')
      .where('status', '==', 'published')
      .count(),
    hasDrafts: await client
      .collection('posts')
      .where('status', '==', 'draft')
      .exists(),
  };

  return {
    posts: processedPosts,
    stats,
  };
}

// Usage
getBlogData().then(({ posts, stats }) => {
  console.log(
    `Found ${stats.publishedPosts} published posts out of ${stats.totalPosts} total`
  );
  console.log(`Has drafts: ${stats.hasDrafts}`);

  posts.forEach(post => {
    console.log(`Post: ${post.title}`);
    console.log(`Featured image: ${post.featuredImage.url}`);
    console.log(`Responsive sources: ${post.responsiveImage.sources.length}`);
  });
});
```

## Advanced Features

### Custom Media Processing

```typescript
// Extend the MediaEmbedder for custom processing
class CustomMediaEmbedder extends MediaEmbedder {
  constructor(
    config,
    private cdnBase?: string
  ) {
    super(config);
  }

  // Override to use CDN
  protected generateMediaUrl(
    baseUrl: string,
    fileInfo: any,
    size: string,
    format: string
  ): string {
    if (this.cdnBase) {
      return `${this.cdnBase}/${fileInfo.filename}?size=${size}&format=${format}`;
    }
    return super.generateMediaUrl(baseUrl, fileInfo, size, format);
  }
}

const customEmbedder = new CustomMediaEmbedder(config, 'https://my-cdn.com');
```

### Caching Query Results

```typescript
// Simple caching wrapper
class CachedGitCMSClient extends GitCMSClient {
  private cache = new Map();

  async collection(name: string) {
    const cacheKey = `collection:${name}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const collection = await super.collection(name);
    this.cache.set(cacheKey, collection);

    // Cache for 5 minutes
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

    return collection;
  }
}
```

These examples demonstrate the full power of the enhanced GitCMS client with
advanced querying, media embedding, and React integration capabilities.
