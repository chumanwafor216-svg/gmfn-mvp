/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageFile = "src/pages/IdentityIntegrityPage.tsx";
const source = readFileSync(join(frontendRoot, pageFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(pattern, message, text = "Expected pattern was not found.") {
  if (pattern.test(source)) return;
  findings.push({
    file: pageFile,
    line: 1,
    message,
    text,
  });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: pageFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

assertContains(
  /import \{[\s\S]*?TrustPaperIcon[\s\S]*?type TrustPaperIconName[\s\S]*?\} from "\.\.\/components\/TrustPaperMarks";/,
  "Identity Integrity must use the shared SVG trust pictogram set instead of emoji-style marks."
);

assertContains(
  /Stable identity, current status, and the next clean proof step\.[\s\S]*?data-identity-integrity-front-package="true"[\s\S]*?gridTemplateColumns: isCompact \? "76px minmax\(0, 1fr\)" : "104px minmax\(0, 1fr\)"/,
  "Identity Integrity front package must keep a compact phone header with a small photo anchor and short page subtitle."
);

assertContains(
  /data-identity-integrity-fact-grid="true"[\s\S]*?gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(4, minmax\(0, 1fr\)\)"[\s\S]*?compactFactCard\(\)[\s\S]*?TrustPaperIcon name=\{item\.icon\}/,
  "Identity Integrity front package must expose short identity facts in compact SVG-led mini cards."
);

assertContains(
  /data-identity-integrity-task-switcher="true"[\s\S]*?gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(5, minmax\(0, 1fr\)\)"[\s\S]*?debugId=\{`identity-integrity\.task\.\$\{item\.key\}`\}/,
  "Identity Integrity must keep the proof tasks as compact SVG-led selectors, not a long exposed explanation stack."
);

assertContains(
  /data-identity-integrity-active-task="true"[\s\S]*?openIdentityTask\(activeTask\)[\s\S]*?debugId="identity-integrity\.active-task-action"/,
  "Identity Integrity front package must show one active task action with an explicit response."
);

assertContains(
  /payoutDetails: routeTarget\([\s\S]*?"payoutDetails"[\s\S]*?communityConfirmations: routeTarget\([\s\S]*?"communityConfirmationInbox"[\s\S]*?to: routes\.communityConfirmations[\s\S]*?to: routes\.payoutDetails/,
  "Identity Integrity must route real bank/wallet and community tasks to real completion surfaces."
);

assertNotContains(
  /height: isCompact \? 240 : 270|<ExplainToggle[\s\S]*?What this screen does|Your stable GSN identity, your consistency across communities, what strengthened it, what weakened it/g,
  "Identity Integrity must not regress to the oversized photo hero or long explanation-first header."
);

assertNotContains(
  /<(button|a|summary)\b|role="button"|to="\/app|homeTo="\/app|backTo="\/app/g,
  "Identity Integrity page must not bypass shared stable primitives with raw action roots or hard-coded app links."
);

if (findings.length > 0) {
  console.error("Identity Integrity front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Identity Integrity front package audit passed: compact SVG-led identity package and active proof task are caged."
);
