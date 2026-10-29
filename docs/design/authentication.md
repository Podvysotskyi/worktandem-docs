# Authentication design flows

**Status: desktop design inputs; not implemented and no design files updated by this change.**

The [canonical product specification](../product/identity-and-company-access) is the
source of current confirmed rules and marks proposals/open choices. Earlier visual
drafts may predate these decisions and do not override them. Apply confirmed rules
and settle relevant proposals before revising actual designs.
Use the approved Penpot file `dfe56358-c92b-8141-8008-dca07ba00319`, page
`40725179-241f-80d5-8008-dcc0d0e0eabc`, revision 53 as the desktop baseline: hybrid
navy enterprise styling and structured topbar/rail navigation. The
[readiness handoff](../implementation/readiness#environment-and-design-handoff)
records required deltas, not edits performed to that prototype.

## Desktop scope

Current design work is desktop-only. Mobile drafts are not updated by this document.
Use the canonical [screen inventory](../product/identity-and-company-access#desktop-design-inputs-after-decisions)
and [acceptance matrix](../product/identity-and-company-access#acceptance-matrix-for-future-implementation)
for detailed states and future verification.

| Flow | Current design requirement |
| --- | --- |
| Sign-in and registration | Google only; chooser/cancel/provider error; no local password login/signup/recovery |
| One-time setup | Temporary Google proof followed by entered server-env secret; invalid/missing/throttled/closed setup; no permanent account before atomic owner creation |
| Operator without company | Platform home with own grants and optional create-company action; no forced company form, implicit tenant membership or first-owner self-review exception |
| New self-service company | Company form, Pending status and manual approval gate; E06/E07 select initial fields and rejection/resubmission defaults |
| Invitation join | Matching verified Google email, explicit acceptance, in-app pending invitation access including no-company accounts; no different-email OTP |
| Invitee onboarding | E08 selects a later join path without duplicate company creation as an engineering default; O07 still gates acceptance |
| Account versus company switching | Distinct controls; Add Worktandem account authenticates that account's own Google identity; stale context and expired-session states; no second-Google linking action |
| Account security | Show the single Google identity and Google recovery guidance; prevent removing the only usable login; Google replacement policy remains open |
| Platform administration | Separate Nuxt operator app; explicit platform permissions, review queue/detail and reason/version-conflict states |
| Platform Users | Users list/detail/DisplayName editing; distinguish global Account.Status and per-company membership status; later Suspend dialog requires nonempty reason and conflict/error states; public status writes remain backend-gated pending ownership safety |
| Global reinstatement | Later authorized action; no automatic restoration of independently revoked memberships/grants/sessions; E11 requires new sign-in, with internal reasons initially and recovery policy gated |
| Optional Google integration | Separate API consent and optional domains; manual outside-domain invitations and subsequent permitted member access remain available |

## Interaction requirements

- Keep the actor and company distinguishable. A Google identity chooser is not the
  Worktandem account switcher or company selector.
- Do not imply membership from a Google address/domain, an invitation view, a
  configured integration or a module toggle.
- Show Pending/invitation/account screens without business access. E07 keeps other
  approved company memberships accessible while one company is Pending.
- On invitation mismatch, switch to the matching Google identity's Worktandem account
  or start its own registration if new; no second-Google attachment or email-based merge.
- Distinguish sign out current versus all accounts in the browser container; E04
  selects per-tab active context, with shared revocation but no automatic cross-tab
  actor/company switch.
- Show manual outside-domain eligibility separately from directory membership if
  directory sync is later adopted; a missing directory entry must not erase it.
- Keep the Google third-party-email evidence policy visibly unresolved rather than
  drawing an adopted OTP or email-only login flow.
- Label global ban as an account-level suspension, separate from company membership
  suspension. Require reason/description in the global-ban flow and communicate
  server validation/version failures. Exact editable profile fields, timed bans,
  reason visibility and self/last-operator/last-owner safeguards remain undecided.
- A global ban blocks protected access across companies without changing their
  membership states. Reinstatement must not visually promise restored memberships,
  revoked roles or revoked sessions. Minimal suspended-account screens remain open.

## Review checklist

Review against [ADR-002](../architecture/decisions#adr-002-google-only-onboarding-invitations-and-platform-review),
[ADR-003](../architecture/decisions#adr-003-one-google-identity-per-worktandem-account),
[ADR-004](../architecture/decisions#adr-004-platform-users-and-independent-suspension-statuses),
the canonical specification and its decision inventory. Confirm loading, empty,
error, declined/revoked/expired, already-member, wrong-identity and suspension states.
Proposed expiry, decline, role defaults and form requirements need product agreement.
No mockup, client route or completed documentation establishes backend access control.
