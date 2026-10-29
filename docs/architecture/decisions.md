# Decisions

This register separates architectural direction from delivered behavior.

| Topic | Status | Decision or open question |
| --- | --- | --- |
| Repository layout | Confirmed | Root workspace with frontend, backend, and docs as submodules |
| Documentation | Confirmed | VitePress |
| Frontend architecture | Confirmed direction | Multiple Nuxt applications; shared authentication is planned |
| Frontend components and data UI | Confirmed direction; implementation partial | Nuxt, shadcn-vue and Tailwind shared primitives/tokens; TanStack Query, Table and Form; see [frontend development guide](https://github.com/Podvysotskyi/worktandem-frontend/blob/main/docs/development.md). Selection does not mean every component/integration exists |
| Backend architecture | Confirmed | .NET multi-service architecture |
| Application structure | Confirmed direction | Clean Architecture per business service; feature-based frontend boundaries (see [conventions](./conventions)) |
| Authorization model | Confirmed direction | Scoped RBAC; no generic ABAC engine |
| Company model | Planned | People, departments, cross-department teams, and managers; managers separate from permission roles |
| Company application path | Scaffold configuration | `/company/` base path and development proxy configured in the frontend scaffold; production prefix-preserving routing contract documented but not deployed |
| CRM application path | Proposed | A future `/crm` path is not implemented by the scaffold |
| Google sign-in | Confirmed direction, not implemented | Google only for current login/registration; no local email/password flows; future providers planned; see ADR-002 |
| Company onboarding | Confirmed direction, not implemented | New self-service registration includes company form; company Pending until manual platform approval |
| Invitations | Confirmed direction, not implemented | Any recipient email; acceptance uses matching verified Google email; existing users see pending invites in app; no different-email OTP |
| Platform administration | Confirmed direction, not implemented | Separate Nuxt operator app and explicit platform grants, distinct from company-admin roles |
| Accounts and memberships | Confirmed direction, not implemented | Many companies per account, many Google identities per account, each Google identity unique to one account, and multiple signed-in accounts with switching; see [ADR-001](#adr-001-multiple-accounts-memberships-and-google-identities) |
| Multi-tab session context | Open | Isolated request context and stale-request guards required; tab strategy not selected |
| Company Google/domain integration | Confirmed optional direction, not implemented | Domain setup belongs to optional Google API integration; manual outside-domain invitations remain allowed |
| Workspace directory sync and domain auto-join | Research proposals | Not adopted or implemented; neither grants authority implicitly |
| EF Core code-first | Confirmed direction, not implemented | Migrations planned; see the unmerged database proposal and its [alignment review](../database/identity-alignment-review) |
| Persistence and messaging | Proposed | Evaluate PostgreSQL and RabbitMQ |
| Real-time and background jobs | Proposed | Evaluate SignalR and Hangfire |
| Documentation hosting | Open | No deployment or GitHub Pages publication configured |

## ADR-001: Multiple accounts, memberships, and Google identities

**Date:** 2026-10-28. **Status:** account/membership cardinality remains confirmed;
Google-scope/onboarding/integration summary partially superseded by ADR-002;
implementation pending. Historical decision text below is retained.

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

## ADR-002: Google-only onboarding, invitations and platform review

**Date:** 2026-10-29. **Status:** confirmed product direction; implementation pending.
Supersedes earlier mixed-provider/local-password implications and generic company
onboarding descriptions. ADR-001's account/identity/membership cardinalities remain valid.

**Context:** Google login, company applications, manual invitations and optional
Google API integration must share one coherent account model without making a
corporate domain a platform admission requirement.

**Decision:** Google-only sign-in/registration for the current scope, with other
providers planned later. New self-service registration requires company creation
in Pending status and manual platform approval before business access. A separate
Nuxt platform-admin app serves Worktandem operators, with explicit platform grants
separate from tenant roles. Company administrators may invite any email; acceptance
requires the signed-in Google identity's verified email to match the invitation.
Existing users must see and accept pending invitations inside the app. A
different-email OTP acceptance path is excluded.

Company-domain configuration is optional and belongs to optional Google API
integration, with separate consent from login. Even when enabled, explicit manual
outside-domain invitations permit joining and continued company use within assigned
roles. Domains do not automatically confer membership, ownership or platform rights.
Directory sync/auto-join remain separate unadopted proposals.

**Consequences:** Account-level onboarding/invitation surfaces, company approval
gates, separate operator authorization, stable identity keys and tenant RBAC need
backend enforcement. No local password flows are included. Manual eligibility must
survive a later domain check; suggested independent manual/directory provenance
still needs schema agreement. Google third-party-address current-mailbox evidence
remains an explicit security-policy question, not an adopted email fallback.

**Open choices:** Invitation-join company-form exemption, exact form fields, owner
activation/resubmission details, invitation expiry and roles, session mechanics,
domain verification and operator assurance remain marked proposed/open in the
[canonical specification](../product/identity-and-company-access#decisions-to-settle).
The former no-guests restriction proposal is superseded, not an open default.

**Implementation:** No authentication, approvals, operator app, invitation endpoints,
EF entities/migrations or design changes are delivered. See the
[database proposal alignment review](../database/identity-alignment-review).

## Recording changes

When a decision becomes concrete, describe its context, chosen option, consequences,
and implementation status. Link to the relevant reviewed code or documentation;
do not use a proposal as evidence that a capability has shipped.
