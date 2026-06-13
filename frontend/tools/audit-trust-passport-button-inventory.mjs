/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const trustPassportFile = "src/pages/TrustScorePage.tsx";
const source = readFileSync(join(frontendRoot, trustPassportFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function debugIdFrom(block) {
  return (
    block.match(/debugId="([^"]+)"/)?.[1] ||
    block.match(/debugId=\{`([^`]+)`\}/)?.[1] ||
    block.match(/debugId=\{([^}]+)\}/)?.[1] ||
    ""
  ).replace(/\s+/g, " ");
}

function assertContains(pattern, message, text = "Expected pattern was not found.") {
  if (pattern.test(source)) return;
  findings.push({
    file: trustPassportFile,
    line: 1,
    message,
    text,
  });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: trustPassportFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

const actionPattern =
  /<(PrimaryButton|SecondaryButton|SubtleButton|DangerButton)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  actions.push({
    tag: match[1],
    id: debugIdFrom(block),
    line: lineAt(match.index),
    block,
  });
}

const expectedSourceActions = 14;
const expectedRenderedActions = 22;

if (actions.length !== expectedSourceActions) {
  findings.push({
    file: trustPassportFile,
    line: 1,
    message: `Trust Passport stable source action inventory changed from ${expectedSourceActions} to ${actions.length}. Re-audit the new or removed action on phone before accepting this baseline.`,
    text: actions.map((action) => `${action.line}:${action.id || "missing-debugId"}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: trustPassportFile,
      line: action.line,
      message: "Every Trust Passport stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^trust-score\./.test(action.id) && action.id !== "item.debugId") {
    findings.push({
      file: trustPassportFile,
      line: action.line,
      message: "Trust Passport stable actions must stay in the trust-score debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/stableHeight=/.test(action.block)) {
    findings.push({
      file: trustPassportFile,
      line: action.line,
      message: "Every Trust Passport stable action must declare a fixed stableHeight for phone geometry.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const expectedOrder = [
  "trust-score.lane.${lane.key}",
  "trust-score.complete-identification",
  "trust-score.open-public-community-record",
  "debugId={item.debugId}",
  "trust-score.repair-next-step",
  "debugId={item.debugId}",
  "trust-score.refresh",
  "trust-score.copy-snapshot",
  "trust-score.open-trust-slip",
  "trust-score.verify",
  "trust-score.review-care",
  "trust-score.export",
  "trust-score.snapshot-open-trust-slip",
];

let cursor = -1;
for (const debugId of expectedOrder) {
  const next = source.indexOf(debugId, cursor + 1);
  if (next === -1) {
    findings.push({
      file: trustPassportFile,
      line: 1,
      message: "Trust Passport front-to-inner action inventory is missing an expected action.",
      text: debugId,
    });
    continue;
  }

  if (next < cursor) {
    findings.push({
      file: trustPassportFile,
      line: lineAt(next),
      message: "Trust Passport front-to-inner action order changed. Re-audit phone flow before accepting this reorder.",
      text: debugId,
    });
  }

  cursor = next;
}

assertContains(
  /debugId: "trust-score\.surface\.local-community-trust"[\s\S]*?debugId: "trust-score\.surface\.cross-community-consistency"[\s\S]*?debugId=\{item\.debugId\}/,
  "Trust Passport surface-card actions must use explicit stable debug IDs, not titles that can change with copy."
);

assertContains(
  /function scrollToPressureNotes\(\)[\s\S]*?pressureSectionRef\.current\?\.scrollIntoView\(\{[\s\S]*?block: "start"[\s\S]*?scrollMarginTop: isCompact \? 96 : 24/,
  "Trust Passport pressure-note action must keep mobile scroll clearance so sticky app chrome does not hide the target section."
);

assertContains(
  /gridTemplateColumns: isCompact[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?: "repeat\(3, minmax\(0, 1fr\)\)"[\s\S]*?gap: isCompact \? 8 : 10[\s\S]*?trustPassportLanes\.map\(\(lane\) =>[\s\S]*?stableHeight=\{isCompact \? 58 : 66\}[\s\S]*?debugId=\{`trust-score\.lane\.\$\{lane\.key\}`\}[\s\S]*?fontSize: isCompact \? 11\.5 : 14[\s\S]*?<GsnLegacyIcon name=\{lane\.icon\} size=\{isCompact \? 24 : 32\} decorative/,
  "Trust Passport lane selector must stay compact enough on phone for all six lanes to clear the bottom rail."
);

assertContains(
  /gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(4, minmax\(0, 1fr\)\)"[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.refresh"[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.copy-snapshot"[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.open-trust-slip"[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.verify"/,
  "Trust Passport shareable tools must keep shorter fixed phone heights while preserving the larger desktop paper controls."
);

assertContains(
  /padding: isCompact \? 12 : 24[\s\S]*?minHeight: isCompact \? "min\(720px, calc\(100svh - 132px\)\)" : undefined[\s\S]*?gridTemplateColumns: isCompact \? "88px minmax\(0, 1fr\)" : "132px minmax\(0, 1fr\)"[\s\S]*?width: isCompact \? 88 : 132[\s\S]*?height: isCompact \? 88 : 132[\s\S]*?overflow: "hidden"[\s\S]*?Snapshot 1[\s\S]*?Photo clear[\s\S]*?Identity Overview[\s\S]*?Community-backed identity snapshot[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?: "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?\? "36px minmax\(0, 1fr\)"[\s\S]*?: "46px minmax\(0, 1fr\)"[\s\S]*?overviewIconBox\(isCompact\)/,
  "Trust Passport identity overview must keep the portable snapshot package boundary, clear photo, and two-column fact grid."
);

assertContains(
  /import \{[\s\S]*?GsnLegacyIcon[\s\S]*?type GsnIconName[\s\S]*?\} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*?function overviewIconBox\(isCompact = false\)[\s\S]*?width: isCompact \? 36 : 46[\s\S]*?height: isCompact \? 36 : 46[\s\S]*?GsnLegacyIcon name=\{icon\} size=\{isCompact \? 31 : 40\} decorative/,
  "Trust Passport identity fact icons must stay as strong 3D object tiles, not weak inline marks."
);

assertContains(
  /const \[identityEvidenceOpen, setIdentityEvidenceOpen\][\s\S]*?data-trust-passport-identity-evidence-meter="true"[\s\S]*?marginTop: isCompact \? 12 : 14[\s\S]*?isCompact \? "Evidence" : "Identity evidence"[\s\S]*?isCompact[\s\S]*?`\$\{identityEvidence\.score\}% ready`[\s\S]*?setIdentityEvidenceOpen\(\(open\) => !open\)[\s\S]*?alignSelf: "center"[\s\S]*?debugId="trust-score\.identity-evidence-meter\.toggle"[\s\S]*?identityEvidenceOpen \?/,
  "Trust Passport identity evidence meter must stay collapsed behind a stable Open/Hide toggle so the snapshot remains portable."
);

assertContains(
  /function overviewStatusBox\(ok: boolean, muted = false\)[\s\S]*?minHeight: 36[\s\S]*?display: "inline-grid"[\s\S]*?gridTemplateColumns: "24px minmax\(0, 1fr\)"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?verificationBadges\.map\(\(item\) =>[\s\S]*?overviewStatusBox\(item\.ok, item\.muted\)[\s\S]*?<GsnLegacyIcon name=\{item\.icon\} size=\{22\} decorative[\s\S]*?Active in \{passportVm\.technicalDetail\.activeClans\}/,
  "Trust Passport verification badges must stay as compact one-line snapshot status chips."
);

assertContains(
  /debugId="trust-score\.complete-identification"[\s\S]*?GsnLegacyIcon name="id"[\s\S]*?Complete ID checks[\s\S]*?debugId="trust-score\.open-public-community-record"[\s\S]*?OpenRecordGlyph/,
  "Trust Passport identity snapshot must include a fixed completion action before the public community record action."
);

assertContains(
  /const \[showIdentityCompletionPaths, setShowIdentityCompletionPaths\][\s\S]*?identityCompletionRows[\s\S]*?trust-score\.completion\.phone[\s\S]*?trust-score\.completion\.community[\s\S]*?trust-score\.completion\.bank[\s\S]*?trust-score\.completion\.passport[\s\S]*?setShowIdentityCompletionPaths\(\(open\) => !open\)[\s\S]*?Only real completion routes open[\s\S]*?debugId=\{item\.debugId\}/,
  "Trust Passport Complete ID checks must open a compact completion-path chooser instead of routing directly to the explanatory Identity / CCI page."
);

assertContains(
  /payoutDetails: routeTarget\([\s\S]*?"payoutDetails"[\s\S]*?communityConfirmations: routeTarget\([\s\S]*?"communityConfirmationInbox"[\s\S]*?communityVerifyPath \|\| routes\.communityConfirmations[\s\S]*?target: routes\.payoutDetails/,
  "Trust Passport identity completion paths must include real bank/wallet and community completion routes."
);

assertContains(
  /trustSlipVerify: routeTarget\([\s\S]*?"merchantVerify"[\s\S]*?"trust-score\.route\.trust-slip-verify"[\s\S]*?const verifyAppPath = useMemo\([\s\S]*?trustSlipVerifyAppPath\(trustSlipCode, routes\.trustSlipVerify\)[\s\S]*?onClick=\{\(\) => openTrustRoute\(verifyAppPath\)\}[\s\S]*?debugId="trust-score\.verify"/,
  "Trust Passport TrustSlip verify action must open the signed-in verifier with the visible TrustSlip code instead of drifting to the wrong TrustSlip surface."
);

assertContains(
  /stableHeight=\{isCompact \? 50 : 58\}[\s\S]*?fullWidth[\s\S]*?debugId="trust-score\.open-public-community-record"[\s\S]*?OpenRecordGlyph/,
  "Trust Passport public community record action must keep the screenshot-style fixed CTA."
);

assertNotContains(
  /minHeight: 62|gridTemplateColumns: "44px minmax\(0, 1fr\)"|width: isCompact \? 104 : 190|height: isCompact \? 104 : 190|right: isCompact \? -8 : -7|bottom: isCompact \? -8 : -7/g,
  "Trust Passport identity snapshot must not regress to the old tall screenshot-style geometry."
);

assertContains(
  /gridTemplateColumns: isCompact \? "82px minmax\(0, 1fr\)" : "112px minmax\(0, 1fr\)"[\s\S]*?fontSize: isCompact \? 54 : 76/,
  "Trust Passport verdict tile must shrink on phone so the verdict text keeps enough room."
);

assertContains(
  /gridTemplateColumns: isCompact \? "1fr" : "minmax\(0, 1fr\) auto"[\s\S]*?alignItems: isCompact \? "start" : "center"[\s\S]*?GsnLegacyIcon[\s\S]*?statusPillStyle\(item\.status\)/,
  "Trust Passport question rows must stack status pills under long labels on phone."
);

assertContains(
  /display: isCompact \? "grid" : "flex"[\s\S]*?fullWidth=\{isCompact\}[\s\S]*?debugId=\{item\.debugId\}/,
  "Trust Passport trust-surface actions must expand to full-width fixed controls on phone."
);

assertContains(
  /gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(3, minmax\(0, 1fr\)\)"[\s\S]*?gridTemplateColumns: isCompact \? "1fr" : "minmax\(0, 1fr\) auto"[\s\S]*?textAlign: isCompact \? "left" : "right"[\s\S]*?overflowWrap: "break-word"/,
  "Trust Passport institutional evidence rows must stack values on phone instead of squeezing right-aligned text."
);

assertNotContains(
  /overflowWrap: "anywhere"/g,
  "Trust Passport page must not use harsh anywhere wrapping that can split IDs or labels into awkward fragments on phone."
);

assertNotContains(
  /<(button|a|summary)\b|role="button"|data-gmfn-action-root|data-cta-id/g,
  "Trust Passport page must not bypass shared stable primitives with raw action roots."
);

if (findings.length > 0) {
  console.error("Trust Passport button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Trust Passport button inventory audit passed: ${actions.length} stable source actions, ${expectedRenderedActions} expected rendered action roots including the lane selector and two trust-surface cards.`
);
