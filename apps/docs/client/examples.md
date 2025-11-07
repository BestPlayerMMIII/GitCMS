# Examples

Real-world examples using the GitCMS Client SDK.

## Blog Website

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({ repository: 'username/blog' });

// Homepage: Recent posts
const recent = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .orderBy('metadata.publishedAt', 'desc')
  .limit(5)
  .get();

// Category page
const jsArticles = await cms
  .from('posts')
  .where('tags', 'contains', 'javascript')
  .where('metadata.status', '==', 'published')
  .get();

// Single post
const post = await cms
  .from('posts')
  .where('id', '==', 'react-hooks-guide')
  .get();
```

## Portfolio Website

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

## Documentation Site

```typescript
// Sidebar navigation
const guides = await cms
  .from('docs')
  .where('category', '==', 'guides')
  .orderBy('order', 'asc')
  .get();

// Version selector
const v3Docs = await cms.from('docs').where('version', '==', 'v3.0').get();
```

## E-commerce Catalog

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

## Mobile App Configuration

```typescript
// Fetch config on app launch
const config = await cms.doc('app-config').get();

if (config.maintenanceMode) {
  showMaintenanceScreen();
} else {
  initializeApp(config.features);
}
```
