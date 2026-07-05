/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = {
  package: "frontend/package.json",
  map: "docs/GSN_EVIDENCE_DISPLAY_IMPLEMENTATION_MAP_DRAFT.md",
  contract: "docs/GSN_EVIDENCE_DISPLAY_CONTRACT_DRAFT.md",
  decisionLog: "docs/GSN_EVIDENCE_FIELD_MAPPING_DECISION_LOG.md",
  handoff: "docs/HANDOFF_NOTES.md",
  protectedFreeze: "frontend/tools/audit-protected-button-freeze.mjs",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(repoRoot, file), "utf8"),
  ])
);

const packageJson = JSON.parse(sourceByKey.package);
const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const source = sourceByKey[key];
  findings.push({
    file: files[key],
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 380),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}

function assertScript(name, command) {
  if (packageJson.scripts?.[name] === command) return;
  findings.push({
    file: files.package,
    line: 1,
    message: `Package script ${name} must stay registered.`,
    text: `Expected ${JSON.stringify(command)}, found ${JSON.stringify(
      packageJson.scripts?.[name]
    )}.`,
  });
}

function assertTool(path) {
  if (existsSync(join(repoRoot, path))) return;
  findings.push({
    file: path,
    line: 1,
    message: "Expected evidence boundary audit/smoke tool is missing.",
    text: path,
  });
}

[
  [
    "audit:evidence-display-boundary-batch",
    "node tools/audit-evidence-display-boundary-batch.mjs",
  ],
  [
    "audit:evidence-display-boundary-suite",
    "node tools/audit-evidence-display-boundary-suite.mjs",
  ],
  [
    "audit:public-trustslip-verify-boundary",
    "node tools/audit-public-trustslip-verify-boundary.mjs",
  ],
  [
    "audit:community-confirmation-outcome-boundary",
    "node tools/audit-community-confirmation-outcome-boundary.mjs",
  ],
  [
    "audit:community-verification-boundary",
    "node tools/audit-community-verification-boundary.mjs",
  ],
  [
    "audit:trust-passport-trustslip-boundary",
    "node tools/audit-trust-passport-trustslip-boundary.mjs",
  ],
  [
    "audit:trust-timeline-evidence-boundary",
    "node tools/audit-trust-timeline-evidence-boundary.mjs",
  ],
  [
    "audit:finance-loan-evidence-boundary",
    "node tools/audit-finance-loan-evidence-boundary.mjs",
  ],
  [
    "audit:marketplace-shop-evidence-boundary",
    "node tools/audit-marketplace-shop-evidence-boundary.mjs",
  ],
  [
    "audit:community-domain-evidence-readiness-boundary",
    "node tools/audit-community-domain-evidence-readiness-boundary.mjs",
  ],
  [
    "audit:evidence-field-mapping-decision-log",
    "node tools/audit-evidence-field-mapping-decision-log.mjs",
  ],
  [
    "smoke:community-confirmation-outcome-boundary",
    "node tools/smoke-community-confirmation-outcome-boundary.mjs",
  ],
  [
    "smoke:community-verification-boundary",
    "node tools/smoke-community-verification-boundary.mjs",
  ],
  [
    "smoke:public-trustslip-verify-states",
    "node tools/smoke-public-trustslip-verify-states.mjs",
  ],
  [
    "smoke:trust-passport-trustslip-boundary",
    "node tools/smoke-trust-passport-trustslip-boundary.mjs",
  ],
  [
    "smoke:trust-timeline-evidence-boundary",
    "node tools/smoke-trust-timeline-evidence-boundary.mjs",
  ],
  [
    "smoke:trustslip-verify-private-evidence-boundary",
    "node tools/smoke-trustslip-verify-private-evidence-boundary.mjs",
  ],
].forEach(([name, command]) => assertScript(name, command));

[
  "frontend/tools/audit-evidence-display-boundary-suite.mjs",
  "frontend/tools/audit-evidence-display-boundary-batch.mjs",
  "frontend/tools/audit-public-trustslip-verify-boundary.mjs",
  "frontend/tools/audit-community-confirmation-outcome-boundary.mjs",
  "frontend/tools/audit-community-verification-boundary.mjs",
  "frontend/tools/audit-trust-passport-trustslip-boundary.mjs",
  "frontend/tools/audit-trust-timeline-evidence-boundary.mjs",
  "frontend/tools/audit-finance-loan-evidence-boundary.mjs",
  "frontend/tools/audit-marketplace-shop-evidence-boundary.mjs",
  "frontend/tools/audit-community-domain-evidence-readiness-boundary.mjs",
  "frontend/tools/audit-evidence-field-mapping-decision-log.mjs",
  "frontend/tools/smoke-community-confirmation-outcome-boundary.mjs",
  "frontend/tools/smoke-community-verification-boundary.mjs",
  "frontend/tools/smoke-public-trustslip-verify-states.mjs",
  "frontend/tools/smoke-trust-passport-trustslip-boundary.mjs",
  "frontend/tools/smoke-trust-timeline-evidence-boundary.mjs",
  "frontend/tools/smoke-trustslip-verify-private-evidence-boundary.mjs",
].forEach(assertTool);

