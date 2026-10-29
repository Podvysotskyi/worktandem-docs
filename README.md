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
npm audit
npm run docs:build
npm run docs:preview
```

The build checks Markdown internal links and produces `docs/.vitepress/dist`.
Preview serves that local build. There is no separate typecheck: the scaffold
contains Markdown and a JavaScript configuration, with no custom TypeScript
components.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the editing workflow.
Deployment is intentionally not configured; CI builds the site but does not publish it.

## Dependency compatibility

VitePress remains pinned to stable `1.6.4`. A version-scoped npm override selects
Vite `6.4.4` instead of its declared Vite 5 dependency to address the current
[Vite development-server advisories](https://github.com/advisories/GHSA-587h-7wmj-h5pm).
The lockfile also resolves esbuild `0.25.12`, which includes the
[development-server CORS fix](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).

This deliberately crosses VitePress's declared Vite version range. Its Vue plugin
supports Vite 6; production build/preview and development Markdown hot reload have
been checked with this combination. Reassess the override when upgrading
VitePress, and remove it when the selected upstream version provides a patched
dependency chain. After dependency updates, run `npm ci`, `npm audit`, and the
build above, then check the development server and preview, including local search.
