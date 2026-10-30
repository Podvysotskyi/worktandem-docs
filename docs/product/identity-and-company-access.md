# Identity, company onboarding and invitations

**Status: product specification for review, 2026-10-29; not implemented.** This is
the canonical source of the confirmed rules in this scope, with unresolved choices
marked explicitly. Proposed defaults require product agreement. It is not a final
database model or authorization to implement or update designs. No authentication, approval,
invitation or platform-administration capability is claimed to exist today.

Use the confirmed rules to guide later desktop designs and the logical database
model. Settle the marked proposals before treating them as implementation inputs.
See the separate [review of the earlier database proposal](../database/identity-alignment-review).
The [implementation readiness register](../implementation/readiness) now selects
first-slice engineering defaults and explicitly scopes remaining owner-review items.
Those technical selections are distinct from user-confirmed requirements below.

## Reading and decision status

- **Confirmed** means explicitly decided product direction or an existing confirmed
  account-model invariant. It does not mean shipped.
- **Proposed** means a suggested product default, service boundary, field or
  implementation requirement. It must not be promoted to a confirmed decision by
  copying it into a design or schema.
- **Open** means a choice still needed. The decision inventory identifies priorities.
- The security and consistency requirements below are proposed acceptance criteria
  derived from the confirmed rules; physical implementations remain undecided.

