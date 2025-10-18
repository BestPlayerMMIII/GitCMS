# Nested Field Access Guide

GitCMS Client supports **dot notation** for accessing nested fields in your
content items. This makes it easy to filter and sort by deeply nested
properties.

## Quick Reference

### Syntax

```typescript
.where('path.to.field', operator, value)
.orderBy('path.to.field', direction)
```

### Examples

```typescript
// Simple field
.where('title', '==', 'Hello')

// One level deep
.where('metadata.status', '==', 'published')

// Two levels deep
.where('author.profile.verified', true)

// Any depth
.where('data.settings.privacy.visibility', '==', 'public')
```

## How It Works

When you specify a field path like `metadata.status`, the system:

1. **First tries direct access**: `item.metadata.status`
2. **Falls back to data object**: `item.data.metadata.status` (for backward
   compatibility)
3. **Returns `undefined`** if neither exists

This means:

- ✅ Works with any content structure
- ✅ Backward compatible with `data.*` access pattern
- ✅ Supports unlimited nesting depth
- ✅ Safe - returns `undefined` for missing paths

## Content Structure Examples

### Example 1: Blog Post with Metadata

```json
{
  "id": "my-post",
  "title": "Getting Started with GitCMS",
  "content": "...",
  "metadata": {
    "status": "published",
    "publishedAt": "2024-10-15T10:00:00Z",
    "featured": true,
    "category": "tutorial",
    "tags": ["cms", "git", "tutorial"]
  },
  "author": {
    "id": "user-123",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "editor",
    "verified": true
  },
  "stats": {
    "views": 1250,
    "likes": 84,
    "comments": 15,
    "shares": 23
  }
}
```

**Queries:**

```typescript
// Filter by publication status
await cms.from('posts').where('metadata.status', '==', 'published').get();

// Filter by author role
await cms.from('posts').where('author.role', '==', 'editor').get();

// Filter by engagement
await cms.from('posts').where('stats.views', '>', 1000).get();

// Order by publish date
await cms.from('posts').orderBy('metadata.publishedAt', 'desc').get();

// Order by popularity
await cms.from('posts').orderBy('stats.likes', 'desc').get();

// Complex query
const featured = await cms
  .from('posts')
  .where('metadata.featured', true)
  .where('metadata.status', '==', 'published')
  .where('author.verified', true)
  .where('stats.views', '>=', 500)
  .orderBy('metadata.publishedAt', 'desc')
  .limit(10)
  .get();
```

### Example 2: E-commerce Product

```json
{
  "id": "product-456",
  "name": "Wireless Headphones",
  "description": "High-quality audio...",
  "pricing": {
    "currency": "USD",
    "retail": 149.99,
    "sale": 119.99,
    "cost": 75.0
  },
  "inventory": {
    "inStock": true,
    "quantity": 45,
    "warehouse": "US-EAST",
    "reorderPoint": 10
  },
  "ratings": {
    "average": 4.7,
    "count": 234,
    "distribution": {
      "5star": 180,
      "4star": 35,
      "3star": 12,
      "2star": 4,
      "1star": 3
    }
  },
  "attributes": {
    "color": "black",
    "brand": "AudioPro",
    "wireless": true,
    "features": ["noise-cancelling", "bluetooth", "40hr-battery"]
  }
}
```

**Queries:**

```typescript
// In-stock products
await cms.from('products').where('inventory.inStock', true).get();

// Products on sale
await cms.from('products').where('pricing.sale', '<', pricing.retail).get();

// High-rated products
await cms.from('products').where('ratings.average', '>=', 4.5).get();

// Low inventory alerts
await cms
  .from('products')
  .where('inventory.quantity', '<=', inventory.reorderPoint)
  .get();

// Wireless products by price
await cms
  .from('products')
  .where('attributes.wireless', true)
  .orderBy('pricing.retail', 'asc')
  .get();

// Top-rated in-stock products
const topProducts = await cms
  .from('products')
  .where('inventory.inStock', true)
  .where('ratings.average', '>=', 4.5)
  .where('ratings.count', '>=', 50)
  .orderBy('ratings.average', 'desc')
  .limit(20)
  .get();
```

