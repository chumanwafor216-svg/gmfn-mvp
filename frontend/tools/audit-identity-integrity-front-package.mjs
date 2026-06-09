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
  /function iconTile\([\s\S]*?width: 46[\s\S]*?height: 46[\s\S]*?borderRadius: 16[\s\S]*?boxShadow:/,
  "Identity Integrity icons must use strong route-local pictogram tiles, not faded inline marks."
);

assertContains(
  /function sectionIconHeader\([\s\S]*?icon: TrustPaperIconName[\s\S]*?TrustPaperIcon name=\{icon\} size=\{23\} strokeWidth=\{2\.85\}/,
  "Identity Integrity secondary sections must keep strong SVG-led headers instead of text-only explanation blocks."
);

assertContains(
  /function defaultCollapseState\(\): CollapseState \{[\s\S]*?summary: true,[\s\S]*?continuity: true,[\s\S]*?recovery: true,[\s\S]*?reasons: true,[\s\S]*?timeline: true,[\s\S]*?next: true/,
  "Identity Integrity secondary readings, continuity, recovery, reasons, timeline, and next-step panels must stay collapsed by default."
);

assertContains(
  /const IDENTITY_PAGE_UI_STORAGE_KEY = "gmfn\.identityPage\.sections\.v2";/,
  "Identity Integrity must bump the section-state storage key when default exposure changes so old open layouts do not persist on pilot phones."
);

assertContains(
  /type TrustSlipRecord = \{[\s\S]*?bank_details_recorded\?: boolean \| null;[\s\S]*?identity_context\?: Record<string, any> \| null;[\s\S]*?function normalizeTrustSlipRecord[\s\S]*?src\?\.identity_context \|\| null/,
  "Identity Integrity must preserve TrustSlip identity context so recorded bank, phone, photo, and ID evidence are not thrown away before rendering."
);

assertContains(
  /const identityContext = trustSlip\?\.identity_context \|\| \{\};[\s\S]*?trustSlip\?\.bank_details_recorded[\s\S]*?identityContext\?\.bank_details_recorded[\s\S]*?trustSlip\?\.official_id_recorded[\s\S]*?identityContext\?\.official_id_recorded/,
  "Identity Integrity task readiness must read canonical TrustSlip identity evidence, not only /me fields and clan-filtered events."
);

assertContains(
  /linear-gradient\(180deg, #0B3E78 0%, #061827 100%\)[\s\S]*?linear-gradient\(180deg, #F8D56B 0%, #D6AA45 100%\)/,
  "Identity Integrity icon tiles must use strong navy and gold contrast surfaces."
);

assertContains(
  /taskIconBadge\(active, item\.tone\)[\s\S]*?TrustPaperIcon[\s\S]*?size=\{active \? 20 : 18\}[\s\S]*?strokeWidth=\{2\.85\}/,
  "Identity Integrity task selector icons must stay large, dark, and badge-backed on phone."
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
  /debugId="identity-integrity\.toggle-continuity"[\s\S]*?debugId="identity-integrity\.toggle-recovery"[\s\S]*?activeIdentityTask === "recovery"[\s\S]*?recovery\.shouldVerify/,
  "Identity Integrity continuity and recovery panels must stay collapsible, while recovery opens for the active or required recovery task."
);

assertContains(
  /IDENTITY_TASK_KEYS[\s\S]*?requestedIdentityTask[\s\S]*?completionMode[\s\S]*?identityTaskTarget\(task: IdentityTaskKey\)[\s\S]*?mode=complete/,
  "Identity Integrity pending proof tasks must support focused completion deep links instead of dead actions."
);

assertContains(
  /data-identity-integrity-completion-target="true"[\s\S]*?Completion path[\s\S]*?activeTask\.completionSteps/,
  "Identity Integrity active task must show the compact completion path for the selected proof."
);

assertContains(
  /startSignedInPhoneVerification/,
  "Identity Integrity must use the signed-in phone start API."
);

assertContains(
  /confirmSignedInPhoneVerification/,
  "Identity Integrity must use the signed-in phone confirm API."
);

assertContains(
  /phoneTaskMessage[\s\S]*?setPhoneTaskMessage\(/,
  "Identity Integrity must keep local phone task response state."
);

assertContains(
  /data-identity-integrity-phone-completion="true"[\s\S]*?data-identity-integrity-phone-response="true"[\s\S]*?\{phoneTaskMessage\}[\s\S]*?debugId="identity-integrity\.phone-completion-submit"/,
  "Identity Integrity must show the phone completion response inside the phone form instead of a dead or disappearing phone requirement."
);

assertContains(
  /recordSignedInOfficialId[\s\S]*?data-identity-integrity-official-id-completion="true"[\s\S]*?debugId="identity-integrity\.official-id-completion-submit"/,
  "Identity Integrity must provide the signed-in official-ID evidence form instead of a dead ID requirement."
);

assertContains(
  /recordSignedInIdentityPhoto[\s\S]*?data-identity-integrity-photo-completion="true"[\s\S]*?debugId="identity-integrity\.identity-photo\.selfie"[\s\S]*?debugId="identity-integrity\.identity-photo\.id-photo"[\s\S]*?debugId="identity-integrity\.identity-photo\.record"/,
  "Identity Integrity must provide signed-in selfie and ID-photo evidence capture instead of an explanation-only ID route."
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
