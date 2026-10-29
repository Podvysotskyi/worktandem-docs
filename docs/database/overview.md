# Database design

**Status: proposed logical catalog aligned with the current product specification;
not implemented.** EF Core code-first and migrations are confirmed direction.
Fields, physical keys/types, lifecycle representations and new defaults below
remain proposals until reviewed. No entities, provider packages, database or
migrations are created by this documentation.

## Read this specification

1. [Identity entities](./identity): single Google identity, accounts, sessions and platform grants.
2. [Organization entities](./organization): company applications/reviews, memberships, invitations and company structure.
3. [Authorization entities](./authorization): tenant RBAC, platform separation and access gates.
4. [Integrity and lifecycle](./integrity): relationships, isolation, transactions, retention and negative tests.
5. [EF Core and migrations](./ef-core): mapping ownership and the later migration workflow.

The canonical [product specification](../product/identity-and-company-access) is the
source of confirmed behavior; its [decision inventory](../product/identity-and-company-access#decisions-to-settle)
keeps P01–P04 and O decisions open. [ADR-003](../architecture/decisions#adr-003-one-google-identity-per-worktandem-account)
supersedes the earlier many-Google rule. The [alignment review](./identity-alignment-review)
preserves findings against the original PR #3 commit and records their documentation dispositions.

## Ownership and storage

| Proposed owner | Owns | Does not own |
| --- | --- | --- |
| Identity/platform access | Accounts, single Google association, session/evidence requirements, explicit platform grants | Company memberships, company RBAC or company-review decisions |
| Organization | Companies, versioned applications/reviews, owner candidates, memberships, invitations, manual eligibility, structure, roles and module configuration | Google login credentials, platform grants or another service's writable entities |
| Google integration capability | Separate company API consent, protected secret references, domain-control evidence and optional policy | Login authority, automatic owner/platform rights or implicit directory provisioning |
| Future business services | Their own company-owned leads/customers/tasks | Another service's database or EF model |

Identity and the integration capability are proposed boundaries; do not scaffold new
services merely because a row appears here. Organization has Clean Architecture
projects but no implemented business schema. The Gateway remains a thin BFF, not a
business-data or migrations owner.

Recommend a service-owned database/DbContext and migration history per service,
possibly on one physical server. No shared writable tables, cross-service SQL joins,
foreign keys or EF navigations. AccountId on Organization records is a contract
reference, not a SQL FK into Identity. Platform authorization is validated by
contract before an Organization review transaction; it does not move review state
into the platform UI or identity database.

Recommend shared company-owned tables with CompanyId in each owning service.
PostgreSQL remains a candidate; selecting EF Core does not select a database engine.

## Confirmed rules and proposed representations

| Confirmed product requirement | Proposed representation; not an approved physical schema |
| --- | --- |
| One Google identity per Worktandem account; issuer/subject owned by one account | Global issuer/subject uniqueness plus Google-scoped AccountId uniqueness; active Google-only lifecycle requires one usable login |
| Many company memberships and concurrent Worktandem accounts | Unique company/account membership; separately revocable account sessions; no Account.CurrentCompanyId authority |
| New self-service company Pending until manual platform approval | Company lifecycle + immutable submitted application versions + review decisions; separate owner candidate until activation |
| Company administration is not platform administration | Tenant-scoped roles and explicit platform capability grants have independent checks/storage ownership |
| Any-email invitations, in-app discovery and matching verified Google acceptance | One invitation for both entry points; current server-validated identity evidence; optional email-link credential, not required by the in-app route |
| Manual outside-domain invitations remain usable with Google integration | Auditable manual membership eligibility honored on later access; suspension and RBAC still override |
| Optional Google/domain configuration | Separate consent/domain-control evidence; directory-sync eligibility records only if sync is adopted |

## Modeling conventions

- Conceptual C# names are not selected SQL names. Proposed IDs are Guid; generation is open.
- Required means non-null; optional fields use `?`. Proposed string lengths must be
  validated against provider limits; never truncate issuer/subject or email silently.
- UTC instants use proposed DateTimeOffset mappings. Mutable aggregates carry
  CreatedAt/UpdatedAt and a proposed application-managed Guid Version token.
- Status sets/transitions are bounded domain rules. Do not accept arbitrary client
  statuses, ownership, account/company IDs or role grants through mass assignment.
- Composite tenant FKs include CompanyId. External service references are contract IDs.
- Prefer explicit Restrict/NoAction deletion plus reviewed lifecycle cleanup; no broad
  cascade through company history, identity ownership or audit evidence.
- DTOs/events and EF entities are separate. Snapshot copies are not fresh security authority.
- Provider/library-owned auth records are mapped only after implementation selection;
  no custom password, token, generic provisioning or unused outbox tables are prescribed.

## First implementation slice

Proposed sequence after the relevant decisions: account/single-Google/session and
platform-access requirements; Pending application/review/owner activation;
company memberships/RBAC; invitation discovery and atomic consumption; then
organization structure and separately scoped Google integration. P01's invited-user
onboarding exception and P02–P04 defaults still require agreement.

All slices keep protected business operations unavailable until authentication,
company approval, active membership, permissions and negative authorization tests
exist. Module availability is an extra gate, never a permission. Account/invitation/
status queries do not require a fabricated tenant; platform queries use explicit
operator grants. A Pending company's effect on other approved memberships follows
proposed P03, not a global account flag.

## Decisions required before initial migrations

| Decision | Current position |
| --- | --- |
| Database provider/version and Identity implementation | Open; selected library determines physical auth/session storage; PostgreSQL is proposed |
| Google cardinality | Confirmed one per account; physical Google-scoped constraint and Google replacement/recovery remain open; future providers undecided |
| Company form/review/owner activation | P01–P03 and O01–O04: exact fields, one status versus review/operational axes, edits/resubmission, candidate representation and final-owner recovery |
| Invitation/default grants | P04/O05: expiry, decline/resend/reinvite, delegation revalidation and removed-member reinstatement |
| Email evidence | O06/O07: conservative normalization, freshness, changed/reassigned mailbox; no different-email OTP or invented same-address proof policy |
| Optional integration/domain policy | O08: proof, manual eligibility/revocation, consent outage and directory behavior; no strict no-guests policy |
| Sessions/operator assurance | O09–O11: per-tab/cross-app context, expiry/revocation bounds, bootstrap/MFA/recovery |
| Privacy and retention | O12: enumeration/rate-limit budgets, audit retention/erasure, slug reuse |
| Structure and scopes | Multiple departments/one optional primary/one direct manager, explicit scope bindings and direct-department-only scope remain proposals |
| Physical mapping | IDs, naming, enum storage, indexes, filtered-key support, provider collations and service boundaries require review |

See the canonical inventory for remaining future-provider and documentation/design
reconciliation decisions. Directory auto-join/synchronization are not adopted merely
by listing the optional integration's logical data needs.
