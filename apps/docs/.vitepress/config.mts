import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    title: 'GitCMS',
    description: 'Universal GitHub-Based Content Management System',

    // GitHub Pages deployment configuration
    base: '/GitCMS/',

    // Theme configuration
    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      logo: '/logo.svg',

      nav: [
        { text: 'Home', link: '/' },
        { text: 'Guide', link: '/guide/introduction' },
        { text: 'Admin Panel', link: '/admin/overview' },
        { text: 'Client SDK', link: '/client/overview' },
        {
          text: 'v0.1.0',
          items: [
            { text: 'Changelog', link: '/changelog' },
            { text: 'Contributing', link: '/contributing' },
          ],
        },
      ],

      sidebar: {
        '/guide/': [
          {
            text: 'Introduction',
            items: [
              { text: 'What is GitCMS?', link: '/guide/introduction' },
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'How It Works', link: '/guide/how-it-works' },
              { text: 'Use Cases', link: '/guide/use-cases' },
            ],
          },
        ],
        '/admin/': [
          {
            text: 'Admin Panel',
            items: [
              { text: 'Overview', link: '/admin/overview' },
              { text: 'Getting Started', link: '/admin/getting-started' },
              { text: 'Authentication', link: '/admin/authentication' },
              { text: 'Repository Setup', link: '/admin/repository-setup' },
            ],
          },
          {
            text: 'Content Management',
            items: [
              { text: 'Schemas', link: '/admin/schemas' },
              { text: 'Creating Content', link: '/admin/creating-content' },
              { text: 'Rich Text Editor', link: '/admin/rich-text-editor' },
              { text: 'Media Management', link: '/admin/media-management' },
            ],
          },
          {
            text: 'Advanced',
            items: [
              { text: 'Workflows', link: '/admin/workflows' },
              { text: 'Best Practices', link: '/admin/best-practices' },
              { text: 'Troubleshooting', link: '/admin/troubleshooting' },
            ],
          },
        ],
        '/client/': [
          {
            text: 'Client SDK',
            items: [
              { text: 'Overview', link: '/client/overview' },
              { text: 'Installation', link: '/client/installation' },
              { text: 'Quick Start', link: '/client/quick-start' },
              { text: 'Configuration', link: '/client/configuration' },
            ],
          },
          {
            text: 'Querying Content',
            items: [
              { text: 'Basic Queries', link: '/client/basic-queries' },
              { text: 'Filtering', link: '/client/filtering' },
              { text: 'Sorting & Limiting', link: '/client/sorting-limiting' },
              { text: 'Nested Fields', link: '/client/nested-fields' },
            ],
          },
          {
            text: 'Media',
            items: [
              { text: 'Media Management', link: '/client/media' },
              { text: 'Progressive Loading', link: '/client/progressive-loading' },
              { text: 'Video & Documents', link: '/client/video-documents' },
            ],
          },
          {
            text: 'Integration',
            items: [
              { text: 'Next.js', link: '/client/nextjs' },
              { text: 'React', link: '/client/react' },
              { text: 'Vue.js', link: '/client/vue' },
              { text: 'Other Frameworks', link: '/client/other-frameworks' },
            ],
          },
          {
            text: 'Advanced',
            items: [
              { text: 'TypeScript', link: '/client/typescript' },
              { text: 'Security', link: '/client/security' },
              { text: 'API Reference', link: '/client/api-reference' },
              { text: 'Examples', link: '/client/examples' },
            ],
          },
        ],
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/BestPlayerMMIII/GitCMS' },
        { icon: 'npm', link: 'https://www.npmjs.com/package/@git-cms/client' },
      ],

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2025 Manuel Maiuolo',
      },

      search: {
        provider: 'local',
      },

      editLink: {
        pattern: 'https://github.com/BestPlayerMMIII/GitCMS/edit/main/apps/docs/:path',
        text: 'Edit this page on GitHub',
      },
    },

    head: [
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/GitCMS/logo.svg' }],
      ['meta', { name: 'theme-color', content: '#54af99' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:locale', content: 'en' }],
      ['meta', { property: 'og:title', content: 'GitCMS | Universal GitHub-Based CMS' }],
      ['meta', { property: 'og:site_name', content: 'GitCMS' }],
      ['meta', { property: 'og:url', content: 'https://bestplayermmiii.github.io/GitCMS/' }],
    ],

    ignoreDeadLinks: [
      // Ignore localhost links
      /^https?:\/\/localhost/,
    ],

    // Mermaid configuration
    mermaid: {
      // Optional: Mermaid config
    },
    mermaidPlugin: {
      class: 'mermaid',
    },
  })
);
