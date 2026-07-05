#!/usr/bin/env node

/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  package: "frontend/package.json",
  verifier: "frontend/tools/verify-pwa-icon-publish-readiness-local.mjs",
  manifest: "docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md",
  stagePlan: "frontend/tools/print-pwa-icon-local-batch-stage-plan.mjs",
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
  "audit:pwa-icon-publish-readiness-nonmutating",
  "node tools/audit-pwa-icon-publish-readiness-nonmutating.mjs"
);
assertScript(
  "verify:pwa-icon-publish-readiness-local",
  "node tools/verify-pwa-icon-publish-readiness-local.mjs"
);

assertContains(
  "verifier",
  /audit-icon-protocol\.mjs[\s\S]*?audit-pwa-icon-publish-readiness-nonmutating\.mjs[\s\S]*?audit-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?print-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?audit-pwa-icon-local-batch-status-scope\.mjs[\s\S]*?args: \["run", "build"\][\s\S]*?command: "git"[\s\S]*?args: \["diff", "--check"\]/,
  "PWA icon publish-readiness verifier must run only icon audit, non-mutating audit, stage-plan audit, stage-plan print, status-scope audit, frontend build, and git diff --check."
);

assertContains(
  "verifier",
  /This does not stage, commit, push, trigger GitHub Actions, deploy, prove Render state, prove live-site availability, or refresh existing phone shortcut caches/,
  "PWA icon publish-readiness verifier must print its non-publishing proof limit."
);

assertContains(
  "verifier",
  /npmCommand = process\.platform === "win32" \? "npm\.cmd" : "npm"[\s\S]*?shell: process\.platform === "win32"[\s\S]*?shell: step\.shell \|\| false/,
  "PWA icon publish-readiness verifier must keep the Windows-safe npm build spawn path explicit."
);

assertNotContains(
  "verifier",
  /\b(?:git|gh)\s+(?:add|commit|push|checkout|reset|merge|rebase|tag|release|workflow|run)\b/,
  "PWA icon publish-readiness verifier must not embed mutating git or gh shell commands."
);

assertNotContains(
  "verifier",
  /args:\s*\[[^\]]*"(?:add|commit|push|checkout|reset|merge|rebase|tag)"[^\]]*\]/,
  "PWA icon publish-readiness verifier must not pass mutating git args."
);

assertNotContains(
  "verifier",
  /command:\s*["']gh["']|command:\s*["']curl["']|command:\s*["']npm["'][\s\S]*?(?:deploy|publish)|hooks\.render\.com|RENDER_[A-Z_]*(?:HOOK|KEY|TOKEN|SECRET)/,
  "PWA icon publish-readiness verifier must not call gh, curl, npm deploy/publish, Render hooks, or Render secret variables."
);

assertNotContains(
  "verifier",
  /writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|mkdirSync|rmdirSync|execSync/,
  "PWA icon publish-readiness verifier must not write files, delete files, or use opaque shell execution."
);

assertContains(
  "manifest",
  /verify:pwa-icon-publish-readiness-local[\s\S]*?icon protocol audit[\s\S]*?non-mutating audit[\s\S]*?stage-plan audit[\s\S]*?stage-plan print[\s\S]*?status-scope audit[\s\S]*?frontend production build[\s\S]*?git diff --check/,
  "PWA icon manifest must describe what the verifier runs."
);

assertContains(
  "stagePlan",
  /verify:pwa-icon-publish-readiness-local[\s\S]*?Unabated truth:[\s\S]*?does not prove Render deploy acceptance, deployment completion, live-site availability, Android WebAPK behavior, or iOS\/Android launcher cache refresh/,
  "PWA icon stage plan must keep the verifier listed and block live/cache overclaims."
);

if (findings.length > 0) {
  console.error("PWA icon publish-readiness non-mutating audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "PWA icon publish-readiness non-mutating audit passed: the readiness verifier remains local, read-only, and non-publishing."
);
