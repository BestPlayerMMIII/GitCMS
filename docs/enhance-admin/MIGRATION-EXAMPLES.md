# Quick Migration Examples

This file shows practical before/after examples for migrating existing code.

## Example 1: Simple GET Request

### Before:

```typescript
// components/repositories/repo-list.tsx
const [repos, setRepos] = useState([]);

useEffect(() => {
  async function loadRepos() {
    const response = await fetch('/api/github/repositories');
    if (response.ok) {
      const data = await response.json();
      setRepos(data);
    }
  }
  loadRepos();
}, []);
```

### After (Option 1 - fetchData):

```typescript
import { fetchData } from '@/lib/api-router';

const [repos, setRepos] = useState([]);

useEffect(() => {
  async function loadRepos() {
    try {
      const data = await fetchData('/api/github/repositories');
      setRepos(data);
    } catch (error) {
      console.error('Failed to load repos:', error);
    }
  }
  loadRepos();
}, []);
```

### After (Option 2 - data layer):

```typescript
import { getRepositories } from '@/lib/data-layer';

const [repos, setRepos] = useState([]);

useEffect(() => {
  async function loadRepos() {
    try {
      const data = await getRepositories();
      setRepos(data);
    } catch (error) {
      console.error('Failed to load repos:', error);
    }
  }
  loadRepos();
}, []);
```

---

## Example 2: POST with Body

### Before:

```typescript
// Save schema
async function handleSave(schema) {
  const params = new URLSearchParams({
    action: 'save',
    owner,
    repo,
  });

  const response = await fetch(`/api/schemas/storage?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schema),
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Saved:', data);
  }
}
```

### After (fetchData):

```typescript
import { fetchData } from '@/lib/api-router';

async function handleSave(schema) {
  try {
    const data = await fetchData('/api/schemas/storage', {
      method: 'POST',
      params: { action: 'save', owner, repo },
      body: schema,
    });
    console.log('Saved:', data);
  } catch (error) {
    console.error('Save failed:', error);
  }
}
```

### After (data layer):

```typescript
import { saveSchema } from '@/lib/data-layer';

async function handleSave(schema) {
  try {
    await saveSchema(owner, repo, schema);
    console.log('Saved successfully');
  } catch (error) {
    console.error('Save failed:', error);
  }
}
```

---

## Example 3: Media Upload

### Before:

```typescript
async function uploadImage(file: File) {
  const base64 = await fileToBase64(file);

  const response = await fetch('/api/media?action=upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      base64Content: base64,
      owner,
      repo,
      folder: 'images',
    }),
  });

  if (response.ok) {
    const { file: mediaFile } = await response.json();
    return mediaFile;
  }
}
```

### After (fetchData):

```typescript
import { fetchData } from '@/lib/api-router';

async function uploadImage(file: File) {
  const base64 = await fileToBase64(file);

  const result = await fetchData('/api/media', {
    method: 'POST',
    params: { action: 'upload', owner, repo },
    body: {
      fileName: file.name,
      base64Content: base64,
      folder: 'images',
    },
  });

  return result.file;
}
```

### After (data layer):

```typescript
import { uploadMedia } from '@/lib/data-layer';

async function uploadImage(file: File) {
  const base64 = await fileToBase64(file);
  const mediaFile = await uploadMedia(
    owner,
    repo,
    file.name,
    base64,
    'images' // folder
  );
  return mediaFile;
}
```

---

## Example 4: Custom Hook

### Before:

```typescript
// hooks/use-schemas.ts
export function useSchemas(owner: string, repo: string) {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ action: 'list', owner, repo });
        const response = await fetch(`/api/schemas/storage?${params}`);
        const data = await response.json();
        setSchemas(data.schemas);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    if (owner && repo) {
      load();
    }
  }, [owner, repo]);

  return { schemas, loading, error };
}
```

### After (data layer):

```typescript
import { getSchemas } from '@/lib/data-layer';

export function useSchemas(owner: string, repo: string) {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await getSchemas(owner, repo);
        setSchemas(result.schemas);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    if (owner && repo) {
      load();
    }
  }, [owner, repo]);

  return { schemas, loading, error };
}
```

---

## Example 5: React Query/SWR

### Before (with React Query):

```typescript
import { useQuery } from '@tanstack/react-query';

export function useContent(owner: string, repo: string, schemaId: string) {
  return useQuery({
    queryKey: ['content', owner, repo, schemaId],
    queryFn: async () => {
      const params = new URLSearchParams({
        action: 'list',
        owner,
        repo,
        schemaId,
      });
      const response = await fetch(`/api/content?${params}`);
      const data = await response.json();
      return data.items;
    },
    enabled: !!(owner && repo && schemaId),
  });
}
```

### After (data layer + React Query):

```typescript
import { useQuery } from '@tanstack/react-query';
import { getContentList } from '@/lib/data-layer';

