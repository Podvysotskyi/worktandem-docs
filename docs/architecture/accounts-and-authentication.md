# Accounts and authentication

**Status: confirmed product direction; not implemented.** This specification supersedes
any earlier one-company-per-account or one-Google-account-per-user assumptions.
It does not introduce an authentication implementation, SSO, or deployment.
See [ADR-001](./decisions#adr-001-multiple-accounts-memberships-and-google-identities).

## Identity model

| Concept | Confirmed relationship | Meaning |
| --- | --- | --- |
| Worktandem account | One account can have many company memberships | The actor performing an action |
| Company membership | Belongs to one account and one company | Roles and permissions are scoped to this membership/company, never inherited from another company |
| Google external identity | Many may link to one Worktandem account; each links to exactly one Worktandem account | A sign-in method, not a company or an additional Worktandem account |
| Signed-in account | Multiple Worktandem accounts can be signed in within one browser | Users can add and switch accounts without conflating them |

Use an internal stable account ID. Identify Google identities by validated provider
issuer and subject (`iss`, `sub`), with canonical issuer handling and a uniqueness
constraint across all Worktandem accounts. Email is mutable profile/contact data,
not the external-identity key. Two Google identities with the same displayed email
must not trigger an automatic merge.

## Two distinct switches

- **Switch account** changes the actor. Show the active Worktandem account clearly,
  offer other signed-in accounts, and provide **Add account**. Adding an account
  authenticates that account; it must not link it to the currently active account.
- **Switch company** changes the tenant context for the active actor. Show only that
  account's memberships and the active company. Never retain a company selected for
  a different account without validating that account's membership.
- **Linked Google accounts** belongs in the active account's security settings. This
  is not the signed-in Worktandem account list or the company switcher.

A company switch does not transfer roles. An account switch does not merge profiles,
memberships, sign-in methods, or recovery settings. An account without a usable
membership must see an appropriate empty/access-recovery state, not another
account's company data.

## Request and session isolation requirements

The server must validate the authenticated active session/account, current company
membership, applicable session assurance, and permission for each protected action.
Client routing, a selected label, a company ID, or an email domain is not authorization.
Revoked memberships and expired sessions must fail safely on the server.

Scope client caches, server caches, queries, and subscriptions by **account + company**
where data is tenant-specific. On a context change, cancel or discard stale requests,
clear sensitive previous-context state, re-establish authorized subscriptions, and
prevent late responses or queued mutations from being applied under the new actor
or tenant. Preserve the original validated request context throughout each operation.

**Open implementation decision:** how active context is represented across tabs,
requests, cookies, and multiple applications. No global cookie-based switch or
automatic cross-tab switch has been selected. The eventual design must provide
isolated request context and stale-request guards; per-tab versus synchronized
switching must be specified and tested before implementation is accepted.

Sign-out flows must clearly distinguish signing out the current Worktandem account
from signing out all Worktandem accounts. Exact session storage, expiry, revocation,
and cross-tab signaling remain implementation decisions; signing out of Worktandem
must not be presented as signing out of Google itself.

## Google sign-in and registration

**Confirmed:** support Google as a sign-in method alongside the account model above.
The integration and shared-session implementation remain unbuilt.

The backend must validate Google's token signature, audience, issuer, and expiry,
and bind the authentication response to the initiating flow with appropriate
CSRF/replay protections. Resolve returning users by the validated external identity,
not by email. See Google's [server-side token verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

For eligible Google registration, skip Worktandem's duplicate email-verification
step when Google is authoritative: a verified Gmail identity, or verified email
with a validated Google Workspace `hd` claim. A non-Gmail address without `hd`
may require independent proof even when `email_verified` is true. An email suffix
alone does not establish Workspace membership. These are email-assurance rules,
not permission to join a company or merge accounts.

A successful new registration proceeds to any required profile/company onboarding;
an existing linked identity signs in to its owning Worktandem account. Cancellation,
invalid/expired responses, and provider failure leave the previous context intact
and offer a safe retry rather than creating a partial link or duplicate account.

## Linking, conflicts, and recovery

1. Start **Link Google account** inside the intended Worktandem account's security
   settings. Reauthenticate that account and authenticate the Google identity being
   linked; bind both proofs to this deliberate linking operation.
2. Add the identity only if it is unlinked or already linked to this same account
   (an idempotent success). Enforce uniqueness atomically, including concurrent attempts.
3. If it belongs to another Worktandem account, do not transfer, merge, or disclose
   that account's private details. Explain the conflict, offer cancellation or a
   different Google account, and direct the user to sign in/recover the owning
   account. Any later transfer/merge policy requires its own decision and both
   accounts' proof; email matching is never enough.
4. Before unlinking, reauthenticate and confirm that a usable sign-in/recovery path
   will remain. Block unlinking that would strand the user or defeat applicable
   company security policy. Explain how to establish an allowed alternative first.

A Google-only Worktandem account has no local password to reset. Recovery must
point to Google or another already-established Worktandem recovery method. Do not
silently create a password through **Forgot password** or imply that Worktandem can
reset Google credentials. Adding a local credential would require an explicit,
authenticated setup flow and applicable policy checks.

If company authentication policies are introduced, access must depend on the
current session's assurance, not merely the presence of a linked corporate Google
identity. Switching into such a company can require step-up authentication with an
allowed identity. Linking alone must not bypass policy, and recovery must not
silently downgrade it.

## Research proposals — not adopted or implemented

Google Workspace directory synchronization, domain-based auto-join, and a company
**Require Google** policy are future research proposals, not consequences of choosing
Google sign-in. Their consent, ownership verification, provisioning/deprovisioning,
admin recovery, and enforcement behavior need separate approval and design.
Enterprise SSO is not implemented. A Google button or Workspace email is not proof
of enterprise SSO, directory synchronization, or corporate access authorization.

## Design coverage and acceptance criteria

The [authentication design flows](../design/authentication) track screens and
pending visual work. Before implementation can be called complete, verify:

- One account with multiple memberships and different roles; switching does not
  leak data or carry permissions across companies.
- Multiple Google identities on one account; the same identity cannot link to a
  second account, including concurrent requests and email-match collisions.
- Multiple signed-in Worktandem accounts; add/switch account remains distinct from
  switching company and linking Google; zero-membership and expired-session states.
- Stale reads, mutations, subscriptions, back navigation, repeated clicks, and
  interrupted flows cannot act as a different account or company; multi-tab tests
  follow the eventually selected tab strategy.
- Eligible Google email assurance skips duplicate verification; third-party email
  proof, provider errors, denied consent, and cancellations have explicit outcomes.
- Linking requires both proofs; conflict and unlink safeguards work; Google-only
  recovery does not create a local password or bypass company session assurance.

These are acceptance requirements, not test results or shipped capabilities.
