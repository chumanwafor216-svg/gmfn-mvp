# GSN Pilot Test Flow

Date: 2026-04-21

This document defines the beginning-to-end pilot route for testing GSN now that
real phone testing has started. It is a testing map, not a new feature
specification. Use it to decide what should happen, what is broken, and what
must be corrected first.

## Pilot Purpose

The pilot should demonstrate three simple things:

1. A new person can enter GSN without being lost.
2. A member can move through community, marketplace, finance, and trust without
   buttons jumping or routes sending them to the wrong place.
3. The system can turn ordinary community behaviour into clear finance and trust
   evidence.

The pilot is not only looking for bugs. It is testing whether ordinary users,
including unbanked and underbanked users, can understand what to do next.

## Controlled Pilot Relaxations

These relaxations are allowed only for the controlled pilot. They are not final
production banking, telecoms, or public-access rules. Keep them visible in every
handoff so that nobody mistakes a test shortcut for a completed external rail.

### 1. Phone Evidence

Current pilot state:

- Live SMS OTP is not fully connected.
- The frontend may use the preview code returned by the backend to keep testing
  moving.
- Pilot phone evidence sessions last about 24 hours so remote testers are not
  blocked by short expiry while giving feedback.

User-facing standard:

- If the phone step succeeds, say that the phone has been linked to the person's
  name for this entry record.
- If it fails because time has passed, say plainly that the session expired and
  the safest step is to start again.

Before public launch:

- Connect the real SMS provider.
- Reduce the session lifetime back toward one or two hours.
- Keep the same plain-language success and expiry messages.

### 2. Bank And Wallet Details

Current pilot state:

- Bank or wallet destination details can be recorded against a verified phone
  session.
- External bank ownership verification is not treated as fully certified unless
  a live provider confirms it.
- Provider-unavailable states should not stop the pilot user from continuing;
  they should be explained as recorded evidence, not confirmed bank ownership.

User-facing standard:

- Tell the user that GSN has recorded where approved money should go.
- Make clear that GSN is not moving money at that moment.
- Make clear that stronger bank ownership checks are a later production rail.

Before public launch:

- Configure the required bank provider for target regions.
- Add/confirm manual-review handling where providers cannot verify directly.
- Do not label recorded details as bank-owned unless the provider or approved
  manual review supports that claim.

### 3. Payment Expectations And Reconciliation

Current pilot state:

- Payment instructions can generate expected-payment references.
- Admin/manual bank-event ingest can be used to simulate a bank credit during
  controlled testing.
- Reconciliation can match expected payments and create downstream evidence for
  pool deposits, repayments, and paid feature subscriptions.

User-facing standard:

- Every successful step should return practical feedback: what was recorded,
  what changed, and what remains pending.
- Mismatch, duplicate, pending, and partial states must tell the user/admin the
  first safe thing to do next.

Before public launch:

- Prefer canonical bank events from signed webhooks or statement imports.
- Keep manual ingest admin-only and clearly marked as a support/testing tool.
- Review whether non-canonical manual events should auto-confirm or require
  admin approval before affecting trust/ledger state.

### 4. Payout Destination And Money Out

Current pilot state:

- Users can save payout destinations.
- The saved destination is recorded evidence of where approved withdrawals should go.
- The system does not yet execute real payouts from GSN.

User-facing standard:

- Say that the payout route tells GSN where approved withdrawals should be sent.
- Do not imply that saving details sends money.

Before public launch:

- Connect payout execution provider(s).
- Add approval, failure, reversal, and audit records around every real payout.
- Keep payout state separate from trust score until the money movement is
  confirmed.

### 5. Invite Links

Current pilot state:

- Invite links are protected with a minimum 24-hour usable window for the
  controlled test day.
- This does not rescue a link whose code was copied incompletely or never
  existed in the active Render database.

User-facing standard:

- If the invite exists but is expired, explain that it needs a fresh GSN invite.
- If the invite code is missing or copied wrongly, say the link may not have
  been copied fully.

Before public launch:

- Reduce minimum invite lifetime toward one or two hours where appropriate.
- Keep longer-lived invite packages only where the product intentionally needs
  them.

### 6. Trust Events And Notifications

Current pilot state:

