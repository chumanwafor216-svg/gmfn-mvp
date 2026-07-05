# GSN Evidence Display Implementation Map Draft

Status: Draft implementation-control map
Date: 2026-07-05
Depends on:

- `docs/GSN_EVIDENCE_DISPLAY_CONTRACT_DRAFT.md`
- `docs/GSN_TRUST_PASSPORT_PURPOSE_AUDIT.md`
- `docs/TRUST_DOCUMENT_LANGUAGE_PROTOCOL.md`
- `docs/APP_WIDE_AUDIT_PROTOCOL.md`
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`

## Purpose

This map records where evidence-display meaning currently lives in code before
any Trust Passport, TrustSlip, public verification, marketplace, finance, or
Community Domain redesign work continues.

It is intentionally a map, not a completion claim. A route appearing here means
it has an evidence-display role and an inspected source anchor. It does not mean
the route already satisfies the evidence display contract.

## Current Highest-Risk Truth

GSN already has strong evidence-boundary language, but it is fragmented across
route-local pages, route-local view models, shared trust-document components,
backend route serializers, and backend service summaries.

The next engineering risk is not "there is no evidence system." The next risk
is drift:

- public TrustSlip Verify may define "current" differently from TrustSlip;
- Community Verify may define "verified" differently from Community Domain;
- Trust Passport may expose a richer story than TrustSlip should carry;
- marketplace/shop evidence may look like TrustSlip proof without a current
  TrustSlip code;
- finance/loan readiness may look like approval instead of decision support;
- Community Domain readiness may look like issued evidence instead of setup
  readiness.

## Shared Frontend Evidence Primitives

| File | Current Role | Contract Risk |
| --- | --- | --- |
| `frontend/src/components/TrustDocumentLanguage.tsx` | Shared trust-document panels, confidence ribbon, boundary panel, disclosure, fingerprint, and security note primitives. | Good anchor. Future work should reuse this before adding route-local document patterns. |
| `frontend/src/components/TrustPaperMarks.tsx` | GSN paper marks, watermark, security footer, and visual document cues. | Visual confidence must stay tied to truthful source states. |
| `frontend/src/components/TrustSlipReaderBlock.tsx` | Reader-facing TrustSlip decision questions, CCI, trust limit, and evidence interpretation. | Must remain decision support, not automatic approval. |
| `frontend/src/lib/trustDocumentSnapshots.ts` | Share/copy snapshot text for Identity/Integrity, CCI, TrustSlip, Verify, and Trust Passport. | Important shared language, but snapshots are not canonical source records. |
| `frontend/src/lib/trustPassportViewModel.ts` | Builds the signed-in Trust Passport view model from trust, identity, community, finance, and TrustSlip inputs. | Central for `/app/trust`; should not become public TrustSlip truth. |
| `frontend/src/lib/trustBandLanguage.ts` | Shared trust-band and evidence-status wording. | Needs to remain "signal only", not moral scoring. |
| `frontend/src/lib/identityEvidenceCompletion.ts` | Shared identity evidence completion signal. | Identity evidence must not be treated as full trust. |
| `frontend/src/lib/api.ts` | Shared frontend API calls for TrustSlip, public verification, community confirmation, Community Domain evidence/readiness, member verification, and review evidence. | Endpoint wrappers exist, but not all returned records satisfy the display contract fields. |

## Route And Source Map

| Surface | Frontend Route(s) | Frontend Source | Backend Source(s) | Evidence Role | Current Risk |
| --- | --- | --- | --- | --- | --- |
| Trust Passport | `/app/trust`, redirects from `/trust`, `/trust-passport`, `/open-trust` | `frontend/src/pages/TrustScorePage.tsx`, `frontend/src/lib/trustPassportViewModel.ts`, `frontend/src/lib/trustDocumentSnapshots.ts` | `GET /trust-slips/me/summary`, `/trust-slips/me`, `/clans/me`, trust explainability endpoints, Trust Event summaries | Fuller signed-in trust story: standing, evidence, community, finance, documents, repair. | It is already the practical Passport home, but the source mix is route-local and fallback-heavy. Do not redesign before mapping exact fields. |
| TrustSlip holder page | `/app/trust-slip`, redirects from `/trust-slip`, `/trustslip`, `/merchant-verify`, `/verify-merchant` | `frontend/src/pages/TrustSlipPage.tsx`, `frontend/src/components/TrustSlipReaderBlock.tsx` | `gmfn_backend/app/api/routes/trust_slips.py`: `/trust-slips/me`, `/trust-slips/me/summary`, `/trust-slips/me/reissue` | Portable current evidence controlled by holder. | Must not show full private Passport or imply bank/escrow/release authority. |
| Public TrustSlip Verify | `/t/:code`, `/t/:code/lite`, `/verify/trust-slip`, `/verify/trustslip`, `/trust-slips/verify/:code`, `/trust-slips/verify/:code/page`, `/trust-slips/verify/:code/lite`, `/trust-slips/verify/:code/print` | `frontend/src/pages/TrustSlipVerifyPage.tsx`, `frontend/src/pages/trustSlipVerify/trustSlipVerifyData.ts`, `frontend/src/pages/trustSlipVerify/trustSlipVerifyViewModel.ts`, `frontend/src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx`, `frontend/src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx`, `frontend/src/pages/trustSlipVerify/TrustSlipVerifyBoundary.tsx` | `gmfn_backend/app/api/routes/trust_slips.py`: `/trust-slips/verify/{code}`, `/share-text`, `/lite`, `/qr.png`, `/page`, `/print`, `/{code}/share`, `/{code}/release` | Public-safe current TrustSlip validity, visibility-filtered evidence, community context, QR, share text, and optional release/decision record. | Highest public-risk surface. It already has visibility filtering and public/private components, but any future additions must prove public fields are released. |
| Trust Timeline | `/app/trust-timeline`, redirect from `/trust-timeline` | `frontend/src/pages/TrustTimelinePage.tsx` | `gmfn_backend/app/api/routes/trust_timeline.py`: `/trust/me/timeline`; `gmfn_backend/app/api/routes/trust_evidence_pack.py`: `/trust/me/evidence-pack/meta`, `/trust/me/evidence-pack.zip`; `gmfn_backend/app/api/routes/trust_timeline_pdf.py`: `/trust/me/timeline.pdf` | Signed-in event trail and redacted evidence pack tools. | Must stay signed-in/private and not become public proof or release authority. |
| CCI reading | `/app/cci-reading`, redirects from `/cci` | `frontend/src/pages/CCIReadingPage.tsx`, `frontend/src/lib/trustDocumentSnapshots.ts`, `frontend/src/lib/trustDocumentGuide.ts` | `gmfn_backend/app/api/routes/cci.py`: `/trust-events/score`, `/trust-events/score/users/{user_id}` plus trust/TrustSlip data | Cross-community consistency signal. | Must not become moral score, full Trust Passport, or universal reliability claim. |
| Identity and Integrity | `/app/identity` | `frontend/src/pages/IdentityIntegrityPage.tsx`, `frontend/src/lib/identityEvidenceCompletion.ts`, identity-risk API helpers | Auth/me, identity risk, identity evidence review endpoints, admin evidence endpoints | Identity continuity, repair, and evidence readiness. | Identity evidence supports trust; it is not trust itself. |
| Community Verify | `/verify/community/:communityKey` | `frontend/src/pages/CommunityVerifyPage.tsx` | `gmfn_backend/app/api/routes/community_confirmations.py`: `/verify/community/{community_key}`, `/verify/community/{community_key}/confirmation-request` | Public community record, Community ID, currentness, relay, public-safe next evidence. | Good public document anchor, but it confirms community record only; not members, shops, parent community, or every community claim. |
| Community Member Credential | `/verify/community/:communityKey/member/:memberKey` | `frontend/src/pages/CommunityMemberVerifyPage.tsx` | `gmfn_backend/app/api/routes/community_confirmations.py`: `/verify/community/{community_key}/member/{member_key}` | Public-safe community-member relationship, witness/currentness, role, community record link. | Must not become legal identity, professional licence, employment proof, or private member record. |
| Community Confirmation Outcome | `/community-confirmations/public/:token` | `frontend/src/pages/CommunityConfirmationOutcomePage.tsx` | `gmfn_backend/app/api/routes/community_confirmations.py`: `/community-confirmations/public/{public_token}`, decision/status/review-evidence endpoints for signed-in actions | Scoped public confirmation outcome, response counts, public result, private contacts protected, signed-in decision/review layer. | Public outcome and signed-in admin/review actions share one page; future work must keep public/private boundaries visually and logically clear. |
| Community Confirmation Inbox/Policy | `/app/community-confirmations`, `/app/community-confirmations/policy`, related redirects | `frontend/src/pages/CommunityConfirmationInboxPage.tsx`, `frontend/src/pages/CommunityConfirmationPolicyPage.tsx` | `gmfn_backend/app/api/routes/community_confirmations.py`: inbox, contact settings, policy, responses, review cases | Operational setup for confirmation contacts and response governance. | Important source for public confirmation readiness, but not itself public proof. |
| Marketplace | `/app/marketplace`, `/app/marketplace/community/:clanId`, redirects from marketplace aliases | `frontend/src/pages/MarketplacePage.tsx`, `frontend/src/pages/MarketplaceWorkspacePage.tsx`, marketplace helpers | `gmfn_backend/app/api/routes/marketplace.py`, marketplace service/routes, Trust Event logging on product/broadcast/repost actions | Activity context that can produce or support evidence. | Marketplace activity must not look like TrustSlip proof unless attached to a current TrustSlip or released evidence source. |
| Public Shop / Shop Gallery | `/shop/:gmfnId`, `/app/shop` and shop gallery routes | `frontend/src/pages/ShopGalleryPage.tsx`, `frontend/src/pages/ShopPage.tsx` | `gmfn_backend/app/api/routes/marketplace.py`, shop/public product endpoints, public shop identity helpers | Public-facing commerce context, shop identity, products, Spotlight/public activity. | Shop QR or activity is not TrustSlip verification unless a live TrustSlip code/source is attached. |
| Finance / Support Readiness | `/app/loan-readiness`, loan/support routes | `frontend/src/pages/LoanReadinessPage.tsx`, loan components, `frontend/src/lib/gsnSnapshotPaper.ts` | `gmfn_backend/app/api/routes/loan_readiness.py`, loan routes/services, guarantor and summary endpoints | Decision-support readiness, support pressure, repayment/contribution discipline snapshots. | Must not read as loan approval, bank approval, guarantee, auto-debit, payment movement, or goods release authority. |
| Loan Decision Intelligence | loan decision routes/panels | `frontend/src/pages/LoanDecisionPage.tsx`, `frontend/src/components/LoanDecisionPanel.tsx` | `gmfn_backend/app/api/routes/loan_decision.py`: `/loans/{loan_id}/decision-intelligence` | Structured support/loan decision intelligence. | Decision intelligence must stay explanation/support, not automatic approval. |
| Community Domain Evidence Readiness | `/app/community-domain`, `/app/community-domain/:communityDomainId`, dashboard aliases | `frontend/src/pages/CommunityDomainDashboardPage.tsx`, `frontend/src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx` | `gmfn_backend/app/api/routes/community_domains.py`: `/evidence-map`, `/evidence-record-readiness`, `/evidence-release-readiness`, `/trust-relay-readiness`, `/member-verification-map`, `/verification-requirements`, `/node-evidence-authority-map` | Institutional setup/readiness for evidence authority, release readiness, relay readiness, trust mobility, member verification, governance. | Current surfaces mostly show readiness/configuration. They must not look like issued public credentials or live proof until a release path proves that. |
| Admin Trust Events | admin trust routes | `frontend/src/pages/AdminTrustEventsPage.tsx`, `frontend/src/pages/TrustCommandCentrePage.tsx`, `frontend/src/pages/AdminTrustGraphPage.tsx` | `gmfn_backend/app/api/routes/trust_events.py`, `admin_trust_manual.py`, `trust_why.py`, Trust Event services | Admin-visible append-only trust-event evidence and diagnostics. | Admin evidence should not leak into public documents or become user-facing moral labels. |

## Endpoint Families To Preserve

### TrustSlip

- Signed-in holder summary: `/trust-slips/me`, `/trust-slips/me/summary`.
- Reissue/refresh: `/trust-slips/me/reissue`.
- Public verification JSON: `/trust-slips/verify/{code}`.
- Public pages/assets: `/trust-slips/verify/{code}/page`, `/lite`, `/print`,
  `/qr.png`.
- Share bundle/text: `/trust-slips/{code}/share`,
  `/trust-slips/verify/{code}/share-text`.
- Merchant/release evidence: `/trust-slips/{code}/release`,
  `/trust-slips/{code}/release/page`.

### Community Verification And Confirmation

- Public community record: `/verify/community/{community_key}`.
- Public community member credential:
  `/verify/community/{community_key}/member/{member_key}`.
- Public community confirmation request:
  `/verify/community/{community_key}/confirmation-request`.
- Public confirmation outcome:
  `/community-confirmations/public/{public_token}`.
- Signed-in confirmation operations:
  `/community-confirmations/request`, `/community-confirmations/inbox`,
  `/community-confirmations/{request_id}/respond`,
  `/community-confirmations/{request_id}/decision`,
  `/community-confirmations/{request_id}/status`,
  `/community-confirmations/review-cases/{review_case_id}/evidence`.

### Trust Timeline And Evidence Pack

- Timeline JSON: `/trust/me/timeline`.
- Evidence pack metadata: `/trust/me/evidence-pack/meta`.
- Evidence pack ZIP: `/trust/me/evidence-pack.zip`.
- Timeline PDF: `/trust/me/timeline.pdf`.

### Community Domain Evidence/Readiness

- `/community-domains/{id}/evidence-map`
- `/community-domains/{id}/evidence-record-readiness`
- `/community-domains/{id}/evidence-release-readiness`
- `/community-domains/{id}/trust-relay-readiness`
- `/community-domains/{id}/member-verification-map`
- `/community-domains/{id}/verification-requirements`
- `/community-domains/{id}/node-evidence-authority-map`
- `/community-domains/{id}/trust-mobility`
- `/community-domains/{id}/record-privacy-map`

These are readiness/configuration/reporting endpoints unless a specific release
or public proof route says otherwise.

## Field Mapping Gaps

The contract fields below need explicit source mapping before code changes:

| Contract Field | Current Observation | Needed Before UI Rewrite |
| --- | --- | --- |
| `evidence_kind` | Present implicitly in route names and local text, not uniformly structured. | Define route-local mapping first, then consider shared helper/schema. |
| `source_engine` | Implied by endpoints: TrustSlip, Community Confirmation, Trust Events, Community Domain, Marketplace, Loans. | Add display-level source labels without overclaiming. |
| `verification_state` | Exists in several forms: `status`, `validNow`, `active`, `expired`, `merchant_verify_active`, readiness lanes. | Normalize display language while preserving backend source states. |
| `visibility` | Strongest in TrustSlip through visibility levels and public/private components. | Extend audit to community, marketplace, finance, and Community Domain surfaces. |
| `provenance` | Often implicit: user-submitted, admin-reviewed, community-witnessed, system-derived. | Identify source per route before adding labels. |
| `excluded_claims` | Present in many pages as does-not-confirm copy. | Move repeated language to shared helpers after route mapping. |
| `maturity_label` | Mostly documented, not usually in app data. | Keep in docs/audit first; do not expose to users unless meaningful. |
| `reference_fingerprint` | Frontend deterministic fingerprints exist on public document pages. | Keep calling them record/reference fingerprints unless real cryptographic proof exists. |
| `related_trust_event_id` | Trust Events exist, but many displays summarize rather than attach event IDs. | Do not claim event-backed evidence unless ID/source is actually present. |
| `trustslip_eligible` | Implied by TrustSlip and share/verify flows. | Needs explicit mapping for marketplace, finance, identity, and Community Domain evidence. |

## Suggested Implementation Order

1. Audit public TrustSlip Verify against the contract.
2. Audit Community Verify, Community Member Credential, and Confirmation Outcome
   as the public registry-record family.
3. Audit `/app/trust` and `/app/trust-slip` as the signed-in Passport/portable
   evidence pair.
4. Audit Trust Timeline and evidence pack as signed-in/redacted share evidence.
5. Audit Finance/Loans evidence language so readiness cannot be confused with
   approval.
6. Audit Marketplace/Public Shop so shop/activity context cannot masquerade as
   TrustSlip proof.
7. Audit Community Domain evidence/readiness surfaces and keep readiness
   separate from released evidence.
8. Only then decide which language belongs in shared helpers, route-local view
   models, or backend schemas.

## Immediate Code-Caution Notes

- Do not touch `frontend/src/pages/DashboardPage.tsx`; Dashboard Market Wisdom
  and button/action geometry are frozen areas.
- Do not change auth, permissions, schema, migrations, deployment workflows, or
  `.github/workflows/render-deploy.yml` for evidence-display work.
- Do not consolidate Trust Passport and TrustSlip routes. They have different
  visibility and purpose.
- Do not merge create-invite, join-community, community verification, and
  TrustSlip verification just because they all produce links.
- Do not expose admin evidence, private contacts, private Trust Passport notes,
  private financial details, or raw community review material on public routes.

## Acceptance Criteria For The Next Real Implementation Pass

Before changing UI code on any route in this map:

- name the exact route;
- name the user type;
- name the backend source;
- name frontend-derived fallback values;
- list what the surface confirms;
- list what the surface does not confirm;
- classify visibility;
- classify record state;
- identify placeholders that must not trigger readiness;
- run the route-local audit/build available for that route;
- update this map and `docs/HANDOFF_NOTES.md`.

## Devil's Advocate

The product is close enough to a believable evidence system that the danger is
subtle overclaiming, not obvious emptiness.

A page can look official because it has a seal, QR, fingerprint, and calm
language. If the data behind it is only a fallback, a readiness check, a
frontend-derived summary, or a route-local interpretation, the official styling
can become misleading. The next implementation pass should therefore harden the
source labels and public/private boundaries before polishing visuals.

