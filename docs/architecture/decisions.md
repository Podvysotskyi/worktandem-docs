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
| Platform Users management | Confirmed direction, not implemented | Users list/detail/manage; global ban uses Account.Status = Suspended with mandatory nonempty reason and actor/time/transition history; company membership states stay independent; see [ADR-004](#adr-004-platform-users-and-independent-suspension-statuses) |
| Accounts and memberships | Confirmed direction, not implemented | Many companies per account; at most one Google identity per account and exactly one usable Google login for an active Google-only account; each Google identity unique to one account; multiple signed-in Worktandem accounts with switching; see [ADR-003](#adr-003-one-google-identity-per-worktandem-account) |
| Google replacement and future providers | Open | No second-Google linking or unrestricted unlink/relink; replacement/recovery and non-Google provider cardinality need separate decisions |
| Multi-tab session context | Open | Isolated request context and stale-request guards required; tab strategy not selected |
| Company Google/domain integration | Confirmed optional direction, not implemented | Domain setup belongs to optional Google API integration; manual outside-domain invitations remain allowed |
| Workspace directory sync and domain auto-join | Research proposals | Not adopted or implemented; neither grants authority implicitly |
| EF Core code-first | Confirmed direction, not implemented | Migrations planned; see the [aligned logical catalog](../database/overview) and [review dispositions](../database/identity-alignment-review#documentation-dispositions) |
| Relational entity model | Proposed, aligned with ADR-002/003/004 | [Service ownership and entity catalog](../database/overview); proposed fields/statuses are not approved defaults; provider, physical authentication schema and P01–P04/O choices remain open |
| Persistence and messaging | Proposed | Evaluate PostgreSQL and RabbitMQ |
| Real-time and background jobs | Proposed | Evaluate SignalR and Hangfire |
| Documentation hosting | Open | No deployment or GitHub Pages publication configured |

## ADR-001: Multiple accounts, memberships, and Google identities

**Date:** 2026-10-28. **Status:** multiple company memberships and concurrent
Worktandem accounts remain confirmed. The many-Google-identities-per-account rule
and its linking/unlinking flow are superseded by ADR-003; Google-scope/onboarding/
integration summary is partially superseded by ADR-002. Implementation pending.
Historical decision text below is retained and is not current Google-linking guidance.

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
onboarding descriptions. Its inherited Google multiplicity is superseded by ADR-003;
multiple company memberships and concurrent Worktandem accounts remain valid.

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

## ADR-003: One Google identity per Worktandem account

**Date:** 2026-10-29. **Status:** confirmed product direction; not implemented.
Supersedes ADR-001's many-Google-identities rule and the earlier specification's
second-Google linking/unlinking flows. ADR-002's onboarding/invitation/admin rules
and the multi-company/concurrent-Worktandem-account decisions remain in effect.

**Context:** Users may keep separate Worktandem accounts for different Google
identities. They do not need several Google accounts attached to one Worktandem
account. This does not restrict the companies an account may participate in.

**Decision:** At most one Google identity per Worktandem account; an active
Google-only account has exactly one usable Google login. A validated Google
issuer/subject belongs to only one Worktandem account. Preserve many company
memberships and multiple signed-in Worktandem accounts in a browser. Switching
accounts changes actor; switching companies changes that actor's tenant context.
Email matching never merges accounts or attaches a second Google identity.

**Consequences:** Remove add-second-Google linking screens and examples. Invitation
mismatch requires switching to the matching identity's Worktandem account or
starting its own registration if new, not attaching it to the current account.
Preserve global issuer/subject uniqueness and add Google-scoped per-account
uniqueness in the eventual provider/library model, including concurrency checks.
Physical constraints remain undecided; do not impose Google cardinality on future
providers or make AccountId globally unique across all external providers.

**Open:** Google identity replacement/recovery requires a separate proof, atomicity
and revocation policy; no unrestricted unlink/relink or removal of the only usable
login. Non-Google provider cardinality/linking remains open. This decision does not
resolve invitation mailbox-evidence policy O07 or the other proposed product defaults.

**Implementation:** Documentation only; no identity tables, EF migrations, app code
or designs changed. See the [canonical specification](../product/identity-and-company-access)
and [database alignment review](../database/identity-alignment-review).

## ADR-004: Platform Users and independent suspension statuses

**Date:** 2026-10-29. **Status:** confirmed product direction; not implemented.
Extends platform administration with global user management. ADR-002/003 identity,
onboarding, invitation and account/company switching rules remain unchanged.

**Decision:** The separate platform-admin app provides Users list/detail/manage,
including global ban. Ban sets Account.Status = Suspended and requires a nonempty
reason/description. Retain authorized actor, time, before/after state and transition
history. Account.Status is authoritative; do not add an independent IsBanned flag.

Each CompanyMembership has an independent status. Global account suspension denies
protected access across companies without overwriting those statuses or grants.
Global reinstatement does not reactivate separately suspended/removed memberships,
undo company suspension or recreate revoked tenant/platform grants. Company-admin
roles do not grant global user-management rights.

**Consequences:** The backend checks explicit operator authority and current account
status. Suspension requires target-account session revocation/invalidation and
current-status enforcement. Proposed storage/workflow uses Account.Version and an
atomic status + transition-history update; keep membership state in Organization
and independent from Identity's global status. Reinstatement evaluates current
gates without restoring an old permissions/session snapshot.

**Open:** Editable profile fields, exact capability keys, reason visibility, timed
suspensions, reinstatement reason, minimal suspended-account surface, exact session
revocation timing/implementation and self/last-operator/last-company-owner recovery.
No automatic timed unban or unrestricted account-field editing is selected.

**Implementation:** Documentation only. See [product rules](../product/identity-and-company-access#global-user-suspension-and-company-status),
[proposed history](../database/identity#account-status-transition-history) and
[consistency/tests](../database/integrity#global-account-suspension-and-reinstatement).
No app, EF model, migration or design implementation is delivered.

## Recording changes

When a decision becomes concrete, describe its context, chosen option, consequences,
and implementation status. Link to the relevant reviewed code or documentation;
do not use a proposal as evidence that a capability has shipped.
