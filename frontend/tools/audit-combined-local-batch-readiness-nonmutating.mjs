#!/usr/bin/env node

/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  package: "frontend/package.json",
  verifier: "frontend/tools/verify-combined-local-batch-readiness.mjs",
  stagePlan: "frontend/tools/print-combined-local-batch-stage-plan.mjs",
  stagePlanAudit: "frontend/tools/audit-combined-local-batch-stage-plan.mjs",
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
  "verify:combined-local-batch-readiness",
  "node tools/verify-combined-local-batch-readiness.mjs"
);
assertScript(
  "audit:combined-local-batch-readiness-nonmutating",
  "node tools/audit-combined-local-batch-readiness-nonmutating.mjs"
);

assertContains(
  "verifier",
  /audit-combined-local-batch-manifest\.mjs[\s\S]*?audit-combined-local-batch-readiness-nonmutating\.mjs[\s\S]*?audit-combined-local-batch-stage-plan\.mjs[\s\S]*?print-combined-local-batch-stage-plan\.mjs[\s\S]*?audit-combined-local-batch-status-scope\.mjs[\s\S]*?verify-evidence-publish-readiness-local\.mjs[\s\S]*?verify-pwa-icon-publish-readiness-local\.mjs[\s\S]*?command: "git"[\s\S]*?args: \["diff", "--check"\]/,
  "Combined readiness verifier must run only combined audits, both local readiness verifiers, and git diff --check."
);

assertContains(
  "verifier",
  /This does not stage, commit, push, trigger GitHub Actions, deploy, prove Render state, prove live evidence behavior, prove live-site availability, or refresh existing phone shortcut caches/,
  "Combined readiness verifier must print its non-publishing proof limit."
);

assertContains(
  "verifier",
  /Combined local batch readiness verification passed:[\s\S]*?combined manifest audit[\s\S]*?non-mutating audit[\s\S]*?combined stage-plan audit[\s\S]*?combined stage-plan print[\s\S]*?combined status-scope audit[\s\S]*?evidence verifier[\s\S]*?PWA icon verifier[\s\S]*?whitespace check passed/,
  "Combined readiness verifier success message must name every local gate it actually ran."
);

assertNotContains(
  "verifier",
  /\b(?:git|gh)\s+(?:add|commit|push|checkout|reset|merge|rebase|tag|release|workflow|run)\b/,
  "Combined readiness verifier must not embed mutating git or gh shell commands."
);

assertNotContains(
  "verifier",
  /args:\s*\[[^\]]*"(?:add|commit|push|checkout|reset|merge|rebase|tag)"[^\]]*\]/,
  "Combined readiness verifier must not pass mutating git args."
);

assertNotContains(
  "verifier",
  /command:\s*["']gh["']|command:\s*["']curl["']|command:\s*["']npm["'][\s\S]*?(?:deploy|publish)|hooks\.render\.com|RENDER_[A-Z_]*(?:HOOK|KEY|TOKEN|SECRET)/,
  "Combined readiness verifier must not call gh, curl, npm deploy/publish, Render hooks, or Render secret variables."
);

assertNotContains(
  "verifier",
  /writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|mkdirSync|rmdirSync|execSync/,
  "Combined readiness verifier must not write files, delete files, or use opaque shell execution."
);

assertContains(
  "stagePlan",
  /audit:combined-local-batch-manifest[\s\S]*?audit:combined-local-batch-readiness-nonmutating[\s\S]*?verify:combined-local-batch-readiness[\s\S]*?Unabated truth:[\s\S]*?does not stage, commit, push, trigger GitHub Actions, deploy/,
  "Combined stage plan must list the combined readiness verifier and non-mutating audit."
);

assertContains(
  "stagePlanAudit",
  /verify:combined-local-batch-readiness[\s\S]*?audit:combined-local-batch-readiness-nonmutating/,
  "Combined stage-plan audit must cage the combined readiness verifier and non-mutating audit references."
);

if (findings.length > 0) {
  console.error("Combined local batch readiness non-mutating audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Combined local batch readiness non-mutating audit passed: the combined verifier remains local, read-only, and non-publishing."
);
