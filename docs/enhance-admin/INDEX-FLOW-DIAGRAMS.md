# Index Maintenance Flow Diagrams

## 1. Content Creation Flow

```
User Action (Admin Panel)
    |
    ↓
Create Content Form
    |
    ↓
createContentData()
    |
    ├─→ Validate & Process Data
    |
    ├─→ Generate Content ID
    |
    ├─→ Create File: content/{schema}/{id}.json
    |       ↓
    |   GitHub Commit
    |
    └─→ IndexManager.addToIndex()
            |
            ├─→ Read current index (or create if missing)
            |
            ├─→ Add filename to array
            |
            ├─→ Write index: .metadata/index.json
            |
            └─→ GitHub Commit
                    ↓
                ✅ Done!
```

## 2. Content Deletion Flow

```
User Action (Admin Panel)
    |
    ↓
Delete Content Button
    |
    ↓
deleteContentData()
    |
    ├─→ Delete File: content/{schema}/{id}.json
    |       ↓
    |   GitHub Commit
    |
    └─→ IndexManager.removeFromIndex()
            |
            ├─→ Read current index
            |
            ├─→ Remove filename from array
            |
            ├─→ Write updated index
            |
            └─→ GitHub Commit
                    ↓
                ✅ Done!
```

## 3. Content Rename Flow

```
User Action (Admin Panel)
    |
    ↓
Change Content ID
    |
    ↓
updateContentData()
    |
    ├─→ Create new file: content/{schema}/{newId}.json
    |       ↓
    |   GitHub Commit
    |
    ├─→ Delete old file: content/{schema}/{oldId}.json
    |       ↓
    |   GitHub Commit
    |
    └─→ IndexManager.renameInIndex()
            |
            ├─→ Read current index
            |
            ├─→ Replace oldId.json → newId.json
            |
            ├─→ Write updated index
            |
            └─→ GitHub Commit
                    ↓
                ✅ Done!
```

## 4. Schema Creation Flow

```
User Action (Admin Panel)
    |
    ↓
Create New Schema
    |
    ↓
saveSchemaData()
    |
    ├─→ Create schema file: .gitcms/schemas/{id}.json
    |       ↓
    |   GitHub Commit
    |
    └─→ IndexManager.ensureMetadataDir()
            |
            ├─→ Check if .metadata/ exists
            |
            ├─→ If not, create:
            |   content/{schema}/.metadata/.gitkeep
            |       ↓
            |   GitHub Commit
            |
            └─→ ✅ Ready for content!
```

## 5. Schema Rename Flow

```
User Action (Admin Panel)
    |
    ↓
Rename Schema (old → new)
    |
    ↓
renameSchemaWithCascade()
    |
    ├─→ Create new schema: .gitcms/schemas/{new}.json
    |       ↓
    |   Track all content filenames
    |
    ├─→ Migrate all content files
    |   old-schema/file.json → new-schema/file.json
    |       ↓
    |   GitHub Commit (batch)
    |
    ├─→ IndexManager.migrateIndex()
    |       |
    |       ├─→ Create: new-schema/.metadata/index.json
    |       |   with all migrated filenames
    |       |       ↓
    |       |   GitHub Commit
    |       |
    |       └─→ Delete: old-schema/.metadata/index.json
    |               ↓
    |           GitHub Commit
    |
    ├─→ Delete old schema & content files
    |       ↓
    |   GitHub Commit
    |
    └─→ ✅ Migration Complete!
```

## 6. Public Mode Client Fetch Flow

```
Client Code: cms.from('blog').get()
    |
    ↓
Detect Transport Mode
    |
    ↓
[PUBLIC MODE]
    |
    ├─→ Fetch Index File
    |   https://raw.githubusercontent.com/.../content/blog/.metadata/index.json
    |       ↓
    |   Parse JSON: ["post1.json", "post2.json"]
    |
    └─→ For each filename:
            |
            ├─→ Fetch File
            |   https://raw.githubusercontent.com/.../content/blog/post1.json
            |       ↓
            |   Parse JSON
            |
            └─→ Add to results
                    ↓
                ✅ Return all items!
```

## 7. Index Manager Internal Flow

```
IndexManager.addToIndex(github, contentPath, schemaId, filename)
    |
    ├─→ ensureMetadataDir()
    |       |
    |       └─→ Check: .metadata/.gitkeep exists?
    |           No → Create it
    |           Yes → Continue
    |
    ├─→ readIndex()
    |       |
    |       ├─→ Try fetch: .metadata/index.json
    |       |
    |       ├─→ Found? Parse & return array
    |       |
    |       └─→ Not found? Return []
    |
    ├─→ Add filename to array (if not present)
    |
    └─→ writeIndex()
            |
            ├─→ JSON.stringify(array, null, 2)
            |
            ├─→ Try update existing file (with SHA)
            |
            └─→ Or create new file
                    ↓
                GitHub Commit
```

## 8. Complete System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN PACKAGE                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Content Operations          Schema Operations           │
│  ├── Create                  ├── Create                  │
│  ├── Update                  ├── Update                  │
│  ├── Delete                  └── Rename                  │
│  └── Rename                                              │
│       │                           │                       │
│       └───────────┬───────────────┘                       │
│                   │                                       │
│                   ↓                                       │
│       ┌──────────────────────┐                           │
│       │   INDEX MANAGER      │                           │
│       ├──────────────────────┤                           │
│       │ • addToIndex()       │                           │
│       │ • removeFromIndex()  │                           │
│       │ • renameInIndex()    │                           │
│       │ • migrateIndex()     │                           │
│       │ • ensureMetadataDir()│                           │
│       │ • rebuildIndex()     │                           │
│       └──────────────────────┘                           │
│                   │                                       │
└───────────────────┼───────────────────────────────────────┘
                    │
                    ↓
            ┌──────────────┐
            │   GITHUB     │
            │   REPO       │
            ├──────────────┤
            │              │
            │  content/    │
            │    blog/     │
            │      .metadata/
            │        index.json  ← Auto-maintained!
            │        .gitkeep
            │      post1.json
            │      post2.json
            │
            └──────────────┘
                    │
                    ↓
            raw.githubusercontent.com
                    │
                    ↓
┌─────────────────────────────────────────────────────────┐
│                   CLIENT PACKAGE                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Public Mode:                                             │
│    1. Fetch .metadata/index.json                         │
│    2. For each file in index:                            │
│       - Fetch from raw.githubusercontent.com             │
│       - Parse content                                     │
│    3. Return all items                                   │
│                                                           │
│  ✅ No GitHub API auth needed!                           │
│  ✅ Works with public repos!                             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 9. Error Handling Flow

```
Any Index Operation
    |
    ↓
Try Operation
    |
    ├─→ [SUCCESS] ✅
    |       ↓
    |   Return result
    |
    └─→ [ERROR]
            |
            ├─→ Index file missing?
            |       ↓
            |   Create new index
            |       ↓
            |   Retry operation ✅
            |
            ├─→ Metadata dir missing?
            |       ↓
            |   Create directory
            |       ↓
            |   Retry operation ✅
            |
            ├─→ GitHub API error?
            |       ↓
            |   Log warning ⚠️
            |       ↓
            |   Don't fail main operation
            |       ↓
            |   Return gracefully
            |
            └─→ Unknown error?
                    ↓
                Log error ❌
                    ↓
                Throw (let caller handle)
```

## Summary

The automatic index maintenance system:

1. **Hooks into every list-changing operation**
2. **Updates indexes transparently**
3. **Creates necessary directories**
4. **Handles errors gracefully**
5. **Enables public mode seamlessly**

All without any manual intervention! 🎉
