# Relationships, integrity and lifecycle

**Status: implementation requirements and proposed enforcement plan.** These checks
must be implemented and tested before the schema is considered ready.

## Relationship map

| Relationship | Cardinality | Enforcement |
| --- | --- | --- |
| Account → ExternalIdentity | 1 to many | Identity-local FK and unique issuer/subject |
| Account → CompanyMembership | 1 to many across services | External AccountId reference, no SQL FK |
| Company → CompanyMembership | 1 to many | Local FK; unique company/account pair |
| Company → Department / Team / CompanyRole | 1 to many each | Local FKs; alternate company/id keys |
| Membership ↔ Department | many to many | DepartmentMembership tenant-consistent FKs |
| Membership ↔ Team | many to many | TeamMembership tenant-consistent FKs |
| Department → parent Department | many children to optional parent | Same-company FK plus cycle validation |
| Membership → manager Membership | many reports to optional one manager proposal | ReportingLine same-company FKs plus cycle validation |
| Role → RolePermission | 1 to many | Same-company FK and catalog validation |
| Membership ↔ Role | many to many for each explicit scope binding | Same-company FKs, including department/team targets |

## Database-enforced boundaries

For each tenant entity with an Id, use alternate key **(CompanyId, Id)** where it is
a composite FK target. For example, TeamMembership's (CompanyId, TeamId) references
Team's (CompanyId, Id), and its (CompanyId, MembershipId) references Membership's
(CompanyId, Id). Both are required. A globally unique Guid PK by itself does not
stop a row from linking a company-A team to a company-B member.

EF supports [composite foreign and principal keys](https://learn.microsoft.com/en-us/ef/core/modeling/relationships/foreign-and-principal-keys).
Map them explicitly, with matching property order. Tenant-owned unique constraints
normally include CompanyId; global uniqueness is intentional only for global identifiers
such as issuer/subject, or proposed global locators such as Company.Slug.

Use NOT NULL for required fields, bounded strings, FK constraints, and explicit
unique/check constraints. Reject empty/invalid names and normalize agreed lookup
fields before persistence. Domain validation gives useful errors; DB constraints
close concurrent-write races. Translate unique violations into safe domain conflicts,
not raw SQL messages that reveal another account's data.

## Tenant filters are defense in depth

Use a request-scoped DbContext with an immutable validated tenant context and global
CompanyId query filters for tenant-owned reads. Identity's global account data and
cross-company membership selection need separate deliberate query paths, not a fake
"default company". The membership chooser may list only the authenticated account's
memberships before a tenant is selected.

[EF query filters](https://learn.microsoft.com/en-us/ef/core/querying/filters) are query
conveniences, not the sole security boundary. Explicitly authorize each operation;
validate/stamp CompanyId on writes, reject tenant reassignment and cross-tenant
references, and constrain raw SQL/bulk/admin paths separately. Test bypass paths;
calling IgnoreQueryFilters must never be a routine authorization shortcut. A
SaveChanges guard does not automatically protect ExecuteUpdate/Delete or raw SQL.

Account/company switching must not mutate an already-running operation's context.
The worker/job/event consumer must carry and validate explicit tenant/actor context,
not borrow whichever company happens to be selected in a browser.

## Deletion and retention

Default to Restrict/NoAction for business-reference FKs, chosen explicitly rather
than relying on EF required-relationship cascade defaults. Archive Company,
Department and Team; suspend/end memberships without deleting historical business
references. Remove pure join assignments deliberately in the owning transaction.

Account deletion is an orchestrated lifecycle, not a cross-service cascade. It needs
membership cleanup, last-owner recovery, credential/session revocation and the
agreed retention/anonymization policy. Do not promise immediate physical erasure or
retain personal identity profile snapshots forever without that policy.

There is no universal soft-delete base class in the proposal. Authentication revocation,
membership departure, archive status, and legal retention are different behaviors.
Uniqueness reuse after archive and slug/email reuse must be decided explicitly.

## Concurrency and transactions

Use optimistic concurrency for editable aggregates; surface conflicts rather than
silently overwriting newer values. Join uniqueness, identity links, invitation
consumption, last-login-method removal and last-owner updates need targeted
transactional handling in addition to Version. Use real-provider integration tests;
EF InMemory cannot establish relational FK/index/transaction guarantees.

Service-local transactions cannot atomically commit another service's database.
Validate AccountId with the owning service/contract and handle eventual suspension,
deletion and stale state explicitly. Reject unavailable required security information
rather than treating a cache miss or dependency outage as permission.

## Audit, outbox and projections

These concerns are distinct and are **not all initial business entities**:

- Audit records explain actor, company, operation, target, timestamp and safe change
  metadata. Never log passwords, invitation/reset tokens, bearer tokens or unnecessary
  provider claims. Delivery/storage, retention and tamper protections remain open.
- An outbox is service-local delivery infrastructure written in the same transaction
  as business changes when events are introduced. Proposed fields then: Id, Type,
  Version, OccurredAt, minimal Payload, processing/retry metadata; index pending work.
  It is not the audit history and not a reason to retain secrets in payloads.
- An inbox/deduplication record may support idempotent consumers once messaging exists.
- Read projections may duplicate minimal external identifiers/display data for queries;
  they are explicitly staleable copies, not shared writable entities or an authorization
  authority by default.

Do not create unused event infrastructure tables until a concrete producer/consumer
and its delivery guarantees are designed.

## Required negative tests

Cross-company joins and writes fail; duplicate memberships/identity links fail under
concurrency; pending/expired invitations cannot be replayed; two concurrent unlinks
cannot remove all login paths; role scopes cannot combine into broader grants; no
cross-company roles leak on switching; archive/suspension revokes access; department
and manager cycles are rejected; concurrent owner removals cannot orphan a company.
These are planned acceptance tests, not tests already executed.
