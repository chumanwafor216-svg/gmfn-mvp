#!/usr/bin/env node

/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inScopeEvidenceBatchFiles } from "./evidence-local-batch-scope.mjs";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  manifest: "docs/GSN_EVIDENCE_BOUNDARY_LOCAL_BATCH_MANIFEST.md",
  package: "frontend/package.json",
  suite: "frontend/tools/audit-evidence-display-boundary-suite.mjs",
  handoff: "docs/HANDOFF_NOTES.md",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(repoRoot, file), "utf8"),
  ])
);

const packageJson = JSON.parse(sourceByKey.package);
const findings = [];

function addFinding(fileKey, message, text = "Expected pattern was not found.") {
  findings.push({
    file: files[fileKey],
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 360),
  });
}

function assertContains(fileKey, pattern, message, text) {
  const source = sourceByKey[fileKey];
  if (pattern.test(source)) return;
  addFinding(fileKey, message, text || pattern.toString());
}

function assertScript(name, command) {
  if (packageJson.scripts?.[name] === command) return;
  findings.push({
    file: files.package,
    message: `Package script ${name} must stay registered.`,
    text: `Expected ${JSON.stringify(command)}, found ${JSON.stringify(
      packageJson.scripts?.[name]
    )}.`,
  });
}

function assertTool(path) {
  if (existsSync(join(repoRoot, path))) return;
  findings.push({
    file: files.manifest,
    message: "Manifest lists a missing in-scope evidence-boundary file.",
    text: path,
  });
}

assertScript(
  "audit:evidence-boundary-local-batch-manifest",
  "node tools/audit-evidence-boundary-local-batch-manifest.mjs"
);
assertScript(
  "verify:evidence-boundary-local-all",
  "node tools/verify-evidence-boundary-local-all.mjs"
);
assertScript(
  "verify:evidence-publish-readiness-local",
  "node tools/verify-evidence-publish-readiness-local.mjs"
);
assertScript(
  "print:evidence-local-batch-stage-plan",
  "node tools/print-evidence-local-batch-stage-plan.mjs"
);
assertScript(
  "audit:evidence-publish-readiness-nonmutating",
  "node tools/audit-evidence-publish-readiness-nonmutating.mjs"
);
assertScript(
  "audit:evidence-local-batch-status-scope",
  "node tools/audit-evidence-local-batch-status-scope.mjs"
);
assertScript(
  "audit:evidence-local-batch-stage-plan",
  "node tools/audit-evidence-local-batch-stage-plan.mjs"
);

inScopeEvidenceBatchFiles.forEach(assertTool);

assertContains(
  "manifest",
  /Local batch manifest, not published[\s\S]*?not a commit, push, deployment, or production\s+verification record/,
  "Manifest must state its local unpublished status."
);

assertContains(
  "manifest",
  /In-Scope Local Files[\s\S]*?GSN_EVIDENCE_LIVE_VERIFICATION_GAP_LOG\.md[\s\S]*?GSN_EVIDENCE_LIVE_FIXTURE_RUNBOOK\.md[\s\S]*?GSN_EVIDENCE_BOUNDARY_LOCAL_BATCH_MANIFEST\.md[\s\S]*?HANDOFF_NOTES\.md[\s\S]*?frontend\/package\.json[\s\S]*?audit-evidence-display-boundary-suite\.mjs/,
  "Manifest must list in-scope docs, package registration, and suite registration."
);

assertContains(
  "manifest",
  /smoke-evidence-display-boundary-batch\.mjs[\s\S]*?verify-evidence-display-boundary-local\.mjs[\s\S]*?audit-evidence-live-verification-gap-log\.mjs[\s\S]*?audit-live-evidence-boundaries\.mjs[\s\S]*?audit-live-evidence-boundary-refusals\.mjs[\s\S]*?audit-evidence-live-fixture-runbook\.mjs[\s\S]*?verify-evidence-live-readiness-local\.mjs[\s\S]*?verify-evidence-boundary-local-all\.mjs[\s\S]*?verify-evidence-publish-readiness-local\.mjs[\s\S]*?audit-evidence-publish-readiness-nonmutating\.mjs[\s\S]*?audit-evidence-local-batch-status-scope\.mjs[\s\S]*?print-evidence-local-batch-stage-plan\.mjs[\s\S]*?audit-evidence-local-batch-stage-plan\.mjs[\s\S]*?evidence-local-batch-scope\.mjs[\s\S]*?audit-evidence-boundary-local-batch-manifest\.mjs/,
  "Manifest must list every local evidence-boundary tool in this batch."
);

assertContains(
  "manifest",
  /Out-of-Scope Workspace Items[\s\S]*?docs\/external_review\/[\s\S]*?frontend\/screenshots\/[\s\S]*?screenshots\/[\s\S]*?Do not stage them/,
  "Manifest must keep unrelated untracked folders out of this batch."
);

