# Getting started

## Workspace

The root repository groups three independently versioned repositories:

| Repository | Responsibility |
| --- | --- |
| [worktandem](https://github.com/Podvysotskyi/worktandem) | Root workspace and submodule references |
| [worktandem-frontend](https://github.com/Podvysotskyi/worktandem-frontend) | Nuxt applications and shared frontend code |
| [worktandem-backend](https://github.com/Podvysotskyi/worktandem-backend) | .NET multi-service backend |
| [worktandem-docs](https://github.com/Podvysotskyi/worktandem-docs) | This VitePress site |

Clone the workspace and the exact child revisions recorded by its submodules:

```sh
git clone --recurse-submodules https://github.com/Podvysotskyi/worktandem.git
cd worktandem
```

For an existing checkout:

```sh
git submodule update --init --recursive
```

Submodules may be checked out at a detached HEAD. Create a branch inside the
relevant child repository before editing. Commit child changes there first;
update the root submodule pointer only when that child revision is ready to consume.

## Run this site

Inside the documentation repository, use Node.js 26 LTS (26.13.0, pinned in `.nvmrc`) and npm:

```sh
npm ci
npm run docs:dev
```

Build and inspect the generated site:

```sh
npm run docs:build
npm run docs:preview
```

Use the address printed by the command. Generated files live in
`docs/.vitepress/dist` and are not committed.

Frontend and backend prerequisites and commands belong in their own READMEs.
This site does not start application services or configure authentication.

## Next steps

Read the [architecture overview](./architecture/overview) and
[decision status](./architecture/decisions). Hosting is not configured by this scaffold.
