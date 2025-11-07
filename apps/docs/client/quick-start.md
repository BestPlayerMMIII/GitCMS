# Quick Start

Get up and running with the GitCMS Client SDK in minutes.

## Basic Setup

### 1. Install the SDK

```bash
npm install @git-cms/client
```

### 2. Initialize GitCMS

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/my-blog',
});
```

::: tip Private Repositories?

If your repository is private, you'll need a GitHub Personal Access Token. See
our [GitHub Token Guide](/admin/github-token) for step-by-step instructions.

```typescript
const cms = new GitCMS({
  repository: 'username/my-blog',
  token: process.env.GITHUB_TOKEN, // For private repos
});
```

:::

### 3. Fetch Content

```typescript
// Get all posts
const posts = await cms.from('posts').get();

// Display
posts.forEach(post => {
  console.log(post.data.title);
});
```

## Complete Example

```typescript
import { GitCMS } from '@git-cms/client';

// Initialize
const cms = new GitCMS({
  repository: 'username/my-blog',
});

async function loadBlog() {
  // Fetch published posts
  const posts = await cms
    .from('posts')
    .where('metadata.status', '==', 'published')
    .orderBy('metadata.publishedAt', 'desc')
    .limit(5)
    .get();

  // Display posts
  posts.forEach(post => {
    console.log(`${post.data.title} - ${post.metadata.publishedAt}`);
  });
}

loadBlog();
```

## Common Queries

### Get All Items

```typescript
const posts = await cms.from('posts').get();
```

### Filter by Field

```typescript
const published = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .get();
```

### Sort Results

```typescript
const latest = await cms
  .from('posts')
  .orderBy('metadata.publishedAt', 'desc')
  .get();
```

### Limit Results

```typescript
const featured = await cms.from('posts').where('featured', true).limit(3).get();
```

### Get Single Item

```typescript
const post = await cms.from('posts').where('id', '==', 'my-post-slug').get();
```

## Next Steps

::: info Learn More

- [Configuration](/client/configuration) - Advanced setup
- [Filtering](/client/filtering) - Complex queries
- [Media Management](/client/media) - Images and videos

:::
