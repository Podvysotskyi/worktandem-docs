# Authentication design flows

**Status: desktop design inputs; not implemented and no design files updated by this change.**

The [canonical product specification](../product/identity-and-company-access) is the
source of current confirmed rules and marks proposals/open choices. Earlier visual
drafts may predate these decisions and do not override them. Apply confirmed rules
and settle relevant proposals before revising actual designs.

## Desktop scope

Current design work is desktop-only. Mobile drafts are not updated by this document.
Use the canonical [screen inventory](../product/identity-and-company-access#desktop-design-inputs-after-decisions)
and [acceptance matrix](../product/identity-and-company-access#acceptance-matrix-for-future-implementation)
for detailed states and future verification.

| Flow | Current design requirement |
| --- | --- |
| Sign-in and registration | Google only; chooser/cancel/provider error; no local password login/signup/recovery |
| New self-service company | Company form, Pending status and manual approval gate; exact fields and rejection/resubmission defaults remain proposed |
| Invitation join | Matching verified Google email, explicit acceptance, in-app pending invitation access including no-company accounts; no different-email OTP |
| Invitee onboarding | Separate join path without duplicate company creation is proposed; do not treat it as separately approved |
| Account versus company switching | Distinct controls; Add Worktandem account authenticates that account's own Google identity; stale context and expired-session states; no second-Google linking action |
| Account security | Show the single Google identity and Google recovery guidance; prevent removing the only usable login; Google replacement policy remains open |
| Platform administration | Separate Nuxt operator app; explicit platform permissions, review queue/detail and reason/version-conflict states |
| Optional Google integration | Separate API consent and optional domains; manual outside-domain invitations and subsequent permitted member access remain available |

## Interaction requirements

- Keep the actor and company distinguishable. A Google identity chooser is not the
  Worktandem account switcher or company selector.
- Do not imply membership from a Google address/domain, an invitation view, a
  configured integration or a module toggle.
- Show Pending/invitation/account screens without business access. Other approved
  company access remaining available while one company is Pending is a proposed
  invariant awaiting confirmation.
- On invitation mismatch, switch to the matching Google identity's Worktandem account
  or start its own registration if new; no second-Google attachment or email-based merge.
- Distinguish sign out current versus all Worktandem accounts; avoid promising global
  cross-tab switching until session mechanics are selected.
- Show manual outside-domain eligibility separately from directory membership if
  directory sync is later adopted; a missing directory entry must not erase it.
- Keep the Google third-party-email evidence policy visibly unresolved rather than
  drawing an adopted OTP or email-only login flow.

## Review checklist

Review against [ADR-002](../architecture/decisions#adr-002-google-only-onboarding-invitations-and-platform-review),
[ADR-003](../architecture/decisions#adr-003-one-google-identity-per-worktandem-account),
the canonical specification and its decision inventory. Confirm loading, empty,
error, declined/revoked/expired, already-member, wrong-identity and suspension states.
Proposed expiry, decline, role defaults and form requirements need product agreement.
No mockup, client route or completed documentation establishes backend access control.