### Example 3: User Profile

```json
{
  "id": "user-789",
  "username": "johndoe",
  "email": "john@example.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://...",
    "bio": "Software developer..."
  },
  "settings": {
    "privacy": {
      "profileVisible": true,
      "emailVisible": false,
      "activityVisible": true
    },
    "notifications": {
      "email": true,
      "push": false,
      "weekly": true
    }
  },
  "status": {
    "active": true,
    "verified": true,
    "premium": false,
    "lastLogin": "2024-10-18T08:30:00Z"
  }
}
```

**Queries:**

```typescript
// Public profiles
await cms.from('users').where('settings.privacy.profileVisible', true).get();

// Active verified users
await cms
  .from('users')
  .where('status.active', true)
  .where('status.verified', true)
  .get();

// Premium users with email notifications
await cms
  .from('users')
  .where('status.premium', true)
  .where('settings.notifications.email', true)
  .get();

// Recently active users
await cms
  .from('users')
  .where('status.active', true)
  .orderBy('status.lastLogin', 'desc')
  .limit(50)
  .get();
```

## Supported Operators

All standard operators work with nested fields:

```typescript
'==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
```

### Examples with Different Operators

```typescript
// Equality
.where('metadata.status', '==', 'published')
.where('author.verified', true)

// Comparison
.where('stats.views', '>', 1000)
.where('pricing.retail', '<=', 99.99)

// In array
.where('metadata.category', 'in', ['tech', 'tutorial', 'guide'])

// Contains
.where('metadata.tags', 'contains', 'javascript')
```

## Best Practices

### ✅ DO

```typescript
// Use descriptive nested paths
.where('metadata.status', '==', 'published')
.where('author.profile.verified', true)

// Chain multiple filters
const results = await cms
  .from('posts')
  .where('metadata.status', '==', 'published')
  .where('stats.views', '>', 500)
  .orderBy('metadata.publishedAt', 'desc')
  .get();

// Use consistent structure across content
// All posts should have the same metadata structure
```

### ❌ DON'T

```typescript
// Don't mix inconsistent structures
// Some posts with 'status' at root, others in 'metadata'
// This makes querying unreliable

// Don't use extremely deep nesting (>5 levels)
// Makes code harder to read and maintain
.where('a.b.c.d.e.f.g', '==', 'value') // Too deep!

// Don't rely on optional nested fields without checking exists()
// Better to structure content consistently
```

## TypeScript Types

For full type safety, define your content structure:

```typescript
interface BlogPost {
  id: string;
  title: string;
  content: string;
  metadata: {
    status: 'draft' | 'published' | 'archived';
    publishedAt: string;
    featured: boolean;
    category: string;
  };
  author: {
    id: string;
    name: string;
    verified: boolean;
    role: 'admin' | 'editor' | 'author';
  };
  stats: {
    views: number;
    likes: number;
    comments: number;
  };
}

// Type-safe queries
const posts = (await cms.from('posts').get()) as BlogPost[];

// IDE will autocomplete nested paths when you type them as strings
const published = (await cms
  .from('posts')
  .where('metadata.status', '==', 'published') // ✓ Type-safe
  .get()) as BlogPost[];
```

## Migration from Old Syntax

If you were using the old syntax with `data.` prefix:

### Old

```typescript
.where('data.status', '==', 'published')
.orderBy('data.publishedAt', 'desc')
```

### New (Both work!)

```typescript
// Direct access (recommended)
.where('status', '==', 'published')
.orderBy('publishedAt', 'desc')

// Or nested
.where('metadata.status', '==', 'published')
.orderBy('metadata.publishedAt', 'desc')
```

The system tries both paths, so old code continues to work!

## Summary

- 🎯 Use **dot notation** for nested fields: `parent.child.grandchild`
- 🔍 Works with **where()** and **orderBy()**
- 🔄 **Backward compatible** with `data.*` pattern
- 📊 Supports **any nesting depth**
- ✅ **Safe** - returns `undefined` for missing paths
- 🚀 **Modular** - easy to understand and use

Happy querying! 🎉
