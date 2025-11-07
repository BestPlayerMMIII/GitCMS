# Use Cases

Discover what you can build with GitCMS and see real-world examples.

## Overview

GitCMS is versatile and can power many types of content-driven applications:

- **Blogs & Publications**
- **Documentation Sites**
- **Portfolio Websites**
- **E-commerce Catalogs**
- **Marketing Pages**
- **Mobile Apps**
- **Configuration Management**

## Blog Management

### Personal Blog

**Scenario**: A developer wants to blog about coding

**Setup**:

```typescript
// Schema: blog-post
{
  "fields": [
    { "name": "title", "type": "string" },
    { "name": "content", "type": "markdown" },
    { "name": "excerpt", "type": "text" },
    { "name": "publishedAt", "type": "datetime" },
    { "name": "tags", "type": "array" },
    { "name": "featured", "type": "boolean" }
  ]
}
```

**Implementation**:

```typescript
// Fetch recent posts
const posts = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.publishedAt', 'desc')
  .limit(10)
  .get();

// Display on homepage
posts.forEach(post => {
  renderPost(post.data.title, post.data.excerpt, post.metadata.publishedAt);
});
```

**Benefits**:

- Write in visual editor
- Version control for posts
- Easy media management
- No database setup

### Multi-Author Publication

**Scenario**: A team blog with multiple writers

**Schema Extensions**:

```typescript
{
  "fields": [
    // ... previous fields
    {
      "name": "author",
      "type": "object",
      "fields": [
        { "name": "name", "type": "string" },
        { "name": "email", "type": "string" },
        { "name": "avatar", "type": "media" }
      ]
    }
  ]
}
```

**Queries**:

```typescript
// Posts by author
const authorPosts = await cms
  .from('posts')
  .where('author.name', '==', 'John Doe')
  .get();

// Featured posts
const featured = await cms.from('posts').where('featured', true).limit(3).get();
```

## Documentation Sites

### Product Documentation

**Scenario**: Software documentation that needs frequent updates

**Schema**:

```typescript
// Schema: documentation
{
  "fields": [
    { "name": "title", "type": "string" },
    { "name": "content", "type": "markdown" },
    { "name": "category", "type": "string" },
    { "name": "order", "type": "number" },
    { "name": "version", "type": "string" }
  ]
}
```

**Organization**:

```typescript
// Get all guides
const guides = await cms
  .from('docs')
  .where('category', '==', 'guides')
  .orderBy('order', 'asc')
  .get();

// Version-specific docs
const v2Docs = await cms.from('docs').where('version', '==', 'v2.0').get();
```

**Benefits**:

- Easy updates from team
- Version history
- Branch-based workflows
- Markdown support

### API Reference

**Schema**:

```typescript
// Schema: api-endpoint
{
  "fields": [
    { "name": "endpoint", "type": "string" },
    { "name": "method", "type": "string" },
    { "name": "description", "type": "markdown" },
    { "name": "parameters", "type": "array" },
    { "name": "response", "type": "object" }
  ]
}
```

**Display**:

```typescript
// Get all GET endpoints
const getEndpoints = await cms
  .from('api-endpoints')
  .where('method', '==', 'GET')
  .orderBy('endpoint', 'asc')
  .get();
```

## Portfolio Websites

### Developer Portfolio

**Scenario**: Showcase projects and skills

**Schema**:

```typescript
// Schema: project
{
  "fields": [
    { "name": "title", "type": "string" },
    { "name": "description", "type": "markdown" },
    { "name": "thumbnail", "type": "media" },
    { "name": "images", "type": "array" },
    { "name": "url", "type": "string" },
    { "name": "github", "type": "string" },
    { "name": "technologies", "type": "array" },
    { "name": "featured", "type": "boolean" },
    { "name": "order", "type": "number" }
  ]
}
```

**Implementation**:

```typescript
// Featured projects
const featured = await cms
  .from('projects')
  .where('featured', true)
  .orderBy('order', 'asc')
  .get();

// Filter by technology
const reactProjects = await cms
  .from('projects')
  .where('technologies', 'contains', 'React')
  .get();
```

**Benefits**:

- Easy project updates
- Rich media support
- Dynamic filtering
- No backend needed

### Designer Portfolio

**Focus**: Visual work with many images

**Schema**:

```typescript
// Schema: design-work
{
  "fields": [
    { "name": "title", "type": "string" },
    { "name": "category", "type": "string" },
    { "name": "coverImage", "type": "media" },
    { "name": "gallery", "type": "array" },
    { "name": "client", "type": "string" },
    { "name": "year", "type": "number" }
  ]
}
```

**Gallery View**:

```typescript
// All design work, newest first
const works = await cms.from('design-work').orderBy('year', 'desc').get();

// Filter by category
const branding = await cms
  .from('design-work')
  .where('category', '==', 'branding')
  .get();
```

## E-commerce Catalog

### Product Catalog

**Scenario**: Display products from GitHub (content only, not transactions)

**Schema**:

```typescript
// Schema: product
{
  "fields": [
    { "name": "name", "type": "string" },
    { "name": "description", "type": "markdown" },
    { "name": "price", "type": "number" },
    { "name": "images", "type": "array" },
    { "name": "category", "type": "string" },
    { "name": "inStock", "type": "boolean" },
    { "name": "sku", "type": "string" }
  ]
}
```

**Product Listing**:

```typescript
// In-stock products
const products = await cms
  .from('products')
  .where('inStock', true)
  .where('category', '==', 'electronics')
  .orderBy('price', 'asc')
  .get();

// Sale items
const onSale = await cms.from('products').where('price', '<', 50).get();
```

**Note**: For actual e-commerce, combine with Stripe/PayPal for payments.