assertContains(
  "contract",
  /Evidence Display Contract Draft[\s\S]*?source_engine[\s\S]*?visibility[\s\S]*?verification_state/,
  "Evidence display contract must still define source, visibility, and state fields."
);

assertContains(
  "contract",
  /7\. what this confirms[\s\S]*?8\. what this does not confirm[\s\S]*?The route says what the evidence confirms\.[\s\S]*?The route says what the evidence does not confirm\./,
  "Evidence display contract must still require both confirms and does-not-confirm truth boundaries."
);

assertContains(
  "map",
  /Suggested Implementation Order[\s\S]*?1\. Audit public TrustSlip Verify[\s\S]*?2\. Audit Community Verify[\s\S]*?3\. Audit `\/app\/trust` and `\/app\/trust-slip`[\s\S]*?4\. Audit Trust Timeline[\s\S]*?5\. Audit Finance\/Loans[\s\S]*?6\. Audit Marketplace\/Public Shop[\s\S]*?7\. Audit Community Domain evidence\/readiness[\s\S]*?8\. Only then decide which language belongs in shared helpers/,
  "Evidence display map must keep the route-family audit order visible."
);

assertContains(
  "map",
  /Field Mapping Gaps[\s\S]*?`evidence_kind`[\s\S]*?`source_engine`[\s\S]*?`verification_state`[\s\S]*?`visibility`[\s\S]*?`provenance`[\s\S]*?`excluded_claims`[\s\S]*?`maturity_label`[\s\S]*?`reference_fingerprint`[\s\S]*?`related_trust_event_id`[\s\S]*?`trustslip_eligible`/,
  "Evidence display map must still list the shared field gaps before any runtime abstraction."
);

assertContains(
  "decisionLog",
  /Keep evidence-display meaning route-local for now[\s\S]*?Do not add a new `EvidenceDisplayRecord`, `EvidenceKind`, or backend schema in[\s\S]*?this batch/,
  "Decision log must keep the suite conservative and block premature evidence schemas."
);

assertContains(
  "decisionLog",
  /Public TrustSlip Verify[\s\S]*?Community Confirmation Outcome[\s\S]*?Marketplace \/ Trade Evidence[\s\S]*?Finance \/ Support Readiness[\s\S]*?Community Domain Evidence Readiness/,
  "Decision log must preserve the audited route-family spread."
);

assertContains(
  "decisionLog",
  /Use existing shared primitives:[\s\S]*?TrustDocumentLanguage\.tsx[\s\S]*?gsnSnapshotPaper\.ts[\s\S]*?trustBandLanguage\.ts[\s\S]*?trustDocumentSnapshots\.ts[\s\S]*?trustDocumentFamilyMap\.ts[\s\S]*?identityEvidenceCompletion\.ts/,
  "Decision log must keep existing shared primitives as the reuse layer."
);

assertContains(
  "handoff",
  /Evidence field mapping decision log caged locally[\s\S]*?Evidence-display meaning stays route-local for now/,
  "Handoff must preserve the evidence field mapping decision for the next session."
);

assertContains(
  "handoff",
  /Community Domain evidence readiness boundary caged locally[\s\S]*?Marketplace \/ Public Shop evidence boundary caged locally[\s\S]*?Finance \/ loan evidence boundary caged locally/,
  "Handoff must preserve recent route-family boundary audit context."
);

assertContains(
  "protectedFreeze",
  /audit-community-confirmation-outcome-boundary\.mjs[\s\S]*?audit-community-verification-boundary\.mjs/,
  "Protected button freeze umbrella must keep public community evidence route audits visible."
);

if (findings.length > 0) {
  console.error("Evidence display boundary suite audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Evidence display boundary suite audit passed: route-family audits, smoke guards, docs, handoff context, and conservative field-mapping decisions are registered and discoverable."
);