export function useContent(owner: string, repo: string, schemaId: string) {
  return useQuery({
    queryKey: ['content', owner, repo, schemaId],
    queryFn: async () => {
      const result = await getContentList(owner, repo, schemaId);
      return result.items;
    },
    enabled: !!(owner && repo && schemaId),
  });
}
```

---

## Example 6: Error Handling

### Before:

```typescript
try {
  const response = await fetch('/api/content', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/auth/signin';
    } else if (response.status === 409) {
      const error = await response.json();
      alert(error.error);
    } else {
      throw new Error('Request failed');
    }
  }

  const result = await response.json();
  return result;
} catch (error) {
  console.error('Failed:', error);
}
```

### After (data layer with better error handling):

```typescript
import { createContent } from '@/lib/data-layer';

try {
  const content = await createContent(
    owner,
    repo,
    schemaId,
    data,
    metadata,
    publish
  );
  return content;
} catch (error) {
  if (error.message.includes('Not authenticated')) {
    // Token expired or invalid
    window.location.href = '/auth/signin';
  } else if (error.message.includes('already exists')) {
    // Conflict - show user-friendly message
    alert('A content item with this ID already exists');
  } else if (error.message.includes('Validation failed')) {
    // Schema validation error
    const errors = JSON.parse(error.message.replace('Validation failed: ', ''));
    showValidationErrors(errors);
  } else {
    // General error
    console.error('Failed to create content:', error);
    alert('An error occurred. Please try again.');
  }
}
```

---

## Example 7: Batch Operations

### Before (sequential):

```typescript
async function createMultipleSchemas(schemas) {
  for (const schema of schemas) {
    const params = new URLSearchParams({
      action: 'save',
      owner,
      repo,
    });

    await fetch(`/api/schemas/storage?${params}`, {
      method: 'POST',
      body: JSON.stringify(schema),
    });
  }
}
```

### After (parallel + atomic):

```typescript
import { createGitHubClient } from '@/lib/client-github';

async function createMultipleSchemas(schemas) {
  const github = createGitHubClient(owner, repo);

  // Create all schemas in a single atomic commit
  const files = schemas.map(schema => ({
    path: `.gitcms/schemas/${schema.id}.json`,
    content: JSON.stringify(schema, null, 2),
  }));

  await github.createMultipleFiles(files, 'Initialize schemas');
}
```

---

## Example 8: Using the Repository Context

### Before:

```typescript
import { useRepository } from '@/contexts/repository-context';

function MyComponent() {
  const { repositoryInfo } = useRepository();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (repositoryInfo) {
      fetch(`/api/content?owner=${repositoryInfo.owner}&repo=${repositoryInfo.repo}`)
        .then(res => res.json())
        .then(setData);
    }
  }, [repositoryInfo]);

  return <div>{/* ... */}</div>;
}
```

### After:

```typescript
import { useRepository } from '@/contexts/repository-context';
import { getContentList } from '@/lib/data-layer';

function MyComponent() {
  const { repositoryInfo } = useRepository();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (repositoryInfo) {
      getContentList(repositoryInfo.owner, repositoryInfo.repo)
        .then(result => setData(result.items))
        .catch(console.error);
    }
  }, [repositoryInfo]);

  return <div>{/* ... */}</div>;
}
```

---

## Tips for Migration

1. **Start with read operations**: GET requests are easier to migrate
2. **Test authentication first**: Ensure token endpoint works
3. **Use TypeScript**: Types will catch migration errors
4. **Enable strict mode**: Catch issues during development
5. **Monitor network tab**: Verify requests go directly to GitHub
6. **Keep fallbacks**: Handle errors gracefully
7. **Update tests**: Ensure tests work with new architecture
8. **Document changes**: Help future maintainers understand the migration

## Common Pitfalls

❌ **Storing tokens in state**

```typescript
// DON'T DO THIS:
const [token, setToken] = useState(null);
useEffect(() => {
  fetch('/api/auth/token')
    .then(res => res.json())
    .then(data => setToken(data.accessToken));
}, []);
```

✅ **Use the client-github.ts which handles tokens securely**

```typescript
// DO THIS:
import { createGitHubClient } from '@/lib/client-github';
const github = createGitHubClient(owner, repo);
// Token is fetched automatically and cached securely
```

---

❌ **Not handling auth errors**

```typescript
// DON'T DO THIS:
const data = await getSchemas(owner, repo);
```

✅ **Always wrap in try/catch**

```typescript
// DO THIS:
try {
  const data = await getSchemas(owner, repo);
} catch (error) {
  if (error.message.includes('Not authenticated')) {
    // Redirect to login or refresh session
  } else {
    // Handle other errors
  }
}
```

---

For more examples and details, see the
[full architecture documentation](./CLIENT-SIDE-ARCHITECTURE.md).
