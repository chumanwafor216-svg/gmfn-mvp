# RUNTIME_QA_RESULTS_TEMPLATE.md

## Run details

- Date:
- Tester:
- Frontend URL:
- Backend URL:
- Branch:
- Commit SHA:
- Seed/data context:
- Role under test:

---

## Status key

- `PASS`
- `FAIL`
- `PARTIAL`
- `BLOCKED`
- `NOT TESTED`

---

## 1. Entry flow

| Route / journey | Check | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| `/welcome` | Create flow button | Lands on correct create route |  |  |  |
| `/welcome` | Join flow button | Lands on correct join route |  |  |  |
| `/welcome` | Login flow button | Lands on correct login route |  |  |  |
| `/welcome` | Activation flow button | Lands on correct activation route |  |  |  |
| `/welcome` | Guide button | Opens guide correctly |  |  |  |
| `/create` | Create entry action | Completes or fails clearly |  |  |  |
| `/create` | Back / welcome path | Returns correctly |  |  |  |
| `/create` | Login path | Opens correct login route |  |  |  |
| `/create` | Guide path | Opens guide correctly |  |  |  |
| `/join` | Join submission | Valid seeded request succeeds clearly |  |  |  |
| `/join` | Approval-status button | Lands on correct route |  |  |  |
| `/join` | Pending-state button | Lands on correct route |  |  |  |
| `/join` | Welcome path | Returns correctly |  |  |  |
| `/join` | Guide path | Opens guide correctly |  |  |  |

---

## 2. Community flow

| Route / journey | Check | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| `/app/community` | Identity/context | Selected community is visible |  |  |  |
| `/app/community` | Current step | Current step is visible |  |  |  |
| `/app/community` | Marketplace handoff | Opens Marketplace correctly |  |  |  |
| `/app/community` | Large blocks | Collapse/open works |  |  |  |
| `/app/community/:clanId/join-requests` | Review actions | Approval/reject works |  |  |  |
| `/app/community/:clanId/join-requests` | Return path | Community-home return works |  |  |  |
| `/app/community/:clanId/join-requests` | Marketplace exit | Marketplace exit works |  |  |  |

---

## 3. Marketplace and shop flow

| Route / journey | Check | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| `/app/marketplace` | Section order | Frozen section order remains correct |  |  |  |
| `/app/marketplace` | Large blocks | Collapse/open works |  |  |  |
| `/app/marketplace` | Handoffs | Finance / money / support handoffs work |  |  |  |
| `/app/shop-control` | Public shop/gallery action | Opens intended surface |  |  |  |
| `/app/shop-control` | Shop assets action | Opens intended surface |  |  |  |
| `/app/shop-control` | TrustSlip / Merchant Verify | Opens intended surface |  |  |  |
| `/app/shop-control` | Vault / spotlight payment requests | Actions work and wording is clear |  |  |  |
| `/app/shop-assets` | Signboard editing | Works clearly |  |  |  |
| `/app/shop-assets` | Product posting/editing | Works clearly |  |  |  |
| `/app/shop-assets` | Back to shop control | Returns correctly |  |  |  |
| `/shop/:gmfnId` | Public products | Products display correctly |  |  |  |
| `/shop/:gmfnId` | Visible slots | No dead placeholder blocks waste public slots |  |  |  |
| `/shop/:gmfnId` | Vault discoverability | Vault card and badges are visible |  |  |  |
| `/shop/:gmfnId` | Ask-for-access CTA | CTA works |  |  |  |
| `/vault/:token` | Active token | Active state is correct |  |  |  |
| `/vault/:token` | Expired token | Expired state is correct |  |  |  |
| `/vault/:token` | Revoked token | Revoked state is correct |  |  |  |
| `/vault/:token` | Exhausted token | Exhausted state is correct |  |  |  |

---

## 4. Money and finance flow

