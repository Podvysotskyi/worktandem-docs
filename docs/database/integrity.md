# Relationships, integrity and lifecycle

**Status: implementation requirements and proposed enforcement plan.** These checks
must be implemented and tested before the schema is considered ready.

## Relationship map

| Relationship | Cardinality | Enforcement |
| --- | --- | --- |
| Account → Google ExternalIdentity | 0..1 in storage; exactly one usable login for active Google-only account | Identity-local FK, global issuer/subject ownership and Google-scoped account uniqueness; future-provider cardinality open |
| Account → PlatformGrant | 1 to many capability grants | Identity/platform-access-local FK; no tenant role inheritance |
| Account → CompanyMembership | 1 to many across services | External AccountId reference, no SQL FK |
| Company → CompanyApplication → ReviewDecision | 1 to many submitted versions; at most one terminal decision per submission proposed | Same-company FKs; immutable reviewed version; authorized platform proof by contract |
| Application → applicant account | One owner candidate reference, not active membership | External account contract; activation only through approved review workflow |
| Company → Invitation → InvitationLinkCredential | Many invitations; optional current link credential per invite | Same-company FKs; email and in-app share one invitation; link token not inherently required in-app |
| Company → CompanyMembership | 1 to many | Local FK; unique company/account pair |
| Membership → ManualInvitationEligibility | 0 to many auditable accepted-invite grants proposed | Same-company accepted invite/member references; does not override suspension/RBAC |
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

The same deliberate account-level boundary serves onboarding/status and an inbox
matched to the account's single Google identity using current verified evidence.
O07 additional mailbox evidence remains unresolved. Platform review queries use
explicit platform capabilities and separately protected internal-note projections,
not a fake tenant or a company Owner role. Any bypass of normal tenant filters must
be narrow, authorized and tested for both data disclosure and writes.

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

Application/review decisions, invitation terminal states and manual eligibility
retain history under an agreed policy. Email-link credentials can be revoked and
cleaned independently without deleting the underlying invitation/acceptance evidence.
Raw reusable tokens never belong in audit. Domain/API grant revocation needs secret
cleanup and an explicit fail/recovery policy, not automatic erasure of manual members.

Account deletion is an orchestrated lifecycle, not a cross-service cascade. It needs
membership cleanup, last-owner recovery, identity/session revocation and the
agreed retention/anonymization policy. Do not promise immediate physical erasure or
retain personal identity profile snapshots forever without that policy.

There is no universal soft-delete base class in the proposal. Authentication revocation,
membership departure, archive status, and legal retention are different behaviors.
Uniqueness reuse after archive and slug/email reuse must be decided explicitly.

## Concurrency and transactions

Use optimistic concurrency for editable aggregates; surface conflicts rather than
silently overwriting newer values. Join uniqueness, single-Google identity enrollment,
invitation consumption, only-login protection and last-owner updates need targeted
transactional handling in addition to Version. Use real-provider integration tests;
EF InMemory cannot establish relational FK/index/transaction guarantees.

Service-local transactions cannot atomically commit another service's database.
Validate AccountId with the owning service/contract and handle eventual suspension,
deletion and stale state explicitly. Reject unavailable required security information
rather than treating a cache miss or dependency outage as permission.

### Application approval transaction

Proposed P03 transaction: validate current operator capability/evidence and exact
expected immutable submission version. In that same Organization transaction,
require **Company.Status = Pending**, **Company.CurrentApplicationId = the requested
submission ID**, and **Company.Version = the expected company version** before any
approval effects. If a different current-submission representation is selected,
enforce the equivalent authoritative current-submission comparison. These guards
must participate in the atomic state transition, not only an earlier read/check.
Changing the current submission or review-relevant company state advances
Company.Version; a matching old submission's own immutable version is insufficient.

Only after those guards succeed, record one terminal ReviewDecision, change company
state, activate applicant membership/Owner grant on approval, and persist audit plus
required notification intent. Use unique application decision and company/account
membership constraints with version checks. Pending candidate has no active owner
privileges; last-active-owner rules begin at activation. Rejected submissions do
not activate membership. Resubmission creates new reviewable history under O03.

