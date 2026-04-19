# One-Page Route Map

## Date
2026-04-19

## Purpose
This is the plain-English route map for the GSN product.

It is meant to show, in the simplest possible way:

- what each major page is for
- what should belong on it
- what should not belong on it
- where it should lead next

This is a communication document, not a code change.

## The simple picture

The app should feel like this:

```text
My Space
  My Dashboard
  Notifications
  Profile & Settings

Community
  Community Hub
  Marketplace
  Shop / Storefront

Money & Trust
  Finance
  Borrowing
  Trust Passport
  Identity & Verification

Separate
  Admin Center
```

## The main movement

For most users, the movement should feel like this:

```text
My Dashboard
  -> Community Hub
    -> Marketplace
      -> Finance / Shop / Borrowing / Trust Passport
```

Money movement should feel like this:

```text
My Dashboard or Marketplace
  -> Finance
    -> Money In / Money Out
      -> Payment Rails / Payout Details / Borrowing
```

Trust movement should feel like this:

```text
My Dashboard or Community Hub
  -> Trust Passport
    -> deeper trust / trust slip / verification
```

## Route map

### 1. My Dashboard
Current route:
- `/app/dashboard`

Preferred visible label:
- `My Dashboard`

Purpose:
- the user’s compact working space
- the page that answers: `what should I do next?`

Should contain:
- compact trust/identity state
- compact attention or next-step signal
- compact notifications summary
- compact demand summary
- regular apps
- compact commitments summary

Should not contain:
- giant hero ownership
- deep trust explanation
- deep finance explanation
- command-centre behavior

Leads to:
- Community Hub
- Marketplace
- Finance
- Trust Passport
- Notifications

### 2. Community Hub
Current route:
- `/app/community`

Preferred visible label:
- `Community Hub`

Purpose:
- the command centre for the currently active community
- the page that answers: `which community am I in and what community action do I need?`

Should contain:
- selected community identity
- the user’s role in that community
- core community tools
- route launches into the right next area

Should not contain:
- full finance ownership
- full marketplace ownership
- oversized spotlight/media ownership
- deep previews of every other domain

Leads to:
- Marketplace
- Demand Box
- Build First Circle
- Notifications
- Finance
- Trust Passport

### 3. Marketplace
Current route:
- `/app/marketplace`

Preferred visible label:
- `Marketplace`

Purpose:
- commerce visibility
- member/shop discovery
- light support continuation

Should contain:
- commerce identity
- marketplace readiness
- visible shop/member activity
- route into shop
- route into finance when money state matters
- light support continuation

Should not contain:
- community command-centre overload
- deep finance ownership
- duplicated admin/tool surfaces

Leads to:
- Shop / Storefront
- Finance
- Borrowing
- Community Hub where needed

### 4. Finance
Current route:
- `/app/finance`

Preferred visible label:
- `Finance`

Purpose:
- the full money workspace
- the page that answers: `what is my true money position and what money action should I take?`

Should contain:
- pool position
- effective available balance
- locked exposure
- borrower obligations
- money events
- rails
- payout details

Should not be partially owned by:
- Dashboard
- Community Hub
- Marketplace

Leads to:
- Money In
- Money Out
- Payment Rails
- Payout Details
- Borrowing
- Notifications

### 5. Money In
Current route:
- `/app/payment/pool`

Preferred visible label:
- `Money In`

Purpose:
- guided pay-in execution

Should contain:
- pay-in context
- exact amount
- exact reference
- reconciliation/confirmation flow

Should not contain:
- broad support or marketplace ownership

Leads to:
- Finance
- Payment Rails
- Notifications

### 6. Money Out
Current route:
- `/app/withdrawal-instructions`

Preferred visible label:
- `Money Out`

Purpose:
- guided withdrawal execution

Should contain:
- withdrawal context
- payout destination
- route branching into direct withdrawal or support if needed

Should not contain:
- general marketplace ownership

Leads to:
- Finance
- Payout Details
- Borrowing if support is needed

### 7. Borrowing
Current route:
- `/app/loans`

Preferred visible label:
- `Borrowing`

Purpose:
- borrower and support work

Should contain:
- borrower-side steps
- readiness
- suggestions
- workbench
- support path

Should not contain:
- general finance ownership

Leads to:
- Finance
- Notifications

### 8. Trust Passport
Current route:
- `/app/trust`

Preferred visible label:
- `Trust Passport`
- helper plain-English meaning: `your trust record`

Purpose:
- the trust record and trust explanation domain

Should contain:
- trust reading
- trust explanation
- trust evidence
- trust portability
- trust journey
- trust-related next steps

Should not be reduced to:
- a small dashboard helper
- a generic badge screen

Leads to:
- TrustSlip
- Notifications
- Marketplace where trust unlocks action

### 9. Identity & Verification
Current route:
- `/app/identity`

Preferred visible label:
- `Identity & Verification`

Purpose:
- stable identity and integrity status

Should contain:
- identity state
- verification state
- CCI / integrity context

Should not contain:
- broad trust ownership
- finance ownership

Leads to:
- Trust Passport
- Notifications

### 10. Notifications
Current route:
- `/app/notifications`

Preferred visible label:
- `Notifications`

Purpose:
- one place for action signals and updates

Should contain:
- unread items
- act-now items
- due-soon items
- grouped sources

Should not contain:
- deep trust ownership
- deep finance ownership

Leads to:
- the route where the user must act next

### 11. Profile & Settings
Current route:
- `/app/my-gmfn-and-i`
- settings tab: `/app/my-gmfn-and-i?tab=settings`

Preferred visible label:
- `Profile & Settings`

Purpose:
- personal guide and settings

Should contain:
- guide/orientation
- workspace settings

Should not contain:
- major domain ownership of finance, marketplace, or trust

Leads to:
- back into the main workspaces

### 12. Shop / Storefront
Current routes:
- public shop: `/shop/:gmfnId`
- owner tools: `/app/shop-control`

Preferred visible label:
- public: `Shop`
- internal owner side: `Shop Control`

Purpose:
- public-facing commerce surface
- owner-facing shop management surface

Should contain:
- shop identity
- spotlight
- products
- storefront access or vault where relevant

Should not become:
- the general member workspace

Leads to:
- Marketplace
- Commerce actions

### 13. Admin Center
Current route:
- `/app/command-center/*`

Preferred visible label:
- navigation: `Admin Center`

Purpose:
- role-gated management and oversight

Should contain:
- admin-only and operator-only surfaces

Should not mix with:
- ordinary member routes

## What must become lighter

### My Dashboard
Must become lighter by losing:
- oversized spotlight ownership
- deep trust ownership
- command-board overload

### Community Hub
Must become lighter by losing:
- mini finance ownership
- deep previews of everything else

### Marketplace
Must become lighter by losing:
- partial finance ownership
- duplicate command tools

## What must stay strong

### Finance
Must stay strong because it is a real domain.

### Trust Passport
Must stay strong because it is a real domain.

## Final plain-English verdict

The app should feel like:

- `My Dashboard` tells me what to do next
- `Community Hub` tells me where I am in my community
- `Marketplace` shows me commerce and support activity
- `Finance` tells me the truth about my money
- `Trust Passport` tells me the truth about my trust
- `Shop` shows the public/storefront face
- `Profile & Settings` handles my personal guide and settings

If every page sticks to that job, the app will become much easier to use and
much stronger to present.

