# Organization entities

**Status: proposed schema for confirmed company-management direction.** All company
references below stay within the Organization database except AccountId, an Identity
service reference. See [integrity rules](./integrity) for composite tenant FKs and
[authorization](./authorization) for permission roles.
The [product specification](../product/identity-and-company-access) controls confirmed
behavior. E06/E07 in the [readiness register](../implementation/readiness) select
first-slice form/review defaults; E08 invitations remain a later gated slice.
The following detailed fields and later lifecycle transitions are logical modeling choices,
not generated entities or migrations.

## Company

| Property | Type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Tenant/workspace ID |
| Name | string, required, max 200 | Display name, not globally unique |
| Slug | string, required, max 100 | Proposed stable normalized workspace locator |
| Status | required enum | E07 selects single Pending/Approved/Rejected/Suspended/Archived vocabulary; Pending/manual approval is user-confirmed, later operational transitions remain scoped |
| CurrentApplicationId | Guid? | Latest submitted application; tenant-consistent reference if stored |
| CreatedByAccountId / CreationOperationId | Guid / Guid, required | External creator and stable creation operation; durable unique pair prevents duplicate initial companies after retry |
| CreatedAt, UpdatedAt, Version | required | Lifecycle/concurrency |

Unique normalized Slug proposed; identifiers/links must not rely on mutable display
names. Company is the Worktandem tenant, **not a CRM customer organization**. Future
customer records belong to their business service and have their own CompanyId.
Archive first; no broad cascade delete of all tenant history.
E06 uses unique (CreatedByAccountId, CreationOperationId) independently of short-lived
HTTP idempotency storage. Normal registration receives its stable operation ID from
Identity; the initial platform owner can request its optional company-creation
operation later. No cross-service FK or distributed registration transaction is implied.

Pending is a business-access gate, not an active membership or global account block.
Proposed transitions: Pending → Approved/Rejected; Rejected → Pending on a versioned
resubmission; Approved ↔ Suspended; Approved/Suspended → Archived under a reviewed
retention policy. E07 selects one Company.Status for the first slice; separate
review/operational axes are not selected in parallel. Owner activation happens only
after approval, in the same owning
transaction as the company/review decision. A platform UI status label is not enforcement.

## CompanyApplication and ReviewDecision

Selected E07 **owner candidate = application's ApplicantAccountId**, not an Active
membership with an Owner role. This keeps JoinedAt meaningful and avoids creating
privileges before approval. A separately non-active candidate membership is not
selected alongside this model; do not add a second candidate table by assumption.

| Record | Required proposed fields | Optional proposed fields | Keys, indexes and lifecycle |
| --- | --- | --- | --- |
| CompanyApplication | Id, CompanyId, ApplicantAccountId Guid; SubmissionNumber int; CompanyName string(200); CountryCode bounded string; BusinessDescription string(2000); ApplicantRoleDescription string(200); SubmittedAt UTC; Version Guid | Website string?, LegalRegistrationId string? | PK Id; alternate (CompanyId, Id); unique (CompanyId, SubmissionNumber); company FK; index SubmittedAt/CompanyId for authorized queue; Restrict history deletion |
| ReviewDecision | Id, CompanyId, ApplicationId, ReviewerAccountId Guid; ReviewedApplicationVersion Guid; Outcome Approved/Rejected; DecidedAt UTC; PlatformAuthorizationEvidenceRef bounded string; IdempotencyKey bounded string | ApplicantVisibleReason string?, InternalNote string? | PK Id; same-company application FK; unique (CompanyId, ApplicationId) for one terminal decision per submission; index (CompanyId, DecidedAt); Restrict deletion |

All AccountId and authorization-evidence references above are external contracts,
not SQL FKs. E06 selects form requirements/lengths as first-slice engineering
defaults, not separately user-confirmed legal fields.
Keep reviewed submissions immutable;
edits/resubmission produce a new version/record under agreed O03 rules. If a draft
form is persisted, model its incomplete fields separately from a submitted snapshot.

If Company.CurrentApplicationId is stored, use (Company.Id, CurrentApplicationId) →
CompanyApplication(CompanyId, Id); null is allowed during initial creation before
setting the pointer in the same transaction. Resolve insert order without broad
cascades or a global required circular FK. Current submission is one pointer, not
an assumption that the highest client-supplied number is authoritative. Advancing
the current submission or changing review-relevant company state advances Company.Version.

