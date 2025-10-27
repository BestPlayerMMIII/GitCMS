# Quick Reference: Automatic Index Maintenance

## ✅ What's Implemented

The GitCMS admin package now **automatically maintains** `.metadata/index.json`
files for public mode support.

## 📁 Directory Structure

```
content/
  {schema-id}/
    .metadata/
      index.json      ← ["file1.json", "file2.json"] - Auto-updated
      .gitkeep        ← Ensures git tracking
    file1.json
    file2.json
```

## 🔄 Auto-Updated On

| Operation          | Function                    | Index Action        |
| ------------------ | --------------------------- | ------------------- |
| **Create Content** | `createContentData()`       | Add filename        |
| **Update Content** | `updateContentData()`       | Update if renamed   |
| **Delete Content** | `deleteContentData()`       | Remove filename     |
| **Create Schema**  | `saveSchemaData()`          | Create `.metadata/` |
| **Rename Schema**  | `renameSchemaWithCascade()` | Migrate index       |

## 📝 Files Modified

### Admin Package

- ✅ `src/lib/data/content/index-manager.ts` - NEW (280 lines)
- ✅ `src/lib/data/content.data.ts` - Modified (3 integration points)
- ✅ `src/lib/data/schemas/storage.data.ts` - Modified (1 integration point)
- ✅ `src/lib/data/schemas/rename.data.ts` - Modified (1 integration point)

### Client Package

- ✅ `src/contents.ts` - Updated path from `_index.json` to
  `.metadata/index.json`

## 🎯 User Experience

### Before

```bash
# Manual work required
node generate-indexes.js
git add content/**/_index.json
git commit -m "Update indexes"
```

### After

```typescript
// Just use the admin panel - indexes auto-update!
// Create content ✅
// Update content ✅
// Delete content ✅
// Everything automatic! 🎉
```

## 🔧 Index Manager API

```typescript
import * as IndexManager from './content/index-manager';

// Add file
await IndexManager.addToIndex(github, contentPath, schemaId, 'file.json');

// Remove file
await IndexManager.removeFromIndex(github, contentPath, schemaId, 'file.json');

// Rename file
await IndexManager.renameInIndex(
  github,
  contentPath,
  schemaId,
  'old.json',
  'new.json'
);

// Migrate during schema rename
await IndexManager.migrateIndex(github, contentPath, 'old-id', 'new-id', files);

// Ensure directory exists
await IndexManager.ensureMetadataDir(github, contentPath, schemaId);

// Rebuild from scratch (if needed)
const stats = await IndexManager.rebuildIndex(github, contentPath, schemaId);
```

## 📊 Testing

### Check Index Exists

```
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/content/{schema}/.metadata/index.json
```

### Expected Content

```json
["file1.json", "file2.json", "file3.json"]
```

## 🚀 Public Mode Client Usage

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'owner/repo',
  // No token = public mode
});

// Automatically fetches .metadata/index.json
// Then fetches each file listed
const items = await cms.from('blog-post').get();
```

## 📚 Documentation

- **User Guide**: `packages/admin/docs/AUTOMATIC-INDEX-MAINTENANCE.md`
- **Implementation**: `docs/enhance-admin/AUTOMATIC-INDEX-IMPLEMENTATION.md`
- **Client Docs**: `packages/client/docs/PUBLIC-MODE-FIX.md`

## 🎉 Key Benefits

- ✅ **Zero Manual Work** - Completely automatic
- ✅ **Always Up-to-Date** - Updated on every operation
- ✅ **Public Mode Ready** - Works without GitHub token
- ✅ **Git-Friendly** - Clean commits, proper tracking
- ✅ **Robust** - Handles errors gracefully

## 🔍 Troubleshooting

### Index Missing?

The next content operation will create it automatically.

### Index Out of Sync?

```typescript
// Rebuild from directory scan
const stats = await IndexManager.rebuildIndex(github, contentPath, schemaId);
console.log(
  `Rebuilt: ${stats.total} files, ${stats.added} added, ${stats.removed} removed`
);
```

### Public Mode Not Working?

1. Check index exists (see URL above)
2. Verify JSON is valid array
3. Ensure files listed exist
4. Check repo is public

## ✨ Summary

**Before**: Manual index generation scripts  
**After**: Fully automatic maintenance  
**Result**: Public mode "just works"! 🚀
