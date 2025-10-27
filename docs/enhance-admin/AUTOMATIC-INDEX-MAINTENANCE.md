# Automatic Index Maintenance

## Overview

The GitCMS admin package **automatically maintains** content index files to
enable public mode in the client package. No manual intervention required!

## What Are Index Files?

Index files are simple JSON arrays that list all content files in a schema
directory:

```json
["post-1.json", "post-2.json", "post-3.json"]
```

## Location

Index files are stored in `.metadata/index.json` within each schema directory:

```
content/
  blog-post/
    .metadata/
      index.json      ← Automatically maintained
      .gitkeep        ← Ensures directory exists in git
    post-1.json
    post-2.json
    post-3.json
```

## Automatic Maintenance

The index is **automatically updated** whenever you:

### ✅ Create Content

When you create new content via the admin panel, the index is updated to include
the new file.

```typescript
// Before: ["post-1.json", "post-2.json"]
// After:  ["post-1.json", "post-2.json", "post-3.json"]
```

### ✅ Update Content

When updating content, the index remains consistent unless you rename the
content ID.

### ✅ Delete Content

When you delete content, the file is removed from the index.

```typescript
// Before: ["post-1.json", "post-2.json", "post-3.json"]
// After:  ["post-1.json", "post-3.json"]
```

### ✅ Rename Content

When you rename content (change the content ID), the index is updated
accordingly.

```typescript
// Before: ["old-name.json", "post-2.json"]
// After:  ["new-name.json", "post-2.json"]
```

### ✅ Create Schema

When you create a new schema, the `.metadata` directory is automatically
created.

### ✅ Rename Schema

When you rename a schema, the entire `.metadata` directory (including index) is
migrated:

```
content/
  old-schema/
    .metadata/
      index.json       ← Deleted
  new-schema/
    .metadata/
      index.json       ← Created with migrated files
```

## How It Works

### 1. Index Manager Module

All index operations are centralized in
`packages/admin/src/lib/data/content/index-manager.ts`:

```typescript
import * as IndexManager from './content/index-manager';

// Add file to index
await IndexManager.addToIndex(github, contentPath, schemaId, filename);

// Remove file from index
await IndexManager.removeFromIndex(github, contentPath, schemaId, filename);

// Rename file in index
await IndexManager.renameInIndex(
  github,
  contentPath,
  schemaId,
  oldName,
  newName
);

// Migrate index during schema rename
await IndexManager.migrateIndex(
  github,
  contentPath,
  oldSchemaId,
  newSchemaId,
  files
);
```

### 2. Integration Points

The index manager is integrated into all "list-changing" operations:

- **`content.data.ts`**:
  - `createContentData()` → `addToIndex()`
  - `updateContentData()` → `renameInIndex()` or `addToIndex()`
  - `deleteContentData()` → `removeFromIndex()`

- **`schemas/storage.data.ts`**:
  - `saveSchemaData()` → `ensureMetadataDir()`

- **`schemas/rename.data.ts`**:
  - `renameSchemaWithCascade()` → `migrateIndex()`

## Client Usage

The client automatically uses the index file when in public mode:

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'owner/repo',
  // No token = public mode
});

// Fetches .metadata/index.json then individual files
const posts = await cms.from('blog-post').get();
```

## Debugging

### Check if Index Exists

Visit in your browser:

```
https://raw.githubusercontent.com/owner/repo/main/content/schema-id/.metadata/index.json
```

### Verify Index Content

The index should be a JSON array of filenames:

```json
["file1.json", "file2.json"]
```

### Rebuild Index

If the index gets out of sync, you can rebuild it:

```typescript
import * as IndexManager from '@/lib/data/content/index-manager';

const result = await IndexManager.rebuildIndex(github, contentPath, schemaId);

console.log(`Rebuilt index: ${result.total} files`);
console.log(`Added: ${result.added}, Removed: ${result.removed}`);
```

## Git Commits

Index updates create minimal, focused commits:

```
Create index for blog-post
Update index for blog-post
Remove old index after schema rename: old → new
```

## Benefits

### ✅ No Manual Work

- Indexes are created and maintained automatically
- You never need to manually edit `.metadata/index.json`

### ✅ Always Up-to-Date

- Every content operation updates the index
- No risk of index becoming stale

### ✅ Public Mode Support

- Enables client to work without GitHub token
- Perfect for static sites and JAMstack

### ✅ Git-Friendly

- `.metadata` directory is tracked by git
- `.gitkeep` ensures empty directories are preserved

## Migration from Old Approach

If you were using the old `_index.json` approach (root of schema directory), the
system will:

1. Look for `.metadata/index.json` first (new location)
2. Fall back to HTML scraping if not found
3. The admin panel will create `.metadata/index.json` on the next content
   operation

**No manual migration needed!** Just use the admin panel normally.

## Technical Details

### File Operations

All index updates go through the GitHub API:

```typescript
// Update existing index
await github.updateFile(indexPath, content, message, existingSha);

// Create new index
await github.createMultipleFiles([{ path, content }], message);

// Delete old index (during schema rename)
await github.deleteFile(indexPath, message, sha);
```

### Error Handling

The index manager gracefully handles:

- Missing `.metadata` directories (creates them)
- Missing index files (creates them)
- Failed updates (logs warning, doesn't fail main operation)

### Performance

- Index files are small (typically <1KB)
- Only updated when content list changes
- No performance impact on content operations

## FAQ

### Q: Do I need to commit `.metadata` folders?

**A:** Yes! The `.metadata` folders are automatically committed by the admin
package. They're essential for public mode.

### Q: What if I manually add content files outside the admin panel?

**A:** The index won't include them automatically. Use `rebuildIndex()` to
rescan the directory, or add them via the admin panel.

### Q: Can I edit `.metadata/index.json` manually?

**A:** Not recommended. The admin panel will overwrite your changes. If you need
to rebuild the index, use the `rebuildIndex()` function.

### Q: What happens if `.metadata/index.json` is deleted?

**A:** The next content operation will recreate it automatically. In the
meantime, the client will fall back to HTML scraping (fragile).

### Q: Does this work with private repositories?

**A:** The index files work with private repos, but the client will need a token
to access them (authenticated mode). Public mode only works with public repos.

## Summary

✅ **Fully automatic** - No manual work required  
✅ **Always up-to-date** - Updated on every content operation  
✅ **Git-friendly** - Clean commits, tracked by git  
✅ **Public mode ready** - Enables client without token  
✅ **Robust** - Handles errors gracefully

Just use the admin panel normally, and the indexes will be maintained
automatically! 🚀
