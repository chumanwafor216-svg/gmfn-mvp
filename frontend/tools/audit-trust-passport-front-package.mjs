/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  trust: "src/pages/TrustScorePage.tsx",
  band: "src/lib/trustBandLanguage.ts",
  viewModel: "src/lib/trustPassportViewModel.ts",
  app: "src/App.tsx",
  targets: "src/lib/actionTargetRoutes.ts",
  publicLinks: "src/lib/publicLinks.ts",
  package: "package.json",
  protocol: "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md",
  specs: "../docs/SCREEN_SPECS.md",
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
    if (!pattern.test(line)) return;
    findings.push({
      file: files[key],
      line: index + 1,
      message,
      text: line.trim(),
    });
  });
}

function assertOrderedSnippets(key, snippets, message) {
  const source = sourceByFile[key];
  let cursor = -1;
  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    if (index === -1) {
      addFinding(files[key], source, Math.max(cursor, 0), message, snippet);
      return;
    }
    cursor = index;
  }
}

function flexibleTextRegex(text) {
  return new RegExp(
    String(text)
      .split(/\s+/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+"),
    "i"
  );
}

assertContains(
  "app",
  /const TrustScorePage = React\.lazy\(\(\) => import\("\.\/pages\/TrustScorePage"\)\)[\s\S]*?<Route path="trust" element=\{<TrustScorePage \/>\} \/>[\s\S]*?<Route path="trust-passport" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\}/,
  "Trust Passport route ownership must stay explicit: /app/trust renders TrustScorePage and /app/trust-passport redirects to it."
);

assertContains(
  "targets",
  /TRUST: APP_ROUTES\.TRUST[\s\S]*?"trust-passport": ACTION_TARGETS\.TRUST[\s\S]*?trust: "TRUST"/,
  "Shared route targets must keep Trust Passport aliases normalized to the canonical trust route."
);

assertContains(
  "trust",
  /sectionLabel="Trust Passport"[\s\S]*?title="Trust Passport"[\s\S]*?subtitle="Loading the trust passport\.\.\."[\s\S]*?homeTo=\{routes\.dashboard\}[\s\S]*?backTo=\{routes\.dashboard\}/,
  "Trust Passport loading shell must keep the Trust Passport identity and Dashboard recovery route."
);

