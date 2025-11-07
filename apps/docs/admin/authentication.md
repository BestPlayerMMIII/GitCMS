# Authentication

GitCMS uses GitHub OAuth to authenticate users and access repositories.

## OAuth Flow (Admin Panel)

The Admin Panel uses GitHub OAuth for seamless authentication:

1. User clicks "Sign in with GitHub"
2. Admin Panel redirects to GitHub OAuth
3. User authorizes the application
4. Admin Panel receives an auth code and exchanges it for a token
5. Token is stored server-side for API requests

## Personal Access Tokens (Client SDK)

For the GitCMS Client SDK, you'll need a GitHub Personal Access Token (PAT) to
access your private repositories.

::: tip Learn How to Get a Token 📚
**[Complete GitHub Token Guide](/admin/github-token)** — Step-by-step tutorial
on creating secure tokens with the right permissions.

:::

### Quick Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens →
   Fine-grained tokens
2. Create a new token with:
   - **Contents**: Read and write
   - **Metadata**: Read-only
3. Copy the token and store it securely
4. Add it to your environment variables

**Need detailed instructions?** See our
[complete token guide](/admin/github-token).

## Required Permissions

### For Admin Panel (OAuth)

- Repository access (read/write)
- Email and basic profile information
- Commit access

### For Client SDK (Personal Access Token)

- **Contents** (Read and write) — Required for content management
- **Metadata** (Read-only) — Automatically included for repository info

## Security

### OAuth Tokens

- Tokens are stored server-side only and never exposed to the browser
- Sessions are encrypted and short-lived
- Automatic token refresh handled by NextAuth.js

### Personal Access Tokens

- **Never commit tokens to Git repositories**
- Store tokens in environment variables (`.env.local`)
- Use different tokens for development, staging, and production
- Set expiration dates (recommended: 90 days)
- Revoke tokens immediately if compromised

::: warning Keep Tokens Secure

Personal access tokens have the same power as your password. Treat them with the
same level of security.

:::

## Token Storage Best Practices

### Development

```bash
# .env.local (never commit this file!)
GITHUB_TOKEN=github_pat_11AAAAAAA0AAAAAAAAAAAA_XXX
```

### Production

Store tokens in your hosting platform's environment variables:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment → Environment variables
- **GitHub Actions**: Repository Settings → Secrets and variables

## Authentication Modes

GitCMS supports two authentication modes:

### 1. Public Mode (No Token)

- For public repositories only
- 60 API requests per hour per IP
- Read-only access
- Best for: Static sites, blogs, documentation

### 2. Authenticated Mode (With Token)

- For public and private repositories
- 5,000 API requests per hour
- Read and write access
- Best for: Content management, private repos

## Troubleshooting

### "Bad credentials" Error

- Your token may have expired
- Verify the token is correct and hasn't been revoked
- Generate a new token if needed

### "Not Found" or "403 Forbidden"

- Check token permissions (ensure Contents: Read and write)
- Verify the token has access to the repository
- Confirm the repository name is correct

### Rate Limit Issues

- Add a token to increase from 60 to 5,000 requests/hour
- Check current rate limit: `await cms.getRateLimit()`

::: tip Need More Help?

- 📖 [GitHub Token Guide](/admin/github-token) — Complete token setup tutorial
- 🔧 [Troubleshooting](/admin/troubleshooting) — Common issues and solutions
- 🔒 [Security Best Practices](/client/security) — Keep your tokens safe

:::
