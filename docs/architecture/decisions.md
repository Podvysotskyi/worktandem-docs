# Decisions

This register separates architectural direction from delivered behavior.

| Topic | Status | Decision or open question |
| --- | --- | --- |
| Repository layout | Confirmed | Root workspace with frontend, backend, and docs as submodules |
| Documentation | Confirmed | VitePress |
| Frontend architecture | Confirmed direction | Multiple Nuxt applications; shared authentication is planned |
| Backend architecture | Confirmed | .NET multi-service architecture |
| Application structure | Confirmed direction | Clean Architecture per business service; feature-based frontend boundaries (see [conventions](./conventions)) |
| Authorization model | Confirmed direction | Scoped RBAC; no generic ABAC engine |
| Company model | Planned | People, departments, cross-department teams, and managers; managers separate from permission roles |
| Company application path | Scaffold configuration | `/company/` base path and development proxy configured in the frontend scaffold; production prefix-preserving routing contract documented but not deployed |
| CRM application path | Proposed | A future `/crm` path is not implemented by the scaffold |
| Google sign-in | Confirmed direction, not implemented | Support Google; provider integration and shared-session implementation remain open |
| Accounts and memberships | Confirmed direction, not implemented | Many companies per account, many Google identities per account, each Google identity unique to one account, and multiple signed-in accounts with switching; see [ADR-001](#adr-001-multiple-accounts-memberships-and-google-identities) |
| Multi-tab session context | Open | Isolated request context and stale-request guards required; tab strategy not selected |
| Workspace directory sync, domain auto-join, Require Google | Research proposals | Not adopted or implemented |
| Persistence and messaging | Proposed | Evaluate PostgreSQL and RabbitMQ |
| Real-time and background jobs | Proposed | Evaluate SignalR and Hangfire |
| Documentation hosting | Open | No deployment or GitHub Pages publication configured |

## ADR-001: Multiple accounts, memberships, and Google identities

**Date:** 2026-10-28. **Status:** confirmed product direction; implementation pending.

**Context:** People may participate in several companies, use several Google
identities, and keep separate Worktandem accounts signed in within one browser.
Restricting an account to one company or one Google identity does not meet this need.

**Decision:** Allow many company memberships and many linked Google identities per
Worktandem account, while each Google identity belongs to exactly one Worktandem
account. Support multiple signed-in Worktandem accounts with explicit account
switching. Account switching changes the actor; company switching changes the tenant.
Roles are company-scoped. External identity uniqueness uses issuer/subject, not email.

**Consequences:** Separate account, membership, identity-link, and session concepts.
Enforce both-proof linking, uniqueness/conflict handling, safe unlinking/recovery,
server-side authorization, and account/company-scoped caches. Do not auto-merge by
email. Cross-tab switching and session storage remain open implementation decisions.
Google support does not adopt directory sync, domain auto-join, or Require Google.

**Implementation:** No authentication or SSO is delivered by this decision. See
[Accounts and authentication](./accounts-and-authentication) for requirements and
[design flows](../design/authentication) for the current draft and pending work.

## Recording changes

When a decision becomes concrete, describe its context, chosen option, consequences,
and implementation status. Link to the relevant reviewed code or documentation;
do not use a proposal as evidence that a capability has shipped.