assertContains(
  "trust",
  /import GSNBrandMark from "\.\.\/components\/GSNBrandMark";[\s\S]*?function OfficialGsnWatermark\([\s\S]*?<GSNBrandMark width=\{isCompact \? 148 : 210\} height=\{isCompact \? 186 : 264\} \/>[\s\S]*?OfficialGsnWatermark[\s\S]*?activeTrustPassportLane === "finance"/,
  "Trust Passport must use the official GSN brand mark as a watermark on the document shell and evidence lanes."
);

assertContains(
  "trust",
  /function overviewIconBox\(isCompact = false\)[\s\S]*?background: "linear-gradient\(180deg, #FFFFFF 0%, #F4F8FF 100%\)"[\s\S]*?color: "#0B63D1"[\s\S]*?border: "1px solid rgba\(11,99,209,0\.14\)"/,
  "Trust Passport identity fact icons must use light embossed 3D tiles, not dark shielded icon blocks."
);

if (/letterSpacing:\s*[1-9]/.test(sourceByFile.trust)) {
  addFinding(
    files.trust,
    sourceByFile.trust,
    sourceByFile.trust.search(/letterSpacing:\s*[1-9]/),
    "Trust Passport must not use spaced-out uppercase lane headers on phone-polished evidence surfaces.",
    sourceByFile.trust.match(/letterSpacing:\s*[1-9][^,\n]*/)?.[0] || ""
  );
}

if (/TrustPaperWatermark[\s\S]*?name="wallet"/.test(sourceByFile.trust)) {
  addFinding(
    files.trust,
    sourceByFile.trust,
    sourceByFile.trust.search(/TrustPaperWatermark[\s\S]*?name="wallet"/),
    "Trust Passport finance evidence surfaces must not use wallet watermark imagery.",
    "Use the official GSN watermark and financeInstitution 3D icon for Finance Discipline."
  );
}

assertContains(
  "trust",
  /const routes = useMemo\([\s\S]*?dashboard: routeTarget\("dashboard", selectedClanId, "trust-score\.route\.dashboard"\)[\s\S]*?notifications: routeTarget\("notifications", selectedClanId, "trust-score\.route\.notifications"\)[\s\S]*?identity: routeTarget\("cci", selectedClanId, "trust-score\.route\.identity"\)[\s\S]*?openTrust: routeTarget\("openTrust", selectedClanId, "trust-score\.route\.open-trust"\)[\s\S]*?cciReading: routeTarget\("cciReading", selectedClanId, "trust-score\.route\.cci-reading"\)[\s\S]*?trustSlip: routeTarget\("trustSlip", selectedClanId, "trust-score\.route\.trust-slip"\)/,
  "Trust Passport must keep traceable shared CTA intents for dashboard, notifications, CCI, local trust, CCI reading, and TrustSlip."
);

[
  "Identity Overview",
  "2. Current trust verdict",
  "3. What this reading says",
  "4. Why this reading looks like this",
  "5. Trust surfaces",
  "6. Why did my trust change?",
  "7. Shareable trust tools",
  "8. Evidence & institutional context",
].forEach((label) => {
  assertContains(
    "trust",
    new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `Trust Passport current front package must keep the ${label} section until a deliberate lane redesign replaces it.`
  );
});

[
  {
    key: "band",
    pattern: /title: "Evidence needs strengthening; reduce exposure"[\s\S]*?label: "Evidence building"[\s\S]*?label: "Evidence still building"/,
    message:
      "Trust Passport trust-band language must frame low-depth states as evidence still building, not a judgement on the person.",
  },
  {
    key: "viewModel",
    pattern:
      /"Evidence still building"[\s\S]*?"Check first"[\s\S]*?before relying on this record/,
    message:
      "Trust Passport view model must use record-state language for low-depth readings.",
  },
  {
    key: "trust",
    pattern:
      /Record state, not character judgement\. Add current evidence to strengthen this reading\./,
    message:
      "Current trust verdict must explain that the reading is about the record state, not character judgement.",
  },
].forEach(({ key, pattern, message }) => {
  assertContains(key, pattern, message);
});

assertContains(
  "trust",
  /const activePostureLabel =[\s\S]*?firstTruthy\([\s\S]*?activeBand[\s\S]*?safeStr\(currentBand\)\.toUpperCase\(\)\.slice\(0, 2\)[\s\S]*?\) \|\| "GSN"/,
  "Trust Passport current verdict tile must use a compact band marker instead of the full verdict phrase."
);

assertNotContains(
  "trust",
  /const activePostureLabel =[\s\S]*?passportVm\.verdict\.label[\s\S]*?Evidence posture/,
  "Trust Passport current verdict tile must not render the full verdict phrase inside the narrow mobile marker."
);

assertContains(
  "trust",
  /data-trust-passport-verdict-marker="true"[\s\S]*?overflow: "hidden"[\s\S]*?data-trust-passport-evidence-rail="true"[\s\S]*?display: isCompact \? "grid" : "flex"[\s\S]*?gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : undefined[\s\S]*?aria-label="Evidence posture rail"[\s\S]*?minWidth: 0[\s\S]*?wordBreak: "normal"/,
  "Trust Passport evidence posture rail must wrap into a two-column mobile grid instead of forcing five long labels into one phone row."
);

[
  { key: "band", pattern: /"Limited evidence"|"Weak"|"Needs caution"|"Under pressure"/ },
  { key: "viewModel", pattern: /"Limited evidence"|"Weak"|"Needs caution"|"Under pressure"/ },
  { key: "trust", pattern: /Record state, not character judgement[\s\S]*?"Weak"|"Needs caution"|"Under pressure"/ },
].forEach(({ key, pattern }) => {
  const source = sourceByFile[key];
  const match = source.match(pattern);
  if (match?.index !== undefined) {
    addFinding(
      files[key],
      source,
      match.index,
      "Trust Passport current verdict surfaces must not reintroduce morally loaded low-evidence labels.",
      match[0]
    );
  }
});

[
  "Current Trust Standing",
  "Evidence Story",
  "Community Confirmation",
  "Finance Discipline",
  "Documents / TrustSlip",
  "Repair or Next Step",
].forEach((lane) => {
  assertContains(
    "protocol",
    flexibleTextRegex(lane),
    `Guided work protocol must keep the Trust Passport ${lane} lane named.`
  );
  assertContains(
    "specs",
    flexibleTextRegex(lane),
    `Trust Passport screen spec must keep the ${lane} lane named.`
  );
});

assertOrderedSnippets(
  "trust",
  [
    "const trustSurfaceCards = [",
    "title: \"Local community trust\"",
    "to: routes.openTrust",
    "debugId: \"trust-score.surface.local-community-trust\"",
    "title: \"Cross-community consistency\"",
    "to: routes.cciReading",
    "debugId: \"trust-score.surface.cross-community-consistency\"",
  ],
  "Trust Passport local/cross-community trust surface cards must keep their route targets and stable debug IDs."
);

assertOrderedSnippets(
  "trust",
  [
    "7. Shareable trust tools",
    "debugId=\"trust-score.refresh\"",
    "debugId=\"trust-score.copy-snapshot\"",
    "debugId=\"trust-score.open-trust-slip\"",
    "debugId=\"trust-score.verify\"",
    "debugId=\"trust-score.review-care\"",
    "debugId=\"trust-score.export\"",
  ],
  "Trust Passport shareable tools must keep the current ordered action set until the Documents / TrustSlip lane is intentionally redesigned."
);

assertContains(
  "trust",
  /community_footprint[\s\S]*?communityRoleCounts[\s\S]*?roleLabel\(item\.role\)[\s\S]*?data-trust-passport-community-footprint="true"[\s\S]*?Community footprint[\s\S]*?communityFootprint\.length/,
  "Trust Passport Identity Overview must show a compact multi-community footprint with community IDs and member roles."
);

assertContains(
  "trust",
  /const gmfnIdValue = useMemo[\s\S]*?const gmfnId = gmfnIdValue \|\| "Not issued yet"[\s\S]*?const communityCodeValue = useMemo[\s\S]*?const communityCode = communityCodeValue \|\| "No community ID yet"[\s\S]*?memberKey: gmfnIdValue/,
  "Trust Passport must separate actual GSN/community keys from display fallback labels before building public credential paths."
);

assertContains(
  "viewModel",
  /gmfnId: clean\(input\.gmfnId, "Not issued yet"\)[\s\S]*?communityId: clean\(input\.communityId, "No community ID yet"\)[\s\S]*?activeMemberCount: clean\(input\.activeMemberCount, "No active community"\)[\s\S]*?identityStatusLabel: clean\(input\.identityStatusLabel, "Identity evidence building"\)/,
  "Trust Passport view model fallbacks must use honest missing-state language, not stale placeholder copy."
);

assertContains(
  "viewModel",
  /trustSlipStatus: clean\(input\.trustSlipStatus, "Not issued yet"\)/,
  "Trust Passport view model must show honest missing TrustSlip state instead of stale pending copy."
);

assertContains(
  "publicLinks",
  /UNREADY_PUBLIC_CREDENTIAL_KEYS[\s\S]*?"awaiting issue"[\s\S]*?"not issued yet"[\s\S]*?"no community id yet"/,
  "Public credential links must reject display fallback labels so missing IDs cannot become fake public paths."
);

assertNotContains(
  "trust",
  /Awaiting issue|classText: "Pending"|TrustSlip: \{trustSlipStatus \|\| "Pending"\}/,
  "Trust Passport visible source must not reintroduce stale pending/issue placeholders for missing evidence."
);

assertNotContains(
  "viewModel",
  /Awaiting issue|Identity status not shown|Community membership record not shown|trustSlipStatus: clean\(input\.trustSlipStatus, "Pending"\)/,
  "Trust Passport view model must not reintroduce stale placeholder-style identity fallbacks."
);

assertContains(
  "trust",
  /const \[identityEvidenceOpen, setIdentityEvidenceOpen\][\s\S]*?buildIdentityEvidenceCompletion[\s\S]*?Complete ID checks[\s\S]*?Open public community record[\s\S]*?data-trust-passport-identity-evidence-meter="true"[\s\S]*?setIdentityEvidenceOpen\(\(open\) => !open\)[\s\S]*?stableHeight=\{isCompact \? 42 : 44\}[\s\S]*?fullWidth[\s\S]*?debugId="trust-score\.identity-evidence-meter\.toggle"[\s\S]*?isCompact \? "Evidence" : "Identity evidence"[\s\S]*?identityEvidenceStageWord\(identityEvidence\)[\s\S]*?identityEvidenceStagePhrase\(identityEvidence\)[\s\S]*?identityEvidenceOpen \?[\s\S]*?identityEvidenceStageShort\(identityEvidence\)[\s\S]*?Recorded helps\. Verified builds confidence\.[\s\S]*?Recorded evidence raises readiness\. Verified evidence raises confidence\./,
  "Trust Passport Identity Overview must keep the reusable identity evidence meter collapsed behind a compact toggle and must describe evidence posture without visible numeric scoring."
);

assertContains(
  "trust",
  /TrustDocumentConfidenceRibbon[\s\S]*?trustPassportConfidenceRibbonItems[\s\S]*?Passport status[\s\S]*?Identity standing[\s\S]*?Evidence chain[\s\S]*?Community history[\s\S]*?Verification path/,
  "Trust Passport front package must expose a Trust Document Language confidence ribbon."
);

assertContains(
  "trust",
  /data-gsn-trust-document-certificate="trust-passport"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?title="Trust Passport security"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This passport confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This passport does not confirm"[\s\S]*?TrustDocumentFingerprint[\s\S]*?label="Trust Passport record reference"/,
  "Trust Passport front package must render the Trust Document Language security, boundary, and record-reference sequence."
);

assertContains(
  "trust",
  /Record reference[\s\S]*?This reference is made from the visible Trust Passport fields\. Use it to match this paper with its GSN record; it is not legal proof or payment approval\.[\s\S]*?Record reference for this visible private Trust Passport\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Trust Passport record-reference copy must stay plain and keep legal/payment boundaries."
);

assertContains(
  "trust",
  /trustPassportDoesNotConfirmList[\s\S]*?Government registration or legal identity beyond recorded evidence[\s\S]*?Bank approval, credit approval, payment movement, or escrow[\s\S]*?Future behaviour, future repayment, delivery, or marketplace outcome[\s\S]*?That a public TrustSlip exposes the full private Trust Passport/,
  "Trust Passport must keep legal, finance, future-behaviour, and private-record boundaries visible."
);

assertContains(
  "package",
  /"audit:trust-passport-front-package"/,
  "Trust Passport front package audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Trust Passport front package work[\s\S]*?audit:trust-passport-front-package[\s\S]*?audit:trust-passport-button-inventory/,
  "Guided work protocol must require Trust Passport front-package and button-inventory audits."
);

if (findings.length > 0) {
  console.error("Trust Passport front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Trust Passport front package audit passed.");
