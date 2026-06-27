# GSN TrustSlip Screen Gap Audit

Date: 15 May 2026
Status: Product, fintech/risk, and community-finance audit note
Scope: `/app/trust-slip`, public TrustSlip verification, backend TrustSlip payload, ROSCA/community evidence requirements

---

## 1. Direct Verdict

The TrustSlip concept is strong, but the current verification surfaces are not yet complete enough for a careful outsider to make a well-informed decision from the public view alone.

The owner TrustSlip page is the strongest current surface. It already shows identity, status, trust limit, CCI, sponsor count, capacity context, exposure, recent release, and last full repayment.

The public React verification page is the weakest current surface. It mainly shows validity, holder/community identity, visible band/score, issue/expiry, and a short note. That is useful for checking that a TrustSlip exists, but it is not enough for a merchant, society officer, risk reviewer, or lender-style evaluator to understand the quality of the evidence behind it.

The backend already carries more TrustSlip evidence than the public React page displays. Some data is nested under `merchant_view`, but the React normalizer mostly looks for flat fields. This means the backend can return useful evidence that the public page does not currently read or show.

Devil's advocate:

- A TrustSlip that shows only a band, score, and expiry can look like a badge.
- A TrustSlip that shows behavior, limits, freshness, sponsor quality, and risk flags becomes a decision aid.
- A TrustSlip that hides negative evidence will not be trusted by serious reviewers.
- A TrustSlip that overclaims becomes dangerous.
- A TrustSlip that exposes the full private story publicly creates privacy risk.

The target is a consented, time-limited, evidence-backed decision snapshot. It must help the viewer decide what to do next, not decide for them.

The TrustSlip should therefore answer four plain questions at speed:

1. What decision can this TrustSlip evidence support?
2. Do they follow through on commitments after receiving support, credit, goods, or community benefit?
3. Are they stable inside a real community, and is their attitude consistent across community settings?
4. Which evidence is confirmed, and which evidence is only recorded or still missing across Trust Events, Trust Graph, Trust Passport, and community evidence?

---

## 2. Evidence Checklist

This audit uses the seven evidence areas from the ROSCA/community-finance research note:

1. Validity: current, expired, revoked, frozen, inactive, checked at, expiry, visibility.
2. Identity: GSN/GMFN ID, holder name, phone verification, community context.
3. Trust reading: trust band, CCI, trust limit, and what the limit does and does not mean.
4. Contribution discipline: expected contributions, completed contributions, missed/late contributions, completed cycles, last contribution.
5. Support and repayment behavior: support received, support repaid, last full repayment, active obligations, last merchant release.
6. Community and sponsor evidence: verified sponsor signals, community standing, active community count, governance/admin verification.
7. Risk and limits: overexposure, disputes, risk flags, correction path, expiry, disclaimer, ask-for-more-evidence guidance.

Research basis is recorded in `docs/GSN_TRUSTSLIP_ROSCA_RESEARCH_AUDIT_2026-05-15.md`.

---

## 3. Current Surface Matrix

| Evidence area | Backend TrustSlip payload | `/app/trust-slip` owner page | Public React verify page | Public backend HTML verify page | Gap |
| --- | --- | --- | --- | --- | --- |
| Validity | Strong: status, active, verified, current flag, issued, expiry, merchant verify active, snapshot version/checksum. | Strong: status, visibility, issue window, merchant verification state. | Basic: status/state, issue/expiry, code. | Good: status, merchant verify, expiry, code. | Public React should show checked-at, current flag, merchant verify state, snapshot version/checksum. |
| Identity | Good: GMFN ID, display name, community, phone verification. | Good: GSN/GMFN ID, community, phone verification. | Weak: normalizer misses `holder_gmfn_id` and nested `merchant_view` fields unless flat aliases exist. | Good: GMFN ID, community, holder display. | Public React should normalize nested `merchant_view.display_name`, `merchant_view.gmfn_id`, `merchant_view.community`, and top-level `holder_gmfn_id`. |
| Trust reading | Good: band, trust limit, currency, CCI score/band, graph score, disclaimer. | Good: band, trust limit, CCI, no-bank-guarantee disclaimer. | Weak: visible score/band only; trust limit and CCI may be absent from React view. | Medium: trust limit, band, optional CCI. | Public React should show trust limit, CCI band/score, and plain warning that limit is not a loan guarantee. |
| Contribution discipline | Weak: no first-class contribution counts in TrustSlip payload. Expected payment data exists elsewhere. | Missing. | Missing. | Missing. | Need derived contribution discipline from expected payments or trust events. This is the largest ROSCA gap. |
| Support and repayment behavior | Medium: last release, last full repayment, days since last full repayment, trust score counts exist in `trust_score_service`. | Medium: last release and last full repayment displayed. | Missing. | Weak to medium: older verify UI can show last full repayment by visibility level, but main React view does not. | Public verification should show last release, last full repayment, days since repayment, and active obligation state where available. |
| Community and sponsor evidence | Medium: active clan count, sponsor count, unique counterparties, sponsors rows in standard/detailed merchant views. | Medium: active clan count, sponsor count, unique counterparties. | Missing. | Basic: community sponsor signals. | Need sponsor quality, not just count. Public view should show sponsor count and whether sponsors are verified/current, without exposing private details. |
| Risk and limits | Medium: risk flags, capacity context, readiness context, overexposure ratio, disclaimer. | Medium: capacity context displayed, but risk flags and readiness context are not prominent. | Weak: only validity note. | Weak: disclaimer but little risk context. | Public view needs risk flags, overexposure/risk level, correction path, and decision guidance. Owner page should surface readiness and risk flags more clearly. |

