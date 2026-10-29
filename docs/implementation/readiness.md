# First-slice implementation readiness

**Status: ready to begin the local implementation PRs below; not implemented or
ready for production.** Reviewed 2026-10-29. This is the implementation decision
register, linked to the [product rules](../product/identity-and-company-access)
and [logical catalog](../database/overview); it is not a second product specification.
No infrastructure, credentials, application code or migrations are created here.

**User requirements (U):** PostgreSQL with EF code-first; Google-only and one Google
identity/account; many companies and signed-in Worktandem accounts; manual company
approval; separate operator app; global suspension with reason and independent
membership states; optional Google integration with manual outside-domain invites.
The first registered account becomes platform owner/admin after entering a secret
configured only on the server, and need not create/join a company. Company use is optional
for that operator and does not follow from its platform role.

**Engineering decisions (E):** defaults selected under the request to prepare for
implementation. They are actionable first-slice choices, not claims that the user
previously confirmed every field, timeout or protocol. Owner-review items below are
scoped away from the first slice rather than hidden behind permissive fallbacks.

## Decision register

| ID / state | Selected first-slice decision |
| --- | --- |
| E01 Ready | Add an Identity service for the actual account/bootstrap/session use cases. Identity owns IdentityDbContext/database; existing Organization owns OrganizationDbContext/database and review/membership/RBAC. Gateway stays a stateless BFF/router. No shared EF entities, SQL FKs, writable tables or cross-service transaction |
| E02 Ready | PostgreSQL 18, current verified minor 18.6; .NET 10 LTS, EF Core/Relational/Design/tool 10.0.14 together, Npgsql EF provider 10.0.3 and Npgsql driver 10.0.3. Recheck supported patches before the implementation lock update; no previews. Explicitly target PG18 SQL compatibility; keep Node 26.13.0/pnpm pins and existing VitePress override |
| E03 Ready | ASP.NET Core OpenIdConnect confidential authorization-code flow with PKCE and framework state/nonce/correlation handling. Google discovery metadata and validated canonical issuer/subject; no ASP.NET local-password schema, browser access-token storage or hand-written OIDC crypto |
| E04 Ready | One same-origin browser cookie for a server-side account-session container; per-tab explicit account-session + company selectors. Identity is the session authority; Organization independently validates identity/session through an authenticated internal contract and its own tenant/RBAC state |
| E05 Ready | Bootstrap is a closed-before-registration, one-time Identity transaction: temporary Google proof + server-env secret + no accounts + durable incomplete setup state → first account/Google identity/owner grants/setup completion. Zero accounts alone never authorizes ownership |
| E06 Ready | Ordinary self-service onboarding creates an account and submitted company application; bootstrap/platform operations require no company membership. Form defaults: company name 1–200, ISO country, business description 20–2000, applicant role 2–200 required; website/legal ID optional. These implement the prior P02 recommendation, not legal/domain verification |
| E07 Ready | Use the catalog's single Company.Status vocabulary initially. Pending snapshot is read-only, with account/status access and no business/member invitations. Candidate activates atomically on approval. Rejection needs applicant-visible reason; editing after rejection creates a new immutable submission. In-app status is the initial outcome channel; email delivery is later scope. Other approved memberships remain usable. No self-review, including platform owner |
| E08 Deferred slice | Invitation-join skips duplicate company creation. Seven-day invitation, explicit decline/revoke, resend rotates old link, member role within delegation authority, no privilege upgrade/reinstatement through stale offers. Current matching Google email remains mandatory. Third-party mailbox evidence O07 must be agreed before enabling acceptance; do not limit invitations to corporate/Gmail addresses or invent a different-email route |
| E09 Ready | UUIDv7 entity IDs; UTC timestamptz instants; explicit snake_case mappings; application-managed Guid Version tokens/ETags. Global issuer/subject unique plus PG partial unique account key for Google only. No future-provider cardinality inferred. Service-local Restrict deletion and migrations/history |
| E10 Ready | JSON contracts, problem responses, If-Match for mutable aggregates and actor/operation/payload-bound idempotency for writes. Approval also checks Pending + current application + Company.Version atomically; suspension writes Account.Status + reason/history atomically |
| E11 Ready locally | No positive account-status/permission cache initially. Identity revokes all target-account sessions in its status transaction; Organization checks live status per protected request and fails closed on unavailable authority. In-flight operations already authorized before suspension may finish; no cross-database instantaneous-rollback claim |
| E12 Owner review before privileged rollout | Require validated Google amr containing mfa and auth_time within five minutes for owner/grant/bootstrap and sensitive operator writes; request/enable those optional claims. Missing/stale assurance fails closed. A chooser or newly received token alone is not proof of fresh MFA. Verify this with the actual client before exposing privileged actions |

