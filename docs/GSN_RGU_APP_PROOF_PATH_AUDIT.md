# GSN RGU App Evidence Path Audit

Date: 15 May 2026  
Purpose: readiness audit for the RGU / Nigerian Society customer discovery workshop  
Audit focus: Cover -> Login -> Dashboard -> Community -> Marketplace -> Shop -> Trust Passport -> TrustSlip -> Public / Merchant Verification

---

## 1. Blunt Summary

The app has the right route structure for the workshop story. The original local admin account did not show the strongest evidence for the claim, so a dedicated workshop demo account has now been prepared.

The workshop claim is:

**GSN makes trust visible, portable, and usable outside the original community.**

The original admin account still shows weak evidence:

- TrustSlip exists but is expired.
- Trust limit is 0.00.
- Trust score is 0.00.
- CCI is red / class E.
- Sponsor count is 0.
- Merchant verification is inactive.

That account should not be used as the main workshop evidence account.

The workshop evidence account is:

- Email: `amara.demo@gsnworkshop.co.uk`
- Password: `pass1234`
- GSN ID: `GSN-DEMO-AMARA`
- TrustSlip code: `GSNAMARA2026`

Current verified evidence state for that account:

- TrustSlip status: active.
- Trust limit: `25000.00 NGN`.
- Trust score: `6.60`.
- Trust band: B.
- CCI: `66.95 / B`.
- Sponsor count: 2.
- Merchant verification: active.
- Public TrustSlip verification: valid.
- Merchant verification link endpoint: working.
- Public verification wording is neutral: `VALID - CURRENT TRUSTSLIP FOUND`, not an instruction to release goods.
- Public verification includes a plain-language reading for transport help, emergency support, credit-based goods/services, and new-community trust checks.

---

## 2. Evidence Path Status

| Step | Route / Screen | Readiness | Audit note |
| --- | --- | --- | --- |
| 1 | `/cover` | Pass | Good starting point for branded entry. |
| 2 | `/login` | Pass | Login works locally with approved credentials. Recent button correction makes the entry choice clearer. |
| 3 | `/app/dashboard` | Partial | Dashboard can introduce identity/trust, but do not disturb frozen Market Wisdom area. |
| 4 | `/app/community` | Pass / needs scenario discipline | Community page supports the story, but during the workshop it must not become a full feature tour. |
| 5 | `/app/marketplace` | Partial | Marketplace exists and can support the shop/trade angle, but it is not the core claim. Use it only as evidence creation context. |
| 6 | `/app/shop-control` | Partial | Local shop data exists, but merchant trust evidence must be connected clearly to TrustSlip / verification. |
| 7 | `/app/trust` | Pass structurally | Trust Passport page is the right place for the full trust story. Needs demo data strong enough to look believable. |
| 8 | `/app/trust-slip` | Pass for Amara demo / Partial for old local admin | TrustSlip page has the right sections. The Amara demo account is the active evidence account; the old local admin slip remains expired/inactive and should not be used for the main story. |
| 9 | Public verify page | Pass for Amara demo / Partial for old local admin | Public verification works for the prepared Amara code. The expired-slip reading below refers to the old local/admin evidence path, not the Amara workshop account. |
| 10 | Merchant verification | Pass for demo account | Merchant-link router is now wired through a non-colliding route. The Amara demo account has active merchant verification. |

---

## 3. What Is Working

### The narrative line exists

The frontend already separates the right concepts:

- Dashboard: personal command centre / identity entry.
- Community: the community context where trust is formed.
- Marketplace / Shop: activity and usefulness context.
- Trust Passport: fuller trust story and explanation.
- TrustSlip: shorter portable evidence layer.
- TrustSlip Verify: public validity check.

This is good. It means we do not need to invent a new demo structure. We need to clean and strengthen the actual evidence.

### Trust Passport and TrustSlip are conceptually separated

The current UX language already supports the correct distinction:

- Trust Passport explains the full trust story.
- TrustSlip shows the shorter portable state.
- TrustSlip Verify confirms whether the public code is current.

This is the right logic for the workshop. We should preserve this separation.

### Public TrustSlip verification exists

The public JSON and page routes return a verification result for the TrustSlip code. That is important because the workshop needs to show someone outside the original community checking the portable trust record.

---

## 4. Gaps Found

### Gap 1: Old local/admin TrustSlip is expired

Old local/admin TrustSlip result:

