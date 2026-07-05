# GSN Evidence Boundary Local Batch Manifest

Date: 2026-07-05
Status: Published batch record; local verification boundary remains active

## Purpose

This manifest records the evidence-boundary tooling batch that was locally
verified, committed, pushed to `main`, and accepted by the frontend Render
deploy hook. It separates in-scope files from unrelated untracked workspace
folders and keeps the verification commands in one place.

It is a scope and truth-boundary record. It proves the listed local checks and
publish/deploy-request facts only; it is not proof of Render deployment
completion, live API behavior, production payload shape, build health, or visual
QA.

## Publish Record

- Commit: `044ddf4bf48c7e7065942aa1d7657a06a75b7bfb`
  (`044ddf4b`), `Add evidence boundary publish readiness tooling`.
- Branch pushed: `main` to `origin/main`.
- GitHub Actions workflow:
  `https://github.com/chumanwafor216-svg/gmfn-mvp/actions/runs/28752245335`.
- Frontend Render deploy hook response included deploy id:
  `dep-d95b0tnaqgkc73etv5s0`.
- Backend/API deploy was skipped with `deploy_api=false`.
- Pre-publish verifier:
  `npm --prefix frontend run verify:evidence-publish-readiness-local` passed.
- No independent Render completion check, production build, live API fixture
  run, or visual QA was performed during that publish step.

## In-Scope Batch Files

Documentation:

- `docs/GSN_EVIDENCE_LIVE_VERIFICATION_GAP_LOG.md`
- `docs/GSN_EVIDENCE_LIVE_FIXTURE_RUNBOOK.md`
- `docs/GSN_EVIDENCE_BOUNDARY_LOCAL_BATCH_MANIFEST.md`
- `docs/HANDOFF_NOTES.md`

Frontend package and suite registration:

- `frontend/package.json`
- `frontend/tools/audit-evidence-display-boundary-suite.mjs`

Frontend evidence-boundary batch tools:

- `frontend/tools/smoke-evidence-display-boundary-batch.mjs`
- `frontend/tools/verify-evidence-display-boundary-local.mjs`
- `frontend/tools/audit-evidence-live-verification-gap-log.mjs`
- `frontend/tools/audit-live-evidence-boundaries.mjs`
- `frontend/tools/audit-live-evidence-boundary-refusals.mjs`
- `frontend/tools/audit-evidence-live-fixture-runbook.mjs`
- `frontend/tools/verify-evidence-live-readiness-local.mjs`
- `frontend/tools/verify-evidence-boundary-local-all.mjs`
- `frontend/tools/verify-evidence-publish-readiness-local.mjs`
- `frontend/tools/audit-evidence-publish-readiness-nonmutating.mjs`
- `frontend/tools/audit-evidence-local-batch-status-scope.mjs`
- `frontend/tools/print-evidence-local-batch-stage-plan.mjs`
- `frontend/tools/audit-evidence-local-batch-stage-plan.mjs`
- `frontend/tools/evidence-local-batch-scope.mjs`
- `frontend/tools/audit-evidence-boundary-local-batch-manifest.mjs`

## Out-of-Scope Workspace Items

These workspace paths were present during local work and are not part of this
evidence-boundary batch:

- `docs/external_review/`
- `frontend/screenshots/`
- `screenshots/`

Separate local PWA shortcut icon batch, also out of scope for this
evidence-boundary batch:

- `docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md`
- `docs/SCREEN_SPECS.md`
- `frontend/index.html`
- `frontend/public/manifest.json`
- `frontend/public/manifest.webmanifest`
- `frontend/public/sw.js`
- `frontend/src/components/GsnInstallPrompt.tsx`
- `frontend/tools/audit-icon-protocol.mjs`
- `frontend/tools/pwa-icon-local-batch-scope.mjs`
- `frontend/tools/print-pwa-icon-local-batch-stage-plan.mjs`
- `frontend/tools/audit-pwa-icon-local-batch-stage-plan.mjs`
- `frontend/tools/audit-pwa-icon-local-batch-status-scope.mjs`
- `frontend/tools/verify-pwa-icon-publish-readiness-local.mjs`
- `frontend/tools/audit-pwa-icon-publish-readiness-nonmutating.mjs`
- `frontend/public/gsn-app-icon-ios-180-v14.png`
- `frontend/public/gsn-app-icon-192-v14.png`
- `frontend/public/gsn-app-icon-512-v14.png`

Combined local publish-planning guard tools, also out of scope for this
evidence-boundary batch:

- `frontend/tools/combined-local-batch-scope.mjs`
- `frontend/tools/print-combined-local-batch-stage-plan.mjs`
- `frontend/tools/audit-combined-local-batch-status-scope.mjs`
- `frontend/tools/audit-combined-local-batch-stage-plan.mjs`
- `frontend/tools/verify-combined-local-batch-readiness.mjs`
- `frontend/tools/audit-combined-local-batch-readiness-nonmutating.mjs`
- `docs/GSN_COMBINED_LOCAL_BATCH_MANIFEST.md`
- `frontend/tools/audit-combined-local-batch-manifest.mjs`

