# Accounts and authentication

**Status: confirmed product direction; not implemented.**

The canonical [identity, company onboarding and invitations specification](../product/identity-and-company-access)
defines current rules, proposed defaults, logical data requirements and open decisions.
This page summarizes the account model. [ADR-001](./decisions#adr-001-multiple-accounts-memberships-and-google-identities)
records the original multi-account decision, including superseded Google multiplicity;
[ADR-002](./decisions#adr-002-google-only-onboarding-invitations-and-platform-review)
records the onboarding and administration direction, and
[ADR-003](./decisions#adr-003-one-google-identity-per-worktandem-account) records
the current one-Google-identity rule.

## Identity model

- One Worktandem account can have many company memberships and at most one Google
  identity. An active Google-only account has exactly one usable Google login.
  Each validated Google issuer + subject belongs to only one Worktandem account.
- Google-only sign-in/registration is the present scope. No local email/password
  signup, login, password setup or password recovery. Other providers are future scope.
- Email is mutable recipient/profile evidence, not an account or external-identity key.
  Never merge, transfer or link accounts merely because emails match.
- Do not add a second Google identity or transfer one from another account. Google
  replacement/recovery needs a separately agreed policy; no unrestricted unlink/relink.
  Future-provider cardinality and linking rules remain open.

See the canonical [identity rules](../product/identity-and-company-access#account-and-identity-behavior).
Google-only recovery points to Google's recovery; Worktandem cannot reset Google
credentials or remove the only usable login from an active account. Identity
replacement and operator-assisted recovery remain open.

## Two distinct switches

**Switch account** changes the actor and may add another independently signed-in
Worktandem account. **Switch company** changes tenant context for that actor and
must revalidate its membership. Authenticating another Google identity resolves or
creates that identity's own Worktandem account; it does not attach it to the current
account. There is no add-second-Google-identity action.

A browser can hold multiple account sessions. Roles never transfer between companies
or accounts. No globally mutable `Account.CurrentCompanyId` is an access authority.
Zero-membership accounts still need account, invitation and onboarding/status routes.

## Request and session isolation requirements

The server validates session/account, company eligibility, active membership,
permission/scope and applicable identity assurance on every protected business action.
Account-level and platform-level routes have their own authorization boundaries.
Frontend routing and module switches grant no permission.

Partition caches/queries/subscriptions by account + company where applicable. Preserve
an operation's original actor/company; cancel/discard stale responses or queued work
on switching. E04/E11 select cookie-bound server sessions, per-tab selectors, live
status checks and explicit revocation semantics for the first slice; deployment
transport/key configuration is still required.
Sign out current account and sign out all Worktandem accounts are distinct operations.
See [sessions and authorization](../product/identity-and-company-access#sessions-account-switching-and-authorization).

## Google sign-in and registration

Ordinary self-service registration after setup requires Google authentication and a company-creation
form. The company starts Pending and requires manual platform approval before its
business product is available. The [readiness register](../implementation/readiness)
selects first-slice engineering defaults for form/review/session behavior.

The first registered account instead uses the entered server-environment setup
secret and validated temporary Google proof to become platform owner/admin in a
serialized one-time transaction. Normal registration is closed until setup finishes;
deleting users never reopens it. That owner need not create/join a company, but may
apply later without self-approval or automatic business access. See
[bootstrap](../implementation/readiness#one-time-platform-bootstrap).

A separate invitation-join path without duplicate company creation is selected as
the later-slice engineering default. O07 evidence remains a gate before acceptance
is enabled. A company administrator can invite any email; accepting requires the
currently authenticated Google identity's verified email to match the invited
address. Existing users must see and accept pending invitations in the app.
On mismatch, switch to the matching identity's Worktandem account or start that
identity's own registration if it is new. No different-email OTP route, second
Google identity attachment or email-based account merge is available.

Google response validation must check signature, issuer, audience, expiry and
flow-bound CSRF/replay defenses. See
[Google's verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
For non-Gmail identities without Workspace `hd`, `email_verified` alone may not
establish current mailbox control. The
[email-evidence policy](../product/identity-and-company-access#email-authority-question)
is explicitly scoped to that later slice; do not invent an email-only login or different-email fallback.

## Platform administration and optional Google integration

Platform operators use a separate Nuxt administration application with explicit
platform grants, separate from tenant RBAC. A company owner or email domain does
not become a platform administrator.

The platform app includes Users list/detail/manage and global ban. Ban sets
Account.Status = Suspended with a mandatory nonempty reason/description and
actor/time/transition history; there is no redundant IsBanned flag. Each company
membership retains an independent status. Global suspension blocks protected
company access everywhere without overwriting membership states, and reinstatement
does not restore separately suspended/removed memberships or revoked grants.
Company administrators cannot perform global user management through tenant roles.
Sessions must be invalidated/revoked with server-side status enforcement; exact
mechanism/propagation timing, editable fields, reason visibility and recovery
safeguards follow selected engineering defaults and explicit owner-review gates in
readiness. See the [suspension rules](../product/identity-and-company-access#global-user-suspension-and-company-status)
and [ADR-004](./decisions#adr-004-platform-users-and-independent-suspension-statuses).

Company-domain configuration is optional and belongs to optional Google API
integration with separate consent. It is not a corporate-email admission requirement.
**Even with integration/domain controls enabled, authorized manual outside-domain
invitations must remain possible and permit later company use within assigned roles.**
Directory synchronization and domain auto-join are separate, unadopted proposals.
No domain/email grants membership, company ownership or platform authority by itself.

## Design coverage and acceptance criteria

The [desktop design inventory](../design/authentication) and canonical
[acceptance matrix](../product/identity-and-company-access#acceptance-matrix-for-future-implementation)
cover approval gates, in-app invitations, matching identities, concurrency,
company/account isolation, platform denial tests and manual outside-domain access.
They are requirements for future work, not executed authentication tests.
