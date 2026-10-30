# Database proposal alignment review

**Status: documentation review and proposed alignment, 2026-10-29.** No entities,
DbContexts, provider configuration, schema, data or migrations were changed.

The [identity, onboarding and invitations specification](../product/identity-and-company-access)
is the source of current confirmed product rules. This review evaluates the earlier
[database design PR #3](https://github.com/Podvysotskyi/worktandem-docs/pull/3)
at its **original reviewed snapshot** `493443ed1a414d4d567f88712008d43232ca35ff`.
The original review found an open draft, not an approved/merged model. The catalog
in this proposal has now been aligned with the merged product specification;
[documentation dispositions](#documentation-dispositions) distinguish those edits
from remaining decisions. The original commit/history is preserved. This page does
not approve the schema, implement it or authorize merging PR #3.

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

These findings describe that pinned earlier snapshot. Current catalog pages address
the confirmed-rule gaps while retaining open defaults. Exact fields, statuses,
recovery and synchronization records below remain proposals.
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
The [readiness register](../implementation/readiness) now selects first-slice
engineering defaults; the pinned earlier findings above remain historical context.

| Area | Proposed shape | Unresolved choice |
| --- | --- | --- |
| Google identity cardinality | Global issuer/subject plus Google-scoped per-account uniqueness | E09 selects PG partial unique key; Google replacement/recovery and future providers remain separate scope |
| Company review | Current company/submission versions, immutable snapshots and authorized decisions | E06/E07 select first-slice fields, single status, Pending read-only, reason and rejected resubmission |
| Owner candidate | E07 selects Application.ApplicantAccountId until approval activates member/Owner | No parallel inactive candidate membership; later ownership/recovery remains gated |
| Platform authorization | Explicit Identity-owned platform capability grants | E01/E05 select owner/bootstrap; E12 assurance and recovery need owner review before rollout |
| Invitation | Current recipient/matching-policy version, inviter, proposed grants, status/expiry, accepted actor/member and proof reference | Seven-day expiry, decline/resend/reinvite defaults, delegation rechecks, retention |
| Invitation link | Token digest/generation separate logically from invitation; same invitation ID supports account-authorized inbox action | Embedded fields versus child delivery/link credential; whether multiple outstanding delivery generations are permitted |
| Manual eligibility | Accepted authorized manual invitation recorded as membership eligibility/provenance | Compact model now versus independent grant records if sync is adopted; explicit revocation/transfer rules |
| Google integration | Company-scoped consent/scopes, protected secret reference, connection health, domain-control evidence and policy version | Exact APIs/scopes, domain proof/conflicts, integration owner and revocation policy |
| Authentication evidence | Framework OIDC plus Identity-owned E04 server session/account-container protocol | O07 mailbox proof remains gated for invitations; E12 optional Google assurance must be verified with actual client |
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

## Documentation dispositions

**Addressed here means documentation aligned, not a feature implemented or product
default approved.** Current catalog changes preserve the original proposal's history
and bring in the merged specification/dependency fixes without rewriting main.

| Original finding | Current catalog disposition | Still open |
| --- | --- | --- |
| Optional local credentials and multiple Google identities | [Identity](./identity#externalidentity) removes password/second-Google flows; E02/E03/E09 select PG/EF/Npgsql/OIDC and partial key | Actual mapping/tests, replacement/recovery and future providers |
| Missing Pending/review history/owner candidate | [Organization](./organization#companyapplication-and-reviewdecision) and [integrity](./integrity#application-approval-transaction) follow E06/E07 fields/status/candidate/review defaults | Additional company/legal workflow and later delivery channels; no user-confirmation claim for engineering defaults |
| Tenant-only authorization statement | [Authorization](./authorization#account-and-platform-query-paths) separates operator paths; E05 supplies permanent secret-protected bootstrap with no tenant requirement | E12 assurance/recovery and ownership coordination before public status writes |
| Invitation discovery, states, role offers and token coupling | [Invitations](./organization#companyinvitation) share one record; optional [link credential](./organization#invitationlinkcredential) does not require token input in-app; current identity proof and race rules documented | P04/O05 lifetime/decline/resend/roles/reinstatement, O06 normalization and O07 third-party-mailbox evidence |
| Missing manual/domain eligibility interaction | [Manual eligibility](./organization#manual-membership-eligibility) preserves outside-domain manual access; [optional integration](./organization#optional-google-integration-and-domains) separates consent/proof from login | Exception authority/revocation, domain proof/outage rules, future directory scope and independent source representation |
| Account/platform queries and last-owner boundary | [Integrity](./integrity#tenant-filters-are-defense-in-depth) adds deliberate no-tenant paths; candidate has no active owner grants; activated companies get owner protection | Revocation bounds, cross-service evidence freshness and recovery |
| Migration model review | [EF gate](./ef-core#model-review-gate) plus E01/E02/E09 choose service contexts/version family/mappings | Actual restore/EF mapping, migration sources, real-PG tests and implementation authorization |

## Decisions and next revision

The canonical [decision inventory](../product/identity-and-company-access#decisions-to-settle)
tracks product and security choices. Use the selected E01–E11 engineering defaults
and scoped owner-review gates for the next model revision. PostgreSQL
and EF code-first are confirmed; framework OIDC, server sessions, bootstrap and
first-slice fields/review are selected. O07 invitation proof, E12 privileged rollout/
recovery and cross-service owner safety remain bounded gates. No ASP.NET local
password framework or full up-front business-entity design is required.

The earlier catalog is now revised in this proposal, with unrelated organization/
RBAC design preserved. Settle the remaining choices, then review the selected logical
model before generating entities/migrations. The catalog remains a proposal for
product/model review; documented dispositions are not approval of its full schema
or production readiness.
