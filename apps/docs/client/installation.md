# Installation

Install the GitCMS Client SDK in your project.

## Package Manager

Install via npm, yarn, or pnpm:

::: code-group

```bash [npm]
npm install @git-cms/client
```

```bash [yarn]
yarn add @git-cms/client
```

```bash [pnpm]
pnpm add @git-cms/client
```

:::

## Prerequisites

- **Node.js**: 18 or higher
- **TypeScript**: 5.0+ (recommended but optional)

## Verify Installation

Create a test file to verify:

```typescript
import { GitCMS } from '@git-cms/client';

const cms = new GitCMS({
  repository: 'username/repo',
});

console.log('GitCMS SDK installed successfully!');
```

## Next Steps

::: info Continue Learning

- [Quick Start](/client/quick-start) - Your first queries
- [Configuration](/client/configuration) - Setup options

:::
