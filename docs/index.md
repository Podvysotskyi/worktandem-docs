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
preserves the earlier proposal's findings and links to their current documentation
dispositions. The [database catalog](./database/overview) remains a proposed logical
model for review, with no implemented entities or migrations.

The [platform Users and suspension rules](./product/identity-and-company-access#global-user-suspension-and-company-status)
define global banning through Account.Status, required reasons/audit and independent
company membership states. [ADR-004](./architecture/decisions#adr-004-platform-users-and-independent-suspension-statuses)
records the decision and remaining policy choices.

Start implementation planning from [First-slice readiness](./implementation/readiness):
selected PostgreSQL/OIDC/session decisions, protected one-time owner bootstrap,
resumable company onboarding, test gates and a small implementation PR sequence.
Ready means ready to implement locally, not a deployed or production-ready product.
