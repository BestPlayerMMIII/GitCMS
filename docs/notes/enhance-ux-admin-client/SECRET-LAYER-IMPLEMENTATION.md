# 🔒 Secret Layer Implementation - Schema ID Mapping

## Overview

The **Secret Layer** provides complete transparency to users while maintaining
system integrity. Users **always** see their friendly schema IDs (like "hello",
"blog-post", "product") while the system internally uses generated system IDs
(like "schema_1759359559148_uscaivf5b") for storage and operations.

## 🎯 User Experience

### What Users See ✅

- **Schema Creation**: Enter "hello" → See "hello" in the admin
- **Schema Editing**: Always work with "hello"
- **Schema List**: Display shows "hello"
- **Content References**: Content shows `schemaId: "hello"`

### What System Uses 🔧

- **GitHub Storage**: Stores schemas with system IDs like
  "schema_1759359559148_uscaivf5b"
- **API Operations**: All backend calls use system IDs
- **Content Storage**: Content files reference system IDs internally

## 🏗️ Architecture

### Core Components

1. **Schema ID Mapping Service** (`schema-mapping.ts`)
   - Manages bidirectional mapping between user ↔ system IDs
   - Session-based caching for performance
   - GitHub storage for persistence

2. **Schema ID Converter** (`schema-id-converter.ts`)
   - Provides conversion functions for all data structures
   - Handles schemas, content, and complex nested objects
   - Graceful fallback when conversion fails

3. **Enhanced API Hooks** (`api-hooks.ts`)
   - `convertSchemasToUserFormat()` - Batch schema conversion
   - `useContentListWithMapping()` - Content with automatic ID conversion
   - Automatic cache invalidation

### Data Flow

```
1. Schema Creation Flow:
   User Input: "hello"
   ↓
   Create Mapping: "hello" → "schema_1759359559148_uscaivf5b"
   ↓
   Storage: System uses "schema_1759359559148_uscaivf5b"
   ↓
   Display: User sees "hello"

2. Schema Loading Flow:
   GitHub: Fetch schemas with system IDs
   ↓
   Convert: System IDs → User-friendly IDs
   ↓
   Display: Show user-friendly IDs

3. Content Reference Flow:
   Content Storage: schemaId: "schema_1759359559148_uscaivf5b"
   ↓
   Convert for Display: schemaId: "hello"
   ↓
   User sees: Content belongs to "hello" schema
```

## 🔧 Implementation Details

### 1. Schema Page (`schemas/page.tsx`)

**Conversion Layer Added:**

```typescript
// Convert system schemas to user-friendly format
useEffect(() => {
  const convertSchemas = async () => {
    if (!systemSchemas || !repositoryInfo) return;

    const convertedSchemas = await convertSchemasToUserFormat(
      systemSchemas,
      repositoryInfo.owner,
      repositoryInfo.repo
    );
    setDisplaySchemas(convertedSchemas);
  };
  convertSchemas();
}, [systemSchemas, repositoryInfo]);
```

**Save Logic Updated:**

```typescript
const handleSaveSchema = async (
  schema: GitCMSSchema,
  originalSchemaId?: string
) => {
  const userDefinedId = schema.id;
  const schemaToSave = { ...schema };

  if (!originalSchemaId) {
    // New schema - create mapping
    const { systemId } = await createMapping(userDefinedId);
    schemaToSave.id = systemId;
    await saveSchema(schemaToSave);
  } else {
    // Edit existing - update mapping if ID changed
    const originalSystemId = await getSystemSchemaId(
      owner,
      repo,
      originalSchemaId
    );
    if (originalSchemaId !== userDefinedId) {
      await updateMapping(originalSystemId, userDefinedId);
    }
    schemaToSave.id = originalSystemId;
    await saveSchema(schemaToSave, originalSystemId);
  }
};
```

**Edit Logic Updated:**

```typescript
const handleEditSchema = async (schema: GitCMSSchema) => {
  // Convert system ID to user-friendly ID for editing
  const userDefinedId = await getUserSchemaId(owner, repo, schema.id);
  const schemaForEditing = { ...schema, id: userDefinedId };
  setState({ view: 'edit', selectedSchema: schemaForEditing });
};
```

### 2. Schema List (`schema-list.tsx`)

**Simplified Display:**

- Removed `SchemaDisplayId` component (conversion now happens at page level)
- Direct display: `{schema.metadata?.name || schema.id}`
- The `schema.id` is now always user-friendly due to pre-conversion

### 3. Content Integration (`api-hooks.ts`)

**New Hook for Content with Mapping:**

```typescript
export function useContentListWithMapping(
  owner: string | null,
  repo: string | null,
  userSchemaId?: string,
  options: { enabled?: boolean } = {}
): UseApiDataResult<ContentItem[]>;
```

This hook automatically:

1. Converts user schema ID to system ID for API calls
2. Fetches content using system schema ID
3. Converts content schema references back to user-friendly IDs

## 📁 File Structure

```
packages/admin/src/
├── lib/
│   ├── schema-mapping.ts          # Core mapping service
│   ├── schema-id-converter.ts     # Conversion utilities
│   └── api-hooks.ts              # Enhanced hooks with mapping
├── app/schemas/page.tsx           # Schema management with secret layer
└── components/schemas/
    └── schema-list.tsx           # Simplified display component
```

## 🔄 Key Features

### ✅ Complete Transparency

- Users never see system-generated IDs
- All admin operations use user-friendly names
- Content references show meaningful schema names

### ✅ System Integrity

- GitHub storage uses consistent system IDs
- API operations maintain referential integrity
- No conflicts with existing content

### ✅ Performance Optimized

- Session-based caching reduces conversion overhead
- Batch conversion for lists
- Selective cache invalidation

### ✅ Error Resilience

- Graceful fallback to system IDs if mapping fails
- Non-blocking behavior for edge cases
- Comprehensive error handling

## 🎯 User Workflow Example

1. **Create Schema:**
   - User types "hello" as schema ID
   - System creates mapping "hello" → "schema_1759359559148_uscaivf5b"
   - GitHub stores schema with system ID
   - Admin displays "hello" to user

2. **Edit Schema:**
   - User clicks edit on "hello" schema
   - System loads schema with system ID
   - Converts to "hello" for editing
   - User edits and saves as "hello" (or renames to "greeting")
   - System maintains mapping consistency

3. **Create Content:**
   - User creates content for "hello" schema
   - System stores content with `schemaId: "schema_1759359559148_uscaivf5b"`
   - Admin displays content belonging to "hello" schema

4. **View Content:**
   - User sees content list
   - Schema references automatically converted to "hello"
   - Seamless user experience

## 🔧 Migration Support

The secret layer is designed to work with existing schemas:

- New schemas get mappings automatically
- Existing schemas work with system IDs until edited
- Gradual migration as users interact with schemas
- No breaking changes to existing content

This implementation provides the exact user experience you requested: **users
always see their friendly schema names while the system maintains integrity with
generated IDs behind the scenes.**
