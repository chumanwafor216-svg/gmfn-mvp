# GSN Trust Passport Purpose Audit

Date: 2026-07-05

Status: Draft local audit

## Purpose

This audit follows `docs/GSN_BOOK_ALIGNMENT_MAP.md` and checks the current
Trust Passport family before any redesign or consolidation work.

The goal is to protect the core distinction:

```text
Trust Passport = fuller signed-in carried trust and evidence story.
TrustSlip = shorter portable current evidence for a specific outside decision.
Identity & Integrity = stable identity, continuity, and missing evidence repair.
My GSN Identity = member guide and capability map, not the evidence instrument itself.
Trust Timeline = event trail and evidence bundle, not the whole Passport.
CCI Reading = cross-community consistency signal, not the full Passport.
```

Unabated truth: GSN already has a Trust Passport-like implementation, but the
product still spreads Passport meaning across several surfaces. The next
redesign should clarify ownership, not merge everything into one heavy page.

## Source Anchors Reviewed

Architecture and specs:

- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/SCREEN_SPECS.md`
- `docs/GSN_BOOK_ALIGNMENT_MAP.md`

Frontend route anchors:

- `frontend/src/App.tsx`
- `frontend/src/lib/appRoutes.ts`
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/lib/trustPassportViewModel.ts`
- `frontend/src/pages/MyGMFNAndIPage.tsx`
- `frontend/src/pages/TrustTimelinePage.tsx`
- `frontend/src/pages/IdentityIntegrityPage.tsx`
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/CCIReadingPage.tsx`

Backend anchors:

- `gmfn_backend/app/db/models.py`
- `gmfn_backend/app/api/routes/trust_events.py`
- `gmfn_backend/app/api/routes/trust_slips.py`
- `gmfn_backend/app/api/routes/trust_score.py`
- `gmfn_backend/app/api/routes/trust_timeline.py`
- `gmfn_backend/app/api/routes/trust_timeline_pdf.py`
- `gmfn_backend/app/services/trust_slips_services.py`
- `gmfn_backend/app/services/trust_timeline_service.py`

## Canonical Responsibility

The canonical skeleton says:

- Trust in one marketplace is local community trust.
- CCI belongs to the cross-community layer.
- Trust Passport is the combined personal trust and evidence layer across
  communities and marketplaces.
- TrustSlip is portable current evidence, not the full story.
- Merchant verification should not expose the whole Trust Passport by default.

The current screen spec says Trust Passport should guide one trust lane at a
time and should not expose every document route, trust event, and explanation
layer at once.

## Current Route Ownership

| Route / Surface | Current Role | Should Own | Should Link To | Should Not Become |
| --- | --- | --- | --- | --- |
| `/app/trust` | Main Trust Passport-like surface implemented by `TrustScorePage` and `buildTrustPassportViewModel`. | Fuller signed-in trust/evidence story, lane-by-lane. | TrustSlip, Trust Timeline, Identity & Integrity, Notifications, Community record. | A raw score page, full event table, or public verification page. |
| `/app/my-gmfn-and-i` | My GSN Identity and capability guide. | Member orientation, settings, capability-to-evidence explanation, "what GSN helps me decide." | Trust Passport, TrustSlip, Finance, Marketplace, Community Home. | The actual Trust Passport evidence instrument. |
| `/app/trust-timeline` | Signed-in timeline and evidence bundle surface. | Event trail, PDF, redacted evidence share copy, movement behind trust. | Trust Passport and TrustSlip. | The full Passport or a public proof page. |
| `/app/identity` | Identity & Integrity page. | GSN ID, identity continuity, phone/community/bank/official-ID/recovery tasks. | Trust Passport, TrustSlip, Action Inbox. | Trust score, membership proof, or full carried trust story. |
| `/app/cci-reading` | Cross-community consistency reading. | CCI/class/score explanation from me, TrustSlip, and selected-community trust explanation. | Identity, Trust Passport, TrustSlip. | Trust Passport replacement or public verification. |
| `/app/trust-slip` | Holder-facing TrustSlip page. | Current portable TrustSlip, public verify link, QR, reader boundary, merchant/community confirmation actions. | Trust Passport and public verify. | The full private Passport story. |
| `/t/:code` and `/trust-slips/verify/:code` | Public TrustSlip verification paper. | Current public validity check and receiver guidance. | Member credential/community record when safely available. | Signed-in private Passport or transaction approval. |

## Current Trust Passport Shape

Confirmed from `frontend/src/pages/TrustScorePage.tsx` and
`frontend/src/lib/trustPassportViewModel.ts`:

- `/app/trust` presents itself as `Trust Passport`.
- The view model groups identity, verdict, trust questions, reasons, outputs,
  and technical detail.
- The page already has the pre-redesign lane mapping:
  - Current Trust Standing
  - Evidence Story
  - Community Confirmation
  - Finance Discipline
  - Documents / TrustSlip
  - Repair or Next Step
- It already carries boundary language:
  - private passport surface;
  - not public TrustSlip;
  - not legal proof or payment approval;
  - public readers should receive scoped TrustSlip or community record.

Audit reading: this is the correct current home for the Trust Passport. The
problem is not absence. The problem is density and route-family confusion.

## Supporting Surfaces

### My GSN Identity

`MyGMFNAndIPage` is useful but not the Passport.

It maps real-world decisions to GSN tools and evidence. It is best understood
as a capability guide and member orientation surface. It should explain where
evidence is created or reviewed, but it should not become the trusted evidence
record itself.

Keep:

- selected capability first;
- collapsed `Find another decision` guide tools;
- links to Trust Passport and TrustSlip;
- plain-language decision/evidence explanations.

Avoid:

- duplicating Trust Passport lanes;
- showing raw trust event history;
- pretending capability explanations prove any one member's evidence.

### Trust Timeline

`TrustTimelinePage` is the event trail.

It loads `/trust/me/timeline`, `/trust/me/evidence-pack/meta`, a timeline PDF,
and an evidence ZIP. It is valuable as supporting evidence for review.

Keep:

- timeline confirms / does-not-confirm boundary;
- signed-in-only privacy boundary;
- PDF/evidence pack tools;
- route back to TrustSlip.

Avoid:

- turning the timeline into the Passport front page;
- presenting raw event count as trust by itself;
- exposing complete private history in portable/public contexts.

### Identity & Integrity

`IdentityIntegrityPage` owns identity repair.

It handles phone verification, community status, bank/wallet evidence,
official ID/photo evidence, continuity, recovery, and links back to Trust
Passport and TrustSlip.

Keep:

- one active identity task;
- GSN ID / community / continuity / TrustSlip facts;
- explicit route-pending responses for unfinished completion routes.

Avoid:

- saying identity equals trust;
- saying membership equals trust;
- making TrustSlip readiness look like government ID verification;
- sending users to explanation-only pages while implying completion is possible.

### TrustSlip

`TrustSlipPage` is the portable record surface.

It has public verify, QR, status, practical evidence, reader boundary, merchant
verification, community confirmation, and links back to Trust Passport.

Keep:

- TrustSlip as short portable current evidence;
- public verify as current validity check;
- reader boundary and non-approval language;
- community/member credential links only when safe keys exist.

Avoid:

- exposing private Passport history;
- calling trust-limit signals approved limits;
- using TrustSlip as payment instruction, credit approval, legal promise, or
  goods-release authority.

### CCI Reading

`CCIReadingPage` is the wider consistency signal.

Recent work made it read from `/auth/me`, TrustSlip, and selected-community
trust explanation while preserving decimal scores.

Keep:

- CCI as a cross-community consistency view;
- links outward to identity, Trust Passport, and TrustSlip;
- selected-community context handling.

Avoid:

- presenting CCI as the whole Passport;
- presenting a class/score as moral judgement or approval.

## Proposed Trust Passport Lane Ownership

| Passport Lane | Owns | Reads From | Links Out To | Boundary |
| --- | --- | --- | --- | --- |
| Identity Overview | GSN ID, display name, photo/status, community context, identity evidence state. | `me`, TrustSlip identity context, community/member evidence. | Identity & Integrity, public member credential where safe. | Identity is not trust. |
| Current Trust Standing | Current band, score, evidence depth, simple interpretation. | Trust score/explanation, TrustSlip summary, Trust Passport VM. | CCI Reading, Trust Timeline. | Score/class is not approval. |
| Evidence Story | Why trust moved, helpful evidence, pressure signals. | Trust Events, trust why/explainability, timeline. | Trust Timeline, evidence pack. | Event count is not proof by itself. |
| Community Confirmation | Community record, membership/currentness, witness strength, live confirmation readiness. | TrustSlip community context, confirmation policy, public community/member records. | Community record, member credential, confirmation policy. | Membership/witness evidence is scoped. |
| Finance Discipline | Trust-limit signal, repayment/support/guarantee evidence, exposure context. | Finance/loan/support records and Trust Events. | Finance, Loans, Guarantor Inbox. | Not a bank, lender, guarantee, or approved limit. |
| Documents / TrustSlip | TrustSlip status, code, verify path, export/copy actions. | TrustSlip summary and public verify path. | TrustSlip, public verify. | TrustSlip is portable current evidence, not full Passport. |
| Repair or Next Step | What evidence is missing or what action is cleanest next. | Identity signals, trust reasons, notifications/action inbox. | Identity & Integrity, Notifications. | Do not route users to pages that cannot complete the task. |

## Consolidation Rules

1. Keep `/app/trust` as the Trust Passport route unless the owner explicitly
   approves a route migration.
2. Keep `/app/my-gmfn-and-i` as identity/capability guidance, not the Passport.
3. Keep `/app/identity` as identity repair, not trust scoring.
4. Keep `/app/trust-timeline` as evidence trail, not the first Passport screen.
5. Keep `/app/trust-slip` as the outward portable document, not private history.
6. Keep `/app/cci-reading` as consistency signal, not moral score or Passport.
7. Any future visual redesign should open one Passport lane at a time.
8. Public receivers should get TrustSlip, member credential, community record,
   or confirmation outcome, not the private Trust Passport.

## Redesign Acceptance Checklist

Before any Trust Passport UI rewrite is called complete:

- The first phone viewport shows the current trust standing and next best
  action without forcing the user through a long document.
- Only one major Passport lane is open at a time.
- TrustSlip and Trust Passport are visually and verbally distinct.
- Identity, membership, verification, endorsement, and trust remain separate.
- Finance amounts are labelled as signals, not approvals.
- Public links never expose private Passport history.
- Missing evidence says what is missing, why it matters, and the first action.
- The route still links cleanly to Identity & Integrity, Trust Timeline,
  TrustSlip, CCI Reading, Community record, Finance, and Action Inbox.
- Dashboard, Community Home, Marketplace, and Shop Control only summarize or
  launch Passport work; they do not absorb the full Passport.
- Protected button and tap stability audits are updated only if route/action
  inventories intentionally change.

## Devil's Advocate Findings

1. `/app/trust` is already the Trust Passport home in practice. Renaming or
   moving it casually would create more confusion than it solves.
2. The Passport family is close to conceptually correct but still too easy to
   read as many separate products: Trust Score, My GSN Identity, Trust Timeline,
   Identity & Integrity, CCI, and TrustSlip.
3. The strongest next move is not another feature. It is a disciplined visual
   and language consolidation around lane ownership.
4. The public boundary must stay strict. If a stranger needs evidence, they get
   TrustSlip, community record, member credential, confirmation outcome, or
   merchant release paper, not the private Passport.
5. The universal evidence-dimension ontology should not be displayed as live
   Passport structure until it has real data/model support.

## Recommended Next Local Step

Create `docs/GSN_EVIDENCE_DISPLAY_CONTRACT_DRAFT.md`.

That document should define shared evidence fields, maturity labels, public vs
private visibility, decision-reading language, and Trust Event/TrustSlip/
Trust Passport display boundaries before any Passport screen redesign begins.
