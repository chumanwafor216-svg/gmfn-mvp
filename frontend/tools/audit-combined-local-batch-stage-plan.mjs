#!/usr/bin/env node

/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  package: "frontend/package.json",
  scope: "frontend/tools/combined-local-batch-scope.mjs",
  stagePlan: "frontend/tools/print-combined-local-batch-stage-plan.mjs",
  statusScope: "frontend/tools/audit-combined-local-batch-status-scope.mjs",
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
  "audit:combined-local-batch-manifest",
  "node tools/audit-combined-local-batch-manifest.mjs"
);
assertScript(
  "print:combined-local-batch-stage-plan",
  "node tools/print-combined-local-batch-stage-plan.mjs"
);
assertScript(
  "audit:combined-local-batch-stage-plan",
  "node tools/audit-combined-local-batch-stage-plan.mjs"
);
assertScript(
  "audit:combined-local-batch-status-scope",
  "node tools/audit-combined-local-batch-status-scope.mjs"
);
assertScript(
  "verify:combined-local-batch-readiness",
  "node tools/verify-combined-local-batch-readiness.mjs"
);
assertScript(
  "audit:combined-local-batch-readiness-nonmutating",
  "node tools/audit-combined-local-batch-readiness-nonmutating.mjs"
);

assertContains(
  "scope",
  /from "\.\/evidence-local-batch-scope\.mjs"[\s\S]*?from "\.\/pwa-icon-local-batch-scope\.mjs"[\s\S]*?combinedToolFiles[\s\S]*?docs\/GSN_COMBINED_LOCAL_BATCH_MANIFEST\.md[\s\S]*?frontend\/tools\/combined-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/print-combined-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-status-scope\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/verify-combined-local-batch-readiness\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-readiness-nonmutating\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-manifest\.mjs[\s\S]*?new Set\(\[[\s\S]*?inScopeEvidenceBatchFiles[\s\S]*?inScopePwaIconBatchFiles[\s\S]*?combinedToolFiles[\s\S]*?outOfScopeCombinedLocalBatchPrefixes[\s\S]*?docs\/external_review\/[\s\S]*?frontend\/screenshots\/[\s\S]*?screenshots\//,
  "Combined scope must compose evidence scope, PWA icon scope, combined tools, and explicit out-of-scope folders."
);

assertContains(
  "stagePlan",
  /from "\.\/combined-local-batch-scope\.mjs"[\s\S]*?read-only scope preview[\s\S]*?No staging, commit, push, GitHub Actions, or Render deploy is performed[\s\S]*?future owner-approved combined evidence plus PWA icon publish batch[\s\S]*?owner choice `1`[\s\S]*?inScopeCombinedLocalBatchFiles\.map[\s\S]*?outOfScopeCombinedLocalBatchPrefixes\.map[\s\S]*?Future owner-approved staging rule:[\s\S]*?Stage only the exact in-scope files printed above[\s\S]*?Do not stage the explicitly out-of-scope workspace items unless the owner changes scope/,
  "Combined stage plan must print shared combined scope and state it is read-only."
);

assertContains(
  "stagePlan",
  /audit:combined-local-batch-manifest[\s\S]*?audit:combined-local-batch-readiness-nonmutating[\s\S]*?verify:combined-local-batch-readiness[\s\S]*?verify:evidence-publish-readiness-local[\s\S]*?verify:pwa-icon-publish-readiness-local[\s\S]*?Unabated truth:[\s\S]*?does not stage, commit, push, trigger GitHub Actions, deploy[\s\S]*?prove live evidence behavior[\s\S]*?refresh existing iOS\/Android shortcut caches/,
  "Combined stage plan must require both verifiers and block publish/live/cache overclaims."
);

assertContains(
  "statusScope",
  /from "\.\/combined-local-batch-scope\.mjs"[\s\S]*?new Set\(inScopeCombinedLocalBatchFiles\)[\s\S]*?git",\s*\["status", "--short", "--untracked-files=normal"\][\s\S]*?outOfScopeCombinedLocalBatchPrefixes\.some[\s\S]*?No staging, commit, push, or deployment action was performed/,
  "Combined status-scope audit must consume shared combined scope and remain non-publishing."
);

assertNotContains(
  "stagePlan",
  /from "node:child_process"|spawnSync|spawn\(|execSync|execFileSync|writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|mkdirSync|rmdirSync|command:\s*["'](?:git|gh|curl)["']/,
  "Combined stage plan must not spawn commands or mutate files."
);

if (findings.length > 0) {
  console.error("Combined local batch stage-plan audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Combined local batch stage-plan audit passed: combined publish scope is printable, caged, and non-mutating."
);
