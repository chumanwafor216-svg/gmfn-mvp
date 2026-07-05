# GSN Combined Local Batch Manifest

Date: 2026-07-05
Status: Local combined publish-readiness record, not published

## Purpose

This manifest records the local combined batch that includes both:

- the evidence-boundary readiness work; and
- the PWA shortcut icon alignment work.

It is a planning and truth-boundary record for a future owner-approved combined
publish. It proves only local source scope and local verification. It does not
stage, commit, push, trigger GitHub Actions, deploy, prove Render state, prove
live-site availability, prove live evidence behavior, or refresh existing
iOS/Android shortcut caches.

## In-Scope Combined Batch Files

The combined batch scope is generated from:

- `frontend/tools/evidence-local-batch-scope.mjs`
- `frontend/tools/pwa-icon-local-batch-scope.mjs`
- `frontend/tools/combined-local-batch-scope.mjs`

Combined guard tools:

- `docs/GSN_COMBINED_LOCAL_BATCH_MANIFEST.md`
- `frontend/tools/combined-local-batch-scope.mjs`
- `frontend/tools/print-combined-local-batch-stage-plan.mjs`
- `frontend/tools/audit-combined-local-batch-status-scope.mjs`
- `frontend/tools/audit-combined-local-batch-stage-plan.mjs`
- `frontend/tools/verify-combined-local-batch-readiness.mjs`
- `frontend/tools/audit-combined-local-batch-readiness-nonmutating.mjs`
- `frontend/tools/audit-combined-local-batch-manifest.mjs`
- `frontend/package.json`

The inherited evidence and PWA files remain listed in their dedicated manifests:

- `docs/GSN_EVIDENCE_BOUNDARY_LOCAL_BATCH_MANIFEST.md`
- `docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md`

## Out-of-Scope Workspace Items

These workspace paths are explicitly outside the combined publish batch:

- `docs/external_review/`
- `frontend/screenshots/`
- `screenshots/`

Do not stage those folders for the combined publish unless the owner explicitly
changes scope.

## Registered Commands

Combined scope and readiness:

```powershell
npm --prefix frontend run print:combined-local-batch-stage-plan
npm --prefix frontend run audit:combined-local-batch-manifest
npm --prefix frontend run audit:combined-local-batch-stage-plan
npm --prefix frontend run audit:combined-local-batch-status-scope
npm --prefix frontend run audit:combined-local-batch-readiness-nonmutating
npm --prefix frontend run verify:combined-local-batch-readiness
```

Inherited readiness checks:

```powershell
npm --prefix frontend run verify:evidence-publish-readiness-local
npm --prefix frontend run verify:pwa-icon-publish-readiness-local
git diff --check
```

## What This Batch Proves Locally

- The combined file scope can be printed from shared scope modules.
- Current dirty-tree paths are either in the combined batch or explicitly out of
  scope.
- Evidence readiness passes locally, including mocked browser route-state
  smokes and live-readiness fail-closed checks.
- PWA icon readiness passes locally, including frontend production build.
- The combined verifier remains local, read-only, and non-publishing.

## What This Batch Does Not Prove

This batch does not prove:

- Render deployment completion;
- live-site availability;
- live backend authorization;
- production payload shape;
- production evidence behavior;
- production service-worker activation;
- Android WebAPK behavior;
- iOS or Android launcher cache refresh;
- existing shortcut repainting.

## Verification Run Locally

- `npm --prefix frontend run audit:combined-local-batch-manifest` passed after
  the audit was corrected to check shared-scope printer behavior instead of
  requiring generated file names to be hardcoded in printer source.
- `npm --prefix frontend run audit:combined-local-batch-stage-plan` passed.
- `npm --prefix frontend run audit:combined-local-batch-readiness-nonmutating`
  passed.
- `npm --prefix frontend run audit:evidence-local-batch-stage-plan` passed.
- `npm --prefix frontend run audit:evidence-boundary-local-batch-manifest`
  passed.
- `npm --prefix frontend run audit:icon-protocol` passed.
- Escalated `npm --prefix frontend run audit:combined-local-batch-status-scope`
  passed: 34 changed paths are in the combined local batch scope and 3 changed
  paths are explicitly out of scope for that combined batch.
- Escalated `npm --prefix frontend run audit:pwa-icon-local-batch-status-scope`
  passed: 19 changed paths are in the PWA icon batch manifest and 18 changed
  paths are explicitly out of scope for that icon batch.
- Escalated `npm --prefix frontend run audit:evidence-local-batch-status-scope`
  passed: 9 changed paths are in the evidence batch manifest and 28 changed
  paths are explicitly out of scope for that evidence-only batch.
- Unprivileged `npm --prefix frontend run verify:combined-local-batch-readiness`
  failed only on known Windows sandbox restrictions: `git status`, nested Node
  smoke/harness spawning, and Vite/esbuild spawning.
- Escalated `npm --prefix frontend run verify:combined-local-batch-readiness`
  passed. It ran the combined manifest audit, combined non-mutating audit,
  combined stage-plan audit, combined stage-plan print, combined status-scope
  audit, the evidence publish-readiness verifier, the PWA icon
  publish-readiness verifier including the frontend production build, and
  `git diff --check`.

## Publish Notes

For a future owner-approved `2`, run:

```powershell
npm --prefix frontend run verify:combined-local-batch-readiness
git diff --check
```

Then stage only paths printed by:

```powershell
npm --prefix frontend run print:combined-local-batch-stage-plan
```

Do not claim Render deployed until GitHub Actions, Render auto-deploy, or a
Render deploy hook/API response proves a deploy request was accepted. Do not
claim the live site is updated until deployment completion or live app behavior
is verified.