PostgreSQL's [version policy](https://www.postgresql.org/support/versioning/) lists
18.6 as supported. The [Npgsql 10 provider](https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL/10.0.3)
targets .NET 10 and permits EF >=10.0.4 and <11; the selected
[EF 10 patch](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore/10.0.14)
fits that range. [Npgsql release notes](https://www.npgsql.org/efcore/release-notes/10.0.html)
document PG18 support. These are compatibility decisions, not a restored/tested
backend dependency graph. PR1 must verify restore, real-PG tests and advisories.

## One-time platform bootstrap

1. Initial Identity migration supplies one durable SetupState row (`platform`,
   Incomplete, Version). Missing row/config is an error, not an implicit empty setup.
   Before Completed, ordinary registration and account insertion are unavailable;
   otherwise an anonymous signup could win the first-owner race. Existing accounts
   with incomplete setup are an inconsistent state requiring controlled recovery.
2. A Google code callback validates the provider response and creates only a
   five-minute, server-side PendingLogin context bound to this browser, nonce/flow
   and validated issuer/subject/email evidence. It is not a permanent account,
   operator grant or tenant session. No secret is supplied to Google.
3. The setup screen sends the entered setup secret by HTTPS POST with antiforgery
   protection. Compare server-side in constant time against a high-entropy secret
   supplied as `Worktandem__Bootstrap__Secret`. Never put it in public Nuxt config,
   Git, URL/query string, telemetry, request-body logging or application audit. No
   actual value is generated by this preparation task.
4. Apply five failed attempts per pending flow and per source IP per ten minutes,
   with a shared deployment budget of thirty setup attempts per minute; return generic failures
   and rate-limit metadata. Use shared enforcement across replicas, not only an
   in-process counter. Do not globally lock setup forever from anonymous failures.
5. In one Identity transaction, lock the singleton row, recheck Incomplete, no
   permanent accounts, unused/fresh PendingLogin, matching secret and identity
   uniqueness; create Account + its single Google identity + explicit PlatformOwner
   and initial admin capabilities + audit, then set CompletedAt/InitialOwnerAccountId
   and consume the pending flow. All account-creation paths respect this gate/lock.
   Exactly one concurrent attempt wins. A rollback creates neither a partial owner
   nor a completed setup; a lost response is recoverable by signing in as that owner.
6. Completed is permanent even if all accounts/grants are later closed/removed.
   Do not derive it from COUNT(accounts), automatically reset it, delete it in
   cleanup or reopen it with the old environment value. Remove the deployed secret
   after completion; completion still blocks bootstrap while ordinary registration
   continues without that secret. Missing secret before completion fails closed.

Use a PostgreSQL transaction-scoped row lock and service-local uniqueness, with
bounded retries for serialization/deadlock failures; [PG locking](https://www.postgresql.org/docs/18/explicit-locking.html)
does not itself make separate databases atomic. No real operator or secret is seeded
in a migration. SetupState must survive account cleanup and backup restoration;
restoring pre-bootstrap backups needs a deliberate recovery procedure, not public
setup exposure. Owner/admin grants never imply CompanyMembership or business access.

## Session, tab and request isolation

- Identity sets `__Host-wt-browser`: opaque 256-bit random credential, Secure,
  HttpOnly, SameSite=Lax, Path=/, no Domain. Store only a credential digest/server
  session record; use framework Data Protection for flow/cookie protection and a
  durable protected key ring across replicas. OIDC correlation-cookie attributes
  follow the framework/provider flow; do not overwrite them with a blanket policy.
- The container references separately revocable AccountSessions. A non-bearer
  AccountSessionId and CompanyId live as per-tab hints in sessionStorage and request
  headers `X-WT-Account-Session` / `X-WT-Company`. Every request verifies that selected
  session belongs to the cookie's container; IDs alone grant nothing. Never put a
  browser credential, Google token, secret or permission authority in localStorage.
- Protected company/platform apps begin with an authorized client context fetch;
  public main can SSR its public shell. No sensitive SSR hydration from a global
  selected-account cookie. Nuxt Query clients remain app/request scoped. Query keys
  include account + account-session + company for tenant data; switch cancels stale
  requests/subscriptions and clears previous-context state. A queued write keeps
  its original validated actor/company or is cancelled.
- Default AccountSession lifetime: 30-minute idle, 12-hour absolute, no persistent
  remember-me initially; owner assurance has E12's shorter freshness requirement.
  Reauthentication uses the same Google identity, never a second linked identity.
  POST logout-current revokes the selected account session in this browser;
  logout-all revokes all sessions in this browser container. All-devices UI is
  deferred; global suspension revokes every session for the target account across
  containers, leaving other Worktandem accounts independent. Reinstatement requires
  new sign-in and current grants/memberships; it never un-revokes sessions.
- Same-origin browser requests use the cookie plus an ASP.NET antiforgery request
  token/header for unsafe methods, with Origin/Fetch Metadata checks as defense in
  depth. Refresh actor-bound antiforgery context on account switching. No mutations
  on GET or permissive credentialed cross-origin CORS. OIDC state/nonce binds the
  callback; allowed return destinations are server-validated relative app routes.
- Gateway forwards only declared contracts; it does not manufacture trusted actor
  headers. Organization calls Identity's private session-validation contract with
  the forwarded browser credential/selector over authenticated service transport,
  then checks its own company/membership/scope. Internal validation is not a public
  route and never logs credentials. Services use authenticated HTTPS/workload
  identities; configure this in the implementation environment, not in this task.
  A timeout/unavailable authority returns safe denial/unavailable, never permission.
- Define the authorization point as the current Identity status/session lookup.
  Reads after a committed suspension fail; operations already admitted may finish.
  No long-lived positive cache or detached job bypass. First slice has no delayed
  user-on-behalf business jobs; adding them requires fresh authority at execution.

Use Microsoft's [OIDC/BFF integration](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication?view=aspnetcore-10.0),
[antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0)
and [Data Protection](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-10.0)
mechanisms; multi-account selection is an application protocol to test, not a
claim that a default single-principal cookie implements account switching.
Google's [OIDC documentation](https://developers.google.com/identity/openid-connect/openid-connect)
defines stable subject and optional amr/auth_time claims; validate their actual
availability rather than treating account selection as MFA.

## Company and invitation boundaries

First vertical slice after bootstrap: Google sign-in → ordinary registration form
and company application → Pending → a different platform reviewer → approval →
authorized company workspace. No domain prerequisite, CRM module, billing or
directory integration. Creating a company is optional for the bootstrap owner;
its own application still needs another authorized reviewer. Do not self-approve
because it is the first/only platform owner. Account-level status/settings remain
available without a company; protected business APIs remain denied while Pending.

Use the existing [application/version/owner-candidate model](../database/organization#companyapplication-and-reviewdecision),
requiring current Pending state, requested current submission and expected company
version in the approval transaction. Duplicate names/domains flag review, never
auto-join, legal verification or global domain ownership. Resubmission increments
company version and creates another immutable snapshot; reasons to applicants and
internal reviewer notes are separate. Audit commits with state; notification outbox
is added only when an actual delivery channel/producer is selected.

**Resumable registration contract:** Identity can commit the ordinary account and
session before Organization accepts the company submission. That account has no
membership/business authority and resumes at the company form; do not make the two
databases atomic or delete/recreate its Google identity on a network failure.
Identity supplies a stable InitialRegistrationOperationId for this normal-account
workflow (absent for bootstrap). Organization stores it with ApplicantAccountId,
with durable uniqueness of that pair for the initial company. No company form or
EF entity is stored in Identity. The client submits the form using that operation
ID plus the normal idempotency key; after uncertain delivery it queries its own
application by operation ID and resumes/replays, rather than creating another
company. Retries retain payload; changed payload after a committed request is a
conflict/resubmission workflow. Durable initial-operation uniqueness remains after
the seven-day HTTP idempotency retention. Context derives needs-company/Pending
from the owning Organization projection; any Identity onboarding hint is not an
authorization flag. Required authority unavailable means safe unavailable/denial.

**O07 scope decision:** invitation issue/acceptance is a later PR, disabled in the
first slice. Any-email manual invitations and exact verified Google-email matching
are preserved. Before enabling the invitation PR, owner review must choose current
mailbox evidence for non-Gmail/no-hd Google identities. The recommended option is
fresh proof to the same invited address in addition to that matching Google identity;
it adds an in-app step and is not adopted merely by this recommendation. No
different-email OTP, email-only login or silently restricted recipient list.
Google explains the [email-authority caveat](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
Directory sync, auto-join, future providers and mobile are deferred independently.

## Contracts and failure behavior

Contract sketches are decisions to implement/test, not existing endpoints or DTOs.
Public DTOs never expose EF entities, setup secrets, tokens or internal review notes.

| Boundary | Minimum contract / checks |
| --- | --- |
| POST auth/start + Google callback | Purpose login/register/bootstrap/add-account, safe return route and flow binding; callback resolves stable identity; bootstrap callback cannot create a permanent account |
| POST setup/complete | PendingLogin reference from protected context + entered secret + antiforgery; atomic E05 checks; generic setup-not-available/invalid/rate-limited outcomes |
| GET session/context | Cookie + selected AccountSessionId → authorized account summaries, own company memberships and CSRF context; global status filtered for permitted surface, no unprotected email enumeration |
| POST companies/applications | Authenticated actor, E06 form, Idempotency-Key; creates Pending + snapshot/candidate; proposed 201 with IDs/status/ETag |
| GET own application / operator queue | Applicant-only safe status/projection versus explicit operator read permission; pagination and separate internal notes |
| POST platform/applications/{id}/decision | Explicit capability/assurance, outcome/reason, expected current Company ETag and submitted version; no self-review; all three approval guards and effects atomic |
| GET company workspace / protected command | Valid cookie-owned session selector + company selector; live account check, approved company, active membership and complete scoped grant; no module-based permission |
| POST platform/users/{id}/suspend or reinstate | Explicit authority, Account If-Match, mandatory nonempty suspension reason, atomic status/history/session revocation; no mass membership rewrites. Public writes remain server-disabled until the ownership-safety gate below is resolved, not merely hidden in UI |

Use 401 for absent/expired session, 403 for known denied action/account suspension,
404 for inaccessible tenant resources where disclosure is inappropriate, 409 for
invalid lifecycle/idempotency-payload conflict, 412 for stale If-Match, 422 for form/
reason validation, 429 with Retry-After, 503 for unavailable required authority.
Use application/problem+json with stable code, correlation ID and safe field errors.
Expected versions are opaque strings, not client-written timestamps. Idempotency
records are bound to authenticated actor + operation + target + payload hash;
retain seven days for these writes, replay the original result, reject changed
payload. They share the owning transaction; never log setup-secret payloads/hashes.
Setup completion instead uses its consumed PendingLogin and durable Completed
marker; do not retain the entered secret or its payload hash in ordinary idempotency storage.

## Owner safety, user management and observability

PlatformOwner is a protected `platform.owner` assignment, not a tenant role or
wildcard permission. Bootstrap also supplies explicit `platform.companies.read`,
`platform.companies.review`, `platform.users.read`, `platform.users.manage` and
`platform.grants.manage` capabilities; later status-write capabilities remain gated.
Only an eligible owner can later grant/revoke platform roles through an audited
workflow. Operator membership in a company is optional. First-slice Users editing
allows DisplayName only (1–200); Google identity/email, global state and grants use
separate commands. Ban reasons/history are operator-internal by default; a suspended
user sees a generic status until owner-approved reason visibility is selected.
Timed bans, bulk editing/deletion and impersonation are not included.

Serialize platform-owner/grant/status changes in Identity and block self-suspension
and removal/suspension of the final active platform owner in self-service. Do not
reopen bootstrap for recovery. Lost-Google/last-owner incidents need an audited
maintenance recovery procedure with independently verified authority and target
Google proof; deployment-owner review is required before production use. Company
ownership coordination is not solved by a remote read: an owner assignment/removal
could race that read. Therefore public global suspend/reinstate/removal writes are
**disabled server-side in the first slice** until a cross-service ownership/recovery
policy is agreed and concurrency-tested; the API fails closed, even for an operator,
and unavailable ownership evidence never enables the action. Users reads and
DisplayName edits can proceed. Test suspension/session enforcement with controlled
fixtures; do not expose the write endpoint based only on UI filtering or one fresh
ownership query. The eventual protocol must serialize competing ownership/status
changes or provide an expressly approved recovery invariant. No local Identity
transaction is claimed to atomically preserve all companies' owners.

Audit bootstrap completion, grants, decisions and suspension transitions with event
ID, actor/target, UTC time, result, reason where required, prior/result version and
correlation ID. Keep logs structured/redacted: no auth cookies, codes, ID tokens,
setup secrets, authorization headers or full form/reason bodies. Emit counts/latency
for failed callbacks, throttling, stale writes, denied tenant access and revocation
failures without email/account identifiers in metric labels. Add real dependency
readiness checks; process-only scaffold health is not database/Google readiness.

## Implementation PRs and definition of done

| PR | Small deliverable | Must pass before merge |
| --- | --- | --- |
| 1 | Identity boundary + separate Identity/Organization Npgsql contexts, explicit mapping and reviewed initial migration sources | Existing architecture tests; lock/restore graph; real PG18 keys, constraints, migrations-from-empty and upgrade tests; no shared tables or real-user seed |
| 2 | Google OIDC, PendingLogin, one-time bootstrap and server session foundation | Invalid issuer/audience/nonce/callback replay; absent/wrong secret; concurrent bootstrap; rollback; pre-bootstrap registration denied; completion never reopens after account removal; owner has no implicit company |
| 3 | Separate platform app/auth shell and resumable ordinary company application/status flow | Nuxt/shadcn/Tailwind shared tokens; per-tab selectors/cache isolation; no second Google link; Identity-success/Organization-failure resumes with one account/company; Pending endpoints deny protected reads/writes; safe cancellation/retry |
| 4 | Operator queue/reject/resubmit/approve and company workspace authorization | Cross-company negative tests; superseded submission even with matching own version rejected; atomic owner activation; no self-review; valid unrelated company remains accessible |
| 5 | Platform Users reads/DisplayName edits and tested suspension enforcement | Required reason/audit and race tests at the owning boundary; suspended fixtures revoke sessions and preserve memberships/grants; stale contexts denied. Public suspend/reinstate/removal writes stay server-disabled until ownership coordination/owner review; direct API bypass tests required |
| Later | Switching UX completion and invitation lifecycle | Session model already supports multiple accounts; E08/O07 agreed and tested before invitation acceptance; outside-domain manual eligibility persists; suspension overrides it |

Each PR supplies reviewed API contracts/errors, actual migrations where applicable,
meaningful denied-access and concurrency tests, secrets-free diffs, accessibility/
desktop UI states and an explicit implemented-versus-pending docs update. No fake
tenant, client-only guard, local password or unverified live provider assumption.
Pin one real PG version in CI tests. E2E tests may use a controlled OIDC issuer;
separate Google-client integration evidence is required before claiming Google E2E.

## Environment and design handoff

Before integration testing, provision separately with authorization: Google OAuth
client/secret, exact HTTPS redirect origin, optional assurance-claim settings;
server-only bootstrap secret; separate PostgreSQL connection identities/databases;
durable Data Protection key storage; internal service-auth material and allowed
hosts/proxy headers; email delivery only before the invitation PR. Configuration
names describe intent, never real values. Missing setup/Google/DB configuration
fails closed; .env examples are not automatic configuration loading. Migration
application is a controlled job, not startup DDL from every API replica.

Tooling follow-up: the preserved Vite 6.4.4 docs override is now reported by npm
audit under [GHSA-8g5g-mxqh-grgj](https://github.com/advisories/GHSA-8g5g-mxqh-grgj).
Its dependency chain is not audit-clean. This task preserves the requested pins;
review a separate tooling update rather than silently running audit fix.

Approved desktop design baseline: Penpot file
`dfe56358-c92b-8141-8008-dca07ba00319`, page
`40725179-241f-80d5-8008-dcc0d0e0eabc`, revision **53**: hybrid navy enterprise
styling with structured topbar/rail navigation. Keep Nuxt + shadcn-vue + Tailwind
shared primitives and TanStack Query/Table/Form; do not replace the library.
Required deltas, not edits performed here: Google → setup-secret gate; setup-closed/
invalid/throttled states; operator home without a company or forced company form;
optional create-company path; no tenant workspace merely from platform ownership;
another-reviewer-needed state; Users global-versus-membership status and ban reason;
separate account/company selectors and stale-session/conflict handling.

| Readiness | Position |
| --- | --- |
| Ready | Begin PR1 and isolated tests/contract work using E01–E11; carry user-management rules forward |
| Integration prerequisites | Authorized runtime/PG/Google/service-auth configuration and operator-assurance proof; no credentials or resources created here |
| Owner review before affected capability | E12 privileged assurance/recovery and company last-owner ban workflow before privileged rollout; O07 before invitation acceptance |
| Deferred | Directory sync/auto-join, extra providers, mobile, generic ABAC and further CRM modules; broad entity design is not a prerequisite for PR1 |
