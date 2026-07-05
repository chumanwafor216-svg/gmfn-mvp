# GSN Public TrustSlip Verify Evidence Audit

Status: Route audit draft
Date: 2026-07-05
Scope: Public TrustSlip Verify, public TrustSlip JSON/pages, and signed-in
private evidence boundary.

## Purpose

This audit records what the public TrustSlip Verify surface currently proves,
what it must not imply, and what still needs enforcement before GSN treats it as
a hardened public evidence document.

This is a docs-only audit. It does not change frontend code, backend code,
schema, auth, permissions, deployment workflows, or Render behavior.

## Routes Audited

Frontend routes:

- `/t/:code`
- `/t/:code/lite`
- `/verify/trust-slip`
- `/verify/trustslip`
- `/trust-slips/verify/:code`
- `/trust-slips/verify/:code/page`
- `/trust-slips/verify/:code/lite`
- `/trust-slips/verify/:code/print`
- signed-in app route: `/app/trust-slip/verify`

Backend routes:

- `GET /trust-slips/verify/{code}`
- `GET /trust-slips/verify/{code}/share-text`
- `GET /trust-slips/verify/{code}/lite`
- `GET /trust-slips/verify/{code}/qr.png`
- `GET /trust-slips/verify/{code}/page`
- `GET /trust-slips/verify/{code}/print`
- `GET /trust-slips/{code}/share`
- `POST /trust-slips/{code}/release`
- `GET /trust-slips/{code}/release/page`

## Source Anchors

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `frontend/src/pages/trustSlipVerify/trustSlipVerifyData.ts`
- `frontend/src/pages/trustSlipVerify/trustSlipVerifyViewModel.ts`
- `frontend/src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx`
- `frontend/src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx`
- `frontend/src/pages/trustSlipVerify/TrustSlipVerifyBoundary.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/components/TrustDocumentLanguage.tsx`
- `frontend/src/components/TrustPaperMarks.tsx`
- `frontend/src/lib/trustDocumentSnapshots.ts`
- `frontend/src/lib/trustBandLanguage.ts`

Backend:

- `gmfn_backend/app/api/routes/trust_slips.py`
- `gmfn_backend/app/services/trust_slips_services.py`
- `gmfn_backend/app/services/community_confirmation_service.py`

## Current Role

Public TrustSlip Verify is GSN's strongest public-facing personal evidence
surface.

It is not the private Trust Passport. It is a scoped public paper that lets an
outside reader check whether a supplied TrustSlip code resolves to a current
public record and then make their own decision inside the stated limits.

## What The Public Paper Can Confirm

When the backend returns a valid record and the frontend renders it honestly,
the public paper can confirm:

- the public TrustSlip code resolves to a TrustSlip record;
- the current public validity/status reading for that code;
- the visible holder label and GSN ID returned for that public record;
- the community label/context returned for the public record;
- the visible evidence band/public score/trust-limit signal returned by the
  TrustSlip public view;
- issue and expiry labels when returned;
- public visibility level (`minimal` or `standard`);
- public verification path and QR destination when available;
- member credential path when the backend returns one;
- community confirmation readiness/result counts where returned;
- public-safe community activity/currentness labels where returned.

## What It Must Not Confirm

Public TrustSlip Verify must not imply:

- legal identity, government identity, professional licence, or regulatory
  approval;
- bank approval, credit approval, escrow, auto-debit, payment movement, or
  release authority;
- delivery guarantee, marketplace outcome guarantee, or future behaviour;
- the holder's private Trust Passport contents;
- raw evidence trail, private contacts, private phone numbers, admin notes,
  disputes, or protected documents;
- parent-community acknowledgement unless returned as current scoped evidence;
- approval by every community member, shop, marketplace actor, or institution;
- trustworthiness by itself.

The page can support a decision. The reader still makes the decision.

## Public And Private Boundary

Confirmed source facts:

- Public and app contexts are separated by `isAppRoute` in
  `TrustSlipVerifyPage.tsx`.
- `TrustSlipVerifyPublicPaper` renders the public document surface.
- `TrustSlipVerifyPrivateEvidence` is lazy-loaded separately.
- Private evidence is gated by `canShowPrivateEvidence = ownsVisibleTrustSlip`.
- `ownsVisibleTrustSlip` requires the app route, a private holder record, and a
  code match between the signed-in user's TrustSlip and the visible record.
- `TrustSlipVerifyBoundary` explicitly tells readers that the public paper ends
  before the private review area.
- App navigation (`PageTopNav`) is only rendered for app routes.

Devil's advocate:

This is a good route-level architecture, but it is not enough by itself. There
should be an automated route audit proving public routes (`/t/:code`,
`/trust-slips/verify/:code`, and aliases) do not render the private evidence
drawer or signed-in internal actions.

