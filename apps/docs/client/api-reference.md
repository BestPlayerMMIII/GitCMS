# API Reference

Complete API documentation for the GitCMS Client SDK.

## GitCMS Class

```typescript
class GitCMS {
  constructor(config: GitCMSConfig);
  from(schema: string): Query;
  doc(id: string): Promise<Document>;
  getTransportMode(): 'public' | 'authenticated';
  isPublicMode(): boolean;
  getRateLimit(): Promise<RateLimit | null>;
  media: MediaAPI;
  contentMedia: ContentMediaAPI;
}
```

## GitCMSConfig

```typescript
interface GitCMSConfig {
  repository: string;
  branch?: string;
  token?: string;
  apiEndpoint?: string;
  transport?: 'public' | 'authenticated';
}
```

## Query Class

```typescript
class Query {
  where(field: string, operator: Operator, value: any): Query;
  orderBy(field: string, direction: 'asc' | 'desc'): Query;
  limit(count: number): Query;
  doc(id: string): Query;
  get(): Promise<Document[]>;
}
```

## Operators

```typescript
type Operator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
```

## Document Interface

```typescript
interface Document {
  id: string;
  schemaId: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}
```

## MediaAPI

```typescript
interface MediaAPI {
  extractFromHTML(html: string): MediaReference[];
  getThumbnail(ref: MediaReference): string;
  fetchFull(ref: MediaReference): Promise<MediaData>;
  renderFast(html: string): string;
  renderFull(html: string, options?: RenderOptions): Promise<string>;
}
```

## ContentMediaAPI

```typescript
interface ContentMediaAPI {
  extractAll(content: Document): MediaReference[];
  getThumbnails(content: Document): Map<string, string>;
  preloadAll(content: Document): Promise<Map<string, MediaData>>;
  renderFast(content: Document): Document;
  renderFull(content: Document, options?: RenderOptions): Promise<Document>;
}
```
