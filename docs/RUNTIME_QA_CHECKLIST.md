# RUNTIME_QA_CHECKLIST.md

## Purpose
This checklist is the live runtime validation pass for the current GMFN phase.

It is meant to verify:
- real route behavior
- real role visibility
- real seeded-data states
- real guided-flow behavior
- real print/export behavior

This checklist should be executed in a browser with working backend data.

---

## How to use this checklist

For each route/journey:
- confirm the page loads
- confirm the user lands in the correct place
- confirm buttons go to the correct next place
- confirm back behavior returns to true origin where appropriate
- confirm the page answers the current-step question clearly
- confirm the route concludes visibly

Record for each item:
- pass
- fail
- note
- screenshot if useful

---

## 1. Entry flow

### Welcome
- Open `/welcome`
- Confirm create flow button lands on the correct create route
- Confirm join flow button lands on the correct join route
- Confirm login flow button lands on the correct login route
- Confirm activation flow button lands on the correct activation route
- Confirm guide button opens the guide correctly

### Create
- Open `/create`
- Confirm create entry action completes or fails with a clear explanation
- Confirm back/welcome path works
- Confirm login path works
- Confirm guide path works

### Join
- Open `/join`
- Submit a join request with valid seeded data
- Confirm success state is clear
- Confirm approval-status button lands on the correct route
- Confirm pending-state button lands on the correct route
- Confirm welcome path works
- Confirm guide path works

### Invite landing
- Open invite route with:
  - active invite
  - expired invite
  - revoked invite
  - inactive invite
- Confirm the page explains the state clearly
- Confirm continue path works only when appropriate
- Confirm welcome and guide exits work

### Activation
- Open activation routes with:
  - valid activation context
  - missing activation context
  - already activated state
- Confirm completion lands on the intended next route
- Confirm failed activation explains what to do next

---

## 2. Community flow

### Community Home
- Open `/app/community`
- Confirm selected community identity is visible
- Confirm current step is visible
- Confirm marketplace handoff works
- Confirm community tools work
- Confirm collapse/open behavior works on large sections

### Join requests
- Open `/app/community/:clanId/join-requests`
- Confirm approval/reject actions work
- Confirm community-home return path works
- Confirm marketplace exit works
- Confirm request rows show readable states

---

## 3. Marketplace and shop flow

### Marketplace
- Open `/app/marketplace`
- Confirm selected community is visible
- Confirm frozen section order remains:
  - Community profile
  - Money routes
  - Stable community tools
  - Member rows
  - Loans & Support
- Confirm collapse/open works for each major section
- Confirm finance/money/support handoffs work

### Shop control
- Open `/app/shop-control`
- Confirm public shop/gallery actions work
- Confirm shop-assets action works
- Confirm TrustSlip/Merchant Verify action works
- Confirm Vault and spotlight payment-request actions work
- Confirm owner-facing wording is clear

### Shop assets
- Open `/app/shop-assets`
- Confirm signboard editing works
- Confirm product posting/editing works
- Confirm route back to shop control works
- Confirm public gallery open/copy actions work

### Public shop
- Open `/shop/:gmfnId`
- Confirm visible products show correctly
- Confirm no dead placeholder blocks waste visible public slots
- Confirm Vault discoverability card is visible
- Confirm Vault badge or private-access indicator is visible
- Confirm ask-for-access CTA works

### Vault access
- Open `/vault/:token` with:
  - active token
  - expired token
  - revoked token
  - exhausted token
- Confirm correct state page appears for each
- Confirm private offers only appear when allowed
- Confirm restrictions are visible
- Confirm the page explains what access means in plain language

---

## 4. Money and finance flow

### Money In
- Open `/app/payment/pool`
- Confirm current step is visible
- Confirm exact payment reference is visible after generation
- Confirm unrelated route clutter stays reduced while active
- Confirm post-completion routes reopen appropriately

### Money Out
- Open `/app/withdrawal-instructions`
- Test:
  - amount within deposited range
  - amount above deposited range
- Confirm the route visibly explains why the path changes
- Confirm support handoff works when required
- Confirm unrelated route clutter stays reduced while active

### Finance
- Open `/app/finance`
- Confirm expected-payment summary appears
- Confirm row-level status badges appear
- Confirm next-action language appears
- Confirm collapse/open works for major sections
- Confirm the page reads as full financial truth, not a simple wallet

### Payment rails / payout
- Open payment-rails and payout pages
- Confirm routes and statuses are readable
- Confirm destinations and next actions are clear

---

## 5. Loans / support / guarantor flow

### Loans hub
- Open `/app/loans`
- Confirm the page behaves as a support hub
- Confirm route tiles go to the correct next pages

### Readiness / suggestions / workbench
- Open:
  - `/app/loan-readiness`
  - `/app/loan-suggestions`
  - `/app/loan-workbench`
- Confirm these feel like one guided continuation
- Confirm current step is visible
- Confirm unrelated routes stay reduced while active

### Summary / repayment
- Open:
  - `/app/loan-summary/:loanId`
  - `/app/payment/loans/:loanId`
- Confirm repayment expectation is visible
- Confirm repayment reference is visible after generation
- Confirm Finance and summary stay aligned on status wording

### Guarantor
- Open guarantor inbox and earnings
- Confirm route tiles and next-step CTAs go to the correct pages
- Confirm statuses are readable

---

## 6. Trust / verification / document flow

### TrustSlip
- Open `/app/trust-slip`
- Confirm verification code is visible
- Confirm verify link is visible when available
- Confirm QR is visible when available
- Confirm issue and expiry metadata are visible
- Confirm print action works

### Trust Passport
- Open `/app/trust`
- Confirm trust reading loads correctly
- Confirm issue and expiry metadata are visible
- Confirm print action works
- Confirm collapse/open works on large sections

### Public verification
- Open TrustSlip verify route with:
  - valid code
  - pending code
  - expired code
  - invalid code
- Confirm banner/state is correct
- Confirm print action works
- Confirm page reads as formal verification, not debug output

### PDF assets
- Open:
  - `/GSN_FINAL_WHITE.pdf`
  - `/gmfn-executive-summary.pdf`
- Confirm files load in browser
- Confirm they are the expected documents

---

## 7. Role visibility checks

### Ordinary member
- Confirm no admin tools appear
- Confirm command center is not surfaced

### Merchant / shop owner
- Confirm shop-control and shop-assets ownership flows are visible
- Confirm Merchant Verify/Vault/Spotlight owner controls appear

### Community operator
- Confirm join-request review surfaces appear where appropriate
- Confirm community operations surfaces are visible

### Admin
- Confirm command center routes load
- Confirm trust analytics, graph, exposure, and system operations are visible

---

## 8. State matrix

Check these state families wherever relevant:

### Empty state
- no data
- no products
- no active payment request
- no private offers

### Pending state
- awaiting issue
- awaiting confirmation
- awaiting review

### Active state
- active verification
- active Vault access
- active spotlight
- active support flow

### Terminal state
- completed
- confirmed
- expired
- revoked
- failed

For each state, confirm:
- the page explains what is happening
- the page explains what to do next
- the page does not look broken or abandoned

---

## 9. Accessibility and readability checks

For the main routes, confirm:
- text contrast is strong enough
- buttons are large enough to click/tap
- warnings are understandable
- empty states are explanatory
- error states are actionable
- no route overwhelms the user with too many equal options

---

## 10. Final sign-off

This phase is ready for sign-off only if:
- all critical journeys pass
- role visibility is correct
- print/document routes behave formally
- no important backend family is hanging without a frontend surface
- no major route lands in the wrong place
- no active guided flow abandons the user halfway