A retry with the same actor/company/operation/payload returns the original result;
another reviewer or edited version cannot overwrite it. No network calls inside the
transaction. If Identity/platform access is a separate service, specify validated
authority freshness/revocation and recoverable contracts; do not claim a distributed
SQL transaction across service databases.

### Invitation acceptance transaction

Resolve the accepting account's current Google proof and O07 evidence policy. Read
the one underlying invitation, check actual expiry/current status, eligible company,
recipient matching, inviter delegation and offered scope policy. Honor explicit
manual outside-domain eligibility, without overriding suspension. In one owning
transaction, consume the invitation, establish at most one authorized membership
and permitted grant set, record manual eligibility if that policy applies, and
persist acceptance/audit plus required delivery intent.

Accept/revoke/resend/decline/expiry races have one committed terminal outcome.
Replayed same-actor acceptance returns its recorded result; another actor gains
nothing. An expired row still marked Pending cannot be accepted; an old resend-link
generation fails. In-app consumption does not inherently require a link digest or
emailed token, while same-address evidence for non-Gmail/no-hd is still O07. Viewing
an email-link GET must not consume anything.

Unique membership/grant keys and versions close duplicate-write races. Existing
active membership does not permit elevated role upgrades; Suspended/Left membership
cannot be reactivated with old grants by merely accepting a new invitation. Precise
reinstatement, duplicate invitation and role defaults remain O05, not an implied
automatic reactivation path.

### Suspension, policy and session changes

Validate session/account, approved company, active membership, eligibility and full
role/scope at protected endpoints. Cache invalidation/versioning must have a defined
revocation bound (O09/O11); a long-lived token or selected company is insufficient.
Google email changes never change issuer/subject ownership or inherit a former
mailbox holder's account. No second Google identity or unrestricted replacement is
allowed; any later recovery/replacement workflow needs atomicity and revocation.

If directory sync is adopted, track independent directory/manual eligibility; losing
one source does not destroy another. Neither directory events nor consent refresh
reactivates an explicit suspension. Optional domain checks honor accepted manual
outside-domain membership at later access, not merely at invitation consumption.

## Audit, outbox and projections

These concerns are distinct and are **not all initial business entities**:

- Audit records explain actor, company, operation, target, timestamp and safe change
  metadata, reviewed application version and safe authorization/proof references.
  Never log invitation tokens, API secrets, bearer tokens or unnecessary
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

These are planned tests, not checks already executed by this documentation change.

| Area | Required negative/concurrency coverage |
| --- | --- |
| Google identities | Duplicate issuer/subject across accounts and a second Google on one account both fail under races; active account cannot lose its only usable login; email collisions do not merge accounts |
| Approval | Pending applicant cannot read/write business/member/invite data; two decisions have one winner; non-Pending company, mismatched Company.Version or superseded prior submission fails with no approval/owner effects even if that prior submission's immutable version still matches; rejection creates no active membership |
| Platform separation | Company Owner cannot review/grant platform access; forged/stale operator evidence fails; internal notes remain protected |
| Invitations | In-app/no-company lookup is recipient-authorized with current evidence; wrong account/email and stale/reassigned-email discovery fail; no differing-email OTP or token-only membership |
| Invite races | Accept versus revoke/resend/expiry has one outcome; terminal/replayed/old-link requests create no grants; exact expiry checked without cleanup dependency |
| Membership/grants | Already-member invitation cannot escalate roles; removed/suspended member cannot regain former privileges; cross-company role/member/scope FKs fail |
| Optional integration | Accepted manual outside-domain member retains assigned access despite domain policy/directory absence; explicit suspension overrides both paths; consent failure does not silently weaken policy |
| Request context | Account/company/tab switches cannot rebind queued writes or leak cached data; revocation stops access within agreed bound; account-level routes do not require a fake tenant |
| Structure/lifecycle | Department/manager cycles rejected; scope unions do not widen grants; concurrent owner changes cannot orphan an activated company; restrict deletion preserves required history |
| Provider/operations | Real-provider FK/index/transaction checks, raw SQL/bulk/admin bypass tests, notification deduplication and audit/secret review; no EF InMemory-only claim of relational integrity |
