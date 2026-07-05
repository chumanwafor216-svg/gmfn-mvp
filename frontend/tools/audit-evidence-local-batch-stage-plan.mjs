#!/usr/bin/env node

/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inScopeEvidenceBatchFiles,
  outOfScopeEvidenceBatchPrefixes,
} from "./evidence-local-batch-scope.mjs";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  package: "frontend/package.json",
  stagePlan: "frontend/tools/print-evidence-local-batch-stage-plan.mjs",
  manifest: "docs/GSN_EVIDENCE_BOUNDARY_LOCAL_BATCH_MANIFEST.md",
  suite: "frontend/tools/audit-evidence-display-boundary-suite.mjs",
  statusScope: "frontend/tools/audit-evidence-local-batch-status-scope.mjs",
  manifestAudit: "frontend/tools/audit-evidence-boundary-local-batch-manifest.mjs",
  scope: "frontend/tools/evidence-local-batch-scope.mjs",
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

assertScript(
  "print:evidence-local-batch-stage-plan",
  "node tools/print-evidence-local-batch-stage-plan.mjs"
);
assertScript(
  "audit:evidence-local-batch-stage-plan",
  "node tools/audit-evidence-local-batch-stage-plan.mjs"
);

for (const file of inScopeEvidenceBatchFiles) {
  assertContains(
    "manifest",
    new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "Manifest must list every file printed by the stage plan.",
    file
  );
}

for (const item of outOfScopeEvidenceBatchPrefixes) {
  assertContains(
    "manifest",
    new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "Manifest must list every explicitly out-of-scope workspace item.",
    item
  );
}

assertContains(
  "scope",
  /inScopeEvidenceBatchFiles[\s\S]*?docs\/GSN_EVIDENCE_LIVE_VERIFICATION_GAP_LOG\.md[\s\S]*?frontend\/tools\/evidence-local-batch-scope\.mjs/,
  "Shared scope module must define the in-scope evidence batch files."
);

assertContains(
  "scope",
  /outOfScopeEvidenceBatchPrefixes[\s\S]*?docs\/external_review\/[\s\S]*?frontend\/screenshots\/[\s\S]*?screenshots\/[\s\S]*?docs\/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST\.md[\s\S]*?docs\/SCREEN_SPECS\.md[\s\S]*?frontend\/index\.html[\s\S]*?frontend\/public\/manifest\.json[\s\S]*?frontend\/public\/manifest\.webmanifest[\s\S]*?frontend\/public\/sw\.js[\s\S]*?frontend\/src\/components\/GsnInstallPrompt\.tsx[\s\S]*?frontend\/tools\/audit-icon-protocol\.mjs[\s\S]*?frontend\/tools\/pwa-icon-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/print-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-local-batch-status-scope\.mjs[\s\S]*?frontend\/tools\/verify-pwa-icon-publish-readiness-local\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-publish-readiness-nonmutating\.mjs[\s\S]*?frontend\/public\/gsn-app-icon-ios-180-v14\.png[\s\S]*?frontend\/public\/gsn-app-icon-192-v14\.png[\s\S]*?frontend\/public\/gsn-app-icon-512-v14\.png[\s\S]*?frontend\/tools\/combined-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/print-combined-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-status-scope\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/verify-combined-local-batch-readiness\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-readiness-nonmutating\.mjs[\s\S]*?docs\/GSN_COMBINED_LOCAL_BATCH_MANIFEST\.md[\s\S]*?frontend\/tools\/audit-combined-local-batch-manifest\.mjs/,
  "Shared scope module must define the explicitly out-of-scope prefixes, separate local PWA icon-batch paths, and combined publish-planning guard paths."
);

assertContains(
  "stagePlan",
  /from "\.\/evidence-local-batch-scope\.mjs"[\s\S]*?inScopeEvidenceBatchFiles\.map[\s\S]*?outOfScopeEvidenceBatchPrefixes\.map/,
  "Stage plan must print the shared evidence batch scope."
);

assertContains(
  "statusScope",
  /from "\.\/evidence-local-batch-scope\.mjs"[\s\S]*?new Set\(inScopeEvidenceBatchFiles\)[\s\S]*?outOfScopeEvidenceBatchPrefixes\.some/,
  "Status-scope audit must consume the shared evidence batch scope."
);

assertContains(
  "stagePlan",
  /read-only scope preview[\s\S]*?No staging, commit, push, GitHub Actions, or Render deploy is performed[\s\S]*?future owner-approved republish or follow-up batch[\s\S]*?owner choice `1`/,
  "Stage plan must state it is a read-only republish/follow-up plan and not for owner choice 1 publishing."
);

assertContains(
  "stagePlan",
  /Unabated truth:[\s\S]*?only prints the intended file scope[\s\S]*?does not prove production payloads, live authorization, build health, visual quality, Render deploy acceptance, or deployment completion/,
  "Stage plan must block overclaims about what it proves."
);

assertNotContains(
  "stagePlan",
  /from "node:child_process"|spawnSync|spawn\(|execSync|execFileSync|writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|mkdirSync|rmdirSync|command:\s*["'](?:git|gh|curl)["']/,
  "Stage plan must not spawn commands or mutate files."
);

assertNotContains(
  "stagePlan",
  /read-only future stage plan|owner chooses `2`|owner-choice-`2`|future batch scope|future publish scope|Before publishing/,
  "Stage plan must not restore stale unpublished-state or pre-publish wording."
);

assertNotContains(
  "manifest",
  /Before publishing, rerun|read-only future stage plan|owner-choice-`2` path|future batch scope|future publish scope/,
  "Manifest stage-plan section must not restore stale unpublished-state or pre-publish wording."
);

assertContains(
  "manifest",
  /print:evidence-local-batch-stage-plan[\s\S]*?audit:evidence-local-batch-stage-plan[\s\S]*?future republish or follow-up/,
  "Manifest must document the stage-plan preview and its audit."
);

assertContains(
  "suite",
  /print:evidence-local-batch-stage-plan[\s\S]*?print-evidence-local-batch-stage-plan\.mjs[\s\S]*?audit:evidence-local-batch-stage-plan[\s\S]*?audit-evidence-local-batch-stage-plan\.mjs/,
  "Discoverability suite must keep the stage-plan print command and audit registered."
);

assertContains(
  "manifestAudit",
  /print-evidence-local-batch-stage-plan\.mjs/,
  "Manifest audit must cage the printable stage-plan tool."
);

assertContains(
  "manifestAudit",
  /audit-evidence-local-batch-stage-plan\.mjs/,
  "Manifest audit must cage the stage-plan audit tool."
);

assertContains(
  "manifestAudit",
  /evidence-local-batch-scope\.mjs/,
  "Manifest audit must cage the shared evidence-batch scope module."
);

if (findings.length > 0) {
  console.error("Evidence local batch stage-plan audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Evidence local batch stage-plan audit passed: republish/follow-up scope is printable, caged, and non-mutating."
);
