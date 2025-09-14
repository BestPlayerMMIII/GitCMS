# Circular Dependency Protection Test Plan

This document outlines test scenarios to verify that our circular dependency
protection system works correctly for object fields with schema references.

## Test Scenarios

### Scenario 1: Simple Circular Reference (A → B → A)

**Setup:**

1. Create Schema A with an object field that references Schema B
2. Create Schema B with an object field that references Schema A

**Expected Results:**

- Design-time: Schema Reference Selector in Schema B should show Schema A as
  disabled with "Would create circular dependency"
- Runtime: If somehow a circular reference exists, ObjectField should detect the
  cycle and show error UI

### Scenario 2: Complex Circular Reference (A → B → C → A)

**Setup:**

1. Create Schema A with object field referencing Schema B
2. Create Schema B with object field referencing Schema C
3. Try to create Schema C with object field referencing Schema A

**Expected Results:**

- Design-time: Schema Reference Selector in Schema C should show Schema A as
  disabled
- getSafeSchemaReferences(C, [A,B,C]) should not include Schema A

### Scenario 3: Self-Reference Prevention

**Setup:**

1. Create Schema A
2. Try to add object field that references Schema A itself

**Expected Results:**

- Design-time: Schema Reference Selector should not show Schema A in available
  options
- Schema A should be filtered out by getAvailableSchemas()

### Scenario 4: Valid References (No Cycles)

**Setup:**

1. Create Schema A (no references)
2. Create Schema B that references Schema A
3. Create Schema C that references Schema B (but not A)

**Expected Results:**

- All references should be allowed
- Form rendering should work correctly
- No circular dependency warnings

## Test Implementation

### Unit Tests for Circular Dependency Detection

```typescript
import {
  buildDependencyGraph,
  wouldCreateCircularDependency,
  getSafeSchemaReferences,
} from '@gitcms/core';

describe('Circular Dependency Detection', () => {
  const schemas = [
    {
      id: 'user',
      metadata: { name: 'User' },
      fields: {
        profile: { type: 'object', schemaRef: 'profile' },
      },
    },
    {
      id: 'profile',
      metadata: { name: 'Profile' },
      fields: {
        owner: { type: 'object', schemaRef: 'user' },
      },
    },
    {
      id: 'post',
      metadata: { name: 'Post' },
      fields: {
        author: { type: 'object', schemaRef: 'user' },
      },
    },
  ];

  test('detects simple circular dependency', () => {
    const graph = buildDependencyGraph(schemas);
    expect(wouldCreateCircularDependency('user', 'profile', graph)).toBe(true);
    expect(wouldCreateCircularDependency('profile', 'user', graph)).toBe(true);
  });

  test('allows valid references', () => {
    const graph = buildDependencyGraph(schemas);
    expect(wouldCreateCircularDependency('post', 'user', graph)).toBe(false);
  });

  test('getSafeSchemaReferences filters correctly', () => {
    const safeForUser = getSafeSchemaReferences('user', schemas);
    expect(safeForUser.map(s => s.id)).toEqual(['post']); // profile would be circular

    const safeForPost = getSafeSchemaReferences('post', schemas);
    expect(safeForPost.map(s => s.id)).toEqual(['user', 'profile']);
  });
});
```

### Integration Tests for Schema Editor

```typescript
describe('Schema Editor Circular Dependency Prevention', () => {
  test('Schema Reference Selector shows correct options', () => {
    const availableSchemas = [/* schemas with circular refs */];

    render(
      <SchemaReferenceSelector
        currentSchemaId="user"
        availableSchemas={availableSchemas}
        selectedSchemaRef=""
        onSchemaRefChange={() => {}}
      />
    );

    // Should show safe schemas in enabled optgroup
    expect(screen.getByText('Available Schemas')).toBeInTheDocument();

    // Should show problematic schemas in disabled optgroup
    expect(screen.getByText('Cannot Reference (Circular Dependency)')).toBeInTheDocument();
  });

  test('Form validation catches circular references', () => {
    // Test that schema editor validation prevents saving schemas with circular refs
  });
});
```

### Runtime Tests for ObjectField

```typescript
describe('ObjectField Runtime Protection', () => {
  test('detects circular dependency during rendering', () => {
    const circularSchema = {/* schema with circular ref */};
    const value = {/* nested object that would cause infinite loop */};

    render(
      <ObjectField
        field={{ type: 'object', schemaRef: 'profile' }}
        value={value}
        onChange={() => {}}
        error=""
        availableSchemas={[circularSchema]}
      />
    );

    // Should show circular dependency error instead of infinite loop
    expect(screen.getByText(/circular dependency/i)).toBeInTheDocument();
    expect(screen.queryByText('Profile fields')).not.toBeInTheDocument();
  });
});
```

## Manual Testing Steps

### Test 1: Create Schemas with Circular References

1. Open GitCMS Admin Interface
2. Navigate to Schemas section
3. Create "User" schema:
   - Add object field "profile" with schema reference to "Profile"
4. Create "Profile" schema:
   - Try to add object field "user" with schema reference to "User"
   - **Expected:** Schema Reference Selector should show "User" as disabled with
     circular dependency warning

### Test 2: Content Creation with Circular Schemas

1. If circular schemas somehow exist, try to create content
2. Navigate to content creation form
3. Try to fill object fields that have circular references
4. **Expected:** Should see error message instead of infinite form nesting

### Test 3: Verify Error Messages Are User-Friendly

1. Check that circular dependency errors are clear and actionable
2. Verify that UI shows helpful context about why reference is not allowed
3. Confirm that users understand how to resolve the issue

## Performance Verification

### Test Dependency Graph Build Performance

```typescript
test('dependency graph builds efficiently', () => {
  const start = performance.now();
  const largeSchemaSet = generateSchemas(1000); // Generate 1000 test schemas
  const graph = buildDependencyGraph(largeSchemaSet);
  const end = performance.now();

  expect(end - start).toBeLessThan(100); // Should complete in < 100ms
  expect(graph.size).toBe(1000);
});
```

### Test Runtime Detection Performance

```typescript
test('circular dependency detection is fast', () => {
  const schemas = generateSchemasWithSomeCircularRefs(100);

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    getSafeSchemaReferences(schemas[i].id, schemas);
  }
  const end = performance.now();

  expect(end - start).toBeLessThan(50); // Should complete in < 50ms
});
```

## Success Criteria

✅ **Design-Time Prevention:** Schema editors prevent creating circular
references ✅ **Runtime Protection:** Object fields handle circular references
gracefully  
✅ **User Experience:** Clear error messages guide users to resolution ✅
**Performance:** Dependency checking completes quickly even with many schemas ✅
**Robustness:** System handles edge cases (self-refs, complex cycles, etc.)

## Edge Cases to Test

1. **Self-reference:** Schema references itself directly
2. **Deep cycles:** A → B → C → D → A (4+ schemas in cycle)
3. **Multiple cycles:** Schema participates in multiple circular chains
4. **Broken references:** Schema references non-existent schema
5. **Array items:** Array field items with circular object references
6. **Nested objects:** Object field with inline properties that reference
   schemas

## Recovery Scenarios

1. **Fixing existing circular references:** How users can break cycles
2. **Schema migration:** Moving from circular to non-circular design
3. **Import validation:** Preventing import of schemas with circular deps
4. **Backup/restore:** Ensuring circular deps don't break data recovery