Context: [current account model](../architecture/accounts-and-authentication),
[existing decision register](../architecture/decisions),
[desktop design coverage](../design/authentication), and
[database design draft PR #3](https://github.com/Podvysotskyi/worktandem-docs/pull/3)
at commit `493443ed1a414d4d567f88712008d43232ca35ff`.
That original PR #3 snapshot was reviewed as an open draft, not an approved
database definition. Publishing its documentation does not implement or approve
the proposed schema or unresolved product defaults.

## Confirmed decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| C01 | Google-only sign-in and registration for the present scope | No local email/password login, signup, password setup or password-recovery flow; other identity providers are future scope |
| C02 | One Worktandem account has at most one Google identity; one Google identity belongs to one account | An active Google-only account has exactly one usable Google login; identify it by validated stable issuer + subject, never email; future-provider cardinality remains open |
| C03 | One account may have many company memberships | Company roles and access stay with the relevant membership |
| C04 | Many Worktandem accounts may remain signed in within one browser | Account switching changes actor; company switching changes tenant for that actor; neither attaches another Google identity |
| C05 | Email matching never automatically associates, merges or transfers accounts | No second-Google linking flow; Google replacement/recovery needs a separately agreed policy |
| C06 | Company creation is part of ordinary new self-service registration; bootstrap/platform operators need no company membership | A created company starts Pending and needs manual platform-admin approval before business-product access; platform grants never imply tenant access |
| C07 | Platform administration has a separate Nuxt application | Worktandem operators are distinct from company administrators; a company-admin role does not grant platform privileges |
| C08 | Company administrators may invite any email address | Company-domain setup is not a mandatory invitation or registration prerequisite |
| C09 | Acceptance requires a signed-in Google identity whose verified email matches the invited address | A different-email OTP route is excluded; switch to the relevant Worktandem account or authenticate the matching Google identity to resolve/create its own account |
| C10 | Existing users see and accept pending invitations inside the app | An invitation is discoverable without requiring the user to reopen its email link |
| C11 | Company-domain configuration is optional and belongs to optional Google API integration | Google Workspace or corporate-email admission is not the platform default |
| C12 | Authorization uses company-scoped RBAC | A manager title, team, domain or enabled module does not itself grant permission |
| C13 | EF Core code-first and migrations are the persistence direction | This specification describes logical requirements; it does not generate entities or migrations |
| C14 | Optional Google integration/domain controls still allow explicit manual invitations to outside-domain addresses | An accepted authorized manual invitation permits the matching Google identity to join and use the company; a domain check must not later undo that exception |
| C15 | Platform administrators have a Users list/detail/manage capability, including global ban | Company administrators do not gain platform-wide user-management rights |
| C16 | Global ban uses Account.Status = Suspended and requires a nonempty reason/description | No separate IsBanned flag; audit actor/time/reason and retain status-transition history |
| C17 | Each CompanyMembership has its own independent status | Global suspension denies access across companies without overwriting those states; reinstatement does not restore separately suspended/removed memberships or revoked grants |
| C18 | PostgreSQL is the selected database, with EF Core code-first migrations | Provider choice is settled; version/mapping and service ownership follow the engineering readiness register |
| C19 | First registered account becomes platform owner/admin through entered server-env setup secret | Validated temporary Google identity + secret + serialized no-existing-account check + durable one-time setup completion; no public first-signup ownership |
| C20 | Initial platform owner need not create/join a company and may do so later | Bootstrap has a separate destination; company ownership/business access still requires the normal company workflow and another authorized reviewer |

Company-invitation UI was previously proposed to show company, inviter, expiry,
Accept/Decline and a company-switcher badge. These presentation details, decline
policy and expiry duration remain proposals unless separately accepted.

## Actors, glossary and ownership

| Term | Meaning |
| --- | --- |
| Worktandem account | Stable global actor with its own internal ID, independent of a Google address or company |
| External identity | A Google issuer + subject association used to authenticate one Worktandem account; email is mutable evidence/profile data |
| Company | Tenant/workspace whose lifecycle and membership determine business access |
| Membership | Association of one account with one company, with company-specific status and RBAC grants |
| Account session | Revocable authenticated context for one account, with authentication evidence and expiry |
| Active context | The account session and optional company selected for a particular request/tab; not an authoritative Account.CurrentCompanyId |
| Applicant / owner candidate | Account requesting a new company; proposed future owner after approval, without active owner authority while Pending |
| Company administrator | An active member with the relevant company-management permissions, limited to that company |
| Platform administrator | Worktandem operator with an explicit platform grant; not inferred from a membership or domain |
| Invitation | Offer to join one company using a particular email; separate from membership and identity linking; lifetime remains proposed |
| Google integration | Optional company connection for separately authorized Google APIs and domain policies, independent of Google login |

**Proposed service ownership**, consistent with the .NET 10 multi-service Clean
Architecture direction:

| Owner | Responsibilities | Boundary |
| --- | --- | --- |
| Identity capability/service | Accounts, identity links, authentication evidence, sessions, account switching and platform-access grants | Exact deployable Identity boundary and authentication library remain open |
| Organization service | Companies, applications/review decisions, invitations, memberships and company RBAC | References accounts by stable contract IDs; no shared Identity entities/database |
| Integration capability | Company Google consent, domain evidence, connection health and directory operations if adopted | May begin in an appropriate existing service; no speculative new service required |
| Business services | Their own company-owned business data and authorization checks | Must not treat frontend context or gateway routing as access authority |
| Thin Gateway/BFF | Session-facing orchestration and routing | Does not own memberships, approvals or domain models |
| Platform-admin Nuxt app | Operator review queue, Users list/detail/manage and platform controls | Separate from company app; backend checks are mandatory |

API → Application → Domain, with Infrastructure implementing Application ports.
Each owning service controls its persistence and migrations. Cross-service IDs do
not imply SQL foreign keys, writable shared tables or cross-service EF navigation.
**Confirmed UI direction:** Nuxt, shadcn-vue and Tailwind shared presentation
primitives/tokens across main, company and the planned platform-admin application;
TanStack Query, Table and Form for the applicable data/form surfaces. Shared UI
does not import app/tenant/API state, and apps do not import one another. This
selected stack does not mean all components or integrations exist; current frontend
guidance identifies Query as initialized. See the
[frontend development guide](https://github.com/Podvysotskyi/worktandem-frontend/blob/main/docs/development.md).
These presentation choices do not establish authentication or RBAC.

## Account and identity behavior

**Confirmed:** a returning Google identity resolves to its existing account through
canonical validated issuer + case-sensitive subject. Its latest email does not
select a different account. A new identity is not automatically attached to an
existing account with the same email. Each Worktandem account has at most one
Google identity; an active Google-only account has exactly one usable Google login.
Multiple company memberships and concurrent Worktandem account sessions remain
supported. The earlier many-Google-identities-per-account decision is superseded by
[ADR-003](../architecture/decisions#adr-003-one-google-identity-per-worktandem-account).

Google documents that `sub` remains stable when email changes, and that email is
not an appropriate identity key. The returned `hd` claim, rather than an email
suffix or account-chooser hint, is the relevant evidence for Workspace-domain
membership. See [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

**Current boundary:** do not offer an add-second-Google-identity flow. A different
Google identity resolves to its own Worktandem account; it must not be attached to
the current account or transferred from another account. Concurrent enrollment
must preserve both global issuer/subject ownership and one Google identity per
account. Reauthenticating the same identity is not adding another sign-in method.
Do not allow removal of the only Google login and strand an active account.

**Confirmed recovery boundary:** Worktandem cannot reset Google credentials and
must not introduce local password recovery. **Open:** operator-assisted recovery
when the account's Google identity is unavailable, Google-identity replacement,
owner recovery and identity transfers. Suggested default: Google's own recovery;
no email-based transfer or unrestricted unlink/relink. Replacing an identity would
need a separately reviewed proof, conflict, atomicity and session-revocation policy,
not permission to hold two Google identities. Cardinality and linking rules for
future non-Google providers remain open.

### Mutable email and recipient matching

**Confirmed:** invitation acceptance must match the current verified email of the
Google identity used for the accepting operation. A historical cached email,
editable contact email or another Worktandem account's identity is insufficient.

**Proposed conservative matching:** preserve the original invitation address for
display; trim surrounding input whitespace and canonicalize the domain using a
documented IDNA/case policy. Do not strip dots, remove plus tags, infer aliases or
rewrite third-party local parts. Exact local-part comparison is the conservative
starting point; case-insensitive local parts and Google-specific equivalences need
an explicit decision and collision tests. Use one versioned matching function for
issuing, listing and accepting invitations. Email uniqueness is not account
uniqueness and must not be imposed globally by accident.

An identity email change updates evidence, not account ownership or memberships.
Stop matching the previous address for invitation discovery/acceptance once its
evidence is stale or changed. A newly assigned mailbox does not inherit the former
holder's account, memberships or platform grants. **Open:** evidence freshness,
mailbox reassignment and ambiguous-address handling; see O06 and O07.

### Email-authority question

Google's [server verification guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
distinguishes Gmail and verified Workspace identities from third-party addresses
without `hd`: `email_verified` may reflect an earlier check rather than current
mailbox control. This distinction must be resolved for registration and invitation
acceptance; it does not change the confirmed same-email requirement.

**Open O07:** choose acceptable current-mailbox evidence for such Google identities.
Options to discuss include fresh same-address invitation/email evidence in
addition to matching Google sign-in, or explicitly accepting Google's claim under
a documented risk policy. The former adds a step to in-app-only acceptance for
this category; the latter retains a mailbox-reassignment risk. Neither is adopted.
Do not silently restrict all users to Workspace/Gmail or add an email/password,
email-only sign-in, or different-email OTP fallback. Product agreement is needed
before this category can be treated as a complete acceptance workflow.

## Registration and company review

### Initial platform owner

**Confirmed:** initial registration can establish platform owner/admin after the
operator enters a secret supplied only in server configuration. Company creation/
joining is optional for that account. This is separate from ordinary self-service
company onboarding; there is no implicit CompanyMembership or self-review exception.

**Selected technical safeguard E05:** until durable setup is Completed, normal
registration is unavailable. Validate Google into a short-lived pre-account context,
then atomically check the entered secret, no accounts and locked incomplete setup
state before creating the first account/Google identity/grants and permanently
completing setup. Account deletion never reopens it. Missing configuration or
inconsistent existing accounts fails closed; an empty user count alone is not
authorization. See the [one-time transaction and recovery limits](../implementation/readiness#one-time-platform-bootstrap).

### Self-service company creation

**Confirmed ordinary sequence after initial bootstrap:** Google authentication → company-creation form → company
Pending → manual platform review → approval or rejection. Pending does not grant
business-product access. There is no domain-ownership prerequisite by default.

**Proposed detailed flow (P01–P03):**

1. Validate the Google response and resolve/create the account without merging by
   email. Keep a resumable incomplete-onboarding state; do not fabricate a company
   when Google authentication is cancelled or the form is abandoned.
2. Display the company form and submit it idempotently. Atomically create a Pending
   company, its submitted application version and an owner-candidate reference.
   An owner candidate is not an active privileged member.
3. Show a waiting-for-review page with application details, status and available
   next actions. Permit account settings, sign-out, status and invitation access.
4. An explicitly authorized platform reviewer approves or rejects the submitted
   version. Approval activates that company and its applicant's owner membership
   as one Organization transaction. Rejection records a reason without activating
   membership; an edited resubmission creates another reviewable version.
5. Notify the applicant of the outcome through agreed channels. A notification
   failure must not undo the decision or create an extra membership.

Form below was proposed as P02; **E06 now selects it as the engineering default for
the first slice**, with field bounds in the readiness register. It is not a claim
that each detail was separately confirmed by the user:

| Field | Suggested requirement | Meaning |
| --- | --- | --- |
| Company display name | Required | Not proof of legal identity and not globally unique |
| Country | Required | Product/company context; supported value policy still open |
| Business description | Required | Information for manual review |
| Applicant's role in company | Required | Review context, not a permission grant |
| Website | Optional | Review hint, not domain ownership |
| Legal registration identifier | Optional | Jurisdiction-specific; do not collect unnecessary sensitive documents |
| Applicant account | Server-supplied | Derived from authenticated actor, never accepted as an arbitrary form ID |

E06/E07 select first-slice field validation, manual duplicate review and versioned
rejection/resubmission. Additional company creation beyond the initial registration
path and legal/domain claims remain separate scope. Never disclose another tenant
or auto-join by name, website or email domain.

### Invitation-based joining

**Selected engineering default E08 (later invitation slice), derived from P01:** joining an existing approved company is a separate onboarding
path. A new invited user authenticates with the matching Google identity and
accepts the invitation without creating a duplicate company. An existing account
accepts into the account owning the invited Google identity. If it belongs to a
different Worktandem account, switch accounts; if it is new, resolve/create its own
account under the agreed onboarding path. Never attach it as a second Google
identity or merge accounts merely because emails match.

This exemption from mandatory company creation for invited registration is a
selected technical default, **not a separately confirmed user decision**.
The handling of a user who arrives through a generic sign-up page but has an invite
also needs agreement: suggested default is to offer discovered invitations before
asking whether they want to create a different company.

### Company states and access

All lifecycle names beyond initial Pending/manual approval are **proposed**.

| Company state | Proposed allowed operations | Business access |
| --- | --- | --- |
| Pending | Applicant status/account screens; platform review; explicitly allowed application edits | Denied; no member invitations by default |
| Rejected | View reason, edit and resubmit; platform audit | Denied |
| Approved | Active memberships and company-authorized administration | Allowed only with valid session, membership, role and policy |
| Suspended | Restricted status/recovery and operator review | Denied, including already-signed-in members |
| Archived | Retained history through expressly authorized recovery/admin paths | Denied |

Proposed transitions: Pending → Approved or Rejected; Rejected → Pending with a new
submission; Approved → Suspended; Suspended → Approved after authorized review;
Approved/Suspended → Archived under a separate retention policy. Approval is a
business decision, not a freely writable status field.

**Selected engineering default E07, based on P03:** a Pending/rejected company must not block the same account's
other approved memberships. The block is company-specific, not a blanket account
onboarding flag. A zero-approved-membership account still gets account settings,
invitation and status surfaces for an otherwise eligible account. A separate global
account suspension denies protected operations; limited suspended-account status/
appeal surfaces remain open O16.

### Platform review workflow

**Proposed:** review queue includes submission time, company details, applicant,
status and possible-duplicate flags. Reviewers can inspect the exact application
version, approve or reject with a reason. Require a reason for rejection; retain
prior submissions and operator decisions. Applicant-visible reasons and internal
review notes are separate fields with separate access.

Concurrent decisions use expected-version checks: two reviewers cannot independently
approve/reject different snapshots of the same Pending version. Approval atomically
requires that the company is still Pending, the requested application is still its
current submission, and the company's concurrency version matches the expected
version, in addition to operator authorization and the immutable submission/version
check. A newer current submission or changed company version prevents approval of
the old submission even when that old submission's own version still matches.
A retry of the
same decision returns the original result. Do not let edits silently change an
application being approved. Self-review, review SLA, edit-while-Pending rules,
notification channels and resubmission limits remain O03 decisions.

## Invitation lifecycle

### Issue and discover

**Confirmed:** a company administrator can address an invitation to any email.
Issuing an invitation does not create membership, establish identity ownership or
grant access. Email and in-app views operate on the same underlying invitation.

**Proposed P04:** only approved companies and active administrators with invitation
permission may issue invitations. Invitation role selection is limited to grants
the inviter may delegate. Start with a least-privilege member role; no implicit
owner or platform role. Validate any referenced role/scope belongs to the company.
Never tell the inviter whether the address is already a Worktandem account.

**Proposed discovery:** an authenticated account-level Pending invitations page is
available before company selection, including for accounts without any memberships.
Match against sufficiently current, verified email evidence for that account's
single Google identity. Show only actionable invitations eligible for that identity;
stale evidence may require Google reauthentication. Listing is not acceptance.
Apply the eventual O07 policy before revealing invitation detail for uncertain
third-party mailbox evidence. Do not expose an unauthenticated email-search API.

Suggested row/card: company name, inviter display name, target email/Google
identity, invited role, sent time, expires time, Accept and Decline. Show a badge
in the company switcher, but make the full inbox reachable without a company.
These UI details remain proposed; no Penpot or other design changes are made here.

### Accept or choose another identity

1. Open the same invitation from an email link or the in-app inbox. If signed out,
   offer Google sign-in and retain only a safe, bounded return destination.
2. Show the intended company and recipient and require an explicit acceptance.
   An email-link GET must not create membership or consume the invitation.
3. Validate that the current account session has fresh authentication evidence for
   its single Google identity with the invited verified email. A different signed-in
   Worktandem account's Google identity does not qualify the current account.
4. On mismatch, explain which address is needed and offer the Google chooser,
   another already-signed-in Worktandem account or cancellation. Authenticating the
   matching Google identity resolves its own Worktandem account or starts that
   account's registration; it does not add a second identity to this account.
   Do not silently transfer/merge identities or accept into the old account.
5. Revalidate invitation state, expiry, company status, recipient evidence and
   proposed grants at the server immediately before commit. Optional domain policy
   must honor the confirmed explicit manual invitation exception.
6. Atomically consume the invitation and establish the intended membership/grants.
   The resulting membership belongs to the account owning the proven identity.
   Refresh company lists/inbox and offer explicit navigation into the company.

Steps are proposed implementation requirements for the confirmed matching rule.
The invite link is a locator/evidence component, not an alternative authentication
method. The authenticated in-app route does not inherently require the email-link
token. Additional same-address mailbox evidence for non-Gmail/no-`hd` identities
remains subject to O07; no OTP or other unresolved evidence policy is adopted here.

### Outcomes, expiry and retries

Proposed statuses: **Pending → Accepted / Declined / Revoked / Expired**.
Treat `now >= ExpiresAt` as expired even if a cleanup job has not updated Status.
Resend rotates the email-link secret on the same pending invitation and establishes
a new expiry; explicitly re-inviting after a terminal state creates a new invitation.
Final defaults and the status model remain P04/O05 decisions.

| Situation | Proposed behavior |
| --- | --- |
| Accept valid invitation | Create/activate one authorized membership and record accepting account/identity evidence |
| Decline | Only the proven recipient may decline; terminal for that invite; company may send a new invitation later |
| Revoke | Authorized company admin cancels a Pending invite; it cannot be accepted afterward |
| Expire | Explain expiry without disclosing private account details; offer a way to request a new invite |
| Resend Pending | Suggested seven-day lifetime from resend; invalidate previous link secret; inbox still refers to the same invite |
| Duplicate Pending issue | Reuse/resend rather than create parallel grants for the same company/address; enforce race safety |
| Already active member | Idempotent already-member result; do not upgrade roles from a stale invite; retire it as a no-op acceptance with audit |
| Previously removed/suspended member | Do not bypass the removal/suspension; require an explicitly permitted reinstatement workflow |
| Repeated acceptance by same actor | Return the established result; do not create duplicate memberships, grants or notifications |
| Replay from another actor | No membership change; generic invalid/unavailable result unless disclosure is authorized |
| Role deleted, scope changed or inviter loses delegation rights | Revalidate at acceptance; suggested default blocks until an authorized admin reissues/reviews it |
| Company Pending/suspended/archived | No business membership activation; suggested default rejects acceptance until company becomes eligible |
| Email mismatch or changed email | No acceptance or second-Google linking; switch to the Worktandem account owning the matching identity, register its own account if new, or request a corrected invitation |

For resend, decide whether metadata/role changes require an explicit replacement
instead of silently modifying the offer. Revocation/acceptance races must have one
winner; a retry cannot revive a terminal invitation.

## Sessions, account switching and authorization

**Confirmed:** switch account changes actor; switch company changes tenant for that
actor. Neither action attaches another Google identity, merges accounts or transfers
permissions. Sign out current account and sign out all
Worktandem accounts are distinct; neither means signing out of Google itself.

**Proposed request invariant:** every protected business operation resolves a valid
account session and explicit company context, then validates account eligibility,
approved company status, active membership, company-scoped permission, and current
identity/domain assurance if a policy applies, including any authorized manual
outside-domain membership exception. Account-level endpoints use account
authority without requiring an approved company. Platform endpoints require platform
grants, independent of a company selection. An enabled module is an additional
availability check, never a permission grant.

Client routes, hidden buttons, a claimed AccountId/CompanyId, cached role labels or
selected email domains cannot authorize writes. Microsoft distinguishes
[authentication from endpoint authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/introduction?view=aspnetcore-10.0).

**Proposed:** freeze the validated actor/company for an operation. Partition client
and server caches, requests and subscriptions by account + company where relevant.
On switching, cancel/discard old responses, clear sensitive state, validate the new
membership and establish fresh subscriptions. A queued mutation must retain its
original context or be cancelled, never be rebound to the newly selected company.

**Open O11:** cookie/session and per-tab strategy across Nuxt applications. Suggested
default is per-tab active account/company with server-validated session handles,
explicit cross-tab sign-out/revocation signaling and no browser-global mutable
active-company authority. This is not a selected storage/protocol implementation.
Decide idle/absolute expiry, refresh/rotation, assurance age, logout scope and
revocation propagation bounds before implementation.

**Proposed:** removal, company/account suspension, lost roles and policy changes
revoke or invalidate affected sessions/context promptly, with a documented maximum
staleness and server checks. Never rely only on waiting for a client refresh or
long-lived JWT expiry. Owner removal must preserve an authorized recovery path.

## Platform administration

**Confirmed:** a separate platform-wide Nuxt app serves Worktandem operators.
It is not the existing company-admin workspace. Its routes/host/deployment and
shared-session details are open; no new app is scaffolded by this specification.

**Confirmed user management:** the platform-admin app includes a Users list,
individual user details and authorized management actions, including global ban.
The API requires the appropriate explicit platform grant; a company-admin/Owner
role alone grants no access to these platform-wide queries or actions. Exact
capability keys and editable profile fields remain open.

**Proposed review capabilities:** list/review company applications; approve/reject
the submitted version with audit; view company status and relevant operational
history; explicitly authorized suspension/reinstatement. Operator grants should
name capabilities, not confer implicit unrestricted tenant-data access. Do not
assume impersonation, company-data browsing, billing or a general ABAC engine.

Backend platform grants are explicit and separate from tenant roles. Google
sign-in, a company-owner role, an email suffix or a configured domain never grants
platform administration. The API rechecks operator grants and assurance for each
privileged action. Separate platform denial tests are required.

**O10 disposition:** initial bootstrap is now confirmed and secured by E05;
E12 selects privileged-assurance defaults for owner review. Grant/revoke/recovery
and rollout choices follow the readiness register; no out-of-band account seed or
public first-signup shortcut is selected. Do not infer MFA from a Google logo or `hd`; verify
what assurance claims and controls the chosen Google integration actually supports.
No operator emails, credentials or bootstrap secrets belong in documentation.
Do not infer production readiness from the design.

### Global user suspension and company status

**Confirmed:** global ban is `Account.Status = Suspended`, with a mandatory nonempty
reason/description. Do not add a second `IsBanned` source of truth. Record the
authorized actor, time, reason and before/after status in retained transition
history. Whitespace-only input does not meet the nonempty-reason requirement;
validate at the server, not just on the dialog.

Account status and each Company's CompanyMembership.Status are independent. A
globally suspended account is denied protected company access everywhere even if
its memberships are Active or its manual outside-domain eligibility remains valid.
Do not mass-update membership statuses or delete their grants when globally banning
the account. A company-level suspension affects only that company's membership;
it neither globally bans the account nor changes another company's membership.

Reinstatement changes the account's global state through an authorized transition.
It must re-evaluate current company, membership, eligibility and permission state;
it does not activate separately Suspended/Left/removed memberships, undo company
suspension, or recreate revoked tenant/platform grants. Do not use a pre-ban snapshot
to restore privileges. Company approval and the existing tenant RBAC gates remain.

**Proposed consistency plan:** compare the expected Account.Version and prior state,
then atomically persist status + actor/time/reason transition history in the owning
Identity transaction. Keep retries idempotent without hiding history, replacing a
reason or emitting duplicate side effects. Competing suspend/reinstate/profile edits
must not silently overwrite a newer status. Prevent generic profile updates from
mass-assigning Status; allowable editable fields need a separate decision.

Account suspension must invalidate/revoke affected account sessions and prevent
stale cookies, tokens, caches, subscriptions, queued jobs or another tab from
continuing protected actions. Apply server-side status checks and an explicit
revocation/invalidation contract; a client-only ban screen or waiting for refresh
is insufficient. Reinstatement is not automatic revival of revoked sessions.
Mechanism, propagation bound, reauthentication/session behavior and cross-service
timing guarantees remain O09/O11 decisions, not a claimed implementation.

**Open O16:** editable fields, user/reviewer visibility of reasons, timed suspensions,
whether reinstatement needs a separate reason, minimal suspended-account status/
appeal surfaces, self/last-operator safeguards and last-company-owner recovery.
Do not infer bulk deletion, impersonation, timed auto-unban or unrestricted profile/
identity editing from the word Manage. O10 operator assurance and recovery also apply.
See [account-state data](../database/identity#account-status-transition-history) and
[suspension consistency](../database/integrity#global-account-suspension-and-reinstatement).

## Optional company Google API integration

**Confirmed:** domain configuration is optional, part of Google API integration,
and not required for ordinary Google-only registration or invitations to any email.

**Proposed separation:** Google login establishes the actor; a company integration
requests separate, purpose-specific OAuth scopes from an appropriately authorized
company administrator. Store consent/grant owner, scopes, connection health and
revocation metadata in the integration's owning service. Protect API refresh tokens
as secrets; never copy them into membership records or audit payloads. Request
incremental scopes only when using a feature. See
[Google OAuth web-server authorization](https://developers.google.com/identity/protocols/oauth2/web-server).

Domain configuration needs separate proof of administrative control/ownership and
a reviewed conflict policy. Neither an email suffix, a validated user `hd` claim,
a website value nor a typed domain proves the applicant controls a company/domain.
Domain claims cannot automatically award company ownership, platform grants,
membership or account linking. Directory synchronization and automatic provisioning
are still separate proposals; an integration connection alone does not enable them.

### Domain controls and manual outside-domain invitations

**Confirmed C14:** an authorized company administrator can explicitly invite an
outside-domain address even when Google integration/domain controls are enabled.
The recipient uses a Google identity with the exact invited verified email, as for
any other invitation. After acceptance, domain enforcement must honor this manual
eligibility during subsequent company access. Allowing acceptance but denying every
later request solely because of the invited address's domain violates this rule.

This is an explicit manual-invitation exception. It does not introduce arbitrary
domain auto-join, automatic directory provisioning, company ownership or additional
role permissions. Normal account/company/membership suspension and RBAC still apply.
The earlier proposal for strict domain enforcement with no guests is superseded by
this confirmed decision and is not an open default.

**Proposed provenance model:** retain why membership is eligible, with independent
manual and directory-managed eligibility if both later exist. Absence from a
directory must not remove an independently authorized manual member. A single
overwriteable Source flag cannot represent simultaneous manual and directory
eligibility safely. Do not add directory-grant tables before directory-sync scope
is actually selected. Sync must not undo an explicit administrator suspension.

**Open O08:** choose the optional domain policy's exact scope, who may grant/revoke
manual exceptions, how to display them, and recheck/recovery rules. Decide policy
semantics for existing members, reauthentication, Google-identity replacement,
domain changes and integration outage/revocation. Suggested default is to evaluate
validated current-session `hd` for a directory/domain-based path, with a separate
explicit manual-invitation eligibility path. A different Worktandem account's
allowed-domain identity does not qualify the current session; neither path grants
an RBAC permission.

Also decide what happens if strict enforcement would lock out the final owner.
Prevent enabling it without an eligible owner/recovery path. An API-consent outage
must not silently remove a security restriction; login and integration availability
are separate concerns with an explicit fail/recovery policy.

## Logical data requirements

The following records and fields are **proposed modeling inputs** for the aligned
database catalog, not EF entities or migrations. IDs, lengths, enum storage, database provider and
physical session tables remain open. UTC times and aggregate concurrency versions
are suggested conventions. Provider-owned records must follow the selected library.

| Record / owner | Proposed information and constraints |
| --- | --- |
| Account / Identity | Stable Id, display/contact fields, Status with Suspended used for global ban, creation/update/version; no redundant IsBanned, authoritative CurrentCompanyId, password, company role or unique-email assumption |
| Account status transition / Identity | Proposed immutable account/actor references, before/after status, occurred time, reason and idempotency/version correlation; nonempty reason required for global suspension; physical storage/retention open |
| SetupState / Identity | Singleton durable completion marker/version/initial-owner reference, locked during account bootstrap; never reset by deleting users, never store the entered environment secret |
| ExternalIdentity / Identity | AccountId, provider, canonical Issuer, case-sensitive Subject, observed email/verified/hd, observed/authenticated times, association version; global unique (Issuer, Subject), plus Google-scoped uniqueness of AccountId so one account cannot hold two Google identities; future-provider cardinality open |
| AccountSession / Identity | AccountId, identity/evidence reference, authentication time/assurance, created/expires/revoked times, context/version as selected; no exposed bearer values |
| PlatformGrant / Identity capability | AccountId, capability, grant/revoke actor/time, status/version; tenant roles cannot create these grants |
| Company / Organization | Id, display name, status, created/update/version; applicant/owner-candidate relation distinct from activated membership |
| CompanyApplication / Organization | CompanyId, applicant AccountId, submission version, form snapshot, submitted time, review state; immutable reviewed versions |
| ReviewDecision / Organization | Application/version, outcome, reviewer AccountId/platform grant evidence, timestamp, applicant-visible reason, separate internal note, idempotency/correlation ID |
| Membership / Organization | CompanyId, AccountId, status, joined/ended times and version; unique (CompanyId, AccountId); tenant-bound role grants |
| Invitation / Organization | CompanyId, original recipient + matching form/version, inviter membership, proposed roles/scopes, status, created/expires/terminal times, accepted AccountId/MembershipId and identity-evidence reference, version |
| InviteLinkCredential / Organization | InvitationId, generation, opaque-token digest, expiry/revocation/consumption metadata; logical capability may live on Invitation, raw secret never retained in logs |
| GoogleConnection / integration owner | CompanyId, authorized actor, scopes, secret reference, consent/revocation times, health/version; login identity association is not consent |
| CompanyDomainPolicy / integration owner | CompanyId, verified domain/control evidence, status, restrictions if selected, verification/recheck times, version; manual invitations remain allowed; no automatic owner grant |
| Membership eligibility / Organization | Proposed auditable accepted-manual-invitation reference; if sync is adopted, separate independent directory eligibility rather than one destructive source flag; suspension remains an overriding membership state |
| Audit / each owner | Event ID, actor, optional company, action, target, timestamp, outcome/reason code, correlation and changed-version reference; avoid raw tokens and unnecessary profile data |

E07 selects the application applicant reference as owner candidate; a parallel
inactive candidate membership is not selected. Do not let an Active membership appear
before approval. The last-active-owner invariant applies to approved companies,
not to Pending applications that intentionally have only a candidate.
Role-grant scopes and membership references use the same company;
cross-company role/member references are rejected even when individual IDs exist.

The logical Google uniqueness requirement may map to a Google-specific relation,
a provider-scoped/filtered unique key or the selected authentication library's
equivalent; E09 selects the PostgreSQL partial unique account key for the first slice.
Do not make AccountId globally unique across all providers or generalize a Google-specific rule into one identity per future
provider without a separate decision. At-most-one uniqueness does not itself
guarantee a usable login: activation and recovery workflows must preserve exactly
one usable Google login for an active Google-only account.

### Consistency and write requirements

- Create Pending company + submission + owner candidate together. Approve company +
  activate owner + record decision/audit together in Organization. If boundaries
  change, specify a recoverable orchestration; do not assume cross-service SQL transactions.
- Accept invitation + membership + permitted grants + terminal audit together.
  Unique membership and identity constraints provide a final concurrency guard.
- Account/identity proofs cross boundaries through validated contracts; acceptance
  records which proof/version was checked, rather than trusting an arbitrary
  client identity ID. Define freshness and invalidation for any future approved
  replacement/recovery workflow and for suspension races.
- Use expected-version checks for review, revoke/resend, policy changes and grants.
  Idempotency keys are bound to actor, company, operation and request payload.
- Acceptance and revocation/expiry races have one committed outcome. Resending
  invalidates the prior email-link generation; retries do not extend expiry again.
- Authentication/session checks and current business authorization precede every
  write; recheck mutable prerequisites close to commit. Reject mass-assigned
  status, owner, role, account, company and platform-grant fields.
- Notifications use a durable retry mechanism such as an outbox in the owning
  service; do not hold a database transaction across Google or email network calls.
  Deduplicate notification delivery separately from decision/membership creation.
- Privacy/rate limits apply to auth callbacks, invite issue/resend/lookup and review
  submissions. Public responses must not reveal whether an email has an account.
  List endpoints enforce the same account/company boundaries as writes.
- Define retention/erasure and audit access before production. Retain required
  review/invitation evidence without keeping reusable link secrets or ID tokens.

EF Core migrations later describe reviewed schema changes from code models; they
are not generated from this prose. See
[Microsoft EF Core migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/).

## Worked examples

All names and addresses below are synthetic.

**New company:** an account authenticates with Google and submits company
“Example Workshop”. Under P02/P03, the form creates Company Pending and an owner
candidate. Viewing status is permitted; sending invitations or reading business
records is denied. An authorized platform reviewer approves the current submission;
the company becomes Approved and the applicant becomes its owner atomically.

**Existing user:** account A has Google identity `member@example.test`. An admin
invites that address to company B. The pending invitation appears in A's account
inbox even when A has no company. Accept authenticates that identity and creates B's
membership only after the same server validation used by the email-link flow.
For this synthetic third-party email, O07 still determines mailbox-evidence needs.

**Wrong account:** account A uses Google identity `personal@example.test`; separate
account B uses Google identity `work@example.test`. The invite targets the latter
while A is active. Switch to B and prove its Google identity; do not accept into A,
attach B's Google identity to A or copy B's memberships. If the matching Google
identity has no Worktandem account, start its own account registration under the
agreed invitation-onboarding policy.

**Other approved membership:** account A applies for new company C while already
active in approved B. Under P03, C's Pending state denies C's business data while A
can still work in B. Rejecting C must not suspend A globally.

**Optional domain controls:** a company with a configured Workspace domain manually
invites an outside-domain address. The recipient proves the matching Google
identity and accepts. The resulting active member can use the company within
assigned roles. Directory absence or a blanket domain middleware check must not
erase that manually granted eligibility; an explicit member suspension still denies.

## Desktop design inputs after decisions

The current design scope is desktop. The screen inventory below is a proposal for
later design work, not a statement that any mockup has been updated:

| Surface | Required states to design |
| --- | --- |
| Google entry | Sign-in/register/bootstrap intent, Google chooser, cancel/failure, invalid response; temporary pre-account proof followed by setup-secret input when initializing; no local password entry |
| Company form | New/incomplete submission, validation, duplicate hint without tenant disclosure, idempotent submit |
| Application status | Pending, rejection reason, edit/resubmit, approval, suspension, access to other approved memberships |
| Invitation inbox | No-company access, empty/loading/error, target account/Google email, expiry, Accept/Decline and unavailable company |
| Invitation detail | Email/in-app entry, explicit accept, identity mismatch, account chooser, already member, revoked/expired/replayed |
| Account/company controls | Distinct switchers, Add Worktandem account with its own Google identity, pending badge, stale session and revoked context; no add-second-Google action |
| Account security | Single Google identity and recovery guidance; no second-Google linking or unrestricted unlink/relink; replacement policy remains open |
| Platform admin | Separate operator sign-in/access-denied; review queue/detail; Users list/detail/manage; global Suspend dialog with required reason, validation, conflict/success and reinstatement; distinct global/membership statuses and audit visibility under selected policy |
| Optional Google integration | Separate consent, domain verification, policy conflict, denied/revoked scope, owner-lockout prevention |

## Acceptance matrix for future implementation

These are **proposed tests**, not results. A documentation build cannot establish
that any security or product behavior works.

| ID | Scenario | Expected result / pending choice |
| --- | --- | --- |
| T01 | Google-only registration and login; attempt password endpoints | Google path succeeds; local credential/signup/recovery unavailable |
| T02 | Same issuer/subject with changed email; two identities sharing displayed email | Stable account resolved; no merge or identity transfer |
| T03 | Concurrent attempts attach one Google identity to different accounts or two Google identities to one account; removal of the only login | Both ownership/cardinality invariants hold under races; active Google-only account is not stranded; no unrestricted replacement path |
| T04 | Abandon Google/form, retry submission, reload Pending screen | No duplicate company/owner; resumable state under chosen policy |
| T05 | Pending owner candidate directly calls business/invite/member-write APIs | Denied despite frontend routing or claimed owner role (P03) |
| T06 | Pending C plus approved B on same account | B unaffected; C denied (P03) |
| T07 | Company admin, ordinary member or forged role calls review API | Denied without explicit platform grant |
| T08 | Two reviewers decide same version; company changes state/version or a newer submission replaces the requested one | One decision; non-Pending, mismatched company version or superseded submission rejected without owner activation even if the old immutable submission version matches |
| T09 | Rejection/edit/resubmission and failed notification delivery | History/reason retained; new reviewed version; no rollback or duplicate effects |
| T10 | Existing no-membership account receives invite | Pending inbox reachable; no membership until explicit acceptance |
| T11 | Brand-new invitee joins approved company | No duplicate company form under P01; matching identity required |
| T12 | Wrong Google email/account; another signed-in account or new matching Google identity | Switch to/resolve the matching identity's own Worktandem account; no second-Google linking, email-based merge or different-email OTP |
| T13 | Third-party email_verified without hd; stale/reassigned email | Follow agreed O06/O07 evidence policy; no historical-email takeover |
| T14 | Email-link GET or in-app view; forged invitation/actor ID | No consumption on view; unauthorized lookup/write denied |
| T15 | Accept from email versus in-app; repeated clicks/replay/concurrent accept | Same invitation state/result; at most one membership/grant set |
| T16 | Expiry boundary, revoked/declined invite, old resend link | Terminal/expired outcomes enforced at request time; old link invalid |
| T17 | Existing member, suspended/removed member, deleted role, inviter loses grant | No privilege escalation or reinstatement bypass; reviewed fallback |
| T18 | Same role/member ID from another company; disabled module | Cross-company grant denied; module state grants no permission |
| T19 | Company/account switch with late fetch, queued mutation, back navigation | No data leakage/rebinding; operation context remains fixed |
| T20 | Concurrent tabs and Nuxt apps, sign out current versus all accounts | Follow O11 context model; revoked session cannot keep protected access |
| T21 | Account/company/member suspension or role revocation while session active | Server denial within agreed revocation bound; no client-only enforcement |
| T22 | Optional domain disabled, mismatched hd, linked-only allowed identity | Default admits eligible Google users; a domain-based path needs current evidence; explicit manual-invitation eligibility remains honored |
| T23 | Optional domain control plus authorized manual outside-domain invite | Matching Google recipient can accept and later access within assigned roles; directory absence does not erase independent manual eligibility |
| T24 | Consent denied/revoked or directory outage; last owner would be blocked | Login/integration separated; explicit recovery and policy behavior |
| T25 | Account enumeration, invite spam, malicious return URL, forged callback | Privacy/rate limits, safe return destinations, signature/audience/issuer/expiry and CSRF/replay checks |
| T26 | Notification retries, audit inspection, log/token review | One business effect; authorized traceable audit; no raw reusable secrets |
| T27 | Global ban of account with Active and separately Suspended/Left memberships in different companies | Account.Status becomes Suspended with recorded actor/time/nonempty reason; all protected company access denied; membership states and grants remain unchanged |
| T28 | Reinstate globally suspended account after separate membership suspension/removal, company suspension or grant revocation | Only global state changes; current independent gates still deny where applicable; no membership/grant/session restoration from an old snapshot |
| T29 | Empty/whitespace suspension reason, forged actor/status/profile write or company admin calls Users/ban API | Server rejects invalid reason or unauthorized action with no status/history mutation; authorized transitions retain correct actor/time/reason and before/after history |
| T30 | Concurrent suspend/reinstate/profile update, duplicate retry and stale tabs/tokens/jobs | Version conflict/idempotency prevents lost history/duplicate effects; status checks and chosen revocation contract prevent continued protected access; exact timing follows open decisions |
| T31 | A company membership is suspended while another is Active; a different Worktandem account is signed in in the same browser | Only the relevant company's membership is affected by its suspension; global ban of the target account does not merge or ban the separate signed-in account |
| T32 | Wrong/missing setup secret, two concurrent bootstrap attempts, rollback, ordinary pre-bootstrap signup or all accounts later removed | No permanent account before atomic owner creation; one winner only; registration gate holds; durable Completed never reopens; owner has no implicit company or self-approval |

## Decisions to settle

### First decision batch already proposed, not accepted

| ID | Proposed default requiring confirmation |
| --- | --- |
| P01 | Separate self-create and invitation-join onboarding; invitees do not create another company |
| P02 | Require company name, country, business description and applicant role; website/legal registration optional |
| P03 | Activate owner on approval; Pending allows account/status/invites but no business/member invitations; rejection reason + edit/resubmit; other approved memberships unaffected |
| P04 | Seven-day invitations; resend invalidates old link; revoke/decline; initial role stays within inviter's delegation authority |
| P05 | Superseded proposal: strict domain enforcement with no guests; rejected by confirmed C14, which requires manual outside-domain invitations |

P01–P04 were not separately user-confirmed. The readiness register now selects
E06/E07 first-slice onboarding/review defaults and E08 later invitation defaults.
O07 remains a gate before invitation acceptance. These are engineering choices
under preparation authority, not blanket user approval of every earlier proposal.

### Ranked remaining implementation decisions

| Priority / ID | Choice | Suggested starting point; still open |
| --- | --- | --- |
| Before design/schema / O01 | Form/onboarding and repeat company creation | E06 selects initial fields and resumable registration; E08 selects later invitation-join exemption; extra company-creation/legal claims remain separate scope |
| Before design/schema / O02 | Duplicate companies and domain claims | Manual duplicate review; no unique company-name or implicit domain-owner entitlement |
| Before design/schema / O03 | Review lifecycle | E07 selects single status, Pending read-only, rejection reason, new rejected resubmission, no self-review and in-app status outcome; additional channels are later scope |
| Before design/schema / O04 | Pending company/membership permissions | P03; owner candidate distinct from active member; account-level routes remain available |
| Before design/schema / O05 | Invite lifetime, resend/reinvite, initial roles, declined visibility and reinstatement | P04; least privilege; one pending offer per company/address; no removed-member bypass |
| Before design/schema / O06 | Email normalization, freshness, changed email, mailbox reassignment and collisions | Conservative matching; no aliases/dot/plus equivalence by assumption; identity keys remain stable |
| Before design/schema / O07 | Google third-party email authority | Explicit current-mailbox evidence policy while retaining same-Google-email rule; no adopted fallback yet |
| Before optional integration design / O08 | Domain policy, manual eligibility controls, proof, rechecks and directory behavior | C14 manual invitations allowed; retain independent eligibility; sync never overrides suspension; directory auto-join not adopted |
| Before security implementation / O09 | Removal/suspension, owner transfer/recovery, Google replacement/recovery and revocation timing | Preserve final-owner and single-usable-Google safeguards; no unrestricted unlink/relink; agree proofs, atomicity, revocation SLA and review-based recovery |
| Before privileged rollout / O10 | Capability grants, assurance and recovery | Bootstrap selected E05; E12 privileged assurance and controlled recovery require owner review/real-client verification; no automatic empty-database owner grant |
| Before session implementation / O11 | Session design and revocation integration | E04/E11 select server container/per-tab selectors, 30-minute idle/12-hour absolute sessions, browser logout semantics and live checks; actual integration must prove them |
| Before endpoint implementation / O12 | Privacy, account enumeration, rate limits and retention | Non-enumerating public results, per-actor/company/address limits, token-free audit; exact budgets/retention undecided |
| Before design/schema changes / O13 | Existing design/database draft reconciliation | Follow the linked database review; preserve historical ADR; separately revise PR #3 after decisions; do not imply merge |
| Future scope / O14 | Other providers, their cardinality/linking rules, transfers/merges and provider migration | General issuer/subject model; one-Google rule does not decide non-Google cardinality; provider-specific proof/matching/assurance before enabling; no local-password inference |
| Before migrations / O15 | Physical mapping and service boundaries | PostgreSQL confirmed; E01–E04/E09 select provider/library/boundaries and sessions for the first slice; map requirements to reviewed service-owned EF models, no duplicate credential framework |
| Before affected user-management rollout / O16 | User editing/reasons and owner safeguards | Readiness selects DisplayName-only editing, internal reasons and no timed bans; public global status/removal writes are backend-gated until ownership coordination is reviewed; no revival of revoked memberships/grants |

## Existing-document reconciliation

Architecture/navigation summaries link to this specification. The original database
snapshot is preserved in history; the [current logical catalog](../database/overview)
now incorporates the confirmed-rule alignment. The separate
[database alignment review](../database/identity-alignment-review#documentation-dispositions)
records documentation dispositions and remaining decisions, not schema approval.

| Source at start of this review | Gap against latest confirmed direction | Disposition |
| --- | --- | --- |
| Accounts and authentication | Google described as a method; optional local-credential and many-Google language; generic onboarding; domain features only research | Replaced with current one-Google summary and links to this specification; email-authority policy remains explicit and open |
| Authentication design flows | No full company application/operator-review state inventory; only limited pending-invite mention | Documentation inventory updated; actual design-file work remains separate |
| Decision register / ADR-001 | Multi-company and concurrent-account rules remain valid; many-Google cardinality superseded | ADR-002 records onboarding/admin rules; ADR-003 records one-Google cardinality; historical text retained with explicit supersession |
| Database PR #3: Identity | Optional LocalCredential/challenges, open login-email uniqueness, obsolete many-Google cardinality | Current catalog removes local-password/multiple-Google flows, preserves issuer/subject and proposes Google-scoped account uniqueness; future-provider/recovery rules remain open |
| Database PR #3: Organization | Company Active/Suspended/Archived only; no application/review/owner candidate; no Declined state | Current catalog proposes versioned applications/reviews, candidate separation and complete invitation outcomes; final form/status/default choices still open |
| Database PR #3: invitation grants | Proposal defers initial elevated role assignment; invite fields omit final role/evidence policy | Explicit conditional role-offer/revalidation model and O05/O07 boundaries documented; P04 remains proposed |
| Database PR #3: optional domains | No connection/domain catalog yet; Require Google research wording | Logical optional consent/domain/manual-eligibility requirements documented separately; directory-sync schema deferred until scope adopted |

## Provenance and next step

The product specification was established in PR #5, based on verified docs `main` commit
`6962d5d6c82a1f1a19cb1f5fba242a431130e132` and the database
draft commit identified above. PR #5 did not import or merge PR #3. The current
database proposal subsequently incorporates merged specification commit
`bc2202360adeac9bd06f9d45f4901e859f553cf2` and aligns the catalog without changing
confirmed product rules or implementing a schema.

Review the selected first-slice engineering defaults and remaining O01–O16 scope gates. Record
accepted/rejected options with dates and consequences; revise the proposed defaults before
treating proposed defaults as confirmed. Use the aligned catalog for the next model
review; actual designs and implementation remain separate tasks. This publication does not authorize
application code, EF models, migrations or design edits.
