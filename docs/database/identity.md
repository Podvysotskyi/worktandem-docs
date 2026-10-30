# Identity entities

**Status: logical requirements and proposed fields; no authentication implementation.**
The [canonical product specification](../product/identity-and-company-access) and
[ADR-003](../architecture/decisions#adr-003-one-google-identity-per-worktandem-account)
control current behavior. Google-only sign-in is confirmed; local credentials and
multiple Google identities on one Worktandem account are excluded.
The [readiness register](../implementation/readiness) selects framework OIDC,
Identity-owned server sessions and first-slice mappings; future-provider cardinality
and detailed deployment/recovery scope remain distinct.

## Account

A stable global actor, independent of company membership or a mutable Google email.

| Property | Proposed type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Internal actor ID |
| DisplayName | string, required, max 200 | User-facing name |
| PrimaryEmail | string?, max 320 | Optional contact/profile address, never an independent login or invitation authority |
| NormalizedPrimaryEmail | string?, max 320 | Optional contact lookup using the selected normalization policy |
| Status | required enum | Suspended is the confirmed global-ban state; Active/Closed and full transition vocabulary remain proposed |
| InitialRegistrationOperationId | Guid? | E06 stable normal-registration correlation, absent for bootstrap; not CompanyId or an authorization flag |
| CreatedAt, UpdatedAt, Version | required | UTC lifecycle metadata and concurrency token |

Index NormalizedPrimaryEmail only for a concrete lookup. Do not infer global email
uniqueness or merge accounts by email. Contact verification, if ever modeled, does
not replace the accepting Google identity's current verified email. O06/O07 in the
product specification govern normalization and current-mailbox evidence.

An otherwise eligible account without an approved membership can use authorized account/onboarding,
status and invitation routes. A company's Pending status must not become an account
suspension; E07 keeps access to other independently approved memberships available.
Do not add CompanyId, authoritative CurrentCompanyId or company roles to Account.
Account suspension is separate from company or membership suspension. Global ban
uses this Status with a mandatory nonempty reason/description and actor/time/history;
do not add IsBanned. It denies protected access across companies without writing
CompanyMembership.Status or erasing grants. Reinstatement does not activate
independently suspended/removed memberships or recreate revoked grants/sessions.

## Account status transition history

**Confirmed information:** global suspension requires nonempty reason/description;
retain authorized actor, time, before/after state and transition history. **Proposed
logical record** AccountStatusTransition belongs to Identity beside Account, not
Organization membership history. This is not a generated EF entity or an assertion
that a particular audit-storage product/table has been selected.

| Property | Proposed type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Immutable transition/event ID |
| AccountId | Guid, required, local FK Account | Target account |
| ActorAccountId | Guid, required, local FK Account | Authenticated authorized platform actor, never an arbitrary client ID |
| PreviousStatus / NewStatus | bounded enums, required | Before/after global state |
| OccurredAt | UTC instant, required | Server-controlled decision time |
| Reason | bounded string?, proposed max 2000 | Non-null/nonempty after trimming when NewStatus = Suspended; reason policy for other transitions remains open |
| ExpectedAccountVersion / ResultAccountVersion | Guid, required | Proposed concurrency/audit correlation, not a replacement for atomic status validation |
| OperationId | bounded string, required | Proposed actor/operation/payload-bound idempotency reference |

Index (AccountId, OccurredAt, Id) for ordered history; define operation-key uniqueness
in the owning idempotency design. Prefer Restrict/NoAction for account/actor FKs
and controlled retention/anonymization so deleting an actor does not silently erase
required history. Reject a null, empty or whitespace-only suspension reason in the
Application/domain workflow, with a provider-compatible storage constraint where
the chosen mapping permits it. Reject inconsistent prior/version transitions;
commit Account.Status/Version and history together. Do not rewrite a prior reason
on retry. This record supplies history without duplicating a current IsBanned flag.

The readiness register selects DisplayName-only editing, internal suspension
reasons and no timed suspension for the first slice. Reinstatement reasons and
controlled recovery/ownership coordination remain scoped O16/O09/O10 choices.
Do not infer a new SuspendUntil field or scheduled automatic reinstatement. Require
current account eligibility plus explicit platform authority on Users list/detail/
manage endpoints. Account suspension requires session revocation/invalidation and
current-status enforcement. E11 selects no positive status cache and revocation of
all target sessions in Identity's suspension transaction; already-authorized
in-flight work may finish. Reinstatement requires new sign-in and never revives
revoked sessions. See [consistency requirements](./integrity#global-account-suspension-and-reinstatement).
Public global status writes remain backend-disabled until the readiness register's
cross-service ownership-safety gate is resolved; fixtures test enforcement meanwhile.

## SetupState and temporary Google proof

The first owner/admin is confirmed to use an entered server-env setup secret and
need not create/join a company. E05 selects a durable singleton SetupState in
IdentityDbContext: Id (constant bounded string PK), Status Incomplete/Completed and
Version Guid required; CompletedAt UTC? and InitialOwnerAccountId Guid? (local FK,
Restrict). Completion fields are present iff Completed. A migration seeds only the
incomplete marker, never an account, Google subject or secret.
With this Restrict FK, retain the initial account as a closed/anonymized tombstone;
first-slice account lifecycle does not physically purge it. Any later approved
erasure mapping must preserve Completed and its audit, never reopen setup.

Lock that row and atomically validate fresh unused PendingLogin, no accounts,
incomplete setup, the entered environment secret and E12's validated same-identity
MFA/authentication freshness before creating Account,
its unique Google association, owner/admin grants, audit and Completed state.
Normal registration is closed until completion and all account-creation paths obey
the gate. The marker is not derived from user count and is never deleted/reset by
account cleanup. Missing marker/configuration or inconsistent existing accounts
fails closed. InitialOwnerAccountId is historical evidence, not permanent role
authority; current operator grants determine access.

PendingLogin is a five-minute server-only pre-account capability bound to the
browser/OIDC flow, validated issuer/subject/email evidence and consumption state;
it grants no permanent account/session/company authority. Its exact adapter storage
uses the chosen auth integration, with expiry/one-time-use checks; never persist
the entered bootstrap secret or reusable ID token as audit evidence. The selected
[bootstrap protocol](../implementation/readiness#one-time-platform-bootstrap) defines
concurrency, retries, permanent closure and controlled recovery separately.

## ExternalIdentity

| Property | Proposed type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Identity association ID |
| AccountId | Guid, required, FK Account | Owning Worktandem account |
| Provider | required bounded string | Google in the current scope |
| Issuer | required bounded string | Canonical validated issuer |
| Subject | required bounded string | Stable case-sensitive provider subject |
| Email | string? | Last observed mutable provider email; not an account key |
| EmailVerified | bool, required | Observed claim, not universal current-mailbox authority |
| HostedDomain | string? | Validated Workspace claim snapshot, not company ownership |
| ObservedAt, AssociatedAt | UTC instants, required | Evidence observation and initial association |
| LastAuthenticatedAt | UTC instant? | Operational metadata |
| Version | Guid, required | Proposed concurrency token |

**Confirmed cardinalities:** unique canonical `(Issuer, Subject)` across accounts;
at most one Google identity per AccountId, including concurrent enrollment. An
active Google-only account has exactly one usable Google login. Choose a
Google-specific relation, Google-scoped/filtered unique key or selected library's
equivalent when choosing the physical model. Do not make AccountId globally unique
across all future providers or impose `(AccountId, Provider)` on those providers
before their cardinality is decided. Index AccountId for lookup; canonicalize
accepted Google issuer aliases and preserve subject case without truncation.

Account → Google identity is 0..1 at the storage boundary, with exactly one usable
identity required by active Google-only workflows. Create a new active account and
its initial identity consistently; an at-most-one constraint cannot ensure the
required login exists. Identity ownership cannot be transferred or inferred from
an email collision. Reauthenticating the same identity is idempotent resolution.

There is no add-second-Google action or unrestricted unlink/relink. Restrict account
removal through an explicit lifecycle; do not cascade away the only usable login.
Google replacement/recovery needs a separately agreed proof, atomicity, conflict,
audit and session-revocation policy. Future-provider rules remain open.

Google documents stable subject identifiers and mutable emails in
[OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).
Validate response signature, audience, issuer, expiry and flow-bound CSRF/replay
protections. For third-party non-Gmail/no-hd addresses, Google's
[email-authority guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
means `email_verified` alone may not prove current mailbox control. O07 remains open;
no OTP, email-only login or differing-email fallback is selected.

## Provider-owned authentication records

Framework OIDC owns protocol/crypto/correlation records. E04 deliberately requires
application-owned browser-container and AccountSession persistence for multiple
accounts; ASP.NET's default single-principal cookie is not that session model.
Map these capabilities once rather than duplicating library records. No
LocalCredential, password signup or password-reset schema belongs to this scope.

| Capability | Required logical information / constraints |
| --- | --- |
| AccountSession | Stable non-secret session reference; AccountId and authenticated identity/evidence binding; authentication time/assurance; creation/expiry/revocation and version |
| Authentication evidence | Validated issuer/subject and current email/verified/hd evidence with observation/authentication time and freshness policy; do not trust editable contact fields or raw client claims |
| Refresh credential, if selected | Library-managed expiry, rotation/revocation and replay protection; no commitment to JWTs or a separate refresh table |
| Flow correlation, if persisted | Purpose, initiating session/account, safe return destination, expiry and one-time use; library-managed nonce/state protections, not a password-recovery framework |

If records are persisted, reference local Account/ExternalIdentity through explicit
FKs, index account/expiry/revocation lookup paths and use Restrict/NoAction until
reviewed lifecycle cleanup. Secret bearer values are not session identifiers or
audit payloads; store only digests/protected values where the selected protocol
requires them. Do not retain full reusable ID tokens merely as acceptance evidence.
Google login does not require keeping Google API access/refresh tokens.

## PlatformGrant

**Selected first-slice ownership E01:** the planned Identity service, separately
from Organization tenant RBAC. No deployed service is implied.

| Property | Proposed type / nullability | Purpose |
| --- | --- | --- |
| AccountId | Guid, required, local FK Account | Operator account |
| CapabilityKey | required bounded string | Code-owned platform permission, e.g. company review or Users read/manage/suspend/reinstate; exact keys/split open, not tenant RoleId |
| GrantedByAccountId | Guid?, local FK Account | Granting operator; null only for separately controlled bootstrap with audit |
| GrantedAt | UTC instant, required | Grant time |
| RevokedAt / RevokedByAccountId | UTC instant? / Guid? | Revocation metadata; controlled bootstrap/recovery must remain auditable |
| Version | Guid, required | Concurrency token |

Proposed PK `(AccountId, CapabilityKey)` with lifecycle changes retained in audit;
index `(CapabilityKey, RevokedAt)` for operator/grant queries. Validate revocation
chronology and actor evidence in the workflow. No CompanyId, tenant role inheritance,
email-domain grant or seeded real operator is implied. Restrict destructive account
FK cascades. E05 selects bootstrap; E12 selects privileged-assurance defaults for
owner review, while emergency recovery/rollout remains bounded O10 scope.
A historical reviewer reference must survive later operator revocation without
allowing that operator to make new decisions.
E05 bootstrap permits the controlled null grantor only inside the one-time
transaction, with bootstrap audit. Reserve `platform.owner` as an explicit protected
platform assignment; it is not a tenant role or wildcard. Initial admin capabilities
are explicit code-owned grants. E12 and the readiness owner-safety section select
assurance/self-service safeguards; recovery never reopens setup.
The first review slice includes an audited owner-authorized grant/revoke command
for an existing registered account, with live capability/E12 assurance and local
workflow locks. A different reviewer can receive platform access without tenant
membership; that grant does not approve its own company application.

## Multiple accounts in one browser

Several independent Worktandem account sessions may coexist. Each account has its
own single Google identity and company memberships. Browser/session-container,
cookie, active-tab and cross-app behavior now follows selected E04: a cookie-bound
server container with independently revocable AccountSessions and per-tab selectors.
Use the [session contract](../implementation/readiness#session-tab-and-request-isolation)
rather than assuming a default single-user cookie supplies multi-account support.

Resolve authenticated session/account and explicit company context per operation.
A Google identity mismatch requires switching to its owning Worktandem account or
starting that identity's own registration, never adding it to the current account.
Scope caches/subscriptions by account + company where appropriate, discard stale
responses, preserve in-flight actor/tenant context and distinguish current-account
from all-account logout. See [request isolation](../architecture/accounts-and-authentication#request-and-session-isolation-requirements).