- Some entry and payout steps show trust-event-style feedback immediately.
- Permanent scoring events should still be written only at safe completion
  points, not repeatedly while a tester edits a form.

User-facing standard:

- The app should not merely say `saved`.
- It should tell the person what the action proves, what remains pending, and
  whether the evidence is temporary, ready for registration, or permanent.

Before public launch:

- Audit every simulated trust-event response and decide which ones become real
  permanent events.
- Avoid writing duplicate trust evidence for the same completed action.

## Current Test URLs

- Live frontend: `https://gmfn-frontend.onrender.com`
- Live backend health: `https://gmfn-api.onrender.com/health`
- Local phone testing example: `http://192.168.1.38:5173`

The local phone URL only works when the phone and laptop are on the same network
and the dev server is running. If the IP address changes, the local URL changes.

## Definition Of Corrected

A route is corrected only when all of these are true:

- The page opens on phone and desktop.
- The route does not unexpectedly redirect to another domain.
- Open, collapse, share, copy, and action buttons respond from the full visible
  button surface, not only from the center.
- The user can understand the first thing to do without reading developer-style
  language.
- The page shows the right identity context: user, community, marketplace, shop,
  finance, or trust.
- The page does not repeat the same information in two nearby blocks unless the
  repetition has a clear user purpose.
- If the action fails, the failure message explains what happened and what to do
  first.

## Tester Roles

Use these roles during pilot testing:

- New creator: someone creating a first community.
- Invited joiner: someone entering through a real invite link.
- Returning member: someone who already has login credentials.
- Shop owner: a member managing their shop, products, Vault, and spotlight.
- Buyer or visitor: someone opening a public shop or Vault link.
- Community admin: someone approving, observing, or managing community activity.

Do not mix creator and joiner flows when testing. Creating a community and
joining an existing community are separate flows.

## End-To-End Test Path

### 1. System Health

Start every test session here:

- Backend: `https://gmfn-api.onrender.com/health`
- Frontend: `https://gmfn-frontend.onrender.com/cover`

Expected result:

- Backend returns healthy JSON.
- Frontend opens the cover page.
- No tester should continue deep testing if the API is down or the frontend is
  serving an old build.

Correct first if broken:

- Render backend deploy failure.
- Frontend environment variable pointing to the wrong API.
- SPA rewrite missing on Render static site.

### 2. Public Cover And First Decision

Primary route:

- `/cover`

Supporting routes:

- `/welcome`
- `/guide`
- `/login`
- `/cover?entry=create`
- `/cover?entry=invite&invite_code=...`
- `/cover?entry=approved`

Expected result:

- A new user can understand whether to create, join, or login.
- The page should speak in GSN user language, not builder language.
- Invite links should preserve the invite code until the join flow uses it.

Correct first if broken:

- Any `Not Found` during public entry.
- Any route that loses the invite code.
- Any text that makes a tester think they are on the wrong product.

### 3. Create Community Flow

Primary routes:

- `/create`
- `/register` redirects to `/create`
- `/founder` and `/public-create` redirect to the create-entry cover path

Backend routes expected by the frontend:

- `/entry/phone/start`
- `/entry/phone/confirm`
- `/entry/bank-details`
- `/entry/create`

Expected result:

- A first-time creator can enter basic details, pass required entry checks, and
  create or start a community without hitting `Not Found`.
- If phone or bank verification is not complete, the page should say what is
  missing in plain language.

Correct first if broken:

- Live backend missing `/entry/*` routes.
- Form submits to a stale API.
- A tester is sent to join flow when they meant to create.

### 4. Join Existing Community Flow

Primary routes:

- `/join`
- `/join/community/:clanId`
- `/invite/:code`
- `/get-invite/:code`
- `/pending-approval`
- `/join-approval/:requestId`
- `/activate-membership`

Expected result:

- A joiner should normally enter from a real invite link or a selected existing
  community.
- A join request should become pending, approved, or activated with a clear next
  step.
- Join flow must not be silently merged with create-community flow.

Correct first if broken:

- Invite code is missing or expired but the page does not explain it.
- Join approval opens without enough context.
- Activation sends the user to the wrong domain.

### 5. Login And Authenticated Landing

Primary routes:

- `/login`
- `/app/dashboard`

Expected result:

- A returning user can log in and lands in the member dashboard.
- Invalid credentials should clearly mean wrong email/password, not a system
  crash.
