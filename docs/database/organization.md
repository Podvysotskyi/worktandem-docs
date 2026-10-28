# Organization entities

**Status: proposed schema for confirmed company-management direction.** All company
references below stay within the Organization database except AccountId, an Identity
service reference. See [integrity rules](./integrity) for composite tenant FKs and
[authorization](./authorization) for permission roles.

## Company

| Property | Type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Tenant/workspace ID |
| Name | string, required, max 200 | Display name, not globally unique |
| Slug | string, required, max 100 | Proposed stable normalized workspace locator |
| Status | required enum | Proposed Active, Suspended, Archived |
| CreatedAt, UpdatedAt, Version | required | Lifecycle/concurrency |

Unique normalized Slug proposed; identifiers/links must not rely on mutable display
names. Company is the Worktandem tenant, **not a CRM customer organization**. Future
customer records belong to their business service and have their own CompanyId.
Archive first; no broad cascade delete of all tenant history.

## CompanyMembership

| Property | Type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Stable company-member identity |
| CompanyId | Guid, required, FK Company | Tenant |
| AccountId | Guid, required, external reference | Worktandem account; no cross-service SQL FK |
| Status | required enum | Proposed Active, Suspended, Left |
| JobTitle | string?, max 200 | Company-specific title; not an access role |
| JoinedAt | UTC instant, required | First accepted membership |
| EndedAt | UTC instant? | Current departure state |
| CreatedAt, UpdatedAt, Version | required | Lifecycle/concurrency |

Unique (CompanyId, AccountId); alternate unique key (CompanyId, Id) supports tenant
FKs. Index (AccountId, Status) for company selection. Rejoining reactivates the same
membership under a reviewed workflow; historical changes go to audit, not duplicate
active/left rows. Proposed CHECK: EndedAt is populated only for Left, and not before
JoinedAt. Company-specific profiles belong here, not on the global account.

Invitation is separate: an email invitation must not create an active membership or
link identities before verified acceptance. Active membership alone does not grant
all permissions. Removal disables access promptly and retains references for history.

## CompanyInvitation

| Property | Type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Invitation ID |
| CompanyId | Guid, required, FK Company | Target tenant |
| RecipientEmail / NormalizedEmail | strings, required, max 320 | Intended recipient; not an account key |
| InvitedByMembershipId | Guid, required | Same-company inviter |
| TokenDigest | bytes, required | Digest of random invitation secret, never raw bearer value |
| Status | required enum | Pending, Accepted, Revoked, Expired proposal |
| CreatedAt, ExpiresAt | UTC instants, required | Lifetime |
| AcceptedAt / AcceptedByMembershipId | UTC instant? / Guid? | Set together on verified acceptance |
| Version | Guid, required | Concurrent consumption/revocation protection |

Unique TokenDigest; index (CompanyId, NormalizedEmail, Status) and (Status, ExpiresAt).
ExpiresAt > CreatedAt; acceptance fields populated iff Accepted. Both membership
references use (CompanyId, MembershipId) FKs. Expiry must be checked at request time,
not depend on a cleanup job changing Status. Do not use a time-dependent CHECK.

Proposed first slice grants no automatic elevated role from invitation metadata;
authorized administrators assign access after acceptance. If preselected invitation
roles are needed, explicitly model/revalidate those grants at acceptance. Verified
recipient control and authenticated accepting account are both required; email-match
alone neither links Google nor transfers an existing account.

## Department and DepartmentMembership

| Entity | Required fields | Optional fields | Keys / constraints |
| --- | --- | --- | --- |
| Department | Id Guid; CompanyId Guid; Name string(200); Status Active/Archived; CreatedAt, UpdatedAt, Version | ParentDepartmentId Guid? | PK Id; alternate (CompanyId, Id); FK Company; same-company parent FK; ParentDepartmentId != Id |
| DepartmentMembership | CompanyId Guid; DepartmentId Guid; MembershipId Guid; IsPrimary bool; AssignedAt UTC instant | None | PK (CompanyId, DepartmentId, MembershipId); both target FKs contain CompanyId |

Proposed multiple departments per member, at most one primary. Enforce primary
uniqueness with a provider-supported filtered/partial unique index on
(CompanyId, MembershipId) where IsPrimary, or a reviewed equivalent. Index
(CompanyId, MembershipId) for reverse lookup. Department name uniqueness is not
assumed; choose a business naming policy before adding such a constraint.

A parent FK cannot prohibit longer cycles: validate hierarchy edits transactionally,
including concurrent changes. Department authorization initially means the explicit
department only; descendants are not implicitly included. Archive does not erase the
hierarchy; block new assignments to archived departments.

## Team and TeamMembership

| Entity | Required fields | Optional fields | Keys / constraints |
| --- | --- | --- | --- |
| Team | Id Guid; CompanyId Guid; Name string(200); Status Active/Archived; CreatedAt, UpdatedAt, Version | Description string? | PK Id; alternate (CompanyId, Id); FK Company |
| TeamMembership | CompanyId Guid; TeamId Guid; MembershipId Guid; JoinedAt UTC instant | None | PK (CompanyId, TeamId, MembershipId); both target FKs contain CompanyId |

Teams are cross-department groups; there is **no required DepartmentId on Team**.
A member may join many teams. Index (CompanyId, MembershipId). Team membership or
team leadership must not silently grant administrative access. Team leaders, if
required as business roles, need a separate reviewed model from permission roles.

## ReportingLine

Proposed one current direct manager per member, within the same company. Fields:
CompanyId Guid, ReportMembershipId Guid, ManagerMembershipId Guid, AssignedAt UTC
instant (all required), plus Version Guid. PK (CompanyId, ReportMembershipId);
index (CompanyId, ManagerMembershipId). Both member FKs include CompanyId; CHECK
report != manager. Longer reporting cycles require transactional application checks.
Removing a reporting line or ending membership must not grant/reassign permissions.
Matrix reporting and effective-dated history are deferred, not silently inferred.

## CompanyModule

Proposed fields: CompanyId Guid, ModuleKey bounded string, IsEnabled bool, UpdatedAt
UTC instant and Version Guid, all required. PK (CompanyId, ModuleKey). ModuleKey
must refer to the versioned application catalog, not an arbitrary client string.
This is a configuration record, not a module's business-data owner or a permission.
An absent optional-module record means disabled in the proposed default-deny model.
Foundational Company/Identity capabilities are not optional modules users can disable.
Dependencies must be validated before enabling/disabling; retain existing business data.
