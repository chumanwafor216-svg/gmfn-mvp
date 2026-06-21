# Amara Storyline Audit

Date: 2026-05-29

Purpose: audit the Amara journey across onboarding, setup, community growth,
and TrustSlip / trust activity so pilot testing stays focused on one human
story instead of becoming a tour of every screen.

Core storyline:

Amara builds a trusted record in Lagos. Later, she arrives in Aberdeen. People
there do not know her personally. GSN should let her show a Trust Passport or
TrustSlip so a society member, merchant, employer, or support network can see
current community-backed evidence and decide what is safe to do.

## Audit Standard

Every screen in this line should answer one question:

Does this help Amara become understandable, trusted, and verifiable outside the
place where she is already known?

If a screen cannot answer that question quickly, it is noise for this storyline.

## Route Line

| Lane | Route / screen | Story job | Current audit reading |
| --- | --- | --- | --- |
| Entry | `/cover`, `/welcome`, `/login` | Get Amara into the right path without confusion. | Route structure exists. Keep this short; the story starts only after Amara can enter or sign in. |
| Onboarding | `/create`, `/join`, `/activate` | Record identity, phone, and entry intent without trapping the user. | Recent fixes make Create/Join more responsive, but phone testing must confirm every stage gives a visible answer. |
| Setup | `/create` community setup blocks | Record community details and optional evidence, then move forward. | `Finish registration now` is wired toward First Circle after successful create. Keep watching for silent failure states. |
| Community growth | `/app/build-first-circle` | Add trusted people and create the first circle without a busy page. | First Circle now has the compact four-step card: aim, three people, list review, invite message. This is the right direction for Amara. |
| Community layer | `/app/community` | Show where Amara belongs and where her communities live. | Community Home can support the story, but it must not become a feature dump during the audit. |
| Marketplace / shop | `/app/marketplace`, `/app/shop-control` | Show the real-world activity context that can create evidence. | Use only as evidence context. Do not let marketplace tools swallow the portable-trust message. |
| Trust Passport | `/app/trust` | Explain the full trust story behind Amara. | Structurally correct. It should make clear why the TrustSlip is believable. |
| TrustSlip | `/app/trust-slip` | Show the portable current evidence. | Stronger than before: code, status, visible limit, merchant verification, and community confirmation language exist. |
| Public verify | `/t/:code`, `/trust-slips/verify/:code/page` | Let an outsider check the current evidence. | This is the strongest final evidence point if the code is current and the Amara data exists in the active environment. |

## Confirmed From Repo

- Existing workshop audit files already define the Amara evidence account and code:
  `amara.demo@gsnworkshop.co.uk`, `GSN-DEMO-AMARA`, and `GSNAMARA2026`.
- `frontend/src/App.tsx` contains the active route line for entry, community,
  marketplace, shop, Trust Passport, TrustSlip, and TrustSlip Verify.
- `frontend/src/pages/CreateEntryPage.tsx` contains stage-level actions for
  continuing after phone/photo/bank evidence and finishing registration toward
  First Circle.
- `frontend/src/pages/BuildFirstCirclePage.tsx` now presents the first-circle
  work as a focused four-step flow instead of exposing the full old workspace.
- `frontend/src/pages/CommunityHomePage.tsx` contains First Circle and Trust
  Passport entry points.
- `frontend/src/pages/TrustSlipPage.tsx` contains visible TrustSlip status,
  merchant verification state, public verify actions, and community confirmation
  request handling.
- `frontend/src/pages/TrustSlipVerifyPage.tsx` and route-local verify modules
  normalize public TrustSlip verification data and explain current/expired/error
  states.

## Devil's Advocate Findings

1. The story is not proven just because the routes exist.

   The active environment must have the Amara demo data. A local seed account
   does not prove Render or the live pilot database contains the same usable
   TrustSlip, sponsor count, merchant verification, and community evidence.

2. Onboarding is still the highest-risk silence point.

   The code now tries to respond after each stage, but the phone audit must
   still click through: details, phone/photo, bank/wallet, optional ID, community
   setup, and finish. If any step fails without explaining why and what to do
   next, Amara's story breaks before trust ever becomes portable.

3. Community growth is still invite-intent, not joined-community evidence.

   First Circle can collect people and copy/share an invite message. That is
   not the same as showing those people received the invite, joined, accepted,
   or produced trust evidence. Do not oversell the first-circle card as evidence
   of community density until recipient activity is recorded.

4. Trust activity is still split between several places.

   TrustSlip tells the portable evidence. Trust Passport tells the fuller story.
   Admin Trust Events and dormant/less-visible timeline surfaces carry deeper
   event trails. For Amara, the pilot needs a plain member-facing "activity
   behind this evidence" path, otherwise a verifier may ask where the evidence came
   from and the app may feel hand-wavy.

5. Merchant verification must stay decision-support, not guarantee language.

   The current docs and code have moved away from overclaiming. Keep that line.
   The story should say: "this is current evidence, not automatic approval, not
   bank guarantee, not auto-debit."

## What To Test Next On Phone

Use only this line. Do not test every product feature.

1. Start from `/cover`.
2. Sign in or create the Amara-style account path.
3. Complete or inspect onboarding setup stages.
4. Tap `Finish registration now`; confirm the app speaks and moves forward.
5. Open `/app/build-first-circle`; add three people and copy/share the invite.
6. Open `/app/community`; confirm Amara's community context is understandable.
7. Open `/app/trust`; confirm the full trust story explains the TrustSlip.
8. Open `/app/trust-slip`; refresh if needed and confirm a current code exists.
9. Open the public verify path for the current code.
10. Ask: could someone in Aberdeen understand what is true, what is current,
    and what is not guaranteed?

## Work Order

### Must protect now

- Every onboarding/setup stage must answer after a tap.
- Every TrustSlip/verify failure must say whether the issue is missing, expired,
  replaced, inactive, or not ready.
- First Circle must stay focused and must not re-expand into a full busy page.
- Public verification must remain plain: valid/current, expired/replaced, or not
  usable.

### Next safest product improvement

Create an Amara-facing trust activity lane that connects:

Trust Passport -> TrustSlip -> activity behind the evidence -> public verification.

This should not expose private raw admin logs. It should show ordinary evidence
categories: identity, community membership, sponsor signals, contribution or
repayment evidence, personal commitments, community confirmation, and current
TrustSlip status.

### What not to do

- Do not merge Create Community and Join Existing Community.
- Do not make Dashboard the owner of the trust story.
- Do not expose raw member financial or private trust records as public evidence.
- Do not claim Amara is trustworthy because the app says so. The evidence must
  point to current evidence and limits.

## Audit Judgment

The Amara storyline is still the right pilot spine.

The current system is closer to supporting it because onboarding responses,
First Circle focus, and TrustSlip verification have all been strengthened.

The remaining truth is simple: the story is only ready when the phone path can
show a current Amara TrustSlip, explain the activity behind it, and let an
outside verifier understand the evidence without the product owner narrating every
screen by hand.
