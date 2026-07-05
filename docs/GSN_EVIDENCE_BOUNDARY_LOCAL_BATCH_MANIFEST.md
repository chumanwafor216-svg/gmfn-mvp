# GSN Evidence Boundary Local Batch Manifest

Date: 2026-07-05
Status: Local batch manifest, not published

## Purpose

This manifest records the local evidence-boundary tooling batch that is waiting
for a future publish decision. It separates in-scope files from unrelated
untracked workspace folders and keeps the verification commands in one place.

It is a local handoff aid. It is not a commit, push, deployment, or production
verification record.

## In-Scope Local Files

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

These untracked workspace paths were present during local work and are not part
of this evidence-boundary batch:

- `docs/external_review/`
- `frontend/screenshots/`
- `screenshots/`

Do not stage them for this batch unless the owner explicitly changes scope.

## Registered Commands

Primary broad local verifier:

```powershell
npm --prefix frontend run verify:evidence-boundary-local-all
```

Future publish-readiness preflight:

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

`print:evidence-local-batch-stage-plan` prints a read-only future stage plan for
the owner-choice-`2` path. `audit:evidence-local-batch-stage-plan` checks that
the printable plan stays aligned with this manifest, the status-scope audit, and
the package/suite registration, and that the plan remains non-mutating.
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
- The future publish scope can be printed without staging, committing, pushing,
  or deploying.

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
- Render deployment;
- legal, bank, government, regulatory, escrow, delivery, payout, or credit
  approval.

## Publish Notes

If the owner later chooses `2`, stage only the in-scope files listed above plus
any intentional follow-up files from the same evidence-boundary batch.

Before publishing, rerun:

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

Do not claim Render deployed unless the GitHub workflow accepted a deploy
hook/API request, Render auto-deploy is confirmed, or Render returned a deploy
id.
