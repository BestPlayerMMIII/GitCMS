# GitCMS Client - Simple Media Embedding

## Basic Setup

```typescript
import { GitCMSClient, MediaEmbedder } from '@git-cms/client';

const config = {
  repository: 'your-username/your-repo',
  token: 'your-github-token',
};

const client = new GitCMSClient(config);
```

## Advance## Key Benefits

✅ **Simple API**: Just two methods - `getFast()` and `getFull()`  
✅ **Fast Initial Load**: Thumbnails show immediately  
✅ **Progressive Enhancement**: Full images load asynchronously  
✅ **User Control**: You decide when and how to load images  
✅ **Clean Code**: Minimal, focused implementation  
✅ **Framework Agnostic**: Works with React, Vue, vanilla JS, etc.  
✅ **Network Aware**: Integrates with GitCMS smart upload features  
✅ **LFS Ready**: Optimized for Git Large File Storage

## Enhanced Upload Experience

When using GitCMS Admin, you'll benefit from:

### 🌐 Smart Upload Progress

- **Network-aware progress simulation** based on real connection speed
- **Intelligent time estimates** that adapt to your bandwidth
- **Visual connection quality indicators** (Excellent, Good, Fair, etc.)
- **Real-time upload speed monitoring** with automatic adjustments

### 🗂️ Automatic LFS Management

- **Large file detection** (files >50MB automatically recommended for LFS)
- **Smart extension-based rules** for common binary formats
- **Automatic .gitattributes management** with zero configuration
- **Repository optimization** for faster clones and better performance

### 📱 Enhanced Mobile Experience

- **Responsive progress indicators** optimized for touch interfaces
- **Bandwidth-conscious uploads** that adapt to mobile connections
- **Battery-efficient monitoring** with minimal background activity

This approach gives you maximum control over the loading experience while
keeping the code simple and maintainable! The GitCMS Admin interface provides
additional smart features that enhance the upload experience without requiring
any changes to your client code.

```typescript
// Get content from a schema with advanced querying
const posts = client.from('posts');

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

// Nested field filtering with dot notation
const publishedPosts = await posts
  .where('metadata.status', '==', 'published')
  .where('metadata.featured', true)
  .where('author.verified', true)
  .where('stats.likes', '>=', 50)
  .orderBy('metadata.publishedAt', 'desc')
  .get();

// Search content
const searchResults = await posts.search('react typescript').limit(5).get();

// Complex filtering
const popularPosts = await posts
  .where('category', 'in', ['tech', 'programming'])
  .where('likes', '>=', 50)
  .exists();
```

## Practical Example: Blog with Nested Metadata

```typescript
import { GitCMSClient } from '@git-cms/client';

const client = new GitCMSClient({
  repository: 'username/blog-repo',
  token: process.env.GITHUB_TOKEN,
});

// Real-world content structure:
// {
//   id: 'my-post',
//   title: 'My Post',
//   content: '...',
//   metadata: {
//     status: 'published',
//     publishedAt: '2024-10-15',
//     featured: true,
//     category: 'tech'
//   },
//   author: {
//     name: 'John Doe',
//     verified: true,
//     role: 'admin'
//   },
//   stats: {
//     views: 1500,
//     likes: 75,
//     comments: 23
//   }
// }

// Get all published posts by verified authors
const publishedByVerified = await client
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('author.verified', true)
  .orderBy('metadata.publishedAt', 'desc')
  .get();

// Get featured tech posts with high engagement
const featuredTech = await client
  .from('posts')
  .where('metadata.featured', true)
  .where('metadata.category', '==', 'tech')
  .where('stats.views', '>', 1000)
  .orderBy('stats.likes', 'desc')
  .limit(5)
  .get();

// Check if any admin posts exist
const hasAdminPosts = await client
  .from('posts')
  .where('author.role', '==', 'admin')
  .exists();

// Get most viewed published posts
const topPosts = await client
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('stats.views', 'desc')
  .limit(10)
  .get();
```

## Simple Media Embedding

The GitCMS media embedding system is designed to be **simple and fast**:

1. **Fast thumbnails**: Show immediately using embedded base64 data
2. **Progressive enhancement**: Load full resolution images asynchronously
3. **User control**: You decide when and how to load full images

### GitCMS Media Tags

The admin rich text editor creates special tags with embedded thumbnails:

```html
<gitcms-media
  data-path="media/images/hero.jpg"
  data-filename="hero.jpg"
  data-thumbnail="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  alt="Hero image"
  title="Main hero image"
>
</gitcms-media>
```

### Basic Usage

```typescript
// Your HTML content with GitCMS media tags
const htmlContent = `
  <h1>My Blog Post</h1>
  <p>Here's our featured image:</p>
  <gitcms-media 
    data-path="media/images/hero.jpg" 
    data-filename="hero.jpg" 
    data-thumbnail="data:image/jpeg;base64,..." 
    alt="Hero image" 
    title="Main hero image">
  </gitcms-media>
  <p>More content here...</p>
