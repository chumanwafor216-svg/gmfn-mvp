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

function assertNotContains(fileKey, pattern, message) {
  const source = sourceByKey[fileKey];
  const match = source.match(pattern);
  if (!match) return;
  addFinding(fileKey, message, match[0]);
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

assertNotContains(
  "manifest",
  /Local batch manifest, not published|waiting for a future publish decision|Before publishing, rerun|read-only future stage plan|owner-choice-`2` path|future batch scope|future publish scope/,
  "Manifest must not restore stale unpublished-state or pre-publish wording."
);

assertContains(
  "manifest",
  /Published batch record; local verification boundary remains active[\s\S]*?committed, pushed to `main`, and accepted by the frontend Render\s+deploy hook[\s\S]*?not proof of Render deployment\s+completion, live API behavior, production payload shape, build health, or visual\s+QA/,
  "Manifest must state the published scope and block deploy-completion/live-proof overclaims."
);

assertContains(
  "manifest",
  /Publish Record[\s\S]*?044ddf4bf48c7e7065942aa1d7657a06a75b7bfb[\s\S]*?044ddf4b[\s\S]*?Add evidence boundary publish readiness tooling[\s\S]*?main[\s\S]*?28752245335[\s\S]*?dep-d95b0tnaqgkc73etv5s0[\s\S]*?deploy_api=false[\s\S]*?verify:evidence-publish-readiness-local[\s\S]*?No independent Render completion check, production build, live API fixture\s+run, or visual QA/,
  "Manifest must record the exact publish/deploy-request facts and their limits."
);

assertContains(
  "manifest",
  /In-Scope Batch Files[\s\S]*?GSN_EVIDENCE_LIVE_VERIFICATION_GAP_LOG\.md[\s\S]*?GSN_EVIDENCE_LIVE_FIXTURE_RUNBOOK\.md[\s\S]*?GSN_EVIDENCE_BOUNDARY_LOCAL_BATCH_MANIFEST\.md[\s\S]*?HANDOFF_NOTES\.md[\s\S]*?frontend\/package\.json[\s\S]*?audit-evidence-display-boundary-suite\.mjs/,
  "Manifest must list in-scope docs, package registration, and suite registration."
);

assertContains(
  "manifest",
  /smoke-evidence-display-boundary-batch\.mjs[\s\S]*?verify-evidence-display-boundary-local\.mjs[\s\S]*?audit-evidence-live-verification-gap-log\.mjs[\s\S]*?audit-live-evidence-boundaries\.mjs[\s\S]*?audit-live-evidence-boundary-refusals\.mjs[\s\S]*?audit-evidence-live-fixture-runbook\.mjs[\s\S]*?verify-evidence-live-readiness-local\.mjs[\s\S]*?verify-evidence-boundary-local-all\.mjs[\s\S]*?verify-evidence-publish-readiness-local\.mjs[\s\S]*?audit-evidence-publish-readiness-nonmutating\.mjs[\s\S]*?audit-evidence-local-batch-status-scope\.mjs[\s\S]*?print-evidence-local-batch-stage-plan\.mjs[\s\S]*?audit-evidence-local-batch-stage-plan\.mjs[\s\S]*?evidence-local-batch-scope\.mjs[\s\S]*?audit-evidence-boundary-local-batch-manifest\.mjs/,
  "Manifest must list every local evidence-boundary tool in this batch."
);

assertContains(
  "manifest",
  /Out-of-Scope Workspace Items[\s\S]*?docs\/external_review\/[\s\S]*?frontend\/screenshots\/[\s\S]*?screenshots\/[\s\S]*?Separate local PWA shortcut icon batch[\s\S]*?docs\/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST\.md[\s\S]*?docs\/SCREEN_SPECS\.md[\s\S]*?frontend\/index\.html[\s\S]*?frontend\/public\/manifest\.json[\s\S]*?frontend\/public\/manifest\.webmanifest[\s\S]*?frontend\/public\/sw\.js[\s\S]*?frontend\/src\/components\/GsnInstallPrompt\.tsx[\s\S]*?frontend\/tools\/audit-icon-protocol\.mjs[\s\S]*?frontend\/tools\/pwa-icon-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/print-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-local-batch-status-scope\.mjs[\s\S]*?frontend\/tools\/verify-pwa-icon-publish-readiness-local\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-publish-readiness-nonmutating\.mjs[\s\S]*?frontend\/public\/gsn-app-icon-ios-180-v14\.png[\s\S]*?frontend\/public\/gsn-app-icon-192-v14\.png[\s\S]*?frontend\/public\/gsn-app-icon-512-v14\.png[\s\S]*?Combined local publish-planning guard tools[\s\S]*?frontend\/tools\/combined-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/print-combined-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-status-scope\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/verify-combined-local-batch-readiness\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-readiness-nonmutating\.mjs[\s\S]*?docs\/GSN_COMBINED_LOCAL_BATCH_MANIFEST\.md[\s\S]*?frontend\/tools\/audit-combined-local-batch-manifest\.mjs[\s\S]*?Do not stage them for an evidence-only batch unless the owner explicitly\s+changes scope or approves a combined publish batch/,
  "Manifest must keep unrelated folders, the separate local PWA icon batch, and combined publish-planning guards out of the evidence-only batch."
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
  /print:evidence-local-batch-stage-plan[\s\S]*?read-only future republish or\s+follow-up scope plan[\s\S]*?audit:evidence-local-batch-stage-plan[\s\S]*?non-mutating/,
  "Manifest must explain the read-only stage plan preview and its audit."
);

assertContains(
  "manifest",
  /What This Batch Proves Locally[\s\S]*?Static evidence-boundary source audits[\s\S]*?Mocked browser route-state smokes[\s\S]*?live-verification gap log[\s\S]*?live harness is opt-in[\s\S]*?fixture runbook stays template-only[\s\S]*?all-local verifier chains[\s\S]*?future republish or follow-up scope/,
  "Manifest must summarize local proof only."
);

assertContains(
  "manifest",
  /What This Batch Does Not Prove[\s\S]*?live backend authorization[\s\S]*?production payload shape[\s\S]*?real public TrustSlip code behavior[\s\S]*?signed-in production Trust Timeline authorization[\s\S]*?full mobile or desktop visual quality[\s\S]*?production build health[\s\S]*?Render deployment completion or live availability[\s\S]*?legal, bank, government, regulatory, escrow, delivery, payout, or credit\s+approval/,
  "Manifest must block overclaims about production, deploy completion, and approvals."
);

assertContains(
  "manifest",
  /For any future republish or follow-up batch[\s\S]*?stage only the in-scope files[\s\S]*?Before republishing or follow-up publishing[\s\S]*?print:evidence-local-batch-stage-plan[\s\S]*?audit:evidence-boundary-local-batch-manifest[\s\S]*?audit:evidence-local-batch-stage-plan[\s\S]*?audit:evidence-publish-readiness-nonmutating[\s\S]*?audit:evidence-local-batch-status-scope[\s\S]*?audit:evidence-display-boundary-suite[\s\S]*?verify:evidence-publish-readiness-local[\s\S]*?verify:evidence-boundary-local-all[\s\S]*?git diff --check[\s\S]*?Do not claim Render accepted a deploy request[\s\S]*?Do not claim the new\s+site is live unless/,
  "Manifest must include guarded future republish notes."
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
