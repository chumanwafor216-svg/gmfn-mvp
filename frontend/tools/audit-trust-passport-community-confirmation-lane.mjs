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

assertContains(
  "trust",
  /const communityConfirmationCards:[\s\S]*?"Community"[\s\S]*?"Community ID"[\s\S]*?"Community record"[\s\S]*?"Activity evidence"[\s\S]*?"Witness currentness"[\s\S]*?"Next witness renewal"[\s\S]*?"Public record"[\s\S]*?"Member credential"/,
  "Community Confirmation lane must keep a plain card model for community, Community ID, activity, witness currentness, renewal, public record, and member credential readiness."
);

assertContains(
  "trust",
  /activeTrustPassportLane === "community" \? "block" : "none"[\s\S]*?Community Confirmation[\s\S]*?Can this trust story be tied to a real community\?/,
  "Community Confirmation lane must open with a plain-language lead gated to the community lane."
);

assertContains(
  "trust",
  /communityVerifyPath \? "Ready to open" : "Needs community code"[\s\S]*?communityVerifyPath[\s\S]*?public community record can open[\s\S]*?public record cannot open until a community code is visible/,
  "Community Confirmation lane must explain public community record readiness from the existing community verify path."
);

assertContains(
  "trust",
  /communityConfirmationCards\.map\(\(\[label, value, detail, icon, status\]\) =>[\s\S]*?<EvidenceMeter status=\{status\}>[\s\S]*?\{status\}[\s\S]*?\{value\}[\s\S]*?\{detail\}/,
  "Community Confirmation lane must render readiness cards with icons, raised inert meters, value, and plain detail."
);

assertContains(
  "trust",
  /debugId="trust-score\.community-lane\.open-public-community-record"[\s\S]*?Open community record[\s\S]*?debugId="trust-score\.community-lane\.open-member-credential"[\s\S]*?Open member credential[\s\S]*?debugId="trust-score\.community-lane\.ask-for-witness"[\s\S]*?Ask for witness/,
  "Community Confirmation lane must preserve stable public record, member credential, and witness-request actions."
);

assertContains(
  "trust",
  /5\. Trust surfaces[\s\S]*?trustSurfaceCards\.map[\s\S]*?debugId=\{item\.debugId\}/,
  "Community Confirmation lane must keep local and cross-community trust-surface actions behind the community lane."
);

assertContains(
  "package",
  /"audit:trust-passport-community-confirmation-lane"/,
  "Trust Passport Community Confirmation lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Trust Passport Community Confirmation lane work[\s\S]*?audit:trust-passport-community-confirmation-lane/,
  "Guided work protocol must require the Trust Passport Community Confirmation lane audit."
);

if (findings.length > 0) {
  console.error("Trust Passport Community Confirmation lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Trust Passport Community Confirmation lane audit passed.");