assertContains(
  "manifest",
  /verify:evidence-boundary-local-all[\s\S]*?verify:evidence-publish-readiness-local[\s\S]*?verify:evidence-display-boundary-local[\s\S]*?verify:evidence-live-readiness-local[\s\S]*?print:evidence-local-batch-stage-plan[\s\S]*?audit:evidence-display-boundary-suite[\s\S]*?audit:evidence-live-verification-gap-log[\s\S]*?audit:evidence-live-fixture-runbook[\s\S]*?audit:evidence-boundary-local-batch-manifest[\s\S]*?audit:evidence-publish-readiness-nonmutating[\s\S]*?audit:evidence-local-batch-status-scope[\s\S]*?audit:evidence-local-batch-stage-plan[\s\S]*?audit:live-evidence-boundaries -- --dry-run[\s\S]*?audit:live-evidence-boundary-refusals/,
  "Manifest must list the registered verification commands."
);

assertContains(
  "manifest",
  /verify:evidence-publish-readiness-local[\s\S]*?manifest audit[\s\S]*?evidence\s+display boundary suite[\s\S]*?stage-plan audit[\s\S]*?status-scope audit[\s\S]*?all-local evidence verifier[\s\S]*?git diff --check[\s\S]*?does not stage files,\s+commit, push, trigger GitHub\s+Actions, or deploy/,
  "Manifest must explain what the publish-readiness verifier runs and that it is non-publishing."
);

assertContains(
  "manifest",
  /audit:evidence-publish-readiness-nonmutating[\s\S]*?source-checks[\s\S]*?stays read-only[\s\S]*?hidden staging[\s\S]*?commit, push, GitHub Actions, Render hook, deploy, publish, or file-mutating\s+behavior/,
  "Manifest must explain the non-mutating publish-readiness source audit."
);

assertContains(
  "manifest",
  /audit:evidence-local-batch-status-scope[\s\S]*?git status --short[\s\S]*?changed files are either in this manifest or under the explicitly\s+out-of-scope workspace paths[\s\S]*?does not stage, commit, push, or deploy/,
  "Manifest must explain the read-only status-scope audit."
);

assertContains(
  "manifest",
  /print:evidence-local-batch-stage-plan[\s\S]*?read-only future stage plan[\s\S]*?audit:evidence-local-batch-stage-plan[\s\S]*?non-mutating/,
  "Manifest must explain the read-only stage plan preview and its audit."
);

assertContains(
  "manifest",
  /What This Batch Proves Locally[\s\S]*?Static evidence-boundary source audits[\s\S]*?Mocked browser route-state smokes[\s\S]*?live-verification gap log[\s\S]*?live harness is opt-in[\s\S]*?fixture runbook stays template-only[\s\S]*?all-local verifier chains/,
  "Manifest must summarize local proof only."
);

assertContains(
  "manifest",
  /What This Batch Does Not Prove[\s\S]*?live backend authorization[\s\S]*?production payload shape[\s\S]*?real public TrustSlip code behavior[\s\S]*?signed-in production Trust Timeline authorization[\s\S]*?full mobile or desktop visual quality[\s\S]*?production build health[\s\S]*?Render deployment[\s\S]*?legal, bank, government, regulatory, escrow, delivery, payout, or credit\s+approval/,
  "Manifest must block overclaims about production, deployment, and approvals."
);

assertContains(
  "manifest",
  /If the owner later chooses `2`[\s\S]*?stage only the in-scope files[\s\S]*?print:evidence-local-batch-stage-plan[\s\S]*?audit:evidence-boundary-local-batch-manifest[\s\S]*?audit:evidence-local-batch-stage-plan[\s\S]*?audit:evidence-publish-readiness-nonmutating[\s\S]*?audit:evidence-local-batch-status-scope[\s\S]*?audit:evidence-display-boundary-suite[\s\S]*?verify:evidence-publish-readiness-local[\s\S]*?verify:evidence-boundary-local-all[\s\S]*?git diff --check[\s\S]*?Do not claim Render deployed unless/,
  "Manifest must include guarded future publish notes."
);

assertContains(
  "suite",
  /audit:evidence-boundary-local-batch-manifest[\s\S]*?audit-evidence-boundary-local-batch-manifest\.mjs/,
  "Discoverability suite must keep the manifest audit registered."
);

assertContains(
  "handoff",
  /Evidence all-local verifier registered locally[\s\S]*?broadest local pre-live evidence cage/,
  "Handoff must preserve the current all-local verifier context."
);

if (findings.length > 0) {
  console.error("Evidence boundary local batch manifest audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Evidence boundary local batch manifest audit passed: in-scope files, commands, out-of-scope paths, and proof limits are caged."
);