Proposed checks: SubmissionNumber > 0; reviewed version/outcome must agree with the
submitted version; E07 requires a non-empty applicant-visible rejection reason.
Internal notes have separate authorization and are not returned to the
applicant. Authorize the current platform capability and match the immutable
submission/version. Approval additionally requires, atomically with its effects,
Company.Status = Pending, Company.CurrentApplicationId = the requested submission
ID, and Company.Version = the expected company version. Use an equivalent
authoritative current-submission comparison if another representation is selected.
A superseded submission cannot be approved merely because its own Version matches.
See the [approval transaction](./integrity#application-approval-transaction).
Later grant revocation does not delete historical reviewer evidence.
Scope/deduplicate idempotency by actor + operation + company + payload, not by a
globally reusable client key alone. Audit persists with approval; first-slice outcomes
are shown through in-app status. Add notification outbox only for a selected actual
delivery channel; network notification failure must not reverse an approval.
An initial Identity account can exist without a committed company when Organization
is unavailable: resume the company form/creation operation idempotently, with no
business privileges. See the [resumable registration contract](../implementation/readiness#company-and-invitation-boundaries).

## CompanyMembership

| Property | Type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Stable company-member identity |
| CompanyId | Guid, required, FK Company | Tenant |
| AccountId | Guid, required, external reference | Worktandem account; no cross-service SQL FK |
| Status | required enum | Independent per-company membership state; Active/Suspended/Left names proposed, not a copy of Account.Status |
| JobTitle | string?, max 200 | Company-specific title; not an access role |
| JoinedAt | UTC instant, required | First activated membership, through approved owner activation or invitation acceptance |
| EndedAt | UTC instant? | Current departure state |
| CreatedAt, UpdatedAt, Version | required | Lifecycle/concurrency |

Unique (CompanyId, AccountId); alternate unique key (CompanyId, Id) supports tenant
FKs. Index (AccountId, Status) for company selection. Rejoining/reinstatement requires
an explicitly authorized workflow; do not auto-reactivate a Suspended/Left membership
or restore its former elevated grants on invitation acceptance. Reuse/history policy
is O05/O09. Proposed CHECK: EndedAt is populated only for Left, and not before
JoinedAt. Company-specific profiles belong here, not on the global account.

Invitation is separate: an email invitation must not create an active membership or
link identities before verified acceptance. Active membership alone does not grant
all permissions. Removal disables access promptly and retains references for history.
An approved active company's last usable Owner needs transaction-safe protection;
a Pending company intentionally has only an applicant/candidate. Optional domain
rules honor authorized manual invitation eligibility on later requests; membership
suspension still denies regardless of eligibility or directory presence.

**Confirmed global-versus-company separation:** platform ban sets Account.Status =
Suspended and requires a reason/history in Identity. It does not overwrite this
membership's state or revoke every role by mass update. Each company can retain
its independent Active/Suspended/Left or separately agreed removal state. Global
reinstatement re-evaluates these current states; it cannot unsuspend/rejoin a
membership or recreate grants revoked independently. A company administrator's
membership-management rights do not include global user banning. Company-level
reason/history and removal/reinstatement policy remain separately reviewable.

## CompanyInvitation

| Property | Type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Invitation ID |
| CompanyId | Guid, required, FK Company | Target tenant |
| RecipientEmail / NormalizedEmail | strings, required, max 320 | Intended recipient; not an account key |
| EmailMatchingPolicyVersion | bounded string, required | One agreed conservative matching function for issue/discovery/acceptance |
| InvitedByMembershipId | Guid, required | Same-company inviter |
| Origin | required bounded enum | AdminManual in current scope; not automatic domain/directory enrollment |
| Status | required enum | Pending, Accepted, Declined, Revoked, Expired proposal |
| CreatedAt, ExpiresAt | UTC instants, required | Lifetime |
| AcceptedAt / AcceptedByMembershipId | UTC instant? / Guid? | Set together on verified acceptance |
| AcceptedByAccountId / AcceptedIdentityEvidenceRef | Guid? / bounded string? | Server-validated accepting account and current Google proof reference, set with acceptance; no raw ID token |
| TerminalAt | UTC instant? | Set for any terminal state |
| Version | Guid, required | Concurrent consumption/revocation protection |

Use alternate (CompanyId, Id) for tenant-bound references; indexes
(CompanyId, NormalizedEmail, Status), (NormalizedEmail, Status, ExpiresAt) for the
explicit account inbox path, and (Status, ExpiresAt) for cleanup. No unauthenticated
email-search endpoint is implied. Proposed one outstanding offer per company/address
uses race-safe uniqueness; an expired-but-not-cleaned Pending row must be handled
transactionally before resend/reinvite. Final duplicate/lifetime policy is P04/O05.

Proposed checks: ExpiresAt > CreatedAt; accepted proof/actor/member fields populated
iff Accepted; TerminalAt present iff terminal and not before CreatedAt. Both member
references use (CompanyId, MembershipId) FKs. AcceptedByAccountId must match that
membership's AccountId, validated locally; evidence ownership/freshness is checked
through the Identity contract. Restrict deletion while referenced by eligibility
or history. Expiry is checked at request time, not only by a cleanup job; do not
use a time-dependent SQL CHECK.

**One invitation, two entry points:** email and in-app use this record. An
authenticated no-company inbox matches current evidence for the account's single
Google identity. A contact email, stale snapshot, email link alone or another
account's Google identity is insufficient. On mismatch, switch to the matching
identity's Worktandem account or start its own registration; never attach a second
Google identity or merge by email. O07 additional same-address mailbox evidence for
non-Gmail/no-hd identities remains open; no OTP/proof policy is adopted here.

**Later invitation default E08:** member role within current delegation authority;
O07 gates acceptance before rollout. When implementing that slice,
represent offered roles/scopes with explicit same-company invitation/role/target
bindings equivalent to the [membership scope bindings](./authorization#scoped-role-assignments).
Revalidate inviter delegation, current role/scope and accepting membership at commit;
do not add an unvalidated polymorphic ScopeId or accept a client role list. Existing
members gain no automatic elevated roles; suspended/removed members need the
separate authorized reinstatement workflow. An unconfigured initial role policy
cannot be treated as permission to expose business endpoints.

Suggested outcomes remain proposed: Pending → Accepted/Declined/Revoked/Expired;
seven-day expiry and rotating the old link on resend are P04, not confirmed defaults.
An already-active member may return an idempotent membership result without role
escalation; whether it records a new manual eligibility requires the explicit
authorized acceptance policy. Acceptance/revoke/resend races have one winner;
retries do not revive a terminal offer or duplicate grants/notifications.

## InvitationLinkCredential

Proposed optional current link record: CompanyId/InvitationId Guid (composite PK
and tenant-consistent FK to Invitation), Generation int, TokenDigest bytes,
CreatedAt/ExpiresAt UTC (required); RevokedAt UTC?; Version Guid required. Unique
TokenDigest; index ExpiresAt; positive generation and expiry after creation.
Restrict delete until controlled credential cleanup; do not cascade away invitation
history. Validate link expiry against invitation expiry in the workflow.

There may be zero records when no email link has been issued; a link record's
digest is required only when that record exists. Resend rotates generation/digest
under the invitation version; old generations cease to work. An email-link GET
does not consume membership. **Authenticated in-app acceptance does not inherently
require this emailed token.** Its account/Google evidence and unresolved O07 policy
are checked separately. A digest is not a second invitation or an email-only login.

## Manual membership eligibility

Confirmed result: authorized manual outside-domain invitations permit joining and
continued company use even with optional Google/domain controls. **Proposed minimal
record** ManualInvitationEligibility: CompanyId, MembershipId, AcceptedInvitationId
Guid, GrantedAt UTC, Version Guid (required); RevokedAt UTC? and RevokedByMembershipId
Guid? (optional, subject to O08 authority policy). Proposed PK
(CompanyId, AcceptedInvitationId), tenant FKs to member/invitation and optional
revoking member; index (CompanyId, MembershipId, RevokedAt). Check chronology,
validate accepted invitation/recipient/member agreement transactionally, and retain
history with Restrict deletion.

This is eligibility, not a company role, and does not override account/company/member
suspension. If directory synchronization is adopted, its eligibility can coexist
independently: directory absence/revocation must not erase a valid manual grant;
sync must never undo explicit suspension. Do not use one overwriteable Source flag.
Directory grant schema, revocation/expiry, identity replacement and exception scope
remain open; no generic provisioning ledger is prescribed before sync scope exists.

## Optional Google integration and domains

These logical records belong to the selected integration owner, not necessarily a
new deployable service or Organization DbContext. If service-local they may use
company FKs; otherwise CompanyId and actor references are external contract IDs.

| Record | Required proposed fields | Optional proposed fields | Constraints/lifecycle |
| --- | --- | --- | --- |
| GoogleConnection | Id, CompanyId, AuthorizedByAccountId Guid; ConsentPrincipalReference bounded string; GrantedScopes bounded set; ConsentAt UTC; Status Connected/Revoked/Error; Version Guid | ProtectedSecretReference bounded string?, RevokedAt UTC?, LastCheckedAt UTC? | PK Id; index (CompanyId, Status); restrict deletion pending reviewed disconnect/secret cleanup; token values never copied into docs/audit |
| CompanyDomainPolicy | Id, CompanyId Guid; DomainAscii bounded string; Status PendingVerification/Verified/Revoked; PolicyVersion Guid | ControlEvidenceReference bounded string?, VerifiedAt UTC?, RecheckAt UTC?, RestrictionMode bounded enum? | PK Id; proposed unique (CompanyId, DomainAscii); index (Status, RecheckAt); verification evidence required for Verified; no global domain-ownership uniqueness assumption |

Separate company-admin OAuth consent for requested APIs from login; request only
feature scopes. Record the validated consent principal separately from the Worktandem
administrator who initiated configuration; consent is not inferred from that actor's
login association. A domain suffix, typed website, user hd claim or successful Google
login does not prove company/domain control or confer owner/platform rights.
Domain verification/conflicts, enabled policy semantics and outage/revocation rules
remain O08. Optional restriction cannot implement the superseded strict-no-guests
proposal: preserve explicit manual outside-domain eligibility on every relevant
access check. Directory sync and domain auto-join remain unadopted separate scope.

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
