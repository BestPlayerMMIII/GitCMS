# GitCMS Terminology Standardization

## Date: October 18, 2025

## Summary

This document describes the terminology standardization performed across the
GitCMS codebase to eliminate confusion between "collections" and "content".

## Problem Statement

The codebase had confusing and overlapping terminology:

- **Client package** used `collection()` to query content by schema type
- **Admin package** used "content" terminology consistently
- **Core package** had a `collections` array in config that didn't serve a clear
  purpose
- **Reference fields** used `collection` property instead of `schema`

This created ambiguity about what a "collection" actually meant in GitCMS.

## Solution

### Clarification of Terms

1. **Schema**: A definition that describes the structure of content (fields,
   types, validation)
2. **Content**: Individual items/documents that conform to a schema
3. **Media Collections**: Groups of media files (separate concept, not related
   to content)

### Changes Made

#### 1. CLI Package Removal

- **Action**: Deleted `packages/cli` folder entirely
- **Reason**: Will be recreated from scratch when project is complete
- **Impact**: No dependencies found in other packages

#### 2. Client Package (`packages/client`)

**API Changes:**

- ✅ Renamed `collection()` → `from()` (SQL-like syntax)
- ✅ `CollectionRef` class → `SchemaRef` class
- ✅ `CollectionQuery` class → `SchemaQuery` class
- ✅ Added `Collection` as deprecated alias for `SchemaGroup`
- ✅ Kept `collection()` as deprecated method pointing to `from()`

**Usage Before:**

```typescript
const posts = await cms.collection('blog-posts').get();
const post = await cms.collection('blog-posts').doc('my-post').get();
```

**Usage After:**

```typescript
const posts = await cms.from('blog-posts').get();
const post = await cms.from('blog-posts').doc('my-post').get();
```

**Type Changes:**

- `Collection` interface → deprecated, replaced by `SchemaGroup`
- `SchemaGroup`: Represents all content items grouped by their schema type

#### 3. Core Package (`packages/core`)

**Schema Changes:**

- ✅ `ReferenceField.collection` → `ReferenceField.schema`
- ✅ Updated validation: "must specify collection" → "must specify schema"

**Config Changes:**

- ✅ Removed `collections: string[]` from `GitCMSRepositoryConfig`
- ✅ Removed `collections` from `DEFAULT_GITCMS_CONFIG`
- ✅ Updated `validateGitCMSConfig()` to not check for collections array
- ✅ Removed `collections` from `GitCMSMetadata.config`

**Documentation:**

- ✅ Updated `.gitcms/README.md` to remove "collections" folder reference
- ✅ Added clarifying comment to `media-organization.ts` for media collections

#### 4. Admin Package (`packages/admin`)

**Component Changes:**

- ✅ `setup-wizard.tsx`: Removed `collections` from setup config
- ✅ `schema-editor.tsx`:
  - Changed "Collection" label → "Schema"
  - Updated `field.collection` → `field.schema`
  - Updated placeholder text to reference schemas instead of collections

#### 5. Documentation Updates

**Client Documentation:**

- ✅ `packages/client/README.md`: All examples use `from()` instead of
  `collection()`
- ✅ `packages/client/EXAMPLES.md`: All examples updated

**Project Documentation:**

- ✅ `PROJECT-BRIEF.md`: Updated all code examples to use `from()`
- ✅ `SETUP-COMPLETE.md`: Updated example code

## Migration Guide for Users

### If You're Using the Client Package

**Old Code:**

```typescript
const posts = await cms.collection('blog-posts').get();
```

**New Code (Recommended):**

```typescript
const posts = await cms.from('blog-posts').get();
```

**Backward Compatibility:** The old `collection()` method still works but is
deprecated. Update your code at your convenience.

### If You're Creating Schemas with Reference Fields

**Old Schema:**

```json
{
  "type": "reference",
  "collection": "blog-posts"
}
```

**New Schema:**

```json
{
  "type": "reference",
  "schema": "blog-posts"
}
```

### If You're Using GitCMS Config

The `collections` array is no longer needed in `.gitcms/config.json`. GitCMS
automatically discovers schemas from the `.gitcms/schemas/` directory and
content from the `content/` directory.

## Benefits

1. **Clearer Mental Model**: "Schemas" define structure, "Content" is the data
2. **SQL-Like Familiarity**: `from()` method resembles SQL's `FROM` clause
3. **No Ambiguity**: Media collections remain separate from content schemas
4. **Consistent Terminology**: Entire codebase now uses consistent naming
5. **Simplified Config**: Less configuration needed

## Breaking Changes

⚠️ **Breaking Changes in ReferenceField:**

- The `collection` property on reference fields must be renamed to `schema`
- This affects schema definitions only, not runtime queries

⚠️ **Config Changes:**

- The `collections` array in `.gitcms/config.json` is no longer used
- Can be safely removed from existing configs

## Non-Breaking Changes

✅ **Client API:**

- Old `collection()` method still works (deprecated)
- Old `Collection` type still available (deprecated alias)

## Testing Recommendations

1. ✅ Verify all client queries work with `from()` method
2. ✅ Check schema editor saves reference fields with `schema` property
3. ✅ Ensure setup wizard no longer tries to initialize collections array
4. ✅ Confirm documentation renders correctly

## Future Considerations

- CLI package will be recreated with consistent terminology
- Consider adding migration tool for old schema definitions
- Update any external examples or tutorials

## Files Modified

### Deleted

- `packages/cli/` (entire folder)

### Modified

- `packages/client/src/client.ts`
- `packages/client/src/collections.ts`
- `packages/client/src/types.ts`
- `packages/client/README.md`
- `packages/client/EXAMPLES.md`
- `packages/core/src/schemas.ts`
- `packages/core/src/config.ts`
- `packages/core/src/types.ts`
- `packages/core/src/github-utils.ts`
- `packages/core/src/media-organization.ts`
- `packages/admin/src/components/setup-wizard.tsx`
- `packages/admin/src/components/schemas/schema-editor.tsx`
- `PROJECT-BRIEF.md`
- `SETUP-COMPLETE.md`

## Conclusion

This standardization eliminates the confusing "collections" terminology and
establishes a clear distinction:

- **Schemas** define the structure
- **Content** is the data conforming to schemas
- **Media Collections** are a separate feature for organizing media files

The codebase now has consistent, SQL-like terminology that's easier to
understand and use.
