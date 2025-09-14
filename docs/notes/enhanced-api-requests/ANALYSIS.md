# Enhanced API Requests Analysis

## Current Issues Identified

### 1. Unnecessary Schema Fetches

**Issue**: Multiple components fetch schemas independently, often for the same
repository.

**Affected Components**:

- `/app/schemas/page.tsx` - Fetches schemas on mount and after operations
- `/components/schemas/schema-editor.tsx` - Fetches schemas when repoInfo
  changes
- `/components/content/schema-form.tsx` - Fetches schemas when repoInfo changes
- `/components/schemas/schema-import-modal.tsx` - Fetches schemas per repository

**Problems**:

1. Same schema data fetched multiple times across components
2. No caching between navigations (e.g., schemas → content → schemas)
3. Refetches on every component mount even when data hasn't changed
4. Loading states but no smart invalidation

### 2. Unnecessary Content Fetches

**Issue**: Content is refetched unnecessarily in content pages.

**Affected Components**:

- `/app/content/page.tsx` - Refetches content on every mount
- Manual refresh button causes full reload

**Problems**:

1. No caching of content lists
2. Re-fetches even when content likely hasn't changed
3. No optimistic updates after mutations

### 3. Loading State Issues

**Issue**: Components show default/empty states instead of proper loading
indicators.

**Affected Areas**:

- Schema lists in selectors
- Content grids
- Repository selection flows

**Problems**:

1. Poor UX during data fetching
2. Flash of wrong content before real data loads
3. Inconsistent loading patterns across app

### 4. Repository Setup Checks

**Issue**: Repository setup status is checked repeatedly.

**Affected Components**:

- Various pages check GitCMS setup status independently
- No caching of setup verification results

## Request Patterns Identified

### API Endpoints Being Called

1. **Schema Endpoints**:
   - `GET /api/schemas?action=list` (registry schemas)
   - `GET /api/schemas/storage?action=list&owner=X&repo=Y` (repo schemas)
   - `GET /api/schemas/storage?action=get&owner=X&repo=Y&schemaId=Z`
   - `POST /api/schemas/storage?action=save&owner=X&repo=Y`
   - `DELETE /api/schemas/storage?owner=X&repo=Y&schemaId=Z`

2. **Content Endpoints**:
   - `GET /api/content?action=list&owner=X&repo=Y&schemaId=Z`
   - `POST /api/content?owner=X&repo=Y`
   - `DELETE /api/content?owner=X&repo=Y&contentId=Z&schemaId=W`

3. **Setup/Status Endpoints**:
   - `GET /api/schemas/storage?action=check-setup&owner=X&repo=Y`

### Unnecessary Request Scenarios

1. **Navigation Back-and-Forth**:
   - User: Dashboard → Schemas → Content → Schemas
   - Result: Schemas fetched 2 times unnecessarily

2. **Component Re-renders**:
   - Schema editor re-fetches available schemas when props change
   - Content form re-fetches schemas when repoInfo changes

3. **Button Clicks**:
   - Refresh buttons always do full reload
   - Create/Edit forms don't leverage existing cached data

4. **Multi-Component Pages**:
   - Same page has multiple components fetching same data
   - No coordination between sibling components

## Next Steps

The analysis shows clear patterns of:

1. **No caching layer** - Same data fetched multiple times
2. **No request deduplication** - Parallel requests for same data
3. **Poor loading UX** - Default values instead of loading states
4. **No smart invalidation** - Always fresh fetch instead of conditional

These will be addressed in the implementation phase.
