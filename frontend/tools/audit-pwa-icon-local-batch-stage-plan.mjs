#!/usr/bin/env node

/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inScopePwaIconBatchFiles,
  outOfScopePwaIconBatchPrefixes,
} from "./pwa-icon-local-batch-scope.mjs";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  package: "frontend/package.json",
  stagePlan: "frontend/tools/print-pwa-icon-local-batch-stage-plan.mjs",
  manifest: "docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md",
  scope: "frontend/tools/pwa-icon-local-batch-scope.mjs",
  statusScope: "frontend/tools/audit-pwa-icon-local-batch-status-scope.mjs",
  verifier: "frontend/tools/verify-pwa-icon-publish-readiness-local.mjs",
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
  "print:pwa-icon-local-batch-stage-plan",
  "node tools/print-pwa-icon-local-batch-stage-plan.mjs"
);
assertScript(
  "audit:pwa-icon-local-batch-stage-plan",
  "node tools/audit-pwa-icon-local-batch-stage-plan.mjs"
);

for (const file of inScopePwaIconBatchFiles) {
  assertContains(
    "manifest",
    new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "PWA icon manifest must list every file printed by the stage plan.",
    file
  );
}

for (const item of outOfScopePwaIconBatchPrefixes) {
  assertContains(
    "scope",
    new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "PWA icon shared scope must list every explicitly out-of-scope workspace item printed by the stage plan.",
    item
  );
}

assertContains(
  "stagePlan",
  /from "\.\/pwa-icon-local-batch-scope\.mjs"[\s\S]*?inScopePwaIconBatchFiles\.map[\s\S]*?outOfScopePwaIconBatchPrefixes\.map[\s\S]*?Future owner-approved staging rule:[\s\S]*?Stage only the exact in-scope files printed above[\s\S]*?Do not stage the explicitly out-of-scope workspace items unless the owner changes scope/,
  "PWA icon stage plan must print the shared PWA icon batch scope."
);

assertContains(
  "statusScope",
  /from "\.\/pwa-icon-local-batch-scope\.mjs"[\s\S]*?new Set\(inScopePwaIconBatchFiles\)[\s\S]*?outOfScopePwaIconBatchPrefixes\.some/,
  "PWA icon status-scope audit must consume the shared PWA icon batch scope."
);

assertContains(
  "stagePlan",
  /read-only scope preview[\s\S]*?No staging, commit, push, GitHub Actions, or Render deploy is performed[\s\S]*?future owner-approved PWA icon publish or combined publish batch[\s\S]*?owner choice `1`/,
  "PWA icon stage plan must state it is read-only and not for owner choice 1 publishing."
);

assertContains(
  "stagePlan",
  /audit:pwa-icon-local-batch-stage-plan[\s\S]*?verify:pwa-icon-publish-readiness-local[\s\S]*?Unabated truth:[\s\S]*?only prints the intended icon-batch file scope[\s\S]*?does not prove Render deploy acceptance, deployment completion, live-site availability, Android WebAPK behavior, or iOS\/Android launcher cache refresh/,
  "PWA icon stage plan must list its audit/verifier and block live/cache overclaims."
);

assertNotContains(
  "stagePlan",
  /from "node:child_process"|spawnSync|spawn\(|execSync|execFileSync|writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|mkdirSync|rmdirSync|command:\s*["'](?:git|gh|curl)["']/,
  "PWA icon stage plan must not spawn commands or mutate files."
);

assertContains(
  "verifier",
  /audit-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?print-pwa-icon-local-batch-stage-plan\.mjs/,
  "PWA icon verifier must run the stage-plan audit before printing the stage plan."
);

if (findings.length > 0) {
  console.error("PWA icon local batch stage-plan audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "PWA icon local batch stage-plan audit passed: icon publish scope is printable, caged, and non-mutating."
);
