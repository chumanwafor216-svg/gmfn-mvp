# GSN TrustSlip Ship Readiness Manifest

Date: 15 May 2026
Status: Cleanup and commit/deploy separation note
Scope: TrustSlip evidence, personal commitments, workshop demo readiness, Render deployment preparation

---

## 1. Direct Verdict

The TrustSlip evidence package is now coherent enough to prepare for a focused commit, but the working tree still contains older or adjacent changes that should not be blindly shipped together.

The next safe move is to commit a single TrustSlip/workshop package, then separately review the reset/login/merchant-route changes before deciding whether they belong in the same deploy.

Devil's advocate:

- The TrustSlip work is valuable and tested.
- The working tree is not clean.
- A Render deploy from the full dirty tree could ship unrelated behavior changes.
- We should not let workshop urgency turn into accidental deployment.

---

## 2. Include In TrustSlip / Workshop Evidence Package

These files belong together because they support the portable-trust evidence path:

- `frontend/src/lib/api.ts`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `gmfn_backend/app/api/routes/trust_events.py`
- `gmfn_backend/app/api/routes/trust_slips.py`
- `gmfn_backend/app/services/trust_slips_services.py`
- `gmfn_backend/tests/test_focus_commitment_trust_events.py`
- `gmfn_backend/app/db/seed_workshop_demo.py`
- `docs/GSN_RGU_Customer_Discovery_Working_Plan.md`
- `docs/GSN_TRUSTSLIP_ROSCA_RESEARCH_AUDIT_2026-05-15.md`
- `docs/GSN_TRUSTSLIP_SCREEN_GAP_AUDIT_2026-05-15.md`
- `docs/GSN_RGU_APP_PROOF_PATH_AUDIT.md`
- `docs/GSN_RGU_PHONE_PROOF_PATH_CHECKLIST.md`
- `docs/HANDOFF_NOTES.md`

Reason:

- Dashboard focus commitments now write neutral backend Trust Events.
- TrustSlip now reads personal commitment discipline, contribution discipline, repayment discipline, risk context, and plain-language explanations.
- Public TrustSlip verification now answers the four decision questions.
- The workshop plan and audit docs explain why this matters and how to test it.
- The demo seed now gives Amara both personal commitment evidence and expected-payment contribution/repayment evidence.

---

## 3. Review Before Including

These files are adjacent but should be reviewed separately before being bundled:

- `frontend/src/App.tsx`
- `frontend/src/main.tsx`

Reason:

- These implement/reset broader browser-session behavior such as `/reset` and `?reset=1`.
- They are useful for demo recovery, especially on phones, but they are not part of TrustSlip evidence itself.
- They touch global app startup and routing behavior, so they deserve separate review.

---

## 4. Probably Separate Commit

These files look like separate entry-flow or merchant-verification routing work:

- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/lib/merchantChannel.ts`
- `gmfn_backend/app/api/router.py`
- `gmfn_backend/app/api/routes/merchant_verify.py`
- `gmfn_backend/app/services/merchant_verify_service.py`

Reason:

- Login copy/action arrangement is not TrustSlip evidence.
- Merchant verification route mounting and path changes are related to TrustSlip but are operational routing changes.
- These may be needed for the full demo, but should be checked as their own small package to avoid hiding route regressions inside the TrustSlip evidence commit.

---

## 5. Generated Or Optional

- `docs/GSN_RGU_Customer_Discovery_Working_Plan.pdf`

Reason:

- The PDF is useful for sharing, but it is generated output.
- Include only if the current PDF was regenerated from the latest Markdown and is intentionally part of the deliverable.

---

## 6. Verification Already Run

TrustSlip and commitment evidence checks:

- `npm exec -- eslint src\pages\DashboardPage.tsx src\pages\TrustSlipVerifyPage.tsx src\pages\TrustSlipPage.tsx src\lib\api.ts`
- `python -m compileall -q gmfn_backend\app\api\routes\trust_events.py gmfn_backend\app\api\routes\trust_slips.py gmfn_backend\app\services\trust_slips_services.py`
- `python -m pytest -q gmfn_backend\tests\test_focus_commitment_trust_events.py --basetemp .pytest-tmp`
- `npm run build` passed after the known sandbox Vite/esbuild `spawn EPERM` and approved escalation.

Seed-specific checks:

- `python -m compileall -q gmfn_backend\app\db\seed_workshop_demo.py gmfn_backend\app\api\routes\trust_events.py gmfn_backend\app\services\trust_slips_services.py`
- `python -m pytest -q gmfn_backend\tests\test_focus_commitment_trust_events.py --basetemp .pytest-tmp`

Public demo payload check:

- Refreshed the Amara seed after the TrustSlip commitment evidence change.
- `GET /trust-slips/verify/GSNAMARA2026` returned `200`.
- The public payload returned:
  - holder `Amara Okafor`
  - `3` expected-payment records
  - `3` confirmed expected-payment records
  - `4` personal commitment Trust Events
  - `1` completed personal commitment
  - human-language follow-through guidance for the reader
- Important distinction preserved:
  - Expected payments are payment evidence.
  - Dashboard focus commitments are personal discipline evidence recorded as Trust Events.
  - The TrustSlip must not blur those two into one fake certainty signal.

---

## 7. What Still Needs A Manual Demo Check

Before committing or deploying, run the local evidence path with Amara:

1. Seed the workshop demo.
2. Sign in as `amara.demo@gsnworkshop.co.uk`.
3. Confirm `/app/dashboard` shows the member identity and lets a commitment action be created or checked in.
4. Confirm `/app/trust-slip` shows:
   - personal commitment discipline
   - contribution discipline
   - repayment discipline
   - risk/caution context
   - plain human reading
5. Open the public TrustSlip page for `GSNAMARA2026`.
6. Confirm the public reader can answer:
   - Can this person be trusted for support, finance, contribution, or trade?
   - Do they follow through?
   - Are they stable inside a real community?
   - Is there verified history behind the claim?

---

## 8. Remaining Truth

Personal commitments are now backend Trust Events, but they are still member-recorded discipline evidence. They should support the TrustSlip follow-through story, not automatically act like verified payment evidence.

Expected payments remain the stronger evidence for contribution and repayment discipline.

Trust Events, Trust Graph, CCI, and Trust Passport remain the deeper evidence layer behind the public TrustSlip summary.

After the independent auditor pass:

- Public visibility is now clamped so `?level=detailed` cannot expand beyond the stored holder-permitted visibility.
- Public TrustSlip Verify no longer borrows signed-in viewer identity/community as fallback on public routes.
- Merchant/reader wording has been tightened from reliance/approval language to evidence/input language.
- The public page now admits the remaining ROSCA gaps:
  - sponsor quality is not shown on the public view
  - on-time rate and cycle position are not shown yet
  - post-benefit contribution after support is not shown in this public view
- The remaining technical risk is snapshot freshness. A future hardening pass should either refresh snapshots when commitment/payment evidence changes or show a clear “snapshot issued at / newer evidence may exist” warning.
