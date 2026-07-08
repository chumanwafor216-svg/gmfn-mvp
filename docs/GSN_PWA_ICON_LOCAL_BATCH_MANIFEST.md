# GSN PWA Icon Local Batch Manifest

Date: 2026-07-05
Status: Local batch, not published

## Purpose

This manifest records the local PWA/home-screen shortcut icon batch that aligns
Apple, Android, and browser shortcut artwork around the same GSN visual
composition: navy tile, outer gold ring, and shield/star emblem.

It is a scope and truth-boundary record. It proves only the listed local files
and local checks. It does not prove Render deployment, live-site availability,
launcher cache refresh, or that existing installed shortcuts have repainted.

## Owner Reference

The owner compared iPhone and Android home-screen screenshots and chose the
iPhone-looking shortcut as the preferred GSN icon. The desired icon is the navy
rounded tile with an outer gold ring and centered shield/star emblem. Android
and other phone shortcuts should not use a separate maskable or SVG treatment
that can drop the outer ring or make the logo look different.

## In-Scope Icon Batch Files

Documentation:

- `docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md`
- `docs/SCREEN_SPECS.md`
- `docs/HANDOFF_NOTES.md`

Frontend install metadata and service worker:

- `frontend/index.html`
- `frontend/public/manifest.json`
- `frontend/public/manifest.webmanifest`
- `frontend/public/sw.js`
- `frontend/src/components/GsnInstallPrompt.tsx`

Frontend icon assets:

- `frontend/public/gsn-app-icon-ios-180-v14.png`
- `frontend/public/gsn-app-icon-192-v14.png`
- `frontend/public/gsn-app-icon-512-v14.png`

Verification tooling:

- `frontend/tools/audit-icon-protocol.mjs`
- `frontend/tools/audit-link-contracts.mjs`
- `frontend/tools/pwa-icon-local-batch-scope.mjs`
- `frontend/tools/print-pwa-icon-local-batch-stage-plan.mjs`
- `frontend/tools/audit-pwa-icon-local-batch-stage-plan.mjs`
- `frontend/tools/audit-pwa-icon-local-batch-status-scope.mjs`
- `frontend/tools/verify-pwa-icon-publish-readiness-local.mjs`
- `frontend/tools/audit-pwa-icon-publish-readiness-nonmutating.mjs`
- `frontend/package.json`

## Required Icon Contract

- `apple-touch-icon` must point to `/gsn-app-icon-ios-180-v14.png`.
- `manifest.json` and `manifest.webmanifest` must point to the v14 PNG icons:
  180, 192, and 512.
- Manifest install icons must use `purpose: "any"`.
- Manifest install icons must not offer `maskable` or `/gsn-app-icon.svg` as an
  install shortcut icon.
- Shortcut icons must point to `/gsn-app-icon-192-v14.png`.
- The service worker cache must use `gsn-pwa-shell-v14` and precache the v14
  icon PNGs.
- The install prompt preview must use `/gsn-app-icon-ios-180-v14.png`.
- The link-contract audit must cage the same v14 install metadata, prompt, and
  service-worker contract instead of the retired v13 shortcut contract.

## Verification Run Locally

- Unprivileged `npm --prefix frontend run build` failed only on the known
  Windows sandbox `spawn EPERM` from Vite/esbuild.
- Escalated `npm --prefix frontend run build` passed and produced dist assets
  with v14 icon metadata.
- `npm --prefix frontend run audit:icon-protocol` passed.
- `npm --prefix frontend run print:pwa-icon-local-batch-stage-plan` passed.
- `npm --prefix frontend run audit:pwa-icon-local-batch-stage-plan` passed.
- `npm --prefix frontend run audit:pwa-icon-publish-readiness-nonmutating`
  passed.
- Escalated `npm --prefix frontend run audit:pwa-icon-local-batch-status-scope`
  passed: 19 changed paths are in the PWA icon batch manifest and 18 changed
  paths are explicitly out of scope for that icon batch. This audit shells out
  to `git status` and may hit the Windows sandbox `spawn EPERM` when run
  unprivileged.
