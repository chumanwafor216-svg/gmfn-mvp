/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const findings = [];

function assertContains(file, pattern, message) {
  const text = read(file);
  if (!pattern.test(text)) {
    findings.push({ file, message, text: "Expected pattern was not found." });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  if (pattern.test(text)) {
    findings.push({ file, message, text: "Forbidden pattern was found." });
  }
}

assertContains(
  "gmfn_backend/app/api/routes/pilot_readiness.py",
  /def pilot_readiness_checks\(\)[\s\S]*?"loan_repayment_e2e"[\s\S]*?"TrustSlip presentation"[\s\S]*?"Frontend route consistency"[\s\S]*?"Evidence capture pack"/,
  "Pilot readiness must keep explicit partial proof items for repayment E2E, TrustSlip, frontend route consistency, and evidence packaging."
);

assertContains(
  "gmfn_backend/app/api/routes/pilot_readiness.py",
  /"why_it_matters"[\s\S]*?"complete"[\s\S]*?"remaining"[\s\S]*?"next_step"[\s\S]*?"next_route"/,
  "Readiness checks must include why, done work, remaining work, next step, and next route."
);

assertContains(
  "gmfn_backend/app/api/routes/pilot_readiness.py",
  /"overall_label"[\s\S]*?"Near ready with evidence gaps"[\s\S]*?"truth_statement"/,
  "Pilot readiness must expose a plain-language overall label and truth statement."
);

assertContains(
  "gmfn_backend/app/api/routes/pilot_readiness.py",
  /def evidence_pack_checklist\(\)[\s\S]*?"status": "needs_capture"[\s\S]*?"accepted_count"[\s\S]*?"folder_shape"[\s\S]*?@router\.get\("\/evidence-pack-checklist"\)/,
  "Pilot readiness must expose the evidence-pack checklist and keep accepted proof separate from checklist readiness."
);

assertContains(
  "gmfn_backend/app/api/routes/protocol_status.py",
  /"surface_brand": "GSN"[\s\S]*?"truth_statement"[\s\S]*?"summary_details"[\s\S]*?"status_counts"/,
  "Protocol status must keep GSN surface branding, a truth statement, structured summary details, and counts."
);

assertContains(
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  /function stringList[\s\S]*?function readinessStatusBadge/,
  "Trust Command Centre must normalize readiness lists and status badge styles."
);

assertContains(
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  /pilotOverallLabel[\s\S]*?pilotTruthStatement/,
  "Trust Command Centre must show backend overall readiness labels and truth statements."
);

assertContains(
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  /Community liquidity/,
  "Trust Command Centre must use current GSN community language for liquidity, not older clan wording."
);

assertNotContains(
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  /Clan liquidity/,
  "Trust Command Centre must not expose older clan wording in the visible liquidity card."
);

assertContains(
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  /Needs proof: \{Number\(executiveReading\.pilotReadiness\?\.partial_count[\s\S]*?Needs proof\{" "\}\s*\{Number\(executiveReading\.pilotReadiness\?\.partial_count/,
  "Trust Command Centre must translate protocol partial counts into user-facing Needs proof language."
);

assertContains(
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  /evidencePackChecklist = executiveReading\.pilotReadiness\?\.evidence_pack_checklist[\s\S]*?evidencePackChecklistItems = rowsOf<any>\(evidencePackChecklist\?\.items\)\.slice\(0, 4\)[\s\S]*?Evidence pack: \{evidencePackChecklistLabel\}\. Accepted[\s\S]*?evidencePackChecklistTruth[\s\S]*?Evidence proof to capture first[\s\S]*?required_proof[\s\S]*?replace\(\/_\/g, " "\)/,
  "Trust Command Centre must show the evidence-pack checklist status, accepted proof count, and first proof areas without implying evidence has already been accepted."
);

assertNotContains(
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  /\|\s*Partial/,
  "Trust Command Centre must not expose the raw Partial label in visible readiness count copy."
);

assertContains(
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  /completeItems[\s\S]*?remainingItems[\s\S]*?nextStep[\s\S]*?nextRoute[\s\S]*?Still needed:[\s\S]*?Open route/,
  "Readiness gap cards must show done work, remaining work, the next step, and the route action."
);

if (findings.length) {
  console.error("Protocol readiness audit failed:");
  findings.forEach((finding) => {
    console.error(`\n${finding.file}: ${finding.message}`);
    console.error(finding.text);
  });
  process.exit(1);
}

console.log("Protocol readiness audit passed.");
