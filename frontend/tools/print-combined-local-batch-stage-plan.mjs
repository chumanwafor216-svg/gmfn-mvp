#!/usr/bin/env node

/* global console */

import {
  inScopeCombinedLocalBatchFiles,
  outOfScopeCombinedLocalBatchPrefixes,
} from "./combined-local-batch-scope.mjs";

console.log(
  [
    "GSN combined local batch scope plan",
    "",
    "Status: read-only scope preview. No staging, commit, push, GitHub Actions, or Render deploy is performed.",
    "Use only for a future owner-approved combined evidence plus PWA icon publish batch; during owner choice `1`, keep this as a planning record.",
    "",
    "In-scope files for this combined local batch:",
    ...inScopeCombinedLocalBatchFiles.map((file) => `- ${file}`),
    "",
    "Explicitly out-of-scope workspace items for this combined batch:",
    ...outOfScopeCombinedLocalBatchPrefixes.map((item) => `- ${item}`),
    "",
    "Future owner-approved staging rule:",
    "Stage only the exact in-scope files printed above. Do not stage the explicitly out-of-scope workspace items unless the owner changes scope.",
    "",
    "Before any future combined publish, rerun:",
    "- npm --prefix frontend run print:combined-local-batch-stage-plan",
    "- npm --prefix frontend run audit:combined-local-batch-manifest",
    "- npm --prefix frontend run audit:combined-local-batch-stage-plan",
    "- npm --prefix frontend run audit:combined-local-batch-status-scope",
    "- npm --prefix frontend run audit:combined-local-batch-readiness-nonmutating",
    "- npm --prefix frontend run verify:combined-local-batch-readiness",
    "- npm --prefix frontend run verify:evidence-publish-readiness-local",
    "- npm --prefix frontend run verify:pwa-icon-publish-readiness-local",
    "- git diff --check",
    "",
    "Unabated truth: this command only prints the intended combined local file scope. It does not stage, commit, push, trigger GitHub Actions, deploy, prove Render deploy acceptance, prove deployment completion, prove live-site availability, prove live evidence behavior, or refresh existing iOS/Android shortcut caches.",
  ].join("\n")
);