- Reverification or identity guard screens should not trap ordinary navigation
  during pilot testing unless the route truly needs protection.

Correct first if broken:

- Login succeeds but authenticated routes still behave as logged out.
- Login fails with a network or CORS error.
- A guard screen appears without explaining the first fix.

### 6. Dashboard

Primary route:

- `/app/dashboard`

Purpose:

- Personal landing page across commitments, events, notifications, trust, finance,
  and next actions.

Frozen area:

- The Market Wisdom presentation and interaction model is frozen. Do not restyle
  or restructure it unless the product owner explicitly asks.

Expected result:

- The dashboard tells the member what needs attention.
- Notifications and focus commitments help the user remember real obligations.
- Buttons should not jump into unrelated pages.

Correct first if broken:

- Attention guard or notification surfaces steal taps.
- Dashboard actions route to unrelated domains.
- Open/collapse buttons flash a different shape than the visible button.

### 7. Community Home

Primary routes:

- `/app/community`
- `/app/community/:clanId`

Purpose:

- Let the member choose and operate inside a community context.

Expected result:

- Community identity is clear.
- Community list opens and collapses safely.
- Main actions, shop control, trusted circle, and spotlight areas stay in their
  own lanes.

Correct first if broken:

- Collapse sends the user to payment, notifications, or another wrong page.
- One action opens another action's panel.
- The community selector is sensitive only in the center of the button.

### 8. Marketplace

Primary routes:

- `/app/marketplace`
- `/app/marketplace/community/:clanId`
- `/community/:clanId`

Purpose:

- The marketplace is the selected-community trade and opportunity layer.

Expected result:

- Marketplace identity, members and shops, demand, shop links, and support work
  appear under the selected community.
- The page should help the user see what they can do next without repeating the
  same identity block several times.
- Buyer-facing and owner-facing actions must remain distinct.

Correct first if broken:

- Marketplace opens without selected-community context.
- Members and shops overflow horizontally on phone.
- Public links show local-only URLs when testing live production.

### 9. Shop Owner Tools

Primary routes:

- `/app/shop-control`
- `/app/shop-assets`

Purpose:

- Let the shop owner control public shop identity, products, spotlight, Vault,
  and shop-facing information.

Expected result:

- Shop owner can edit or review shop details without facing too many competing
  buttons.
- Product slots are visually clear and phone-sized.
- Upload/edit/remove controls are tucked behind simple owner controls where
  possible.

Correct first if broken:

- Product blocks leave large dead white space.
- Product text sits outside the frame.
- Owner controls appear on public visitor surfaces.

### 10. Public Shop Gallery And Vault

Primary routes:

- `/shop/:gmfnId`
- `/shop-gallery/:gmfnId`
- `/open-shop/:gmfnId`
- `/vault/:token`

Purpose:

- Show the outside world a clean public shop while keeping private Vault viewing
  trust-controlled.

Expected result:

- The public shop signpost identifies the shop once, then moves into buyer
  confidence and product display.
- Vault language should mean private viewing by trust link, not hidden or fake
  stock.
- Public visitors should not see internal owner/admin language.

Correct first if broken:

- Repeated identity blocks say the same thing.
- Share shop and copy shop link are unclear or redundant.
- Vault asks for access but does not explain why private viewing exists.

### 11. Demand, Borrow, Lend, And Support

Primary routes:

- `/app/demand-box`
- `/app/loans`
- `/app/loan-readiness`
- `/app/loan-suggestions`
- `/app/loan-workbench`
- `/app/guarantor-inbox`
- `/app/guarantor-earnings`

Purpose:

- Connect community need, borrowing, guarantees, repayment, and support into
  trust evidence.

Expected result:

- A user can see whether they are asking, helping, guaranteeing, repaying, or
  still preparing.
- The page should not make support feel like punishment.
- Completed behavior should be the strongest evidence.

Correct first if broken:

- Borrowing and guarantor actions are mixed without context.
- A pending action is shown as completed trust.
- Repayment or guarantee actions do not show what happens next.

### 12. Finance

Primary routes:

- `/app/finance`
- `/app/payment/pool`
- `/app/payment/loans/:loanId`
- `/app/withdrawal-instructions`
- `/app/payment-rails`
- `/app/payout-details`