Do not stage them for an evidence-only batch unless the owner explicitly
changes scope or approves a combined publish batch.

## Registered Commands

Primary broad local verifier:

```powershell
npm --prefix frontend run verify:evidence-boundary-local-all
```

Republish-readiness preflight:

```powershell
npm --prefix frontend run verify:evidence-publish-readiness-local
```

Component local verifiers:

```powershell
npm --prefix frontend run verify:evidence-display-boundary-local
npm --prefix frontend run verify:evidence-live-readiness-local
```

Fast source/discoverability audits:

```powershell
npm --prefix frontend run print:evidence-local-batch-stage-plan
npm --prefix frontend run audit:evidence-display-boundary-suite
npm --prefix frontend run audit:evidence-live-verification-gap-log
npm --prefix frontend run audit:evidence-live-fixture-runbook
npm --prefix frontend run audit:evidence-boundary-local-batch-manifest
npm --prefix frontend run audit:evidence-publish-readiness-nonmutating
npm --prefix frontend run audit:evidence-local-batch-status-scope
npm --prefix frontend run audit:evidence-local-batch-stage-plan
```

Live harness local safety checks:

```powershell
npm --prefix frontend run audit:live-evidence-boundaries -- --dry-run
npm --prefix frontend run audit:live-evidence-boundary-refusals
```

The broad verifier and refusal audit may need escalation on this Windows
sandbox because mocked browser smokes and nested child Node processes can hit
`spawn EPERM`.

`verify:evidence-publish-readiness-local` runs the manifest audit, the evidence
display boundary suite, the stage-plan audit, the status-scope audit, the
all-local evidence verifier, and `git diff --check`. It does not stage files,
commit, push, trigger GitHub Actions, or deploy.

`audit:evidence-publish-readiness-nonmutating` source-checks that the
publish-readiness verifier stays read-only and does not grow hidden staging,
commit, push, GitHub Actions, Render hook, deploy, publish, or file-mutating
behavior.

`audit:evidence-local-batch-status-scope` reads `git status --short` and checks
that changed files are either in this manifest or under the explicitly
out-of-scope workspace paths. It does not stage, commit, push, or deploy.

`print:evidence-local-batch-stage-plan` prints a read-only future republish or
follow-up scope plan. `audit:evidence-local-batch-stage-plan` checks that the
printable plan stays aligned with this manifest, the status-scope audit, and the
package/suite registration, and that the plan remains non-mutating.
`frontend/tools/evidence-local-batch-scope.mjs` is the shared local source for
the in-scope file list and explicitly out-of-scope workspace prefixes consumed
by the stage-plan and status-scope tools.

## What This Batch Proves Locally

- Static evidence-boundary source audits are grouped and discoverable.
- Mocked browser route-state smokes are grouped and runnable.
- The local display-boundary verifier runs the static batch and mocked browser
  smoke batch.
- The live-verification gap log separates local proof from live production
  proof.
- The live harness is opt-in and refuses unconfigured proof claims.
- The live fixture runbook stays template-only and no-secret.
- The all-local verifier chains display-boundary and live-readiness local
  checks.
- The future republish or follow-up scope can be printed without staging,
  committing, pushing, or deploying.

## What This Batch Does Not Prove

This batch does not prove:

- live backend authorization;
- production payload shape;
- real public TrustSlip code behavior;
- real public community or confirmation payload behavior;
- signed-in production Trust Timeline authorization;
- PDF or ZIP redaction against live data;
- full mobile or desktop visual quality;
- production build health;
- Render deployment completion or live availability;
- legal, bank, government, regulatory, escrow, delivery, payout, or credit
  approval.

## Publish Notes

For any future republish or follow-up batch, stage only the in-scope files
listed above plus any intentional follow-up files from the same
evidence-boundary batch.

Before republishing or follow-up publishing, rerun:

```powershell
npm --prefix frontend run print:evidence-local-batch-stage-plan
npm --prefix frontend run audit:evidence-boundary-local-batch-manifest
npm --prefix frontend run audit:evidence-local-batch-stage-plan
npm --prefix frontend run audit:evidence-publish-readiness-nonmutating
npm --prefix frontend run audit:evidence-local-batch-status-scope
npm --prefix frontend run audit:evidence-display-boundary-suite
npm --prefix frontend run verify:evidence-publish-readiness-local
npm --prefix frontend run verify:evidence-boundary-local-all
git diff --check
```

Do not claim Render accepted a deploy request unless the GitHub workflow,
Render auto-deploy, or Render API/hook response proves it. Do not claim the new
site is live unless Render completion or live app behavior is independently
verified.
