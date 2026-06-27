/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  trust: "src/pages/TrustScorePage.tsx",
  package: "package.json",
  protocol: "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md",
};

const sourceByFile = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);

const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(file, source, index, message, text = "Expected pattern was not found.") {
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 280),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByFile[key];
  if (pattern.test(source)) return;
  addFinding(files[key], source, -1, message, text);
}

function assertNotContains(key, pattern, message) {
  const source = sourceByFile[key];
  source.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file: files[key],
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

assertContains(
  "trust",
  /const financeDisciplineCards:[\s\S]*?"Trust limit"[\s\S]*?"Available capacity"[\s\S]*?"Locked support"[\s\S]*?"Overexposure"[\s\S]*?"Risk level"/,
  "Finance Discipline lane must keep a plain card model for limit, capacity, locked support, overexposure, and risk."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "finance" \? "block" : "none"[\s\S]*?Finance Discipline[\s\S]*?What money discipline says about trust/,
  "Finance Discipline lane must open with a plain-language lead gated to the finance lane."
);

assertContains(
  "trust",
  /It does not[\s\S]*?move money[\s\S]*?create a bank guarantee[\s\S]*?start auto-debit[\s\S]*?Finance[\s\S]*?fuller money story/,
  "Finance Discipline lane must clearly separate Trust Passport trust signals from actual Finance money movement."
);

assertContains(
  "trust",
  /"Requester repayment delta"[\s\S]*?ruleset\?\.borrower_repayment_delta[\s\S]*?"Support repayment delta"[\s\S]*?ruleset\?\.guarantor_repayment_delta/,
  "Trust Passport technical finance rows must label backend borrower deltas as requester repayment deltas in visible copy."
);

assertNotContains(
  "trust",
  /"Borrower repayment delta"/,
  "Trust Passport technical finance rows must not restore old Borrower repayment delta wording."
);

assertContains(
  "trust",
  /function trustIconBadge\([\s\S]*?linear-gradient\(180deg, rgba\(255,255,255,0\.98\)[\s\S]*?size=\{Math\.max\(26, Math\.round\(size \* 0\.96\)\)\}[\s\S]*?financeDisciplineCards:[\s\S]*?"Trust limit"[\s\S]*?"financeInstitution"[\s\S]*?"Overexposure"[\s\S]*?"financeInstitution"[\s\S]*?financeDisciplineCards\.map\(\(\[label, value, detail, icon\]\) =>[\s\S]*?trustIconBadge\(icon, 28[\s\S]*?\{value\}[\s\S]*?\{detail\}/,
  "Finance Discipline lane must render the finance signal cards with real icons, values, and plain detail."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "evidence" \|\|[\s\S]*?activeTrustPassportLane === "finance"[\s\S]*?8\. Evidence & institutional context/,
  "Finance Discipline lane must keep the deeper institutional evidence context available only inside the active finance or evidence lane."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "documents" \? "block" : "none"[\s\S]*?7\. Shareable trust tools/,
  "Finance Discipline lane must not absorb Documents / TrustSlip actions."
);

assertContains(
  "package",
  /"audit:trust-passport-finance-discipline-lane"/,
  "Trust Passport Finance Discipline lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Trust Passport Finance Discipline lane work[\s\S]*?audit:trust-passport-finance-discipline-lane/,
  "Guided work protocol must require the Trust Passport Finance Discipline lane audit."
);

if (findings.length > 0) {
  console.error("Trust Passport Finance Discipline lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Trust Passport Finance Discipline lane audit passed.");
