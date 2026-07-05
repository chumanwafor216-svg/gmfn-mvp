import { inScopeEvidenceBatchFiles } from "./evidence-local-batch-scope.mjs";
import { inScopePwaIconBatchFiles } from "./pwa-icon-local-batch-scope.mjs";

const combinedToolFiles = [
  "docs/GSN_COMBINED_LOCAL_BATCH_MANIFEST.md",
  "frontend/tools/combined-local-batch-scope.mjs",
  "frontend/tools/print-combined-local-batch-stage-plan.mjs",
  "frontend/tools/audit-combined-local-batch-status-scope.mjs",
  "frontend/tools/audit-combined-local-batch-stage-plan.mjs",
  "frontend/tools/verify-combined-local-batch-readiness.mjs",
  "frontend/tools/audit-combined-local-batch-readiness-nonmutating.mjs",
  "frontend/tools/audit-combined-local-batch-manifest.mjs",
];

export const inScopeCombinedLocalBatchFiles = [
  ...new Set([
    ...inScopeEvidenceBatchFiles,
    ...inScopePwaIconBatchFiles,
    ...combinedToolFiles,
  ]),
];

export const outOfScopeCombinedLocalBatchPrefixes = [
  "docs/external_review/",
  "frontend/screenshots/",
  "screenshots/",
];