`;

// Create media embedder
const embedder = new MediaEmbedder(config, htmlContent);

// Get fast version with thumbnails (immediate)
const fastHtml = embedder.getFast();
console.log(fastHtml);
// Output:
// <h1>My Blog Post</h1>
// <p>Here's our featured image:</p>
// <img id="gitcms-media-1" src="data:image/jpeg;base64,..." alt="Hero image" title="Main hero image" data-gitcms-placeholder="true">
// <p>More content here...</p>

// Load full resolution images progressively
await embedder.getFull(updatedHtml => {
  console.log('Updated HTML with full resolution image:', updatedHtml);
  // Each time an image loads, this callback is called with the latest HTML
  // You can update your UI progressively as images load
});
```

### React Example

```typescript
import React, { useState, useEffect } from 'react';
import { MediaEmbedder } from '@git-cms/client';

function BlogPost({ post, config }) {
  const [content, setContent] = useState('');

  useEffect(() => {
    // Create embedder with post content
    const embedder = new MediaEmbedder(config, post.content);

    // Show thumbnails immediately
    setContent(embedder.getFast());

    // Load full resolution images progressively
    embedder.getFull((updatedHtml) => {
      setContent(updatedHtml);
    });
  }, [post.content, config]);

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
}
```

### Vue Example

```typescript
import { ref, onMounted } from 'vue';
import { MediaEmbedder } from '@git-cms/client';

export default {
  props: ['post', 'config'],
  setup(props) {
    const content = ref('');

    onMounted(async () => {
      const embedder = new MediaEmbedder(props.config, props.post.content);

      // Show thumbnails immediately
      content.value = embedder.getFast();

      // Load full resolution images progressively
      await embedder.getFull(updatedHtml => {
        content.value = updatedHtml;
      });
    });

    return { content };
  },
  template: `
    <article>
      <h1>{{ post.title }}</h1>
      <div v-html="content"></div>
    </article>
  `,
};
```

### Progressive Loading Example

```typescript
// Example: Blog with progressive image loading
async function renderBlogPost(postId) {
  // Get post content
  const posts = client.from('posts');
  const post = await posts.where('id', '==', postId).first();

  if (!post) return;

  // Create embedder
  const embedder = new MediaEmbedder(config, post.content);

  // Show fast version immediately
  const container = document.getElementById('blog-content');
  container.innerHTML = embedder.getFast();

  // Track loading progress
  let loadedImages = 0;
  const totalImages = (post.content.match(/<gitcms-media/g) || []).length;

  if (totalImages > 0) {
    // Show loading indicator
    showLoadingIndicator(`Loading images... (0/${totalImages})`);

    // Load full resolution images
    await embedder.getFull(updatedHtml => {
      loadedImages++;
      container.innerHTML = updatedHtml;
      updateLoadingIndicator(
        `Loading images... (${loadedImages}/${totalImages})`
      );

      if (loadedImages === totalImages) {
        hideLoadingIndicator();
      }
    });
  }
}

function showLoadingIndicator(text) {
  const indicator = document.getElementById('loading-indicator');
  indicator.textContent = text;
  indicator.style.display = 'block';
}

function updateLoadingIndicator(text) {
  const indicator = document.getElementById('loading-indicator');
  indicator.textContent = text;
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  indicator.style.display = 'none';
}
```

## Complete Blog Example

```typescript
import { GitCMSClient, MediaEmbedder } from '@git-cms/client';

const config = {
  repository: 'my-username/my-repo',
  token: process.env.GITHUB_TOKEN,
};

const client = new GitCMSClient(config);

async function getBlogData() {
  // Get published posts
  const posts = await client
    .from('posts')
    .where('status', '==', 'published')
    .orderBy('publishDate', 'desc')
    .limit(10)
    .get();

  // Stats
  const stats = {
    totalPosts: await client.from('posts').count(),
    publishedPosts: await client
      .from('posts')
      .where('status', '==', 'published')
      .count(),
  };

  return { posts, stats };
}

async function renderBlog() {
  const { posts, stats } = await getBlogData();

  console.log(
    `Showing ${posts.length} of ${stats.publishedPosts} published posts`
  );

  // Render each post
  for (const post of posts) {
    const container = document.createElement('article');
    container.innerHTML = `<h2>${post.title}</h2><div class="content"></div>`;

    const contentDiv = container.querySelector('.content');

    // Create embedder for this post
    const embedder = new MediaEmbedder(config, post.content);

    // Show thumbnails immediately
    contentDiv.innerHTML = embedder.getFast();

    // Load full images progressively, asynchronously without await
    embedder.getFull(updatedHtml => {
      contentDiv.innerHTML = updatedHtml;
    });

    document.getElementById('blog-posts').appendChild(container);
  }
}

// Initialize blog
renderBlog();
```

## Key Benefits

✅ **Simple API**: Just two methods - `getFast()` and `getFull()`  
✅ **Fast Initial Load**: Thumbnails show immediately  
✅ **Progressive Enhancement**: Full images load asynchronously  
✅ **User Control**: You decide when and how to load images  
✅ **Clean Code**: Minimal, focused implementation  
✅ **Framework Agnostic**: Works with React, Vue, vanilla JS, etc.

This approach gives you maximum control over the loading experience while
keeping the code simple and maintainable!