Purpose:

- Finance is the money truth. It should show what happened with money across all
  communities and prepare the evidence that Trust Passport can interpret.

Expected result:

- A member sees one finance file with community-by-community units.
- Money behavior is simple: promises kept, promises pending, pressure, support,
  guarantees, exposure, and repayment.
- Finance should not judge wealth. It should show behavior around money.

Correct first if broken:

- Same finance fact appears in multiple blocks without purpose.
- A member across several communities cannot tell which community created which
  obligation.
- Money movement is treated as trust before the promise is completed.

### 13. Trust Passport And TrustSlip

Primary routes:

- `/app/trust`
- `/app/trust-slip`
- `/app/open-trust-reading`
- `/app/trust-slip/verify`
- `/t/:code`

Purpose:

- Trust Passport explains what finance and community behavior mean. TrustSlip
  turns that record into portable evidence that can be shown to someone who does
  not personally know the member.

Expected result:

- A member can see trust evidence without feeling judged.
- TrustSlip should be understandable as real-life community vouching made
  portable and verifiable.
- Verification should clearly tell the viewer whether the slip is valid and what
  it proves.

Correct first if broken:

- TrustScore, Trust Passport, and TrustSlip repeat the same story without
  purpose.
- Verification fails without saying if the code is invalid, expired, or missing.
- Trust evidence is shown without the finance/community reason behind it.

### 14. Notifications, Identity, And Settings

Primary routes:

- `/app/notifications`
- `/app/identity`
- `/app/cci-reading`
- `/app/my-gmfn-and-i`
- `/app/settings`

Purpose:

- Keep the member informed, help identity continuity stay safe, and let them
  understand their GSN profile.

Expected result:

- Notifications explain what happened and what to do first.
- Identity continuity should protect sensitive actions without confusing normal
  browsing.
- Settings and guide surfaces should use GSN language.

Correct first if broken:

- Notifications become a trap screen.
- Identity guard appears too often during simple page testing.
- A route sends the user away before explaining the problem.

### 15. Admin And Oversight

Primary route:

- `/app/command-center`

Supporting admin routes:

- `/app/command-center/bank-console`
- `/app/command-center/revenue-allocation`
- `/app/command-center/exposure`
- `/app/command-center/trust-analytics`
- `/app/command-center/trust-events`
- `/app/command-center/identity-risk`
- `/app/command-center/incomplete-loans`
- `/app/command-center/system-operations`
- `/app/command-center/trust-graph`

Purpose:

- Admin surfaces are for oversight, readiness, risk, finance operations, trust
  events, and pilot review.

Expected result:

- Only authorized users can reach admin surfaces.
- Pilot readiness should help the team measure the pilot, not rely only on chat
  feedback.

Correct first if broken:

- Non-admin users can open admin pages.
- Admin pages are used to change user-facing flow without checking the public
  route first.

## Correction Protocol

When a tester reports a problem, record it in this format:

- Tester role:
- Device and browser:
- Route:
- Account or invite used:
- What they tapped:
- Expected result:
- Actual result:
- Screenshot or log:
- Time in London time:
- Is it blocking entry, commerce, finance, trust, or only polish?

Correction order:

1. Entry, login, and invite problems.
2. Wrong-route jumps and tap instability.
3. Public shop, Vault, marketplace, finance, and trust correctness.
4. Phone layout and visual polish.
5. Copy tone and explanation improvements.

Do not correct by guessing. Reproduce the route, inspect the page and backend
contract, make the smallest safe fix, then test again.

## Do Not Disturb During Pilot

Unless the product owner explicitly asks:

- Do not rewrite Dashboard Market Wisdom.
- Do not merge create-community and join-community flows.
- Do not change auth, permissions, schemas, payment, ledger, migrations, or
  environment configuration for a UI issue.
- Do not remove a route only because it looks duplicated. Confirm redirects and
  callers first.
- Do not use desktop success as evidence of phone success.

## What Testers Should Say Back

Ask testers to report in plain language:

- I started from this link.
- I expected this page.
- I tapped this button.
- It opened the right place, opened the wrong place, did nothing, or showed an
  error.
- I could understand what to do next, or I could not.

This is enough for the team to correct the route without making the tester feel
they did something wrong.
