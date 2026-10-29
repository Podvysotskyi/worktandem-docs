---
layout: home
hero:
  name: Worktandem
  text: Project documentation
  tagline: A small starting point for setup, architecture, and explicit decisions.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Architecture
      link: /architecture/overview
features:
  - title: Separate repositories
    details: Frontend, backend, and documentation are linked from the root workspace as Git submodules.
  - title: Nuxt frontend
    details: Multiple applications with shared authentication are the intended direction, not a completed authentication system.
  - title: .NET services
    details: A multi-service backend is confirmed; infrastructure and detailed service boundaries remain to be chosen.
---

## Status

This repository supplies the documentation scaffold. Architecture pages distinguish
confirmed direction from proposals and implementation work still to come.

See [Accounts and authentication](./architecture/accounts-and-authentication) for
the confirmed identity model and [authentication design flows](./design/authentication)
for current design coverage and pending updates.

The canonical [identity, onboarding and invitations specification](./product/identity-and-company-access)
records the latest Google-only, manual company approval and invitation rules, with
open choices marked. The [database alignment review](./database/identity-alignment-review)
explains what the earlier unmerged database proposal needs to change.
