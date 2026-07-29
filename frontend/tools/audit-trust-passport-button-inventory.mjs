/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const trustPassportFile = "src/pages/TrustScorePage.tsx";
const documentLaneFile = "src/pages/trustScore/TrustPassportDocumentLane.tsx";
const institutionalContextFile = "src/pages/trustScore/TrustPassportInstitutionalContext.tsx";
const trustPassportSource = readFileSync(join(frontendRoot, trustPassportFile), "utf8");
const documentLaneSource = readFileSync(join(frontendRoot, documentLaneFile), "utf8");
const institutionalContextSource = readFileSync(join(frontendRoot, institutionalContextFile), "utf8");
const source = trustPassportSource
  .replace(/<TrustPassportDocumentLane[\s\S]*?\/>/, documentLaneSource)
  .replace(/<TrustPassportInstitutionalContext[\s\S]*?\/>/, institutionalContextSource);
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

const expectedSourceActions = 24;
const expectedRenderedActions = 32;

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
  "trust-score.decision-primary-next-step",
  "trust-score.lane.${lane.key}",
  "trust-score.complete-identification",
  "trust-score.open-public-community-record",
  "trust-score.identity-evidence-meter.toggle",
  "debugId={item.debugId}",
  "trust-score.standing-decision-details.toggle",
  "trust-score.repair-next-step",
  "trust-score.community-lane.evidence-details.toggle",
  "trust-score.community-lane.open-public-community-record",
  "trust-score.community-lane.open-member-credential",
  "trust-score.community-lane.ask-for-witness",
  "debugId={item.debugId}",
  "trust-score.evidence-movement-details.toggle",
  "trust-score.refresh",
  "trust-score.copy-snapshot",
  "trust-score.open-trust-slip",
  "trust-score.verify",
  "trust-score.review-care",
  "trust-score.export",
  "trust-score.documents-lane.preview-details.toggle",
  "trust-score.snapshot-open-trust-slip",
  "trust-score.institutional-context-details.toggle",
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
  /const aggregatePassportReading = passportVm\.verdict\.lowData[\s\S]*?"Aggregate evidence building"[\s\S]*?const communityPortfolioDetail = passportVm\.evidenceScope\.summary;[\s\S]*?const trustPassportDecisionAnswer = !trustSlipCode[\s\S]*?"Evidence setup needed"[\s\S]*?: aggregatePassportReading[\s\S]*?const trustPassportDecisionLine = !trustSlipCode[\s\S]*?Issue the public TrustSlip before sharing evidence\.[\s\S]*?Aggregate reading first\. Primary community is the anchor, not the whole judgement\.[\s\S]*?Build aggregate evidence before relying on this passport\.[\s\S]*?const trustPassportPrimaryActionLabel =[\s\S]*?safeStr\(nextStep\.ctaLabel\)\.length <= 24 \? nextStep\.ctaLabel : "Open next step"[\s\S]*?const trustPassportPrimaryAction = !trustSlipCode[\s\S]*?label: "Issue TrustSlip"[\s\S]*?to: routes\.trustSlip[\s\S]*?label: trustPassportPrimaryActionLabel[\s\S]*?to: nextStep\.ctaTo[\s\S]*?const trustPassportDecisionFacts: Array<[\s\S]*?"Aggregate reading"[\s\S]*?"Primary anchor"[\s\S]*?"Community portfolio"[\s\S]*?communityPortfolioDetail[\s\S]*?"Next step"[\s\S]*?const trustPassportDecisionBoundaryRows: Array<\[string, string\]> = \[[\s\S]*?passportVm\.evidenceScope\.readingScope[\s\S]*?"Aggregate \+ anchor"[\s\S]*?\["Primary anchor", "Separate"\][\s\S]*?\["Guarantee", "No"\][\s\S]*?\["Government ID", "No"\][\s\S]*?\["Final decision", "Yours"\]/,
  "Trust Passport first viewport must compute one aggregate answer, one plain action line, four aggregate-scope facts, one primary next-step action, and a compact Decision Boundary."
);

