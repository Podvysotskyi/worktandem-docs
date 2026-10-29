# Identity, company onboarding and invitations

**Status: product specification for review, 2026-10-29; not implemented.** This is
the canonical source of the confirmed rules in this scope, with unresolved choices
marked explicitly. Proposed defaults require product agreement. It is not a final
database model or authorization to implement or update designs. No authentication, approval,
invitation or platform-administration capability is claimed to exist today.

Use the confirmed rules to guide later desktop designs and the logical database
model. Settle the marked proposals before treating them as implementation inputs.
See the separate [review of the earlier database proposal](../database/identity-alignment-review).

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
PR #3 is an open draft, not an approved or merged database definition.

## Confirmed decisions

| ID | Decision | Consequence |
| --- | --- | --- |
| C01 | Google-only sign-in and registration for the present scope | No local email/password login, signup, password setup or password-recovery flow; other identity providers are future scope |
| C02 | One Worktandem account may link many Google identities; one Google identity belongs to one account | Use validated stable issuer + subject, never email, to identify the external identity |
| C03 | One account may have many company memberships | Company roles and access stay with the relevant membership |
| C04 | Many Worktandem accounts may remain signed in within one browser | Account switching, company switching and linking a Google identity are separate actions |
| C05 | Linking requires deliberate proof of the current account and the identity being linked | Matching email never automatically links, merges or transfers accounts |
| C06 | Company creation is part of new self-service registration | A created company starts Pending and needs manual platform-admin approval before business-product access |
| C07 | Platform administration has a separate Nuxt application | Worktandem operators are distinct from company administrators; a company-admin role does not grant platform privileges |
| C08 | Company administrators may invite any email address | Company-domain setup is not a mandatory invitation or registration prerequisite |
| C09 | Acceptance requires a signed-in Google identity whose verified email matches the invited address | A different-email OTP route is excluded; another identity or account must be selected instead |
| C10 | Existing users see and accept pending invitations inside the app | An invitation is discoverable without requiring the user to reopen its email link |
| C11 | Company-domain configuration is optional and belongs to optional Google API integration | Google Workspace or corporate-email admission is not the platform default |
| C12 | Authorization uses company-scoped RBAC | A manager title, team, domain or enabled module does not itself grant permission |
| C13 | EF Core code-first and migrations are the persistence direction | This specification describes logical requirements; it does not generate entities or migrations |
| C14 | Optional Google integration/domain controls still allow explicit manual invitations to outside-domain addresses | An accepted authorized manual invitation permits the matching Google identity to join and use the company; a domain check must not later undo that exception |

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
| Platform-admin Nuxt app | Operator review queue and platform controls | Separate from company app; backend checks are mandatory |

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
existing account with the same email.

