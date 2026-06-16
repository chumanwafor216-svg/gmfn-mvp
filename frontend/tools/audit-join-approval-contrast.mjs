/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = "src/pages/JoinApprovalPage.tsx";
const text = readFileSync(join(frontendRoot, file), "utf8");
const findings = [];

function assertContains(pattern, message) {
  if (!pattern.test(text)) {
    findings.push({
      message,
      text: "Expected contrast pattern was not found.",
    });
  }
}

function assertNotContains(pattern, message) {
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

assertContains(
  /bg: "linear-gradient\(180deg, rgba\(9,48,39,0\.98\)[\s\S]*?text: "#7CF0AA"[\s\S]*?helper: "#D9FBE6"/,
  "Approved join status must use a dark readable status card, not a pale card with dark-page label styles."
);

assertContains(
  /<div style=\{\{ marginTop: 10, \.\.\.helperText\(\), color: tone\.helper \}\}>/,
  "Join status helper text must use the status tone helper color so contrast stays readable across states."
);

assertNotContains(
  /bg: "#ECFDF5"|border: "1px solid #A7F3D0"|text: "#065F46"/,
  "JoinApprovalPage must not bring back the washed-out light approved status palette."
);

if (findings.length > 0) {
  console.error("Join approval contrast audit failed:");
  for (const finding of findings) {
    const loc = finding.line ? `${file}:${finding.line}` : file;
    console.error(`- ${loc} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Join approval contrast audit passed.");