- Status: expired.
- Message: `EXPIRED - DO NOT RELEASE`.
- Trust limit: 0.00.
- Merchant verify active: false.

This does not support the Amara story unless we deliberately frame it as "this is what a failed/expired trust document looks like." For the main demo, use the prepared Amara evidence account above.

### Gap 2: Old local/admin trust record is too weak for the story

Old local/admin trust readings:

- Trust score: 0.00.
- Trust band: D / Starting.
- CCI score: 9.75.
- CCI class: E.
- Sponsor count: 0.

This is useful for testing warnings, but not useful for showing that a person can carry trust from Lagos to Aberdeen. The workshop needs a prepared demo member with credible positive evidence.

### Gap 3: Merchant verification route was not fully wired

Backend file exists:

- `gmfn_backend/app/api/routes/merchant_verify.py`

It has now been included in:

- `gmfn_backend/app/api/router.py`

The public merchant route was moved to a non-colliding path:

- `/trust-slips/merchant/verify/{token}`

This avoids colliding with the existing TrustSlip route:

- `/trust-slips/verify/{code}`

### Gap 4: Merchant verification entitlement is missing

The local account does not have an active `merchant_verify` entitlement. It has an active entitlement for a different feature. So even where the TrustSlip public route works, the merchant-verification layer is not active for the demo account.

### Gap 5: The app can become too broad during the demo

The path contains many pages and features. The workshop should not become "let me show every page." Every screen should be judged by one question:

**Does this show portable trust evidence, or is it noise?**

---

## 5. Required Demo Fixes Before Workshop

### Fixed for local workshop demo

1. Prepared one clean demo account for the workshop.
2. Gave that account a believable community membership story.
3. Gave that account positive trust event history.
4. Created an active TrustSlip.
5. Confirmed public verification shows a valid/current reading.
6. Activated merchant verification for that account.
7. Wired merchant verification route without colliding with existing TrustSlip public verification.
8. Tested the evidence APIs on laptop.
9. Added local workshop seed script: `gmfn_backend/app/db/seed_workshop_demo.py`.
10. Changed public verification wording so it supports informed decisions without pretending GSN guarantees payment, lending, medical decisions, or goods release.

### Still must verify

1. Test the full route line visually on phone.
2. Confirm no page is too crowded or confusing on phone.
3. Confirm the app presentation stays focused on portable trust, not every feature.

### Should fix later

1. Prepare backup screenshots for each evidence step.
2. Prepare one expired/failed TrustSlip example separately, so students can see what rejection looks like.
3. Make sure the visible brand is GSN unless the screen is explaining the wider GMFN system layer.

---

## 6. Recommended Demo Scenario Data

Use one named scenario:

**Amara moves from Lagos to Aberdeen.**

Minimum demo evidence:

- Amara has a verified phone.
- Amara belongs to a trusted Lagos community.
- Amara has completed contribution/support activity.
- Amara has a shop or marketplace record.
- Amara has one or more supporting trust events.
- Amara has a Trust Passport with a clear explanation.
- Amara has an active TrustSlip.
- A public verifier can confirm the TrustSlip.
- A merchant or society member can see a compact merchant-facing view.

This should be demo data, not fake claims hidden in copy. The app output should support the story.

---

## 7. Audit Judgment

### What I would tell Chris bluntly

The customer discovery story is strong enough to share as a working plan.

The live app should not yet be treated as fully workshop-ready until the trust evidence path is corrected with an active TrustSlip and working merchant verification.

### What I would tell Favour bluntly

Students can react to the idea now, but the live demonstration must be kept focused. If the app shows too many pages or weak trust evidence, students may think GSN is only a savings/contribution app or may lose the portable-trust point.

### What I would tell Chuma bluntly

Do not demo the old local admin account as the main evidence of GSN. It demonstrates caution, expiry, and inactive merchant verification more than it demonstrates portable trust. Use the Amara workshop demo account.

---

## 8. Immediate Next Work Order

1. Finish phone audit using the same evidence path.
2. Record any blank page, confusing route, or misleading wording.
3. Sign in with `amara.demo@gsnworkshop.co.uk` / `pass1234`.
4. Re-test `/app/trust`, `/app/trust-slip`, public TrustSlip verification, and merchant verification.
5. Then rehearse the one-hour presentation path.

---

## 9. One-Line Standard

The demo is ready only when an outside person can open a verification view and understand:

**Who this person is, what community-backed evidence exists, what trust state is current, what can be trusted, and what cannot be overclaimed.**
