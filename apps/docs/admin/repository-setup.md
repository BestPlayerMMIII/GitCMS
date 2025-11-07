# Repository Setup

This page explains how to connect and prepare your repository for GitCMS.

## Connect a Repository

1. Sign in with GitHub.
2. Click "Connect Repository".
3. Choose a repository from the list or create a new one.
4. Select branch and click "Connect".

## What GitCMS Adds

When connecting to a repository, GitCMS may add:

- `.gitcms/config.json` — basic configuration
- `.gitcms/schemas/` — initial schema examples
- `content/` — content folder
- `media/` — media folder

## Best Practices

- Use a dedicated branch for content if you prefer workflows.
- Add `.gitattributes` for LFS if you plan to host large files.
- Keep media under `media/` and content under `content/`.
