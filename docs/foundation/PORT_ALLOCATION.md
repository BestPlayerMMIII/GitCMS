# GitCMS Development Server Ports

This document outlines the port allocation for all development servers in the
GitCMS monorepo to avoid conflicts.

## Port Assignments

| Port | Service                | Description            | URL                   |
| ---- | ---------------------- | ---------------------- | --------------------- |
| 3000 | @git-cms/web           | Marketing Website      | http://localhost:3000 |
| 3001 | @git-cms/admin         | Admin Interface        | http://localhost:3001 |
| 3002 | @git-cms/docs          | Documentation Site     | http://localhost:3002 |
| 3003 | nextjs-blog-example    | Blog Example App       | http://localhost:3003 |
| 3004 | nuxt-portfolio-example | Nuxt Portfolio Example | http://localhost:3004 |

## Other Services

| Service                  | Type             | Notes                        |
| ------------------------ | ---------------- | ---------------------------- |
| @git-cms/core            | TypeScript Build | No server, builds to `dist/` |
| @git-cms/client          | TypeScript Build | No server, builds to `dist/` |
| @git-cms/cli             | TypeScript Build | No server, builds CLI tools  |
| react-native-app-example | Placeholder      | Not implemented yet          |

## Starting All Services

```bash
npm run dev
```

This will start all development servers simultaneously. Each service will be
available on its designated port.

## Starting Individual Services

```bash
# Start only the web app
npm run dev --workspace=apps/web

# Start only the admin interface
npm run dev --workspace=packages/admin

# Start only the docs site
npm run dev --workspace=apps/docs

# Start only the blog example
npm run dev --workspace=examples/nextjs-blog

# Start only the Nuxt portfolio example
npm run dev --workspace=examples/nuxt-portfolio
```

## Notes

- All Next.js apps use the `--port` flag to specify their port explicitly
- The Nuxt app uses `--port` as well to avoid conflicts
- TypeScript packages (core, client, cli) don't need ports as they only build
  libraries
- If you need to change a port, update the corresponding `package.json` dev
  script
