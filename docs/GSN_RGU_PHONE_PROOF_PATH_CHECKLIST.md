# GSN RGU Phone Evidence Path Checklist

Date: 15 May 2026  
Use this after the laptop-side evidence-path audit.
Phone URL: `http://192.168.1.38:5173/reset`, then continue from `/cover` or `/login`.

---

## Before You Start

Use the local Wi-Fi version, not Render:

`http://192.168.1.38:5173`

Workshop demo sign-in:

- Email: `amara.demo@gsnworkshop.co.uk`
- Password: `pass1234`
- GSN ID: `GSN-DEMO-AMARA`
- TrustSlip code: `GSNAMARA2026`

Older local admin sign-in, useful only for admin checks:

- Email: `admin@test.com`
- Password: `pass1234`

Known phone number sign-in format:

- `+447903165266`
- Password: `pass1234`

Do not use `447903165266` without the `+`; that version fails locally.

For the workshop evidence path, use the Amara demo account, not the admin account.

---

## What We Are Testing

Do not test the app like a normal full feature tour. Test one story:

**Can Amara carry trust from one community into another place where people do not already know her?**

Every page should answer one question:

**Does this page help show portable trust evidence, or is it noise?**

---

## Phone Walkthrough Line

### 1. Cover

Route: `/cover`

Check:

- Does it open cleanly on phone?
- Does it feel like the right GSN entry point?
- Does it avoid sending you unexpectedly to Dashboard or Community before sign-in?

Status from laptop audit: page route responds.

### 2. Login

Route: `/login`

Check:

- Can you sign in with `amara.demo@gsnworkshop.co.uk` / `pass1234`?
- Is the entry choice clear?
- Does the page show:
  - Existing member sign-in
  - Activate membership
  - Start a new community
- Is anything duplicated, confusing, or too close together on phone?

Status from laptop audit: sign-in works.

### 3. Dashboard

Route: `/app/dashboard`

Check:

- Does it show identity/trust direction clearly?
- Does it make the app feel like a trusted command centre?
- Do not judge every dashboard section. Only ask whether it supports the portable-trust story.

Status from laptop audit: route responds. Dashboard Market Wisdom area is frozen and should not be casually changed.

### 4. Community

Route: `/app/community`

Check:

- Does the selected community context make sense?
- Can you explain this as "where trust is formed"?
- Does the page feel too broad or too busy for a workshop viewer?

Status from laptop audit: route responds.

### 5. Marketplace

Route: `/app/marketplace`

Check:

- Does marketplace activity feel connected to community trust?
- Does it show why shop/trade activity creates evidence?
- Does it distract from the main story?

Status from laptop audit: route responds.

### 6. Shop Control

Route: `/app/shop-control`

Check:

- Does the shop look usable as the merchant/business part of the story?
- Can you explain it as "activity that contributes to trust evidence"?
- Does it connect back to Trust Passport / TrustSlip clearly enough?

Status from laptop audit: route responds. Local data has one shop.

### 7. Trust Passport

Route: `/app/trust`

Check:

- Does this page explain the full trust story?
- Does it show enough evidence to make trust believable?
- Does it clearly connect to TrustSlip?

Laptop audit expectation:

- Trust score should be about `6.60`.
- Trust band should be B.
- CCI should be about `66.95 / B`.
- The page should feel like the full trust story behind the shorter TrustSlip.

### 8. TrustSlip

Route: `/app/trust-slip`

Check:

- Does it show the portable public trust summary?
- Does it show TrustSlip code, trust limit, CCI, issue window, and verification route?
- Does it clearly say whether Merchant Verify is active?

Laptop audit expectation:

- Current TrustSlip code is `GSNAMARA2026`.
- TrustSlip status should be active.
- Trust limit should be `25000.00 NGN`.
- Merchant verification should be active.

### 9. TrustSlip Verify

Route inside app: `/app/trust-slip/verify`  
Public backend verify page: `/trust-slips/verify/GSNAMARA2026/page`

Check:

- Does the verify page open?
- Does it show status clearly?
- Does it make clear what an outside person can and cannot rely on?

Laptop audit expectation:

- The public page currently says:
  - `VALID - CURRENT TRUSTSLIP FOUND`
  - Plain reading explains the current trust state in non-technical language
  - Trust Limit: `25000.00 NGN`
  - Status: `active`
  - Holder: `Amara Okafor`
  - Community: `Lagos Trusted Circle Market`

This is now the main local evidence example. The old admin account remains useful as a rejection/caution example.

---

## What To Report Back

When you test on phone, bring back only these four types of correction:

1. Page does not open or stays blank.
2. Page opens but sends you to the wrong place.
3. Text or button is confusing on phone.
4. Trust story breaks because the page does not show the next evidence step.

Do not worry about every minor feature yet. The job is to protect the evidence line.

---

## Current Go / No-Go

Current judgment:

**Conditional go for phone rehearsal using the Amara demo account.**

Reason:

The evidence data now supports the portable-trust story on the backend. The remaining job is to confirm the phone UI is clear, reachable, and not confusing.

The demo account now has:

- positive community evidence,
- active Trust Passport story,
- active TrustSlip,
- active merchant verification,
- public verification that shows a usable current trust state.
