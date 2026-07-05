#!/usr/bin/env node

/* global console */

import {
  inScopeEvidenceBatchFiles,
  outOfScopeEvidenceBatchPrefixes,
} from "./evidence-local-batch-scope.mjs";

console.log(
  [
    "GSN evidence-boundary local batch stage plan",
    "",
    "Status: read-only preview. No staging, commit, push, GitHub Actions, or Render deploy is performed.",
    "Use only after the owner chooses `2`; during owner choice `1`, keep this as a planning record.",
    "",
    "In-scope files for the future batch:",
    ...inScopeEvidenceBatchFiles.map((file) => `- ${file}`),
    "",
    "Explicitly out-of-scope workspace items for this batch:",
    ...outOfScopeEvidenceBatchPrefixes.map((item) => `- ${item}`),
    "",
    "Before any future publish, rerun:",
    "- npm --prefix frontend run audit:evidence-boundary-local-batch-manifest",
    "- npm --prefix frontend run audit:evidence-local-batch-stage-plan",
    "- npm --prefix frontend run audit:evidence-publish-readiness-nonmutating",
    "- npm --prefix frontend run audit:evidence-local-batch-status-scope",
    "- npm --prefix frontend run verify:evidence-publish-readiness-local",
    "- git diff --check",
    "",
    "Unabated truth: this command only prints the intended file scope. It does not prove production payloads, live authorization, build health, visual quality, or deployment state.",
  ].join("\n")
);
