# Authorization entities

**Status: scoped RBAC confirmed; relational design below proposed, not enforced yet.**
**Tenant authorization** belongs to a company membership. Platform capabilities are
separate explicit [PlatformGrant](./identity#platformgrant) records, not company roles.
Neither a job title, tenant Owner role nor email/domain confers platform authority.
Resource-owning services authorize their own operations using current information,
including company approval, and fail safely on revocation. No UI route enforces this.

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
- Require active account/session, active membership, approved eligible company, enabled module
  where relevant, and a matching permission/scope. Module availability alone grants nothing.
- Reserved Owner role is company-scoped only; an activated approved company needs
  at least one usable active owner. Pending applications intentionally have a
  candidate, not an Active owner membership. Selected E07 approval activates the
  candidate and Owner grant together with company/review state in Organization.
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

## Invitations and eligibility are not role grants

Any-email invitations and their authenticated in-app entry point use the same
invitation record. Issue/revoke/resend needs the relevant company permission;
E07 disallows these operations for Pending companies. Later E08 role offers remain
within current inviter delegation and are revalidated at acceptance.
No invite grants platform authority or reinstates a suspended/removed member's
former privileges. An already-active member is not silently promoted by a stale offer.

The accepting account's single Google identity must provide current verified email
matching the invited address. Evidence policy O07 remains open for non-Gmail/no-hd;
email-link possession and an editable contact address do not replace that identity.
Google identity mismatch switches Worktandem accounts, never adds a second Google.

**Manual outside-domain eligibility is confirmed:** optional integration/domain
checks must allow authorized manually invited members to use the company within
their assigned roles after acceptance. Store/revalidate the auditable eligibility;
do not admit someone merely because an unaccepted invitation exists. Later directory
absence must not erase an independent manual grant, and directory membership must
not undo suspension or add a role automatically. Company/account/member suspension
and tenant RBAC still override both eligibility paths. Module availability grants nothing.

## Account and platform query paths

Account settings, onboarding/status and pending-invitation discovery are deliberately
account-authorized paths without an approved tenant. Return only the authenticated
account's relevant data using current identity proof; do not expose a general email
lookup or use an arbitrary CompanyId to bypass normal filters. E07 keeps
other approved company memberships usable while one company is Pending.

The separate Nuxt operator app calls platform endpoints with a valid account/session,
explicit non-revoked platform capability and the selected assurance/recency policy.
It need not borrow a tenant membership. Company review uses the submitted company
and application version, with validated platform authority before the Organization
transaction. Internal review notes and operational evidence have separate read
permissions. Platform grants do not automatically confer tenant business-data access.
The live Identity contract checks the requested capability and E12 assurance for
this actor/session/action, not only account status. Organization uses the result
immediately before its transaction; an already-admitted command may finish after
concurrent remote revocation. Identity-owned grant writes recheck under local locks.
The initial platform owner receives explicit owner/admin grants only through the
[one-time secret-protected bootstrap](../implementation/readiness#one-time-platform-bootstrap).
Company creation/membership is optional for platform operation; applying for a
company later still requires a different authorized reviewer. Empty account count,
email/domain, tenant role or a setup-page visit never grants platform authority.
The initial owner can authorize that separate registered reviewer through the
minimal audited platform-grant command, without creating tenant membership or
granting a self-approval exception.

E05 selects bootstrap; E07 denies self-review; E12 selects privileged-assurance
defaults for owner review, with controlled recovery/rollout still gated. Do not seed
a real operator or infer assurance
from Google sign-in, email suffix, hd or a frontend access label. Grant revocation
affects future actions without deleting historical ReviewDecision records.

## Platform Users management and suspension precedence

**Confirmed:** platform-wide Users list/detail/manage, including global ban, belongs
to explicit operator authority. Company administrators cannot enumerate/manage all
platform accounts or globally ban someone through their tenant role. Exact
capability keys and read/manage/suspend/reinstate split remain open; the backend
must enforce the relevant authority, not rely on the admin app's route or button.

Global ban uses Account.Status = Suspended with a mandatory nonempty reason and
actor/time/transition audit. It denies protected operations across that account's
companies even with Active memberships or valid manual/domain eligibility.
CompanyMembership.Status remains independent; global suspension is not a mass
membership update. A company-specific suspension does not globally suspend the
account or another company's membership.

Reinstating the global account does not unsuspend/rejoin a membership, remove a
company's own suspension, or recreate revoked tenant/platform grants. Evaluate
the current independent gates on every protected operation; do not restore a
pre-ban permission snapshot. The target account's sessions must be invalidated/
revoked with server-side current-status enforcement. Other independently signed-in
Worktandem accounts are not merged into that account's ban/session state.

Users detail may expose global status, authorized membership-status metadata and
transition history under the selected visibility policy; it does not imply broad
tenant business-data browsing. E04/E11 select per-tab server-session context,
revocation/new-sign-in semantics and live status checks; E12 scopes
privileged assurance before rollout. DisplayName-only editing and internal reasons
are the engineering defaults, with no timed bans or generic unrestricted account
update. Recovery/ownership coordination remains scoped O09/O10/O16. Public global status/removal writes remain
server-disabled pending ownership coordination, including direct API calls; no
UI-only owner filter or unavailable authority can bypass that gate.

## Authorization acceptance examples

These are future tests, not executed feature verification:

| Scenario | Required result |
| --- | --- |
| Company Owner calls platform review/grant API | Denied without relevant explicit platform grant |
| Operator with review capability but no tenant membership | May perform authorized versioned review; no implicit access to company business records |
| Pending applicant supplies Owner role or Approved status in a request | Business/invite/member writes denied; only allowed account/status operations |
| Manual outside-domain member is missing from a directory | Retains explicit manual eligibility and only assigned permissions; suspension still denies |
| Invite role/scope points to another company, deleted role or stale delegation | No unauthorized grant or automatic reinstatement; safe conflict/reviewed fallback |
| Same account selects another company; another Worktandem account is signed in | Validate actor/company separately; no union of roles, identities or caches |
| Active membership but Account.Status = Suspended | Denied in every company; independent membership/grant records unchanged |
| Reinstated account with one suspended/removed membership or revoked grant | Only current authorized memberships/grants can work; no restoration or tenant-suspension bypass |
| Company administrator calls Users/global-ban API | Denied; tenant role never implies platform-wide user-management authority |
| Authorized ban has null/blank reason or forged actor | Denied with no status/history change; successful ban records validated actor/time/reason |

## Example

Member A has `members.read` through a company-scoped Reader role and `tasks.update`
through an Operations-team-scoped Editor role. The result is company member reading
plus Operations task editing. It is not company-wide task editing, and it gives no
access in another company where A is also a member.