---

## 4. Current Confirmed Strengths

The current backend and owner page already give GSN a useful TrustSlip skeleton:

- TrustSlip code and public verify link.
- Holder display name and GSN/GMFN ID.
- Community context.
- Phone verification signal.
- Current status, active state, issue time, and expiry.
- Trust limit and currency.
- CCI score and CCI band.
- Trust band.
- Sponsor count.
- Active community/clan count.
- Unique counterparties.
- Capacity context: available guarantee capacity, locked guarantees, overexposure ratio, risk level.
- Last release date.
- Last full repayment date.
- Merchant verification active/inactive state.
- Visibility levels: minimal, standard, detailed.
- Snapshot version and checksum at backend level.
- No bank guarantee and no auto-debit disclaimer.

That is already more credible than a simple trust badge.

---

## 5. Current Critical Gaps

### 5.1 Public React verification is under-reading backend data

The public backend response returns rich nested `merchant_view` evidence, but `TrustSlipVerifyPage.tsx` currently normalizes mostly flat fields such as `holder_name`, `gmfn_id`, `community_name`, `trust_score`, `issued_at`, and `expires_at`.

The backend public response uses fields such as:

- `holder_gmfn_id`
- `trust_limit`
- `merchant_verify_active`
- `snapshot_version`
- `snapshot_checksum`
- nested `merchant_view.display_name`
- nested `merchant_view.gmfn_id`
- nested `merchant_view.community`
- nested `merchant_view.band`
- nested `merchant_view.trust_limit`
- nested `merchant_view.cci_score`
- nested `merchant_view.cci_band`
- nested `merchant_view.sponsor_count`
- nested `merchant_view.last_full_repayment_at`

Risk:

The public page may make the TrustSlip look weaker than the backend actually is.

### 5.2 Contribution discipline is not first-class evidence

ROSCA and contribution-group trust depends heavily on repeated contribution and post-payout follow-through. Current TrustSlip evidence does not clearly show:

- expected contributions
- completed contributions
- on-time contribution rate
- missed contribution count
- late contribution count
- current arrears
- completed cycles
- last contribution date
- whether the member continued contributing after receiving support

Risk:

Without this, TrustSlip can confuse "community membership" with "proven follow-through."

### 5.3 Sponsor quality is weaker than sponsor count

Current TrustSlip can show sponsor count and sponsor rows in some visibility modes. That is useful, but not enough for serious decision-making.

Needed sponsor quality signals:

- sponsor role: founder, admin, member, guarantor, previous counterparty
- sponsor standing: verified, current, or inactive
- relationship type
- sponsor confidence or weight, if explainable
- sponsor overexposure flag

Risk:

Three weak sponsors could look stronger than one highly credible sponsor.

### 5.4 Negative evidence needs to be visible enough

TrustSlip must be willing to show careful negative signals:

- active dispute
- frozen, revoked, or inactive state
- missed or late contribution history
- missed repayment or default flag
- fraud or identity warning if admin-reviewed
- guarantee without repayment confirmation
- overexposure
- stale evidence

Risk:

If TrustSlip only shows positive evidence, serious users will not trust it.

### 5.5 The public view needs decision guidance

The TrustSlip should not say "approve this person." It should say something closer to:

- proceed carefully
- ask for more evidence
- reduce the amount or risk
- verify with the community admin
- do not rely on this TrustSlip while inactive, expired, revoked, or disputed

Risk:

Without guidance, viewers may treat a TrustSlip as a guarantee, credit score, or approval decision.

---

## 6. Recommended Field Changes By Priority

### P0: Surface existing evidence without changing schema

These are the safest first changes because they mostly reuse fields already returned by the backend.

Backend public verify JSON should expose flat aliases for:

- `holder_name`
- `gmfn_id`
- `community_name`
- `trust_band`
- `trust_limit`
- `currency`
- `cci_score`
- `cci_band`
- `sponsor_count`
- `phone_verified`
- `visibility_level`
- `merchant_verify_active`
- `last_release_at`
- `last_full_repayment_at`
- `days_since_last_full_repayment`
- `snapshot_version`
- `snapshot_checksum`
- `verification_note`
- `disclaimer`

Public React verify page should normalize both flat and nested fields from `merchant_view`.

Public React verify page should display:

- TrustSlip validity and expiry.
- Holder and GSN/GMFN ID.
- Community.
- Phone verified.
- Trust band.
- Trust limit.
- CCI score and band.
- Sponsor count.
- Last release and last full repayment.
- Merchant verification active/inactive.
- Snapshot version/checksum.
- Clear disclaimer: not a bank guarantee, not auto-debit, not automatic lending or employment approval.

Owner `/app/trust-slip` should surface already-loaded but underused fields:

- `risk_flags`
- `evidence_summary.readiness_context`
- `capacity_context.reasons`
- sponsor rows where visibility permits
- snapshot version/checksum if present

### P1: Add behavior counts already available from trust scoring

`trust_score_service.py` already computes useful counts:

- full repayments
- guarantor success
- missed payments
- defaults
- fraud flags
- reversed full repayments
- reversed guarantor success
- latest reason
- latest source

TrustSlip should include a small `behavior_counts` or `repayment_behavior` block in `evidence_summary`.

This can strengthen TrustSlip without inventing new business rules.

### P2: Derive contribution discipline from expected payments

The backend already has `ExpectedPayment` rows with:

- `expected_type`
- `amount`
- `paid_amount`
- `remaining_amount`
- `due_at`
- `status`
- `trust_event_id`
- `created_at`

This can support a `contribution_discipline` block:

- expected contribution count
- confirmed contribution count
- partial contribution count
- missed/defaulted/expired contribution count
- outstanding contribution count
- total expected amount
- total paid amount
- remaining amount
- last contribution confirmation date
- on-time rate where due dates and confirmation times are reliable

Caution:

Do not claim "on-time" unless the source data can reliably compare due date to confirmation time. If that is not reliable yet, show "confirmed", "partial", "outstanding", and "expired/defaulted" first.

### P3: Add governance and sponsor-quality evidence

These may need product decisions or new derivations:

- community active member count
- community age
- completed contribution cycles
- contribution rule type
- payout order type
- admin/leader verified standing
- dispute process available
- active disputes count
- sponsor role and standing
- sponsor overexposure signal
- correction or appeal path

These fields are important for credibility, but should be added carefully to avoid fake precision.

---

## 7. What Not To Add

Do not turn TrustSlip into a hidden credit score.

Avoid:

- demographic scoring
- exact public location
- private full Trust Passport data on public verify pages
- employer/lender approval language
- "guaranteed repayment" language
- "automatic lending" language
- "bank verified" language unless the bank evidence is actually verified
- sensitive sponsor details without consent

TrustSlip should communicate evidence and limits, not authority it does not have.

---

## 8. Recommended Implementation Order

1. Fix public verification normalization and display using existing backend fields.
2. Add flat public JSON aliases so React and non-React viewers receive the same core fields.
3. Surface risk flags, readiness context, capacity reasons, and snapshot checksum/version on `/app/trust-slip`.
4. Add a backend `behavior_counts` block from existing trust score breakdown.
5. Add contribution discipline from `ExpectedPayment`, starting with confirmed/partial/outstanding/expired/defaulted counts.
6. Add sponsor-quality and community-governance signals after confirming the source data is trustworthy.
7. Update workshop demo data so Amara's TrustSlip can show both positive and negative evidence in a believable way.

---

## 9. Workshop Testing Questions To Add

Ask participants and auditors:

- Would you make a small trade decision from this TrustSlip?
- Which field made you more confident?
- Which missing field made you cautious?
- Did the TrustSlip show enough negative evidence to be believable?
- Would you ask for the full Trust Passport after seeing this?
- Would you trust sponsor count without sponsor quality?
- Does the trust limit feel like a guarantee, even with the disclaimer?
- What amount or risk level would require more evidence?

---

## 10. Bottom Line

The current TrustSlip is not stopped. It is halfway through becoming real.

The foundation is credible: status, identity, trust limit, CCI, sponsor signals, expiry, capacity, repayment date, and merchant verification are already present in some form.

The public verification experience must now catch up with the backend, and the next serious product gap is contribution discipline. Without contribution discipline, TrustSlip does not yet fully capture what ROSCA-style community trust is built on.
