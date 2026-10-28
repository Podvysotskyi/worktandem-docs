# Identity entities

**Status: logical requirements and proposed fields; no authentication implementation.**
See [database overview](./overview) for unresolved provider decisions. Actual credential,
challenge and session tables must follow the chosen authentication implementation;
this catalog is not a custom password/token framework.

## Account

A global Worktandem actor, independent of any company or Google login.

| Property | Proposed type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Stable internal actor ID |
| DisplayName | string, required, max 200 | User-facing name |
| PrimaryEmail | string?, max 320 | Contact/login address only if configured |
| NormalizedPrimaryEmail | string?, max 320 | Lookup form consistent with selected login provider |
| PrimaryEmailVerifiedAt | UTC instant? | Evidence for this current address, cleared when changed |
| Status | required enum | Proposed Active, Suspended, Closed |
| CreatedAt, UpdatedAt, Version | required | Lifecycle/concurrency metadata |

Index NormalizedPrimaryEmail if used for lookup. **Global uniqueness is undecided**:
local email login needs an explicit unique-login policy, while Google email matching
must never merge accounts. Do not generate a global email unique constraint by assumption.
Suspension blocks sign-in/use; company membership suspension is a separate operation.

Do not put CompanyId, authoritative CurrentCompanyId, company roles, Google subject,
or plaintext Password on Account. A remembered company preference, if added later,
is only a hint and never access authority or global mutable request context.

## ExternalIdentity

| Property | Proposed type / nullability | Purpose |
| --- | --- | --- |
| Id | Guid, required, PK | Link record ID |
| AccountId | Guid, required, FK Account | Owning account |
| Provider | required bounded string | Initially Google; routing/display metadata |
| Issuer | required string | Canonical validated issuer |
| Subject | required string | Stable validated provider subject, case-sensitive |
| Email | string? | Last observed mutable provider profile email |
| EmailVerified | bool, required | Last observed provider claim; not general email authority |
| HostedDomain | string? | Last observed validated Workspace claim; not company membership |
| LinkedAt | UTC instant, required | Link creation |
| LastAuthenticatedAt | UTC instant? | Operational metadata |
| Version | Guid, required | Link concurrency token proposal |

**Unique (Issuer, Subject)** across all accounts. Index AccountId; it is deliberately
not unique. Do not impose unique (AccountId, Provider): multiple Google accounts may
link to one Worktandem account. Choose provider identifier lengths/collation without
truncation; canonicalize permitted Google issuer aliases before lookup/insert.

Account 1 → many ExternalIdentity. The FK restricts account deletion until an explicit
identity cleanup workflow. Unlink deletes the association only after both recent
account proof and remaining-login/recovery safeguards; credentials are not copied
into audit history. Uniqueness handles concurrent linking attempts atomically.
An identity already linked to the same account is idempotent success; another account
is a conflict, not an email-based transfer. Concurrent unlink operations must serialize
against the account or use another transaction-safe invariant so neither removes the
last usable method after independently passing a check.

Provider email/HostedDomain snapshots are not proof of current session assurance.
Re-evaluate validated authentication claims and company policies for access when such
policies exist. Google sign-in does not require retaining Google access/refresh tokens.

## Provider-owned authentication records

These are required **capabilities**, not final table names or parallel tables to add
beside ASP.NET Identity or an external provider's existing storage.

| Logical record | Required information / constraints |
| --- | --- |
| LocalCredential (optional per account) | Account reference; provider-managed password hash and security/concurrency state; no reversible/plain password; Google-only account has none |
| Verification/recovery challenge | Purpose, account/address binding where applicable, expiry, one-time consumption, attempt/replay protection; store a token digest if opaque tokens are persisted, not a usable reset token |
| Authenticated session | Account reference, creation/expiry/revocation, authentication time/method/assurance; secret bearer values must not be exposed as identifiers or logged |
| Refresh credential, if used | Provider-managed rotation/revocation and replay handling; not a design commitment to JWT or refresh tokens |

Some providers use protected tokens without per-token rows; others need persistent
records. Map the requirements to that provider before deciding EF entities, expiry
indexes, cleanup jobs or FKs. Do not store a password hash just because a column is
available, or set a local password through Google-only forgot-password recovery.

## Multiple accounts in one browser

A browser may hold several independent authenticated account sessions. A browser
session container, if selected, references separately revocable account sessions;
it must not merge their credentials, permissions, or companies. The exact container,
cookie and active-tab schema is open. Session/account selection must be validated
per request, and sign-out-current must differ from sign-out-all.

There is no persistent `Account.CurrentCompanyId` in this design. The request carries
an authenticated actor plus independently authorized company context, pinned for
that operation. See [request isolation](../architecture/accounts-and-authentication#request-and-session-isolation-requirements).
