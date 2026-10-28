# Worktandem documentation

VitePress source for Worktandem's setup, architecture, and decisions.

## Local development

Use Node.js 24 (see `.nvmrc`) and npm.

```sh
npm ci
npm run docs:dev
```

## Verification

```sh
npm run docs:build
npm run docs:preview
```

The build checks Markdown internal links and produces `docs/.vitepress/dist`.
Preview serves that local build. There is no separate typecheck: the scaffold
contains Markdown and a JavaScript configuration, with no custom TypeScript
components.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the editing workflow.
Deployment is intentionally not configured; CI builds the site but does not publish it.
