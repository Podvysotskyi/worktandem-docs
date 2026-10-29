# Architecture overview

## Confirmed direction

Worktandem uses a root workspace with separate frontend, backend, and documentation
repositories linked through Git submodules.

- **Frontend:** Nuxt, with multiple applications and shared authentication as the
  intended architecture. Authentication is planned, not provided by this documentation.
- **Backend:** .NET multi-service architecture. Concrete service boundaries,
  contracts, persistence, and operational setup need implementation decisions.
- **Documentation:** VitePress in its own repository.
- **Persistence:** PostgreSQL with service-owned EF Core code-first contexts/migrations;
  the [readiness register](../implementation/readiness) selects compatible PG18/EF10/Npgsql10 versions.
- **Authorization:** scoped role-based access control (RBAC), not a generic
  attribute-based access control (ABAC) engine. Enforcement is still implementation work.

## Company module

The company model is intended to cover people, departments, cross-department teams,
and managers. Management relationships are distinct from authorization roles:
being a manager must not silently confer arbitrary permissions. Scope and role
semantics should be documented alongside the eventual API and server-side enforcement.

## Accounts, companies, and sign-in

The confirmed [account model](./accounts-and-authentication) supports multiple
company memberships per Worktandem account, at most one Google identity per account
(exactly one usable Google login for an active Google-only account; each identity
unique to one Worktandem account), and multiple
signed-in Worktandem accounts in one browser. Account and company switching are
distinct; roles remain company-scoped. No second-Google linking flow is included;
replacement/recovery and future-provider cardinality remain open.
Google-only sign-in is the present direction;
no local email/password flow is planned for this scope. New self-service registration
creates a Pending company for manual platform review. Initial platform-owner setup
is a separate secret-protected, one-time Google workflow with no company requirement.
A separate Nuxt platform-admin
application is planned. Existing users must see pending invitations in the app,
with acceptance requiring a Google identity matching the invited verified email.

Optional company-domain configuration belongs to separate Google API integration.
Manual outside-domain invitations remain allowed even with that integration enabled.
See the canonical [product specification](../product/identity-and-company-access)
and [database proposal review](../database/identity-alignment-review). None of these
flows is implemented. The [readiness register](../implementation/readiness) selects
session/tab and bootstrap designs and scopes remaining integration/owner-review gates.

## Frontend scaffold configuration

The frontend scaffold configures the company application at `/company/` and a
main-app development proxy for that prefix. Its production routing contract
requires a same-origin reverse proxy that preserves `/company/`; production
routing is not deployed by the scaffold. This configuration is not evidence of
a production deployment or implemented authentication.

## Proposed, not delivered

The following are candidates, not installed infrastructure or implemented features:

- A future `/crm` application path; it is not implemented by the scaffold.
- Shared-session/tab implementation remains undelivered; E04/E11 select its design.
- Google Workspace directory sync and domain auto-join remain separate proposals.
  Optional domain configuration is confirmed direction; its verification/policy
  implementation is open and must preserve manual outside-domain invitations.
- RabbitMQ for messaging, SignalR for real-time delivery, and Hangfire for background
  jobs remain candidates; PostgreSQL is selected. None is provisioned by documentation.

The frontend tooling direction includes shadcn-vue, Tailwind CSS, and TanStack
Table, Query, and Form, with Virtual optional when needed. Consult the frontend
repository for what is actually installed and usable.

## Implementation boundary

A scaffold is not a deployed product. No production authentication, authorization
enforcement, cross-service transactions, event contracts, or operational guarantees
are claimed here. Record decisions before treating a proposal as a dependency.

See the [decisions](./decisions) page for the compact status register.

## Database design

EF Core code-first and migrations are confirmed direction. The [database specification](../database/overview)
describes proposed service ownership, entity fields, relationships and integrity rules.
It separates confirmed product requirements from provider/schema decisions still open;
no entities or migrations are implemented by that specification.
