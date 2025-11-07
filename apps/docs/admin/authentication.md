# Authentication

GitCMS uses GitHub OAuth to authenticate users and access repositories.

## Flow

1. User clicks "Sign in with GitHub".
2. Admin Panel redirects to GitHub OAuth.
3. User authorizes the app.
4. Admin Panel receives an auth code and exchanges it for a token.
5. Token is stored server-side for API requests.

## Permissions

- Repository access (read/write)
- Email and basic profile

## Security

- Tokens are stored server-side only and never exposed to the browser.
- Sessions are encrypted and short-lived.