- `npm --prefix frontend run print:combined-local-batch-stage-plan` passed and
  printed the future combined evidence plus PWA icon publish scope without
  staging, committing, pushing, or deploying.
- `npm --prefix frontend run audit:combined-local-batch-manifest` passed after
  the audit was corrected to check the stage-plan printer's shared-scope import
  and array mapping instead of requiring generated file names to be hardcoded in
  printer source.
- `npm --prefix frontend run audit:combined-local-batch-stage-plan` passed.
- Escalated `npm --prefix frontend run audit:combined-local-batch-status-scope`
  passed: 34 changed paths are in the combined local batch scope and 3 changed
  paths are explicitly out of scope for that combined batch.
- `npm --prefix frontend run audit:combined-local-batch-readiness-nonmutating`
  passed.
- Escalated `npm --prefix frontend run verify:combined-local-batch-readiness`
  passed. It ran the combined manifest audit, combined non-mutating audit,
  combined stage-plan audit, combined stage-plan print, combined status-scope
  audit, the evidence publish-readiness verifier, the PWA icon
  publish-readiness verifier including the frontend production build, and
  `git diff --check`.
- Unprivileged
  `npm --prefix frontend run verify:pwa-icon-publish-readiness-local` failed
  only on known Windows sandbox restrictions: `git status` and Vite/esbuild
  build spawning.
- Escalated `npm --prefix frontend run verify:pwa-icon-publish-readiness-local`
  passed after the verifier was updated to include the stage-plan audit. It ran
  the icon protocol audit, non-mutating audit, stage-plan audit,
  stage-plan print, status-scope audit, frontend production build, and
  `git diff --check`. It was rerun after the combined guard additions and
  passed with the PWA status-scope count at 19 in-scope paths and 18
  explicitly out-of-scope paths.
- Follow-up install-readiness cleanup updated
  `frontend/tools/audit-link-contracts.mjs` from the retired v13 shortcut icon
  contract to the current v14 PNG/no-maskable contract, then added that audit
  to the PWA icon batch scope. The active RGU customer-discovery plan document
  remains explicitly out of scope for this install batch.
- `git diff --check` passed with only LF-to-CRLF warnings for touched frontend
  source/tool files.

## Publish Notes

For an owner-approved publish, stage the icon batch files intentionally. If the
evidence-boundary batch is also being published, decide explicitly whether this
is a combined evidence-plus-icon publish or two separate publishes.

Before any future PWA icon publish or combined publish, rerun:

```powershell
npm --prefix frontend run audit:icon-protocol
npm --prefix frontend run print:pwa-icon-local-batch-stage-plan
npm --prefix frontend run audit:pwa-icon-local-batch-stage-plan
npm --prefix frontend run audit:pwa-icon-local-batch-status-scope
npm --prefix frontend run audit:pwa-icon-publish-readiness-nonmutating
npm --prefix frontend run verify:pwa-icon-publish-readiness-local
npm --prefix frontend run print:combined-local-batch-stage-plan
npm --prefix frontend run audit:combined-local-batch-manifest
npm --prefix frontend run audit:combined-local-batch-stage-plan
npm --prefix frontend run audit:combined-local-batch-status-scope
npm --prefix frontend run audit:combined-local-batch-readiness-nonmutating
npm --prefix frontend run verify:combined-local-batch-readiness
npm --prefix frontend run build
git diff --check
```

Do not claim the live site is serving v14 icons until the same commit is pushed
and Render deployment or live app behavior is verified. Do not claim existing
phone shortcuts have changed automatically; iOS and Android launchers can cache
old shortcut artwork until the user removes and re-adds the shortcut, or until
the launcher/browser refreshes its installed icon cache.

## What This Batch Does Not Prove

This batch does not prove:

- Render deployment completion;
- live-site availability;
- production service-worker activation;
- Android WebAPK behavior;
- iOS or Android launcher cache refresh;
- existing shortcut repainting;
- Play Store or native app package readiness.
