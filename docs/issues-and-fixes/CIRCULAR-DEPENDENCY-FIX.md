# Circular Dependency Fix Verification

## Problem Fixed

### Original Issue
The original issue was that the `useRef` renderingStack was shared across all
ObjectField component instances, causing the first schema reference to be
considered circular with itself.

### Flickering/Re-render Issue  
After the initial fix, there was a "Maximum update depth exceeded" error and flickering because:
1. Context callbacks were recreated on every render due to dependency arrays
2. Functions in `useEffect` dependencies caused infinite re-render loops
3. Stack state changes triggered unnecessary re-renders

## Solution Implemented

### 1. Stable Context API
- **Context Interface**: Simple, stable functions that don't change between renders
- **Ref-based Stack**: Uses `useRef` to avoid triggering re-renders when stack changes
- **Stable Callbacks**: `getCurrentStack`, `pushSchema`, `popSchema` are created once with `useCallback`

### 2. Dependency Array Optimization
- **Removed Function Dependencies**: Excluded stable callbacks from `useEffect` deps to prevent infinite loops
- **ESLint Disable**: Added comment to disable exhaustive-deps warning since callbacks are intentionally stable
- **Minimal Dependencies**: Only include values that actually change and should trigger re-evaluation

### 3. Stack Management Strategy
```typescript
// Context provides stable functions (no re-renders)
const { getCurrentStack, pushSchema, popSchema } = useSchemaRenderingContext();

// useMemo only depends on actual changing values
const { properties, circularDependencyError } = useMemo(() => {
  // getCurrentStack() called during memoization (not in deps)
  const currentStack = getCurrentStack();
  // ... logic
}, [objectField.schemaRef, objectField.properties, availableSchemas]);

// useEffect with minimal deps (no function refs)
useEffect(() => {
  // pushSchema/popSchema called but not in deps
}, [objectField.schemaRef, circularDependencyError]);
```

## How It Works

### Before (Broken)

```
ObjectField 1 (User schema) → useRef([])
ObjectField 1 pushes "user" → useRef(["user"])
ObjectField 2 (Profile schema) → SAME useRef(["user"])
ObjectField 2 sees "user" in stack → FALSE POSITIVE circular dependency
```

### After (Fixed)

```
SchemaRenderingProvider
├── ObjectField 1 (User schema) → context.pushSchema("user") → stack: ["user"]
│   └── ObjectField 2 (Profile schema) → context.pushSchema("profile") → stack: ["user", "profile"]
│       └── Only blocked if trying to push "user" again (real circular dependency)
```

## Test Cases

### Test 1: Simple Non-Circular Reference

**Schema A**: Has object field referencing Schema B **Schema B**: Has string
field (no further references) **Expected**: Should render both schemas
successfully

### Test 2: Real Circular Reference

**Schema A**: Has object field referencing Schema B  
**Schema B**: Has object field referencing Schema A **Expected**: Should detect
cycle and show error UI

### Test 3: Self-Reference

**Schema A**: Has object field referencing Schema A itself **Expected**: Should
detect immediate cycle and show error UI

### Test 4: Deep Chain Without Cycle

**Schema A** → **Schema B** → **Schema C** (no back-references) **Expected**:
Should render all schemas successfully, stack: ["a", "b", "c"]

### Test 5: Array Items with Objects

**Schema A**: Has array field with object items referencing Schema B
**Expected**: Should work through FieldRenderer delegation

## Implementation Details

### Context Value

```typescript
interface SchemaRenderingContextValue {
  renderingStack: string[]; // Current rendering path
  pushSchema: (schemaId: string) => boolean; // Returns false if circular
  popSchema: (schemaId: string) => void; // Clean up when done
}
```

### Stack Management

- **pushSchema**: Only adds if not already in stack (prevents circularity)
- **popSchema**: Removes specific schema from stack (cleanup)
- **renderingStack**: Array showing current rendering path for debugging

### Graceful Degradation

If no SchemaRenderingProvider is found:

- Returns safe defaults that allow all rendering
- Prevents crashes in environments without provider
- Maintains backward compatibility

## Performance Impact

- **Minimal**: Context operations are O(1) for stack operations
- **Efficient**: No expensive graph algorithms during rendering
- **Optimized**: Uses React's built-in context optimization

## Integration Points

1. **SchemaForm**: Wraps entire form with SchemaRenderingProvider
2. **ObjectField**: Uses context instead of useRef for stack tracking
3. **ArrayField**: Automatically protected through FieldRenderer delegation
4. **FieldRenderer**: Passes context through to all field types

This fix ensures that legitimate schema references work correctly while still
preventing dangerous circular dependencies that could crash the application.