## Marketing Pages

### Landing Pages

**Scenario**: Marketing team manages landing pages

**Schema**:

```typescript
// Schema: landing-page
{
  "fields": [
    { "name": "slug", "type": "string" },
    { "name": "hero", "type": "object" },
    { "name": "features", "type": "array" },
    { "name": "cta", "type": "object" },
    { "name": "active", "type": "boolean" }
  ]
}
```

**Dynamic Pages**:

```typescript
// Get active landing page
const page = await cms
  .from('landing-pages')
  .where('slug', '==', 'summer-sale')
  .where('active', true)
  .get();

// Render hero section
renderHero(page.hero.title, page.hero.image);
```

**Benefits**:

- Marketing team independence
- A/B testing with branches
- Version history
- No developer needed

## Mobile Applications

### App Configuration

**Scenario**: Mobile app fetches config from GitHub

**Schema**:

```typescript
// Schema: app-config
{
  "fields": [
    { "name": "features", "type": "object" },
    { "name": "announcements", "type": "array" },
    { "name": "maintenanceMode", "type": "boolean" },
    { "name": "minVersion", "type": "string" }
  ]
}
```

**Fetch on Launch**:

```typescript
// React Native / Flutter
const config = await cms.doc('app-config').get();

if (config.maintenanceMode) {
  showMaintenanceScreen();
} else {
  initializeApp(config.features);
}
```

**Benefits**:

- Update without app releases
- Feature flags
- Emergency announcements
- Version enforcement

### Content Feed

**Scenario**: News/content app

**Implementation**:

```typescript
// Fetch latest articles
const articles = await cms
  .from('articles')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.publishedAt', 'desc')
  .limit(20)
  .get();

// Offline support
cacheArticles(articles);
```

## Educational Platforms

### Course Content

**Schema**:

```typescript
// Schema: lesson
{
  "fields": [
    { "name": "title", "type": "string" },
    { "name": "content", "type": "markdown" },
    { "name": "course", "type": "string" },
    { "name": "module", "type": "number" },
    { "name": "order", "type": "number" },
    { "name": "video", "type": "media" },
    { "name": "quiz", "type": "array" }
  ]
}
```

**Course Structure**:

```typescript
// Get course lessons in order
const lessons = await cms
  .from('lessons')
  .where('course', '==', 'javascript-basics')
  .orderBy('module', 'asc')
  .orderBy('order', 'asc')
  .get();

// Current lesson
const lesson = lessons[currentIndex];
```

## Real-World Examples

### Example 1: Tech Blog

```typescript
// Setup
const cms = new GitCMS({ repository: 'johndoe/blog' });

// Homepage: Recent posts
const recent = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.publishedAt', 'desc')
  .limit(5)
  .get();

// Category page: Filter by tag
const jsArticles = await cms
  .from('posts')
  .where('tags', 'contains', 'javascript')
  .get();

// Single post
const post = await cms
  .from('posts')
  .where('id', '==', 'react-hooks-guide')
  .get();
```

### Example 2: Agency Website

```typescript
// Services page
const services = await cms
  .from('services')
  .where('active', true)
  .orderBy('order', 'asc')
  .get();

// Portfolio gallery
const projects = await cms
  .from('projects')
  .where('featured', true)
  .limit(6)
  .get();

// Team members
const team = await cms.from('team').orderBy('role', 'asc').get();
```

### Example 3: Documentation Site

```typescript
// Sidebar navigation
const guides = await cms
  .from('docs')
  .where('category', '==', 'guides')
  .orderBy('order', 'asc')
  .get();

// Search functionality
const results = await cms
  .from('docs')
  .where('title', 'contains', 'authentication')
  .get();

// Version selector
const v3Docs = await cms.from('docs').where('version', '==', 'v3.0').get();
```

## Best Practices by Use Case

### For Blogs

✅ **Do**:

- Use `publishedAt` for sorting
- Add tags for categorization
- Include excerpt for previews
- Use featured flag for highlights

❌ **Don't**:

- Store comments (use external service)
- Store user data
- Handle authentication

### For Documentation

✅ **Do**:

- Use order field for sequencing
- Version your docs
- Use categories
- Enable search

❌ **Don't**:

- Forget to update version
- Mix versions in queries
- Skip ordering

### For Portfolios

✅ **Do**:

- Optimize images
- Use thumbnail fields
- Add rich metadata
- Include external links

❌ **Don't**:

- Upload huge files
- Forget alt text
- Skip mobile optimization

### For E-commerce

✅ **Do**:

- Keep product data updated
- Use stock status
- Optimize product images
- Add detailed descriptions

❌ **Don't**:

- Store payment info
- Handle transactions
- Store customer data

## Performance Optimization

### Static Generation

```typescript
// Next.js: Generate at build time
export async function getStaticProps() {
  const posts = await cms
    .from('posts')
    .where('metadata.status', '==', 'published')
    .get();

  return { props: { posts }, revalidate: 3600 };
}
```

### Incremental Static Regeneration

```typescript
// Revalidate every hour
export const revalidate = 3600;

export default async function Page() {
  const posts = await cms.from('posts').get();
  return <PostList posts={posts} />;
}
```

### Client-Side Caching

```typescript
// Cache in memory
const cache = new Map();

async function getCachedPosts() {
  if (cache.has('posts')) {
    return cache.get('posts');
  }

  const posts = await cms.from('posts').get();
  cache.set('posts', posts);

  return posts;
}
```

## Next Steps

Choose a use case that fits your needs:

::: info Start Building

- [Admin Panel Guide](/admin/getting-started) - Create content
- [Client SDK Guide](/client/quick-start) - Build your app
- [Examples](/client/examples) - See more code examples

:::