## Backend Visibility Controls

Confirmed source facts:

- `_safe_visibility_level` accepts `minimal`, `standard`, and `detailed` for
  holder/requested configuration.
- `_public_visibility_level` only permits public requests to resolve to
  `minimal` or `standard`.
- Requested public level cannot exceed the stored holder visibility level.
- `PUBLIC_TRUSTSLIP_BLOCKED_KEYS` filters sensitive keys such as email, phone,
  contacts, sponsors, raw events, repayment details, risk flags, evidence
  summary, admin notes, payment references, and bank account details.
- `_public_trustslip_merchant_view` recursively applies the public filter.
- For `minimal` visibility, the public JSON suppresses profile image,
  identity context, community context, CCI explainer, and most community
  confirmation detail.
- The backend returns explicit limitation language, including that TrustSlip is
  a decision aid, not bank guarantee, auto-debit, or automatic approval.

Devil's advocate:

`detailed` exists as a safe holder/config level, but public resolution currently
allows only `minimal` and `standard`. Future code must not accidentally expose a
public `detailed` level without a fresh security review and route tests.

## Frontend Display Controls

Confirmed source facts:

- The public paper uses shared Trust Document Language components:
  confidence ribbon, security panel, boundary panels, fingerprint, authority
  strip, and paper marks.
- The public paper contains explicit "This paper confirms" and "This paper does
  not confirm" sections.
- The public paper states that it does not open the holder's private Trust
  Passport.
- The public reading section states "Evidence, not approval".
- The community confirmation block states that GSN returns counts and outcome
  only and does not publish member phone numbers.
- The page derives `validNow` from a success banner plus non-blocking state.
- Blocking states include expired, revoked, frozen, inactive merchant verify,
  non-current slips, and inactive merchant verification.

Devil's advocate:

The public document is visually official. That strength becomes a risk if
fallbacks are ever styled as real evidence. Future work needs source tests for
expired, revoked, frozen, missing, no-code, minimal-visibility, and low-data
records.

## Data Source Truth

Canonical public source:

- `GET /trust-slips/verify/{code}` is the canonical JSON source for the
  frontend public paper.

Frontend interpretation:

- `normalizeTrustSlipVerification` merges top-level JSON, `trust_slip`,
  `verification`, `merchant_view`, `merchant_summary`, `identity_context`,
  `community_context`, and `cci_explainer` into one frontend record.
- `buildTrustSlipVerifyViewModel` derives display labels, validity labels,
  quick answers, reader verdicts, community confirmation rows, public paths,
  and fallback wording.
- Fallback labels include "Not shown", "Not stated", "Not available", and
  "Witness renewal not started". These must never become readiness or official
  proof.
- `referenceFingerprint` is deterministic from visible fields. It is useful as
  a record reference, not a cryptographic hash, legal proof, or payment
  approval.

## Public States To Test

Before any implementation pass claims this route is hardened, add or update
route-local tests for:

- no code supplied on a public route;
- missing or unknown code;
- current standard public record;
- current minimal public record;
- expired record;
- revoked record;
- frozen record;
- inactive merchant verification;
- low-data record with no snapshot/event depth;
- missing issue/expiry window;
- member credential returned;
- no member credential returned;
- community confirmation relay available;
- community confirmation unavailable;
- public route with a signed-in user present in app state;
- signed-in app route for the holder's own TrustSlip;
- signed-in app route for a TrustSlip the user does not own.

## Acceptance Checklist For Future Code Work

A future TrustSlip Verify implementation pass should not be considered complete
until it proves:

- public routes render `TrustSlipVerifyPublicPaper`;
- public routes do not render `TrustSlipVerifyPrivateEvidence`;
- public routes do not show app navigation or internal actions;
- private evidence opens only for `ownsVisibleTrustSlip`;
- `minimal` visibility hides private contexts and profile image;
- `standard` visibility does not expose blocked keys;
- status and validity labels map correctly for current, expired, revoked,
  frozen, inactive, missing, and low-data states;
- green/valid styling appears only when route state supports it;
- reference fingerprints are labelled as references, not cryptographic proof;
- QR and share text point back to the same public verification record;
- community confirmation blocks never expose private member contacts;
- print/lite/page variants carry the same limitation language;
- mobile first viewport shows status, code/reference, confidence, and next safe
  action or limitation.

## Verdict

Public TrustSlip Verify is the right first route to harden into a canonical GSN
public evidence document.

The current implementation already has the important bones: backend visibility
filtering, public/private frontend separation, Trust Document Language sections,
public QR/reference cues, and explicit non-approval language.

The unabated truth: it is not fully hardened yet. The next safest engineering
step is not a visual redesign. It is a route-local audit/test pass that proves
private evidence cannot leak onto public aliases and that every public state
uses honest evidence language.

