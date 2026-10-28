import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Worktandem',
  description: 'Project setup, architecture, and decisions for Worktandem.',
  lang: 'en-US',
  themeConfig: {
    nav: [
      { text: 'Getting started', link: '/getting-started' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Database', link: '/database/overview' }
    ],
    sidebar: [
      { text: 'Guide', items: [
        { text: 'Getting started', link: '/getting-started' }
      ] },
      { text: 'Architecture', items: [
        { text: 'Overview', link: '/architecture/overview' },
        { text: 'Decisions', link: '/architecture/decisions' },
        { text: 'Accounts and authentication', link: '/architecture/accounts-and-authentication' },
        { text: 'Authentication design flows', link: '/design/authentication' },
        { text: 'Conventions', link: '/architecture/conventions' }
      ] },
      { text: 'Database design', items: [
        { text: 'Overview and decisions', link: '/database/overview' },
        { text: 'Identity entities', link: '/database/identity' },
        { text: 'Organization entities', link: '/database/organization' },
        { text: 'Authorization entities', link: '/database/authorization' },
        { text: 'Integrity and lifecycle', link: '/database/integrity' },
        { text: 'EF Core and migrations', link: '/database/ef-core' }
      ] }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Podvysotskyi/worktandem' }
    ],
    search: { provider: 'local' }
  }
})
