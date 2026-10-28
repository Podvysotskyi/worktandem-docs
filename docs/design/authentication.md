# Authentication design flows

**Status: desktop design specification; latest updates pending.** The
[current Figma draft](https://www.figma.com/design/dSXPL7TKHMDP0lcxjTfikC)
is the design reference, not an implemented authentication system. Access follows
the file's existing permissions. No exports or sharing changes are implied.

As of 2026-10-28, the latest Google and multi-account/multi-company updates have
**not been applied to Figma** because the available Figma integration reached its
plan quota. Existing drafts must not be treated as confirmation of the updated
model. The requirements below follow [Accounts and authentication](../architecture/accounts-and-authentication).

## Desktop scope

Focus on desktop flows. Existing mobile drafts remain unchanged; mobile design
work and the earlier mobile welcome-button clipping fix are deferred, not current
acceptance blockers. Preserve existing desktop work while updating the flows below.

| Flow | Required desktop design states |
| --- | --- |
| Google login and registration | Continue with Google; handoff to Google's own account chooser; return, cancel, provider failure, and invalid/expired response; eligible email assurance skips duplicate verification, third-party email proof when needed |
| Post-sign-in destination | Show the active Worktandem account and authorized company context; multiple-membership selection; no-company onboarding with create/join options where available; never imply that a Google domain grants membership |
| Worktandem account switcher | Clearly identified active account; list other signed-in Worktandem accounts; Add another account; current-account versus all-account sign-out; loading and expired-session recovery |
| Company switcher | Separate control scoped to the active account; active company and membership/role context; selection, loading, revoked/unavailable company, and pending invitation states |
| Linked Google accounts | Account security settings list multiple linked identities; add and unlink actions; reauthentication and confirmation; prevent removing the last usable sign-in/recovery path |
| Explicit linking | Authenticate the target Worktandem account and chosen Google identity; confirm the intended account; cancel safely; do not merge by matching email |
| Identity already linked elsewhere | Explain that the identity cannot be linked here; offer another Google account or safe sign-in/recovery guidance; do not reveal the other account's private details or silently reassign it |
| Recovery | Google-only account has no local password reset; guide to Google or an established recovery method; respect applicable company session assurance without implying a shipped company policy |

## Interaction requirements

- Keep account identity and company context visible enough to distinguish actor
  switching from tenant switching. Linking a Google identity is a third, separate action.
- Cancel, Back, interrupted authentication, repeated submission, and stale responses
  must not silently create accounts, link identities, or apply actions to a new context.
- Switching must show a clear pending state and safe failure/recovery destination;
  it must not flash another account/company's cached data.
- Designs must not promise automatic global switching in other tabs. The tab/session
  strategy remains undecided; implementation must preserve isolated request context.
- Do not present Workspace directory sync, domain auto-join, Require Google, or
  enterprise SSO as available features. Those enterprise capabilities are research
  proposals, separate from confirmed Google sign-in support.

## Review checklist

Review all desktop states against [ADR-001](../architecture/decisions#adr-001-multiple-accounts-memberships-and-google-identities)
and the [acceptance requirements](../architecture/accounts-and-authentication#design-coverage-and-acceptance-criteria).
After Figma access becomes available, apply and inspect the pending screens before
marking this page updated. A completed mockup would still not establish backend
integration, authorization enforcement, or passing authentication tests.
