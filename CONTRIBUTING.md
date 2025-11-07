# Contributing to GitCMS

Thank you for your interest in contributing to GitCMS! We welcome contributions
from everyone. This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Questions](#questions)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and
collaborative environment. Please be kind and courteous to other contributors.

## How Can I Contribute?

There are many ways to contribute to GitCMS:

### 🐛 Reporting Bugs

Found a bug? Please check if it's already reported in
[GitHub Issues](https://github.com/BestPlayerMMIII/GitCMS/issues). If not,
create a new issue with:

- Clear title and description
- Steps to reproduce the issue
- Expected vs. actual behavior
- GitCMS version and environment details
- Screenshots or code snippets if applicable

### 💡 Suggesting Features

Have an idea? We'd love to hear it! Open a
[GitHub Discussion](https://github.com/BestPlayerMMIII/GitCMS/discussions) or
create a feature request issue with:

- Clear description of the feature
- Use cases and benefits
- Potential implementation approach (optional)

### 📝 Improving Documentation

Documentation improvements are always welcome! This includes:

- Fixing typos or clarifying existing docs
- Adding examples and tutorials
- Improving API documentation
- Translating documentation

### 🔧 Contributing Code

Ready to code? Great! Here's how:

1. Check [existing issues](https://github.com/BestPlayerMMIII/GitCMS/issues) for
   tasks to work on
2. Look for issues labeled `good first issue` if you're new to the project
3. Comment on the issue to let others know you're working on it
4. Follow the [Development Workflow](#development-workflow) below

## Development Setup

### Prerequisites

- **Node.js**: >= 18.x
- **npm**: >= 10.x
- **Git**: Latest version

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/BestPlayerMMIII/GitCMS.git
cd GitCMS

# Install dependencies
npm install

# Build all packages
npm run build
```

### Environment Configuration

For the admin panel, you'll need to create environment variables:

**`packages/admin/.env.local`:**

```env
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

To get GitHub OAuth credentials:

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Use `http://localhost:3000` as the Homepage URL
4. Use `http://localhost:3000/api/auth/callback/github` as the Authorization
   callback URL

## Project Structure

GitCMS is a monorepo managed with [Turborepo](https://turbo.build/):

```
GitCMS/
├── apps/
│   └── docs/              # Documentation website (VitePress)
├── packages/
│   ├── admin/             # Admin Panel (Next.js)
│   │   ├── src/
│   │   │   ├── app/       # Next.js App Router
│   │   │   ├── components/# React components
│   │   │   ├── lib/       # Utility functions
│   │   │   └── types/     # TypeScript types
│   │   └── public/        # Static assets
│   ├── client/            # Client SDK
│   │   └── src/
│   │       ├── index.ts   # Main SDK export
│   │       ├── query.ts   # Query builder
│   │       └── types.ts   # Type definitions
│   └── core/              # Core utilities
│       └── src/
│           ├── github/    # GitHub API wrappers
│           └── utils/     # Shared utilities
├── docs/                  # User documentation
├── eslint.config.js       # ESLint configuration
├── turbo.json            # Turborepo configuration
└── package.json          # Root package.json
```

### Key Technologies

- **Monorepo**: [Turborepo](https://turbo.build/)
- **Admin Panel**: [Next.js 14+](https://nextjs.org/) with App Router
- **UI Components**: [TailwindCSS](https://tailwindcss.com/)
- **Rich Text Editor**: [TipTap](https://tiptap.dev/)
- **GitHub API**: [Octokit](https://github.com/octokit/octokit.js)
- **Validation**: [Zod](https://zod.dev/)
- **TypeScript**: v5.3+

## Development Workflow

### Running Development Servers

```bash
# Run all development servers concurrently
npm run dev

# Run specific package
cd packages/admin
npm run dev

# Run docs site
cd apps/docs
npm run dev
```

### Making Changes

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following our
   [code style guidelines](#code-style-guidelines)

3. **Test your changes**:

   ```bash
   # Build all packages
   npm run build

   # Run linting
   npm run lint

   # Run type checking
   npm run type-check
   ```

4. **Commit your changes** following our
   [commit guidelines](#commit-message-guidelines)

5. **Push your branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub

## Code Style Guidelines

### TypeScript

- **Use TypeScript** for all new code
- **Avoid `any`** types - use proper typing or `unknown`
- **Export types** that may be useful to consumers
- **Use interfaces** for object shapes, **types** for unions/intersections

### Code Formatting

We use [Prettier](https://prettier.io/) for code formatting:

```bash
# Format all files
npm run format
```

### Linting

We use [ESLint](https://eslint.org/) with TypeScript support:

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### Best Practices

- **Keep functions small** and focused on a single responsibility
- **Use meaningful variable names** that describe the purpose
- **Add comments** for complex logic, but prefer self-documenting code
- **Handle errors gracefully** with proper error messages
- **Avoid console logs** in production code (use proper logging)
- **Write tests** for new features when applicable

### File Naming

- **Components**: `PascalCase.tsx` (e.g., `ContentEditor.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Types**: `PascalCase.ts` or `types.ts`
- **Constants**: `UPPER_SNAKE_CASE` or `camelCase` depending on usage

## Commit Message Guidelines

We follow a simplified
[Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic changes)
- **refactor**: Code refactoring (no feature changes)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, configs)

### Examples

```bash
feat: add media preview in content editor

fix: resolve authentication redirect issue

docs: update client SDK installation guide

refactor: simplify query builder logic

chore: update dependencies to latest versions
```

## Pull Request Process

### Before Submitting

- [ ] Code builds successfully (`npm run build`)
- [ ] All linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Code is formatted (`npm run format`)
- [ ] Changes are tested manually
- [ ] Documentation is updated if needed
- [ ] Commit messages follow guidelines

### Submitting a Pull Request

1. **Fill out the PR template** with all relevant information
2. **Link related issues** using keywords (Fixes #123, Closes #456)
3. **Describe your changes** clearly and concisely
4. **Add screenshots** for UI changes
5. **Request review** from maintainers

### Review Process

- Maintainers will review your PR and may request changes
- Address feedback by pushing new commits to your branch
- Once approved, your PR will be merged into `main`
- Your contribution will be included in the next release!

### PR Title Format

Use the same format as commit messages:

```
feat: add search functionality to content list
fix: resolve media upload error on Safari
docs: improve SDK quickstart guide
```

## Reporting Bugs

When reporting bugs, please use this template:

```markdown
**Describe the bug** A clear description of what the bug is.

**To Reproduce** Steps to reproduce the behavior:

1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior** What you expected to happen.

**Screenshots** If applicable, add screenshots.

**Environment:**

- GitCMS version: [e.g., 0.1.0]
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Node version: [e.g., 18.17.0]

**Additional context** Any other information about the problem.
```

## Suggesting Features

When suggesting features, please include:

- **Problem statement**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches you've thought about
- **Use cases**: Real-world scenarios where this would be useful
- **Implementation ideas**: Technical approach (optional)

## Questions?

Need help or have questions? Here's how to reach us:

- **GitHub Discussions**:
  [Start a discussion](https://github.com/BestPlayerMMIII/GitCMS/discussions)
- **GitHub Issues**:
  [Browse existing issues](https://github.com/BestPlayerMMIII/GitCMS/issues)
- **Documentation**: [Read the docs](https://gitcms-docs.bestplayer.dev)

## Recognition

All contributors will be recognized in our documentation and release notes.
Thank you for helping make GitCMS better! 🚀

## License

By contributing to GitCMS, you agree that your contributions will be licensed
under the [MIT License](./LICENSE).

---

**Thank you for contributing to GitCMS!** ❤️
