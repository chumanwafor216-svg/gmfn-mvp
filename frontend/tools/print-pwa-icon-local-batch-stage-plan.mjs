#!/usr/bin/env node

/* global console */

import {
  inScopePwaIconBatchFiles,
  outOfScopePwaIconBatchPrefixes,
} from "./pwa-icon-local-batch-scope.mjs";

console.log(
  [
    "GSN PWA icon batch scope plan",
    "",
    "Status: read-only scope preview. No staging, commit, push, GitHub Actions, or Render deploy is performed.",
    "Use only for a future owner-approved PWA icon publish or combined publish batch; during owner choice `1`, keep this as a planning record.",
    "",
    "In-scope files for this PWA icon batch:",
    ...inScopePwaIconBatchFiles.map((file) => `- ${file}`),
    "",
    "Explicitly out-of-scope workspace items for this batch:",
    ...outOfScopePwaIconBatchPrefixes.map((item) => `- ${item}`),
    "",
    "Future owner-approved staging rule:",
    "Stage only the exact in-scope files printed above. Do not stage the explicitly out-of-scope workspace items unless the owner changes scope.",
    "",
    "Before any future PWA icon publish or combined publish, rerun:",
    "- npm --prefix frontend run audit:icon-protocol",
    "- npm --prefix frontend run print:pwa-icon-local-batch-stage-plan",
    "- npm --prefix frontend run audit:pwa-icon-local-batch-stage-plan",
    "- npm --prefix frontend run audit:pwa-icon-local-batch-status-scope",
    "- npm --prefix frontend run audit:pwa-icon-publish-readiness-nonmutating",
    "- npm --prefix frontend run verify:pwa-icon-publish-readiness-local",
    "- npm --prefix frontend run build",
    "- git diff --check",
    "",
    "Unabated truth: this command only prints the intended icon-batch file scope. It does not prove Render deploy acceptance, deployment completion, live-site availability, Android WebAPK behavior, or iOS/Android launcher cache refresh.",
  ].join("\n")
);
