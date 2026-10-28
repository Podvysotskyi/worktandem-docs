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

## Frontend scaffold routing (pending review)

The frontend scaffold configures the company application at `/company/` and a
main-app development proxy for that prefix. Its production routing contract
requires a same-origin reverse proxy that preserves `/company/`; production
routing is not deployed by the scaffold. These changes remain pending review,
not capabilities already released on the default branch.

## Proposed, not delivered

The following are candidates, not installed infrastructure or implemented features:

- A future `/crm` application path; it is not implemented by the scaffold.
- An identity provider for shared authentication; provider and session design are undecided.
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
