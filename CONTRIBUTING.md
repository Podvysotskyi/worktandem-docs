# Contributing

1. Use Node.js 26 LTS (see `.nvmrc`) and run `npm ci`.
2. Edit Markdown under `docs/`; update navigation in
   `docs/.vitepress/config.mjs` when adding a page.
3. Run `npm run docs:dev` to check your edits locally.
4. Run `npm run docs:build` and `npm run docs:preview` before opening a PR.
   Check navigation, page headings, search, and narrow-screen layout in preview.
5. Commit source and `package-lock.json`, never generated output or `node_modules`.

Keep internal links valid; do not disable VitePress's dead-link checking.
The build does not validate external websites. Check changed external links manually.
There is no separate typecheck or test suite in this Markdown-only scaffold.

Clearly label **confirmed**, **proposed**, and **implemented** behavior. A chosen
architecture is not proof that a feature has shipped. Do not publish credentials,
private notes, personal information, or environment-specific secrets.

CI runs the production build with read-only repository permissions. Hosting,
deployment credentials, and a deployment-specific base path must be decided
separately before publication.
