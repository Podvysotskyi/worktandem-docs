# Architecture overview

## Confirmed direction

Worktandem uses a root workspace with separate frontend, backend, and documentation
repositories linked through Git submodules.

- **Frontend:** Nuxt, with multiple applications and shared authentication as the
  intended architecture. Authentication is planned, not provided by this documentation.
- **Backend:** .NET multi-service architecture. Concrete service boundaries,
  contracts, persistence, and operational setup need implementation decisions.
- **Documentation:** VitePress in its own repository.
- **Authorization:** scoped role-based access control (RBAC), not a generic
  attribute-based access control (ABAC) engine. Enforcement is still implementation work.

## Company module

The company model is intended to cover people, departments, cross-department teams,
and managers. Management relationships are distinct from authorization roles:
being a manager must not silently confer arbitrary permissions. Scope and role
semantics should be documented alongside the eventual API and server-side enforcement.

## Accounts, companies, and sign-in

The confirmed [account model](./accounts-and-authentication) supports multiple
company memberships per Worktandem account, multiple Google identities linked to
one account (each Google identity unique to one Worktandem account), and multiple
signed-in Worktandem accounts in one browser. Account and company switching are
distinct; roles remain company-scoped. Google sign-in is confirmed direction, not
implemented authentication or enterprise SSO. Session design and the multi-tab
switching strategy remain open.

## Frontend scaffold configuration

The frontend scaffold configures the company application at `/company/` and a
main-app development proxy for that prefix. Its production routing contract
requires a same-origin reverse proxy that preserves `/company/`; production
routing is not deployed by the scaffold. This configuration is not evidence of
a production deployment or implemented authentication.

## Proposed, not delivered

The following are candidates, not installed infrastructure or implemented features:

- A future `/crm` application path; it is not implemented by the scaffold.
- Shared-session implementation and multi-tab context design remain undecided, although Google sign-in support is confirmed.
- Google Workspace directory sync, domain auto-join, and Require Google are research proposals, not adopted features.
- PostgreSQL for persistence, RabbitMQ for messaging, SignalR for real-time delivery,
  and Hangfire for background jobs.

The frontend tooling direction includes shadcn-vue, Tailwind CSS, and TanStack
Table, Query, and Form, with Virtual optional when needed. Consult the frontend
repository for what is actually installed and usable.

## Implementation boundary

A scaffold is not a deployed product. No production authentication, authorization
enforcement, cross-service transactions, event contracts, or operational guarantees
are claimed here. Record decisions before treating a proposal as a dependency.

See the [decisions](./decisions) page for the compact status register.