assertContains(
  /data-trust-passport-decision-first="one-answer-four-facts"[\s\S]*?Aggregate Passport reading[\s\S]*?\{trustPassportDecisionAnswer\}[\s\S]*?\{trustPassportDecisionLine\}[\s\S]*?data-trust-passport-decision-facts="four-quick-facts"[\s\S]*?trustPassportDecisionFacts\.map[\s\S]*?debugId="trust-score\.decision-primary-next-step"[\s\S]*?trustPassportPrimaryAction\.label[\s\S]*?isCompact \? \([\s\S]*?<details[\s\S]*?data-trust-passport-decision-boundary="compact"[\s\S]*?<StableDisclosureSummary[\s\S]*?debugId="trust-score\.decision-boundary\.toggle"[\s\S]*?Decision Boundary[\s\S]*?Open limits[\s\S]*?: \([\s\S]*?<div[\s\S]*?data-trust-passport-decision-boundary="compact"[\s\S]*?Decision Boundary[\s\S]*?trustPassportDecisionBoundaryRows\.map[\s\S]*?<section[\s\S]*?ref=\{laneSelectorRef\}[\s\S]*?id="trust-passport-lanes"/,
  "Trust Passport must lead with aggregate Passport reading, four facts, one primary next-step action, and the compact mobile boundary before lane navigation or deeper passport details."
);
assertContains(
  /debugId: "trust-score\.surface\.local-community-trust"[\s\S]*?debugId: "trust-score\.surface\.cross-community-consistency"[\s\S]*?debugId=\{item\.debugId\}/,
  "Trust Passport surface-card actions must use explicit stable debug IDs, not titles that can change with copy."
);

assertContains(
  /function scrollToPressureNotes\(\)[\s\S]*?pressureSectionRef\.current[\s\S]*?revealElementWithoutJump\(pressureSectionRef\.current[\s\S]*?targetId: "pressure-notes"[\s\S]*?scrollMarginTop: isCompact \? 96 : 24/,
  "Trust Passport pressure-note action must keep mobile scroll clearance so sticky app chrome does not hide the target section."
);

assertContains(
  /function trustPassportLaneFromLocation\(locationLike: Pick<Location, "search" \| "hash">\): TrustPassportLaneKey[\s\S]*?community-confirmation[\s\S]*?return "community"[\s\S]*?trust-repair[\s\S]*?return "repair"[\s\S]*?rank[\s\S]*?return "evidence"[\s\S]*?const laneSelectorRef = useRef<HTMLElement \| null>\(null\)[\s\S]*?useState<TrustPassportLaneKey>\(\(\) => trustPassportLaneFromLocation\(location\)\)[\s\S]*?reason: `url-focus-\$\{focusedLane\}`[\s\S]*?ref=\{laneSelectorRef\}[\s\S]*?id="trust-passport-lanes"/,
  "Trust Passport must support URL-focused evidence, community, and repair lane landings for trust/rank notifications."
);

assertContains(
  /gridTemplateColumns: isCompact[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?: "repeat\(3, minmax\(0, 1fr\)\)"[\s\S]*?gap: isCompact \? 8 : 10[\s\S]*?trustPassportLanes\.map\(\(lane\) =>[\s\S]*?stableHeight=\{isCompact \? 58 : 66\}[\s\S]*?debugId=\{`trust-score\.lane\.\$\{lane\.key\}`\}[\s\S]*?fontSize: isCompact \? 11\.5 : 14[\s\S]*?<GsnLegacyIcon name=\{lane\.icon\} size=\{isCompact \? 24 : 32\} decorative/,
  "Trust Passport lane selector must stay compact enough on phone for all six lanes to clear the bottom rail."
);

assertContains(
  /gridTemplateColumns: isCompact[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?: "repeat\(4, minmax\(0, 1fr\)\)"[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.refresh"[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.copy-snapshot"[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.open-trust-slip"[\s\S]*?stableHeight=\{isCompact \? 48 : 58\}[\s\S]*?debugId="trust-score\.verify"/,
  "Trust Passport shareable tools must keep shorter fixed phone heights while preserving the larger desktop paper controls."
);
assertContains(
  /const \[documentPreviewDetailsOpen, setDocumentPreviewDetailsOpen\][\s\S]*?activeTrustPassportLane === "documents" \? \([\s\S]*?7\. Shareable trust tools[\s\S]*?debugId="trust-score\.export"[\s\S]*?data-trust-passport-document-preview-details="collapsed"[\s\S]*?debugId="trust-score\.documents-lane\.preview-details\.toggle"[\s\S]*?aria-expanded=\{documentPreviewDetailsOpen\}[\s\S]*?Document preview details[\s\S]*?documentPreviewDetailsOpen \?[\s\S]*?<GsnSnapshotPaperCard[\s\S]*?debugId="trust-score\.snapshot-open-trust-slip"/,
  "Trust Passport Documents lane must keep the share/verify actions visible and collapse the full paper preview behind a stable details toggle."
);

assertContains(
  /padding: isCompact \? 12 : 24[\s\S]*?minHeight: isCompact \? "min\(720px, calc\(100svh - 132px\)\)" : undefined[\s\S]*?gridTemplateColumns: isCompact \? "88px minmax\(0, 1fr\)" : "132px minmax\(0, 1fr\)"[\s\S]*?width: isCompact \? 88 : 132[\s\S]*?height: isCompact \? 88 : 132[\s\S]*?overflow: "hidden"[\s\S]*?Identity & Community Overview[\s\S]*?Who this person is, their GSN ID, and where they belong.[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?: "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?\? "36px minmax\(0, 1fr\)"[\s\S]*?: "46px minmax\(0, 1fr\)"[\s\S]*?overviewIconBox\(isCompact\)/,
  "Trust Passport identity and community overview must keep the portable snapshot package boundary and two-column fact grid without decorative status chips above the title."
);

assertNotContains(
  /Snapshot 1|Photo clear/,
  "Trust Passport identity and community overview must not restore the old decorative Snapshot 1 or Photo clear chips above the title."
);

assertContains(
  /import \{[\s\S]*?GsnLegacyIcon[\s\S]*?type GsnIconName[\s\S]*?\} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*?function overviewIconBox\(isCompact = false\)[\s\S]*?width: isCompact \? 36 : 46[\s\S]*?height: isCompact \? 36 : 46[\s\S]*?GsnLegacyIcon name=\{icon\} size=\{isCompact \? 31 : 40\} decorative/,
  "Trust Passport identity fact icons must stay as strong 3D object tiles, not weak inline marks."
);

assertContains(
  /const \[identityEvidenceOpen, setIdentityEvidenceOpen\][\s\S]*?data-trust-passport-identity-evidence-meter="true"[\s\S]*?marginTop: isCompact \? 8 : 10[\s\S]*?setIdentityEvidenceOpen\(\(open\) => !open\)[\s\S]*?stableHeight=\{isCompact \? 42 : 44\}[\s\S]*?fullWidth[\s\S]*?debugId="trust-score\.identity-evidence-meter\.toggle"[\s\S]*?isCompact \? "Evidence" : "Identity evidence"[\s\S]*?identityEvidenceStageWord\(identityEvidence\)[\s\S]*?identityEvidenceOpen \?/,
  "Trust Passport identity evidence meter must stay collapsed behind a compact stable toggle and describe evidence posture without visible numeric scoring."
);

assertContains(
  /function overviewStatusBox\(ok: boolean, muted = false\)[\s\S]*?minHeight: 36[\s\S]*?display: "inline-grid"[\s\S]*?gridTemplateColumns: "24px minmax\(0, 1fr\)"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?verificationBadges\.map\(\(item\) =>[\s\S]*?overviewStatusBox\(item\.ok, item\.muted\)[\s\S]*?<GsnLegacyIcon name=\{item\.icon\} size=\{22\} decorative[\s\S]*?Active Communities: \{passportVm\.technicalDetail\.activeClans\}/,
  "Trust Passport verification badges must stay as compact one-line snapshot status chips."
);

assertContains(
  /debugId="trust-score\.complete-identification"[\s\S]*?GsnLegacyIcon name="id"[\s\S]*?Complete ID checks[\s\S]*?debugId="trust-score\.open-public-community-record"[\s\S]*?OpenRecordGlyph/,
  "Trust Passport identity snapshot must include a fixed completion action before the public community record action."
);

assertContains(
  /const \[showIdentityCompletionPaths, setShowIdentityCompletionPaths\][\s\S]*?identityCompletionRows[\s\S]*?trust-score\.completion\.phone[\s\S]*?trust-score\.completion\.community[\s\S]*?trust-score\.completion\.bank[\s\S]*?trust-score\.completion\.passport[\s\S]*?setShowIdentityCompletionPaths\(\(open\) => !open\)[\s\S]*?Only ready completion pages open[\s\S]*?debugId=\{item\.debugId\}/,
  "Trust Passport Complete ID checks must open a compact completion-path chooser instead of routing directly to the explanatory Identity / CCI page."
);

assertContains(
  /payoutDetails: routeTarget\([\s\S]*?"payoutDetails"[\s\S]*?communityConfirmations: routeTarget\([\s\S]*?"communityConfirmationInbox"[\s\S]*?communityVerifyPath \|\| routes\.communityConfirmations[\s\S]*?target: routes\.payoutDetails/,
  "Trust Passport identity completion paths must include real bank/wallet and community completion routes."
);

assertContains(
  /trustSlipVerify: routeTarget\([\s\S]*?"merchantVerify"[\s\S]*?"trust-score\.route\.trust-slip-verify"[\s\S]*?const verifyAppPath = useMemo\([\s\S]*?trustSlipVerifyAppPath\(trustSlipCode, routes\.trustSlipVerify\)[\s\S]*?onClick=\{\(\) => onOpenTrustRoute\(verifyAppPath\)\}[\s\S]*?debugId="trust-score\.verify"/,
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
  /debugId="trust-score\.verdict-note\.toggle"[\s\S]*?Evidence reading note[\s\S]*?Record state, not character judgement\. Add current evidence to strengthen this reading\./,
  "Trust Passport evidence reading note must stay behind a stable open/close control so the screenshot surface stays compact."
);
assertContains(
  /const \[standingDecisionDetailsOpen, setStandingDecisionDetailsOpen\][\s\S]*?activeTrustPassportLane === "standing" \? "grid" : "none"[\s\S]*?gridTemplateColumns: "1fr"[\s\S]*?data-trust-passport-standing-decision-details="collapsed"[\s\S]*?debugId="trust-score\.standing-decision-details\.toggle"[\s\S]*?aria-expanded=\{standingDecisionDetailsOpen\}[\s\S]*?Decision support details[\s\S]*?standingDecisionDetailsOpen \?[\s\S]*?What this evidence helps you decide[\s\S]*?passportVm\.trustQuestions\.map/,
  "Trust Passport standing lane must show the evidence reading first and keep decision-support rows collapsed behind a stable toggle."
);
assertContains(
  /const \[communityEvidenceDetailsOpen, setCommunityEvidenceDetailsOpen\][\s\S]*?Community Confirmation[\s\S]*?Can this evidence be tied to a real community\?[\s\S]*?data-trust-passport-community-evidence-details="collapsed"[\s\S]*?debugId="trust-score\.community-lane\.evidence-details\.toggle"[\s\S]*?aria-expanded=\{communityEvidenceDetailsOpen\}[\s\S]*?Community evidence details[\s\S]*?communityEvidenceDetailsOpen \?[\s\S]*?<CommunityProofPanel[\s\S]*?communityConfirmationCards\.map[\s\S]*?debugId="trust-score\.community-lane\.open-public-community-record"/,
  "Trust Passport community lane must keep member, witness, activity, and TrustSlip evidence details collapsed before showing the community action row."
);


assertContains(
  /gridTemplateColumns: isCompact[\s\S]*?"58px minmax\(0, 1fr\)"[\s\S]*?"78px minmax\(0, 1fr\)"[\s\S]*?minHeight: isCompact \? 58 : 78[\s\S]*?fontSize: isCompact \? 34 : 46/,
  "Trust Passport evidence posture marker must stay compact on phone so the reading text no longer sits beside a tall empty tile."
);

assertContains(
  /aria-label="Evidence posture rail"[\s\S]*?linear-gradient\(180deg, #FFF9EA 0%, #FFE7A8 100%\)[\s\S]*?boxShadow: isActive[\s\S]*?inset 0 -8px 18px rgba\(214,170,69,0\.20\)/,
  "Trust Passport evidence posture rail must render as a raised institutional rail, not a flat ABCDE strip."
);

assertContains(
  /import EvidenceMeter[\s\S]*?from "\.\.\/components\/EvidenceMeter"[\s\S]*?gridTemplateColumns: isCompact \? "1fr" : "minmax\(0, 1fr\) auto"[\s\S]*?alignItems: isCompact \? "start" : "center"[\s\S]*?GsnLegacyIcon[\s\S]*?<EvidenceMeter status=\{item\.status\}>/,
  "Trust Passport question rows must stack raised inert evidence meters under long labels on phone."
);

assertContains(
  /display: isCompact \? "grid" : "flex"[\s\S]*?fullWidth=\{isCompact\}[\s\S]*?debugId=\{item\.debugId\}/,
  "Trust Passport evidence-surface actions must expand to full-width fixed controls on phone."
);
assertContains(
  /const \[evidenceMovementDetailsOpen, setEvidenceMovementDetailsOpen\][\s\S]*?activeTrustPassportLane === "evidence"[\s\S]*?6\. What changed in the evidence\?[\s\S]*?data-trust-passport-evidence-movement-details="collapsed"[\s\S]*?debugId="trust-score\.evidence-movement-details\.toggle"[\s\S]*?aria-expanded=\{evidenceMovementDetailsOpen\}[\s\S]*?Evidence movement details[\s\S]*?evidenceMovementDetailsOpen \?[\s\S]*?Latest explanation[\s\S]*?\{latestExplanation\}[\s\S]*?Recent evidence events[\s\S]*?recentEvents\.slice/,
  "Trust Passport Evidence Story lane must keep latest explanation and recent event detail collapsed behind a stable details toggle."
);

assertContains(
  /gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(3, minmax\(0, 1fr\)\)"[\s\S]*?gridTemplateColumns: isCompact \? "1fr" : "minmax\(0, 1fr\) auto"[\s\S]*?textAlign: isCompact \? "left" : "right"[\s\S]*?overflowWrap: "break-word"/,
  "Trust Passport institutional evidence rows must stack values on phone instead of squeezing right-aligned text."
);
assertContains(
  /const \[institutionalContextDetailsOpen, setInstitutionalContextDetailsOpen\][\s\S]*?activeTrustPassportLane === "evidence"[\s\S]*?activeTrustPassportLane === "finance"[\s\S]*?Evidence & institutional context[\s\S]*?data-trust-passport-institutional-context-details="collapsed"[\s\S]*?debugId="trust-score\.institutional-context-details\.toggle"[\s\S]*?aria-expanded=\{institutionalContextDetailsOpen\}[\s\S]*?Institutional context details[\s\S]*?institutionalContextDetailsOpen \?[\s\S]*?institutionalRows\.map[\s\S]*?<TrustPaperSecurityFooter/,
  "Trust Passport institutional context must stay collapsed behind a stable details toggle on Evidence and Finance lanes."
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
  `Trust Passport button inventory audit passed: ${actions.length} stable source actions, ${expectedRenderedActions} expected rendered action roots including the lane selector, evidence reading note toggle, standing decision detail toggle, community evidence detail toggle, document preview detail toggle, institutional context detail toggle, evidence movement detail toggle, and two evidence-surface cards.`
);
