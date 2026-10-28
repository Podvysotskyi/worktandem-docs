# Authorization entities

**Status: scoped RBAC confirmed; relational design below proposed, not enforced yet.**
Authorization belongs to a company membership. Neither Account nor job title carries
cross-company administrative roles. Resource-owning services still authorize their own
operations using current membership/policy information and fail safely on revocation.

## CompanyRole

Required fields: Id Guid (PK), CompanyId Guid (FK Company), Name string(100),
NormalizedName string(100), IsSystem bool, CreatedAt/UpdatedAt UTC instants, Version Guid.
Unique (CompanyId, NormalizedName); alternate unique (CompanyId, Id). Custom roles
belong to one company. IsSystem prevents normal editing of reserved roles, not a
bypass of permission checks. Owner is a protected system role proposal.

## RolePermission

Required fields: CompanyId Guid, RoleId Guid, PermissionKey bounded string.
PK (CompanyId, RoleId, PermissionKey); FK (CompanyId, RoleId) → CompanyRole.
PermissionKey comes from a code-owned versioned catalog, e.g. `members.read` or
`departments.update`, not a user-authored expression. The catalog defines applicable
resource types and allowed scopes. A lookup table may mirror it if DB enforcement
is desired; its storage and synchronization are open. Unknown permission keys deny.

A role contains actions. A role assignment binds that action set to one scope.
Never union all actions and all scopes separately: a company-wide reader plus a
team-scoped editor must **not** become a company-wide editor.

## Scoped role assignments

Propose four explicit binding entities rather than a polymorphic ScopeId with no FK:

| Entity | Required fields | Primary key and references |
| --- | --- | --- |
| CompanyRoleAssignment | CompanyId, MembershipId, RoleId (Guid); AssignedAt UTC instant | PK first three fields; same-company member and role FKs |
| OwnRoleAssignment | CompanyId, MembershipId, RoleId (Guid); AssignedAt UTC instant | PK first three fields; same-company member and role FKs |
| DepartmentRoleAssignment | CompanyId, MembershipId, RoleId, DepartmentId (Guid); AssignedAt UTC instant | PK first four fields; same-company member, role and department FKs |
| TeamRoleAssignment | CompanyId, MembershipId, RoleId, TeamId (Guid); AssignedAt UTC instant | PK first four fields; same-company member, role and team FKs |

Every FK uses CompanyId plus the referenced Id. Index the role/target references
needed for reverse lookup and revocation. Join rows do not need surrogate IDs.
Validate allowed permission/scope combinations when defining or assigning roles;
invalid combinations deny rather than widening scope.

- Company scope covers the authorized resource type within that company, not other tenants.
- Own scope requires the resource service's explicit ownership rule, such as
  OwnerMembershipId. Creator/audit metadata is not automatically ownership.
- Department scope targets the named department only, not all descendants by default.
- Team scope targets the named team. It does not automatically include other teams
  the assignee joins later or arbitrary resources owned by team members.

The initial proposal assigns roles to individual memberships, not groups. Department
and team scope constrain resource access; merely being a department/team member does
not automatically assign a role. Group role inheritance can be designed later.
Each resource service must define how its objects belong to a scope; a client-supplied
TeamId does not establish that relationship. This schema is not generic ABAC.

## Protected invariants

- Evaluate complete grants and union their allowed results; no explicit-deny engine is
  proposed. If deny rules are needed, define precedence before adding tables.
- Require active account/session, active membership, active company, enabled module
  where relevant, and a matching permission/scope. Module availability alone grants nothing.
- Reserved Owner role is company-scoped only; retain at least one usable active owner.
  Role removal, membership suspension/departure and account suspension workflows must
  preserve/recover ownership under a defined policy. This is a multi-row and potentially
  cross-service invariant, not an ordinary CHECK constraint.
- Serialize competing owner changes (or use equivalent transaction-safe locking) and
  test last-owner races. Identity suspension needs coordination/recovery rather than a
  synchronous cross-database FK assumption; exact emergency recovery policy is open.
- Permission caches must be tenant/account scoped and invalidated/versioned on changes;
  long-lived session claims are not proof that membership or grants remain valid.
- Archive roles or require explicit removal/replacement of assignments before deletion;
  do not cascade silently into privilege changes. Record changes in the audit trail.

## Example

Member A has `members.read` through a company-scoped Reader role and `tasks.update`
through an Operations-team-scoped Editor role. The result is company member reading
plus Operations task editing. It is not company-wide task editing, and it gives no
access in another company where A is also a member.