| Route / journey | Check | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| `/app/payment/pool` | Current step | Current step is visible |  |  |  |
| `/app/payment/pool` | Payment reference | Exact payment reference is visible after generation |  |  |  |
| `/app/payment/pool` | Guided mode | Unrelated route clutter stays reduced while active |  |  |  |
| `/app/withdrawal-instructions` | Within deposited range | Correct path and explanation |  |  |  |
| `/app/withdrawal-instructions` | Above deposited range | Support handoff works and explains why |  |  |  |
| `/app/withdrawal-instructions` | Guided mode | Unrelated route clutter stays reduced while active |  |  |  |
| `/app/finance` | Expected-payment summary | Summary appears |  |  |  |
| `/app/finance` | Status badges | Row-level badges appear |  |  |  |
| `/app/finance` | Next action | Next-action language appears |  |  |  |
| `/app/finance` | Major sections | Collapse/open works |  |  |  |
| Payment rails / payout | Readability | Statuses and destinations are clear |  |  |  |

---

## 5. Loans / support / guarantor flow

| Route / journey | Check | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| `/app/loans` | Support hub | Page behaves like support hub |  |  |  |
| `/app/loans` | Route tiles | Tiles go to correct next pages |  |  |  |
| `/app/loan-readiness` | Guided continuation | Feels like guided continuation |  |  |  |
| `/app/loan-suggestions` | Guided continuation | Feels like guided continuation |  |  |  |
| `/app/loan-workbench` | Guided continuation | Feels like guided continuation |  |  |  |
| `/app/loan-summary/:loanId` | Repayment expectation | Visible and readable |  |  |  |
| `/app/payment/loans/:loanId` | Repayment reference | Visible after generation |  |  |  |
| `/app/payment/loans/:loanId` | Status wording | Matches Finance and summary |  |  |  |
| Guarantor inbox / earnings | Route tiles and CTAs | Go to correct pages |  |  |  |

---

## 6. Trust / verification / document flow

| Route / journey | Check | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| `/app/trust-slip` | Verification code | Visible |  |  |  |
| `/app/trust-slip` | Verify link | Visible when available |  |  |  |
| `/app/trust-slip` | QR | Visible when available |  |  |  |
| `/app/trust-slip` | Issue / expiry metadata | Visible |  |  |  |
| `/app/trust-slip` | Print action | Works |  |  |  |
| `/app/trust` | Trust reading | Loads correctly |  |  |  |
| `/app/trust` | Issue / expiry metadata | Visible |  |  |  |
| `/app/trust` | Print action | Works |  |  |  |
| TrustSlip verify route | Valid code | Correct banner/state |  |  |  |
| TrustSlip verify route | Pending / expired / invalid codes | Correct banner/state |  |  |  |
| TrustSlip verify route | Print action | Works |  |  |  |
| `/GSN_FINAL_WHITE.pdf` | Browser load | Opens expected document |  |  |  |
| `/gmfn-executive-summary.pdf` | Browser load | Opens expected document |  |  |  |

---

## 7. Role visibility

| Role | Check | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| Ordinary member | Admin visibility | No admin tools appear |  |  |  |
| Merchant / shop owner | Commerce controls | Shop-control / shop-assets / Vault / spotlight controls appear appropriately |  |  |  |
| Community operator | Community operations | Join-request review and community operations appear appropriately |  |  |  |
| Admin | Command Center | Admin routes load and are visible |  |  |  |

---

## 8. State matrix

| State family | Surface | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| Empty |  | Explains what is missing and what to do next |  |  |  |
| Awaiting issue |  | Clear state and next action |  |  |  |
| Awaiting confirmation |  | Clear state and next action |  |  |  |
| Awaiting review |  | Clear state and next action |  |  |  |
| Active |  | Active state is obvious and usable |  |  |  |
| Completed / confirmed |  | End state is clear |  |  |  |
| Expired / revoked / failed |  | End state and next action are clear |  |  |  |

---

## 9. Accessibility and readability

| Surface | Check | Expected | Actual | Status | Screenshot / note |
| --- | --- | --- | --- | --- | --- |
| Main routes | Text contrast | Strong enough to read comfortably |  |  |  |
| Main routes | Button clarity | Buttons are large and clear enough to click/tap |  |  |  |
| Main routes | Warnings | Warnings are understandable |  |  |  |
| Main routes | Error states | Actionable and explanatory |  |  |  |
| Main routes | Decision load | Does not overwhelm the user |  |  |  |

---

## 10. Final sign-off

- Critical journeys pass:
- Role visibility is correct:
- Print/document routes behave formally:
- No important backend family is hanging without frontend surface:
- No major route lands in the wrong place:
- No guided flow abandons the user halfway:

## Final decision

- `READY`
- `NOT READY`

## Final notes
