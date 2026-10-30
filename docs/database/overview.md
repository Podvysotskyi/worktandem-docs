# Database design

**Status: proposed logical catalog aligned with the current product specification;
not implemented.** EF Core code-first and migrations are confirmed direction.
The [readiness register](../implementation/readiness) selects PostgreSQL/EF/Npgsql,
service boundaries, first-slice mappings and engineering defaults; remaining entity
detail/later scope stays proposed. No entities, provider packages, database or
migrations are created by this documentation.

## Read this specification

1. [Identity entities](./identity): single Google identity, accounts, sessions and platform grants.
2. [Organization entities](./organization): company applications/reviews, memberships, invitations and company structure.
3. [Authorization entities](./authorization): tenant RBAC, platform separation and access gates.
4. [Integrity and lifecycle](./integrity): relationships, isolation, transactions, retention and negative tests.
5. [EF Core and migrations](./ef-core): mapping ownership and the later migration workflow.

The canonical [product specification](../product/identity-and-company-access) is the
source of confirmed behavior; its [decision inventory](../product/identity-and-company-access#decisions-to-settle)
distinguishes user requirements from the selected E06/E07/E08 defaults and remaining
O decisions. [ADR-003](../architecture/decisions#adr-003-one-google-identity-per-worktandem-account)
supersedes the earlier many-Google rule. The [alignment review](./identity-alignment-review)
preserves findings against the original PR #3 commit and records their documentation dispositions.

## Ownership and storage

| Proposed owner | Owns | Does not own |
| --- | --- | --- |
| Identity/platform access | Accounts, global status/transition history, single Google association, session/evidence requirements, explicit platform grants | Company memberships, company RBAC or company-review decisions |
| Organization | Companies, versioned applications/reviews, owner candidates, memberships, invitations, manual eligibility, structure, roles and module configuration | Google login credentials, platform grants or another service's writable entities |
| Google integration capability | Separate company API consent, protected secret references, domain-control evidence and optional policy | Login authority, automatic owner/platform rights or implicit directory provisioning |
| Future business services | Their own company-owned leads/customers/tasks | Another service's database or EF model |

E01 selects Identity as the first-slice account/bootstrap/session owner with its own
database and DbContext. Optional integration ownership remains deferred; do not add
a service merely because a future row appears here. Organization has Clean Architecture
projects but no implemented business schema. The Gateway remains a thin BFF, not a
business-data or migrations owner.

Recommend a service-owned database/DbContext and migration history per service,
possibly on one physical server. No shared writable tables, cross-service SQL joins,
foreign keys or EF navigations. AccountId on Organization records is a contract
reference, not a SQL FK into Identity. Platform authorization is validated by
contract before an Organization review transaction; it does not move review state
into the platform UI or identity database.

Recommend shared company-owned tables with CompanyId in each owning service.
PostgreSQL is confirmed; E02 selects PG18 with EF Core/Npgsql 10. UUIDv7 IDs,
UTC timestamptz, explicit snake_case mappings, Guid Version concurrency and the
Google-scoped partial unique account key are E09 implementation choices, not an
executed migration. Separate credentials/migration histories are required per owner.

## Confirmed rules and proposed representations

| Confirmed product requirement | Proposed representation; not an approved physical schema |
| --- | --- |
| One Google identity per Worktandem account; issuer/subject owned by one account | Global issuer/subject uniqueness plus Google-scoped AccountId uniqueness; active Google-only lifecycle requires one usable login |
| Many company memberships and concurrent Worktandem accounts | Unique company/account membership; separately revocable account sessions; no Account.CurrentCompanyId authority |
| New self-service company Pending until manual platform approval | Company lifecycle + immutable submitted application versions + review decisions; separate owner candidate until activation |
| Initial platform owner with entered server-env secret and no company requirement | Durable SetupState completion + temporary Google proof + serialized no-account/secret validation; one Identity transaction creates initial account/identity/platform grants; no automatic tenant membership |
| Company administration is not platform administration | Tenant-scoped roles and explicit platform capability grants have independent checks/storage ownership |
| Platform Users/global ban with independent company statuses | Account.Status = Suspended and mandatory reason + actor/time/history; proposed atomic status/history model; no IsBanned or mass membership-status update; reinstatement cannot restore independently revoked access |
| Any-email invitations, in-app discovery and matching verified Google acceptance | One invitation for both entry points; current server-validated identity evidence; optional email-link credential, not required by the in-app route |
| Manual outside-domain invitations remain usable with Google integration | Auditable manual membership eligibility honored on later access; suspension and RBAC still override |
| Optional Google/domain configuration | Separate consent/domain-control evidence; directory-sync eligibility records only if sync is adopted |

## Modeling conventions

- E09 selects explicit snake_case SQL mapping, UUIDv7 IDs represented by Guid and
  application-managed Guid Version tokens; conceptual API/Domain names remain separate.
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
- Selected framework OIDC/cookie integration owns protocol/crypto; E04's deliberate
  application session-container state implements multiple accounts. Do not add
  duplicate password/token frameworks, generic provisioning or unused outbox tables.

## First implementation slice

The [readiness PR sequence](../implementation/readiness#implementation-prs-and-definition-of-done)
starts with service-owned persistence, Google/bootstrap/sessions, resumable Pending
applications and platform review/company authorization. E06/E07 select the initial
onboarding/review defaults. Invitation discovery/consumption follows in a later
E08 slice gated by O07; structure and optional Google integration remain separate.

All slices keep protected business operations unavailable until authentication,
company approval, active membership, permissions and negative authorization tests
exist. Module availability is an extra gate, never a permission. Account/invitation/
status queries do not require a fabricated tenant; platform queries use explicit
operator grants. E07 keeps other approved memberships accessible when a different
company is Pending; no global onboarding flag overrides their authorization.

## Decisions required before initial migrations

| Decision | Current position |
| --- | --- |
| Database provider/version and Identity implementation | PostgreSQL confirmed; E01–E04 select PG18/EF10/Npgsql10, Identity and Organization contexts, framework Google OIDC and server sessions; verify dependency graph in PR1 |
| Google cardinality | Confirmed one per account; E09 selects a Google-scoped partial unique key plus issuer/subject uniqueness; replacement/recovery and future providers remain deferred |
| Company form/review/owner activation | E06/E07 select initial fields, single Company.Status, candidate-as-applicant, Pending read-only and rejected resubmission; bootstrap operator needs no company; self-review denied |
| Invitation/default grants | Later E08 selects seven days, decline/revoke, rotated resend and member role within delegation; O07 gates acceptance, with reinstatement and full lifecycle tests before rollout |
| Email evidence | O06/O07: conservative normalization, freshness, changed/reassigned mailbox; no different-email OTP or invented same-address proof policy |
| Optional integration/domain policy | O08: proof, manual eligibility/revocation, consent outage and directory behavior; no strict no-guests policy |
| Sessions/operator assurance | E04/E05/E11 select per-tab contexts, server sessions, permanent bootstrap gate and live status enforcement; E12 privileged assurance/recovery needs owner review before rollout |
| User management policy | First slice selects DisplayName-only editing, internal reasons and no timed bans; public status/removal writes stay backend-gated until reviewed ownership coordination/recovery; reinstatement reason and broader policy remain scoped O16 |
| Privacy and retention | O12: enumeration/rate-limit budgets, audit retention/erasure, slug reuse |
| Structure and scopes | Multiple departments/one optional primary/one direct manager, explicit scope bindings and direct-department-only scope remain proposals |
| Physical mapping | E09 selects UUIDv7, UTC timestamptz, snake_case, Guid Version and Google-scoped partial index; actual EF mapping/migration and real-PG test review remain required |

See the canonical inventory for remaining future-provider and documentation/design
reconciliation decisions. Directory auto-join/synchronization are not adopted merely
by listing the optional integration's logical data needs.
