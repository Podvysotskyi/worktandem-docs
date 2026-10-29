# Database proposal alignment review

**Status: documentation review and proposed alignment, 2026-10-29.** No entities,
DbContexts, provider configuration, schema, data or migrations were changed.

The [identity, onboarding and invitations specification](../product/identity-and-company-access)
is the source of current confirmed product rules. This review evaluates the earlier
[database design PR #3](https://github.com/Podvysotskyi/worktandem-docs/pull/3)
at exact head `493443ed1a414d4d567f88712008d43232ca35ff`. At review time it is
**open and draft**, not approved or merged. This page does not import that branch,
change its files, approve it or assume its proposals are confirmed.

## Review outcome

Keep the draft's separation of account, external identity and membership; stable
issuer/subject uniqueness; service-owned persistence; tenant-consistent keys; and
complete scoped RBAC grants. Its onboarding/authentication sections need alignment
before the initial model is accepted. There are no implemented EF entities to
migrate from this proposal today.

The main changes required by confirmed rules are:

1. Remove current-scope local email/password authentication assumptions.
2. Model Pending company applications, manual review and owner activation boundaries.
3. Separate platform authorization from company-membership authorization.
4. Support one invitation used by both email and authenticated in-app acceptance,
   with current matching Google-email evidence and safe concurrency.
5. Preserve explicitly invited outside-domain membership eligibility when optional
   domain policies or later directory synchronization apply.
6. Replace the earlier many-Google-identities proposal with one Google identity per
   Worktandem account, while preserving issuer/subject ownership and leaving
   non-Google provider cardinality open.

Exact fields, statuses, recovery and synchronization records below are proposals.
The earlier strict-domain/no-guests proposal is superseded by the confirmed manual
outside-domain invitation rule.

## Findings by earlier document

Pinned links below resolve to the reviewed commit, not a moving branch.

| Priority | Source / finding | Required alignment or proposed change |
| --- | --- | --- |
| Before model acceptance | [Identity: provider-owned records](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/identity.md#provider-owned-authentication-records) includes optional LocalCredential and password/challenge language | Google-only current scope has no local password login/setup/recovery. Keep provider-managed session and rotation requirements; do not generate duplicate credential/challenge tables just because they appear in a catalog |
| Before model acceptance | [Identity: Account](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/identity.md#account) leaves local-login email uniqueness open | Remove local-login rationale; account contact email is not the login identity key. Email matching/normalization remains open for invites; do not add global email uniqueness or email-based merges |
| Before model acceptance | [ExternalIdentity](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/identity.md#externalidentity) explicitly allows many Google identities per account and rejects account/provider uniqueness | That Google multiplicity is obsolete under ADR-003. Keep global unique issuer/subject and add Google-scoped uniqueness of owning AccountId; active Google-only accounts need exactly one usable Google login. Choose the eventual provider/library constraint without deciding future-provider cardinality |
| Before model acceptance | [Organization: Company](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/organization.md#company) proposes Active/Suspended/Archived only | Represent Pending application, approved/rejected review history and a real backend business gate. Choose whether review state and operational status are separate axes or one lifecycle; do not merely rename Active without deciding |
| Before model acceptance | CompanyMembership implies JoinedAt is always required and active-owner rules assume an established company | Keep applicant/owner candidate separate until activation. Proposed default activates owner on approval in the same Organization transaction; no active privileged owner before approval |
| Before model acceptance | [Authorization introduction](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/authorization.md) says authorization belongs to company membership | Qualify this as tenant authorization. Add separate explicit platform grants and operator endpoint checks; company Owner must not imply platform privileges |
| Before invitation implementation | [CompanyInvitation](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/organization.md#companyinvitation) omits in-app lookup/evidence rules and Declined | One invite record can serve email and in-app paths. Add current verified Google-email proof/accepting-identity evidence and choose decline/expiry/resend outcomes. A required digest for delivered links does not mean the authenticated in-app route must supply that secret |
| Before invitation implementation | Invitation grant proposal defers elevation until after join | Reconcile with proposed initial-role selection, least privilege and inviter delegation limits. Final default is still open; no role choice may silently upgrade an already-active member |
| Before optional integration | [Overview](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/overview.md) leaves all domains/sync/Require Google as research, no related catalog | Optional domain configuration is confirmed direction within optional Google API integration, distinct from mandatory corporate admission. Directory sync and domain auto-join remain separate unadopted proposals |
| Before optional integration | No explicit manual outside-domain eligibility or directory interaction | Persist authorized manual invitation provenance/eligibility in the membership domain so runtime policy honors it. Later sync must not remove it just because a directory entry is absent; independent sources may coexist |
| Before endpoint implementation | [Integrity: tenant filters](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/integrity.md#tenant-filters-are-defense-in-depth) discusses membership chooser, not pending inbox or review queue | Add deliberate account-level invitation/status queries and separately authorized platform review queries. These do not use a fabricated default tenant or broad unprotected IgnoreQueryFilters path |
| Before security acceptance | [Protected invariants](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/authorization.md#protected-invariants) require an active owner | Apply last-owner protection to activated companies; Pending applications intentionally have a candidate only. Define account suspension and owner recovery across services |

## Keep these earlier constraints

- Unique canonical `(Issuer, Subject)` across accounts, with case-sensitive subject.
  **Changed Google cardinality:** also enforce at most one Google identity per
  owning account, including concurrent enrollment. A Google-scoped relation,
  filtered/provider-scoped unique key or library equivalent remains a physical
  design choice. Do not impose a blanket AccountId or `(AccountId, Provider)` rule
  on future providers before their cardinality is decided. Active Google-only
  accounts need exactly one usable Google login; uniqueness alone cannot ensure it.
- Unique company/account membership; same-company composite foreign keys on
  membership, role, department and team references. A GUID by itself does not prove
  tenant consistency.
- Identity and Organization own their own data. Cross-service AccountId is a
  contract reference, not a shared EF entity or SQL foreign key.
- Explicit scoped grants keep action and scope paired. Team/manager membership,
  module availability and a company/domain label are not permission grants.
- Request/session context is distinct from persistent Account data. No authoritative
  Account.CurrentCompanyId; multiple browser accounts remain independently revocable.
- Query filters are defense in depth, not endpoint authorization or complete write
  protection. Raw SQL, bulk writes, workers and operator paths need their own checks.
- Concurrency/versioning, unique constraints, audit and only-login/last-owner race
  protections remain necessary. Relational guarantees need real-provider tests.
- [EF migration ownership](https://github.com/Podvysotskyi/worktandem-docs/blob/493443ed1a414d4d567f88712008d43232ca35ff/docs/database/ef-core.md)
  stays service-local; Domain remains framework-free. There is no all-system
  DbContext or migration for each company.

## Proposed model changes for the next design revision

This is a logical change list, not permission to implement it.

| Area | Proposed shape | Unresolved choice |
| --- | --- | --- |
| Google identity cardinality | Global issuer/subject uniqueness plus Google-scoped per-account uniqueness; preserve exactly one usable Google login for active Google-only accounts | Mapping to the chosen provider/library; Google replacement/recovery policy; future-provider cardinality remains separate and open |
| Company review | Company references current review state/version; CompanyApplication stores submitted form snapshots; ReviewDecision records authorized actor, outcome, reason and reviewed version | Exact required form fields; one status enum versus separate review/lifecycle axes; pending edits; resubmission |
| Owner candidate | ApplicantAccountId on application or explicit non-active candidate record; approval activates member + Owner grant | Candidate record versus inactive membership; preserve JoinedAt meaning and avoid active-role leakage |
| Platform authorization | Explicit AccountId + platform capability grant, granting/revoking actor/time and concurrency | Owning Identity capability, bootstrap, MFA assurance and last-operator recovery |
| Invitation | Current recipient/matching-policy version, inviter, proposed grants, status/expiry, accepted actor/member and proof reference | Seven-day expiry, decline/resend/reinvite defaults, delegation rechecks, retention |
| Invitation link | Token digest/generation separate logically from invitation; same invitation ID supports account-authorized inbox action | Embedded fields versus child delivery/link credential; whether multiple outstanding delivery generations are permitted |
| Manual eligibility | Accepted authorized manual invitation recorded as membership eligibility/provenance | Compact model now versus independent grant records if sync is adopted; explicit revocation/transfer rules |
| Google integration | Company-scoped consent/scopes, protected secret reference, connection health, domain-control evidence and policy version | Exact APIs/scopes, domain proof/conflicts, integration owner and revocation policy |
| Authentication evidence | Current identity proof tied to session/operation, email/verified/hd evidence age and validation policy | Google third-party-address current-mailbox proof; provider/library records versus application projection |
| Audit/notification | Decision/acceptance audit plus durable idempotent outcome delivery where needed | Audit owner/retention/access; outbox implementation when an actual producer/consumer exists |

### Multiple eligibility sources

**Confirmed result:** an administrator's manual outside-domain invitation must allow
the matching Google recipient to join and use the company even with integration
enabled. **Proposed modeling consequence:** keep manual and directory-based
eligibility independent if directory synchronization is introduced. For example,
one member may have both an accepted manual invitation and a current directory
grant. Losing the directory grant must not erase the manual one.

A single overwriteable `Membership.Source = Directory` would lose the original
manual authorization. Do not use directory sync to reactivate a suspended member
or to erase an independent manual eligibility. Membership suspension and RBAC
override eligibility; eligibility alone does not confer a permission.

The number of source records, expiry/revocation of exceptions and identity binding
after email changes remain design questions. Do not prebuild a generic provisioning
engine or sync schema while synchronization is still unadopted scope.

## Transaction and lifecycle review

1. **Submit:** one Organization transaction creates Pending company, application
   version and candidate reference. Idempotent retries do not create extra tenants.
2. **Review:** authorize platform grant, compare exact submitted version, then
   atomically decide and, on approval under the proposed default, activate company,
   owner membership/grants and audit. Two reviewers cannot approve/reject one version
   independently. Cross-service proofs are contracts, not distributed SQL FKs.
3. **Accept:** authenticate current matching Google identity, validate proof and
   company/invitation/grant state, honor the manual-domain exception, and atomically
   consume the invite + establish at most one membership/grant set + audit.
4. **Race/retry:** serialize or use equivalent safe concurrency for accept versus
   revoke/resend/expiry; one outcome wins. Expiry is checked at request time. An
   existing membership is not permission to upgrade roles or reinstate a suspended
   member with its former privileged grants.
5. **Change identity/member status:** stale email evidence must not reveal new
   invitations to a former mailbox holder. An identity with the same recycled email
   cannot inherit an old account or membership. Define suspension races and any
   separately approved replacement/recovery workflow; do not offer unrestricted
   unlink/relink or remove an active account's only usable login. Define proof
   freshness without storing full reusable ID tokens as audit evidence.
6. **Notify:** persist required notification intent with business state and retry
   independently. Email failure does not reverse approval or duplicate membership.

## Required verification before accepting an implemented model

These are future tests, not checks run by this documentation change:

| Test group | Required evidence |
| --- | --- |
| Approval | Pending candidate cannot use business/invite/member APIs; stale application cannot be approved; concurrent decision activates one owner |
| Platform boundary | Company Owner cannot review companies or grant platform capabilities; valid operator still needs explicit relevant platform permission |
| In-app invitation | No-company account can list eligible invitations; authenticated acceptance does not inherently require the email-link token. Additional same-address mailbox evidence for non-Gmail/no-hd identities remains subject to O07; no OTP/evidence policy is adopted here; forged/stale-identity lookup is denied |
| Identity/email | Changed email preserves account key; global issuer/subject ownership and one-Google-per-account hold under races; matching uses current proven Google email; no second-Google attachment, dot/plus alias inference, email-based merge or reassigned-mailbox inheritance |
| Invite concurrency | Accept versus revoke/expiry/resend has one result; replay creates no extra grants; old link generation fails |
| Membership lifecycle | Suspended/removed member is not automatically reinstated; already-member invite cannot escalate grants |
| Optional integration | Outside-domain manual member retains permitted access after integration/policy checks and directory absence; explicit suspension remains effective |
| Tenant isolation | Forged company/member/role/scope IDs fail on reads and writes; query-filter bypass/admin paths remain authorized |
| Context/revocation | Multiple accounts/tabs preserve actor/company; pending company does not block another approved membership under proposed default; revoked permissions stop within chosen bound |
| Storage/migrations | Real selected provider enforces keys/FKs/transactions; reviewed initial migration and subsequent upgrade tests; no shared writable service tables |

## Decisions and next revision

The canonical [decision inventory](../product/identity-and-company-access#decisions-to-settle)
tracks product and security choices. Highest schema-impact questions are the
company form/review states and owner activation, invitation defaults and reinstatement,
email-evidence/normalization policy, manual eligibility representation, platform
bootstrap/assurance and session context. Database provider/authentication library
remain open; choosing EF Core does not choose PostgreSQL or ASP.NET Core Identity.

After agreement, revise the earlier proposal in a separate reviewable change,
reconcile its status vocabulary and links, and preserve unrelated organization/RBAC
design work. PR #3 must not be merged as if these gaps were already resolved.
This review does not approve the full schema or promise production readiness.