Google documents that `sub` remains stable when email changes, and that email is
not an appropriate identity key. The returned `hd` claim, rather than an email
suffix or account-chooser hint, is the relevant evidence for Workspace-domain
membership. See [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

**Proposed linking flow:** from account security settings, reauthenticate the target
account and authenticate the Google identity to add, bound to one deliberate
operation. An identity already linked here is idempotent success; an identity
belonging elsewhere is a conflict without exposing that account's details. Do not
move an identity between accounts or merge accounts without a separate policy.
Unlink must preserve at least one usable login path and satisfy company policy;
concurrent unlinks must not remove the final usable method.

**Confirmed recovery boundary:** Worktandem cannot reset Google credentials and
must not introduce local password recovery. **Open:** operator-assisted recovery
when all Google identities are unavailable, owner recovery and identity transfers.
Suggested default: no self-service transfer by email; use another already-linked
identity or Google's own recovery until a separately reviewed process exists.

### Mutable email and recipient matching

**Confirmed:** invitation acceptance must match the current verified email of the
Google identity used for the accepting operation. A historical cached email,
editable contact email or another linked identity's old email is insufficient.

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

### Self-service company creation

**Confirmed sequence:** Google authentication → company-creation form → company
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

Proposed form, **not yet accepted**:

| Field | Suggested requirement | Meaning |
| --- | --- | --- |
| Company display name | Required | Not proof of legal identity and not globally unique |
| Country | Required | Product/company context; supported value policy still open |
| Business description | Required | Information for manual review |
| Applicant's role in company | Required | Review context, not a permission grant |
| Website | Optional | Review hint, not domain ownership |
| Legal registration identifier | Optional | Jurisdiction-specific; do not collect unnecessary sensitive documents |
| Applicant account | Server-supplied | Derived from authenticated actor, never accepted as an arbitrary form ID |

**Open:** exact lengths, supported countries, duplicate-company detection, legal
name requirements and whether an existing member may create additional companies.
Suggested default: flag possible duplicates for manual review; do not disclose
another tenant or auto-join by name, website or email domain.

### Invitation-based joining

**Proposed P01:** joining an existing approved company is a separate onboarding
path. A new invited user authenticates with the matching Google identity and
accepts the invitation without creating a duplicate company. An existing account
accepts into that account after proving the invited identity. Do not attach an
unlinked Google identity to that account merely because the email matches.

This exemption from mandatory company creation for invited registration is a
necessary proposed interpretation, **not a separately confirmed user decision**.
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

**Proposed P03:** a Pending/rejected company must not block the same account's
other approved memberships. The block is company-specific, not a blanket account
onboarding flag. A zero-approved-membership account still gets account settings,
invitation and status surfaces. A separate account suspension overrides all access.

### Platform review workflow

**Proposed:** review queue includes submission time, company details, applicant,
status and possible-duplicate flags. Reviewers can inspect the exact application
version, approve or reject with a reason. Require a reason for rejection; retain
prior submissions and operator decisions. Applicant-visible reasons and internal
review notes are separate fields with separate access.

Concurrent decisions use expected-version checks: two reviewers cannot independently
approve/reject different snapshots of the same Pending version. A retry of the
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
Match against sufficiently current, verified email evidence on identities linked
to that account. Show only actionable invitations to eligible recipient identities;
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
   the Google identity with the invited verified email. Having a matching identity
   linked somewhere on the account is insufficient if this operation authenticated
   a different identity.
4. On mismatch, explain which address is needed and offer the Google chooser,
   another already-signed-in Worktandem account or cancellation. Distinguish using
   another linked identity of this account from switching to another Worktandem
   account. Do not silently link, transfer an identity or accept into the old account.
5. Revalidate invitation state, expiry, company status, recipient evidence and
   proposed grants at the server immediately before commit. Optional domain policy
   must honor the confirmed explicit manual invitation exception.
6. Atomically consume the invitation and establish the intended membership/grants.
   The resulting membership belongs to the account owning the proven identity.
   Refresh company lists/inbox and offer explicit navigation into the company.

Steps are proposed implementation requirements for the confirmed matching rule.
The invite link is a locator/evidence component, not an alternative authentication
method. In-app acceptance must remain possible under the selected evidence policy.

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
| Email mismatch or changed email | No acceptance and no automatic account link; select/prove an eligible identity or request a corrected invitation |

For resend, decide whether metadata/role changes require an explicit replacement
instead of silently modifying the offer. Revocation/acceptance races must have one
winner; a retry cannot revive a terminal invitation.

## Sessions, account switching and authorization

**Confirmed:** switch account changes actor; switch company changes tenant for that
actor; link identity changes available sign-in methods. None of these actions merges
accounts or transfers permissions. Sign out current account and sign out all
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

**Proposed initial capabilities:** list/review company applications; approve/reject
the submitted version with audit; view company status and relevant operational
history; explicitly authorized suspension/reinstatement. Operator grants should
name capabilities, not confer implicit unrestricted tenant-data access. Do not
assume impersonation, company-data browsing, billing or a general ABAC engine.

Backend platform grants are explicit and separate from tenant roles. Google
sign-in, a company-owner role, an email suffix or a configured domain never grants
platform administration. The API rechecks operator grants and assurance for each
privileged action. Separate platform denial tests are required.

**Open O10:** initial operator bootstrap, grant/revoke authority, MFA assurance,
step-up, emergency recovery and self-review separation. Suggested default:
reviewed out-of-band initial provisioning with audit, minimal capability grants,
recent strong authentication for sensitive operations, and an independently
controlled recovery process. Do not infer MFA from a Google logo or `hd`; verify
what assurance claims and controls the chosen Google integration actually supports.
No operator emails, credentials or bootstrap secrets belong in documentation.

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
semantics for existing members, reauthentication, multiple linked identities,
domain changes and integration outage/revocation. Suggested default is to evaluate
validated current-session `hd` for a directory/domain-based path, with a separate
explicit manual-invitation eligibility path. Merely linking an allowed identity
does not qualify a different session; neither path grants an RBAC permission.

Also decide what happens if strict enforcement would lock out the final owner.
Prevent enabling it without an eligible owner/recovery path. An API-consent outage
must not silently remove a security restriction; login and integration availability
are separate concerns with an explicit fail/recovery policy.

## Logical data requirements

The following records and fields are **proposed modeling inputs**, not updates to
PR #3, EF entities or migrations. IDs, lengths, enum storage, database provider and
physical session tables remain open. UTC times and aggregate concurrency versions
are suggested conventions. Provider-owned records must follow the selected library.

| Record / owner | Proposed information and constraints |
| --- | --- |
| Account / Identity | Stable Id, display/contact fields, status, creation/update/version; no authoritative CurrentCompanyId, password, company role or unique-email assumption |
| ExternalIdentity / Identity | AccountId, provider, canonical Issuer, case-sensitive Subject, observed email/verified/hd, observed/authenticated times, link version; global unique (Issuer, Subject), many identities per account |
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

An owner candidate may be represented by the application reference or an explicitly
non-active membership; choose one. Do not let a generic Active membership appear
before approval. The last-active-owner invariant applies to approved companies,
not to Pending applications that intentionally have only a candidate.
Role-grant scopes and membership references use the same company;
cross-company role/member references are rejected even when individual IDs exist.

### Consistency and write requirements

- Create Pending company + submission + owner candidate together. Approve company +
  activate owner + record decision/audit together in Organization. If boundaries
  change, specify a recoverable orchestration; do not assume cross-service SQL transactions.
- Accept invitation + membership + permitted grants + terminal audit together.
  Unique membership and identity constraints provide a final concurrency guard.
- Account/identity proofs cross boundaries through validated contracts; acceptance
  records which proof/version was checked, rather than trusting an arbitrary
  client identity ID. Define freshness and invalidation for unlink/suspension races.
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

**Wrong identity:** account A has linked identities with addresses
`personal@example.test` and `work@example.test`. The invite targets the latter but
the operation authenticated the former. Show/prove the work identity; do not accept
using the personal identity merely because both are linked. If the work identity
belongs to account B, switch to B; do not link it to A or copy B's memberships.

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
| Google entry | Sign-in/register intent, Google chooser, cancel/failure, invalid response, no local password entry |
| Company form | New/incomplete submission, validation, duplicate hint without tenant disclosure, idempotent submit |
| Application status | Pending, rejection reason, edit/resubmit, approval, suspension, access to other approved memberships |
| Invitation inbox | No-company access, empty/loading/error, multiple target identities, expiry, Accept/Decline and unavailable company |
| Invitation detail | Email/in-app entry, explicit accept, identity mismatch, account chooser, already member, revoked/expired/replayed |
| Account/company controls | Distinct switchers, Add account versus Link identity, pending badge, stale session and revoked context |
| Account security | Linked identities, both-proof linking, conflict, safe unlink, Google recovery boundary |
| Platform admin | Separate operator sign-in/access-denied, review queue/detail, version conflict, approve/reject reason and audit |
| Optional Google integration | Separate consent, domain verification, policy conflict, denied/revoked scope, owner-lockout prevention |

## Acceptance matrix for future implementation

These are **proposed tests**, not results. A documentation build cannot establish
that any security or product behavior works.

| ID | Scenario | Expected result / pending choice |
| --- | --- | --- |
| T01 | Google-only registration and login; attempt password endpoints | Google path succeeds; local credential/signup/recovery unavailable |
| T02 | Same issuer/subject with changed email; two identities sharing displayed email | Stable account resolved; no merge or identity transfer |
| T03 | Two concurrent links to different accounts; concurrent final unlinks | One identity owner; final usable login path preserved |
| T04 | Abandon Google/form, retry submission, reload Pending screen | No duplicate company/owner; resumable state under chosen policy |
| T05 | Pending owner candidate directly calls business/invite/member-write APIs | Denied despite frontend routing or claimed owner role (P03) |
| T06 | Pending C plus approved B on same account | B unaffected; C denied (P03) |
| T07 | Company admin, ordinary member or forged role calls review API | Denied without explicit platform grant |
| T08 | Two reviewers decide same version; stale form changes during review | One decision; stale version rejected; owner activated once |
| T09 | Rejection/edit/resubmission and failed notification delivery | History/reason retained; new reviewed version; no rollback or duplicate effects |
| T10 | Existing no-membership account receives invite | Pending inbox reachable; no membership until explicit acceptance |
| T11 | Brand-new invitee joins approved company | No duplicate company form under P01; matching identity required |
| T12 | Wrong Google email, another linked identity, another signed-in account | Require correct identity/account; no different-email OTP or auto-link |
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

## Decisions to settle

### First decision batch already proposed, not accepted

| ID | Proposed default requiring confirmation |
| --- | --- |
| P01 | Separate self-create and invitation-join onboarding; invitees do not create another company |
| P02 | Require company name, country, business description and applicant role; website/legal registration optional |
| P03 | Activate owner on approval; Pending allows account/status/invites but no business/member invitations; rejection reason + edit/resubmit; other approved memberships unaffected |
| P04 | Seven-day invitations; resend invalidates old link; revoke/decline; initial role stays within inviter's delegation authority |
| P05 | Superseded proposal: strict domain enforcement with no guests; rejected by confirmed C14, which requires manual outside-domain invitations |

P01–P04 remain unconfirmed. Agree each option explicitly; accepting that batch does
not establish approval of every other proposal in this specification.

### Ranked remaining implementation decisions

| Priority / ID | Choice | Suggested starting point; still open |
| --- | --- | --- |
| Before design/schema / O01 | Final form, onboarding, incomplete registration and repeat company creation | P01/P02; save resumable onboarding; never auto-create/auto-join by domain |
| Before design/schema / O02 | Duplicate companies and domain claims | Manual duplicate review; no unique company-name or implicit domain-owner entitlement |
| Before design/schema / O03 | Review edits, reasons, resubmission, self-review and notifications | Versioned submissions; required rejection reason; separate internal notes; no self-review; durable outcome notifications |
| Before design/schema / O04 | Pending company/membership permissions | P03; owner candidate distinct from active member; account-level routes remain available |
| Before design/schema / O05 | Invite lifetime, resend/reinvite, initial roles, declined visibility and reinstatement | P04; least privilege; one pending offer per company/address; no removed-member bypass |
| Before design/schema / O06 | Email normalization, freshness, changed email, mailbox reassignment and collisions | Conservative matching; no aliases/dot/plus equivalence by assumption; identity keys remain stable |
| Before design/schema / O07 | Google third-party email authority | Explicit current-mailbox evidence policy while retaining same-Google-email rule; no adopted fallback yet |
| Before optional integration design / O08 | Domain policy, manual eligibility controls, proof, rechecks and directory behavior | C14 manual invitations allowed; retain independent eligibility; sync never overrides suspension; directory auto-join not adopted |
| Before security implementation / O09 | Removal/suspension, owner transfer/recovery, identity recovery and revocation timing | Preserve final-owner/login safeguards; server enforcement; agree revocation SLA and review-based recovery |
| Before security implementation / O10 | Platform bootstrap, capability grants and MFA/step-up | Explicit reviewed initial grant, minimum privileges, verified assurance and independent recovery |
| Before session implementation / O11 | Per-tab contexts, session storage, expiry, refresh and cross-app logout | Per-tab selection proposal; server-bound session proof; distinguish current/all-account logout |
| Before endpoint implementation / O12 | Privacy, account enumeration, rate limits and retention | Non-enumerating public results, per-actor/company/address limits, token-free audit; exact budgets/retention undecided |
| Before design/schema changes / O13 | Existing design/database draft reconciliation | Follow the linked database review; preserve historical ADR; separately revise PR #3 after decisions; do not imply merge |
| Future scope / O14 | Other providers, transfers/merges and provider migration | General issuer/subject model; provider-specific matching/assurance decisions before enabling; no local-password inference |
| Before migrations / O15 | Physical provider/library, entity mapping and service boundaries | Map these requirements to selected authentication/session library and service-owned EF models; do not hand-roll duplicate credential tables |

## Existing-document reconciliation

Architecture/navigation summaries link to this specification. The earlier database
draft itself remains unchanged; its required changes are recorded in the separate
[database alignment review](../database/identity-alignment-review).

| Source at start of this review | Gap against latest confirmed direction | Disposition |
| --- | --- | --- |
| Accounts and authentication | Google described as a method; optional local-credential language; generic onboarding; domain features only research | Replaced with current summary and links to this specification; email-authority policy remains explicit and open |
| Authentication design flows | No full company application/operator-review state inventory; only limited pending-invite mention | Documentation inventory updated; actual design-file work remains separate |
| Decision register / ADR-001 | Multi-account core remains valid; newer onboarding/admin/integration choices absent | ADR-002 records current rules; ADR-001 historical text retained with partial-supersession status |
| Database PR #3: Identity | Optional LocalCredential/challenges, open login-email uniqueness | Remove current-scope local-password implication; keep stable identity and provider-managed session requirements |
| Database PR #3: Organization | Company Active/Suspended/Archived only; no application/review/owner candidate; no Declined state | Align lifecycle and invitation outcomes after agreement; choose physical naming deliberately |
| Database PR #3: invitation grants | Proposal defers initial elevated role assignment; invite fields omit final role/evidence policy | Reconcile with O05 and accepted grant default; do not silently treat P04 as approved |
| Database PR #3: optional domains | No connection/domain catalog yet; Require Google research wording | Keep optional integration separately scoped; domain policy/directory tables only after their design decisions |

## Provenance and next step

This documentation change is based on verified docs `main` commit
`6962d5d6c82a1f1a19cb1f5fba242a431130e132` and the database
draft commit identified above. It was not branched from or merged with PR #3.

Settle P01–P04 and then O01–O15 in manageable product/security batches. Record
accepted/rejected options with dates and consequences; revise the proposed defaults before
treating proposed defaults as confirmed. Update designs and the database proposal
afterward, under separate explicit tasks. This publication does not authorize
application code, EF models, migrations or design edits.
