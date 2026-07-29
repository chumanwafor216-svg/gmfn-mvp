/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  trust: "src/pages/TrustScorePage.tsx",
  documentLane: "src/pages/trustScore/TrustPassportDocumentLane.tsx",
  financeLane: "src/pages/trustScore/TrustPassportFinanceLane.tsx",
  institutionalContext: "src/pages/trustScore/TrustPassportInstitutionalContext.tsx",
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
  /const TrustPassportDocumentLane = lazy\([\s\S]*?import\("\.\/trustScore\/TrustPassportDocumentLane"\)[\s\S]*?activeTrustPassportLane === "documents" \? \([\s\S]*?<Suspense[\s\S]*?<TrustPassportDocumentLane[\s\S]*?onOpenTrustRoute=\{openTrustRoute\}/,
  "Trust Passport must lazy-load the Documents / TrustSlip lane from the page shell."
);
assertContains(
  "trust",
  /const TrustPassportFinanceLane = lazy\([\s\S]*?import\("\.\/trustScore\/TrustPassportFinanceLane"\)[\s\S]*?activeTrustPassportLane === "finance" \? \([\s\S]*?<Suspense[\s\S]*?<TrustPassportFinanceLane[\s\S]*?financeDisciplineCards=\{financeDisciplineCards\}/,
  "Trust Passport must lazy-load the Finance Discipline lane from the page shell."
);
assertContains(
  "trust",
  /const TrustPassportInstitutionalContext = lazy\([\s\S]*?import\("\.\/trustScore\/TrustPassportInstitutionalContext"\)[\s\S]*?activeTrustPassportLane === "evidence" \|\|[\s\S]*?activeTrustPassportLane === "finance" \? \([\s\S]*?<Suspense[\s\S]*?<TrustPassportInstitutionalContext[\s\S]*?institutionalRows=\{institutionalRows\}/,
  "Trust Passport must lazy-load the institutional context from the page shell."
);


assertContains(
  "trust",
  /import GSNBrandMark from "\.\.\/components\/GSNBrandMark";[\s\S]*?function OfficialGsnWatermark\([\s\S]*?<GSNBrandMark width=\{isCompact \? 148 : 210\} height=\{isCompact \? 186 : 264\} \/>/,
  "Trust Passport must use the official GSN brand mark as a watermark on the document shell and evidence lanes."
);

assertContains(
  "financeLane",
  /import GSNBrandMark from "\.\.\/\.\.\/components\/GSNBrandMark";[\s\S]*?function OfficialGsnWatermark\([\s\S]*?<GSNBrandMark width=\{isCompact \? 148 : 210\} height=\{isCompact \? 186 : 264\} \/>[\s\S]*?Finance Discipline/,
  "Trust Passport Finance Discipline lane must keep the official GSN watermark."
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
if (/TrustPaperWatermark[\s\S]*?name="wallet"/.test(sourceByFile.financeLane)) {
  addFinding(
    files.financeLane,
    sourceByFile.financeLane,
    sourceByFile.financeLane.search(/TrustPaperWatermark[\s\S]*?name="wallet"/),
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
  ["trust", "Identity & Community Overview"],
  ["trust", "2. Current evidence reading"],
  ["trust", "Decision support details"],
  ["trust", "4. Why the evidence reads this way"],
  ["trust", "5. Evidence surfaces"],
  ["trust", "6. What changed in the evidence?"],
  ["documentLane", "7. Shareable trust tools"],
  ["institutionalContext", "8. Evidence & institutional context"],
].forEach(([key, label]) => {
  assertContains(
    key,
    new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `Trust Passport current front package must keep the ${label} section until a deliberate lane redesign replaces it.`
  );
});

assertContains(
  "trust",
  /const trustPassportDecisionLine = !trustSlipCode[\s\S]*?Issue the public TrustSlip before sharing evidence\.[\s\S]*?Aggregate reading first\. Primary community is the anchor, not the whole judgement\.[\s\S]*?Build aggregate evidence before relying on this passport\.[\s\S]*?const trustPassportPrimaryActionLabel =[\s\S]*?safeStr\(nextStep\.ctaLabel\)\.length <= 24 \? nextStep\.ctaLabel : "Open next step"[\s\S]*?const trustPassportPrimaryAction = !trustSlipCode[\s\S]*?label: "Issue TrustSlip"[\s\S]*?to: routes\.trustSlip[\s\S]*?label: trustPassportPrimaryActionLabel[\s\S]*?to: nextStep\.ctaTo/,
  "Trust Passport first answer must include aggregate-scope plain action language and a real primary next-step target."
);

assertContains(
  "trust",
  /data-trust-passport-decision-first="one-answer-four-facts"[\s\S]*?Aggregate Passport reading[\s\S]*?\{trustPassportDecisionAnswer\}[\s\S]*?\{trustPassportDecisionLine\}[\s\S]*?data-trust-passport-decision-facts="four-quick-facts"[\s\S]*?trustPassportDecisionFacts\.map[\s\S]*?debugId="trust-score\.decision-primary-next-step"[\s\S]*?trustPassportPrimaryAction\.label[\s\S]*?isCompact \? \([\s\S]*?<details[\s\S]*?data-trust-passport-decision-boundary="compact"[\s\S]*?<StableDisclosureSummary[\s\S]*?debugId="trust-score\.decision-boundary\.toggle"[\s\S]*?Decision Boundary[\s\S]*?Open limits[\s\S]*?: \([\s\S]*?<div[\s\S]*?data-trust-passport-decision-boundary="compact"[\s\S]*?Decision Boundary/,
  "Trust Passport first viewport must show aggregate Passport reading, four facts, one primary next-step button, then the compact mobile boundary disclosure."
);

assertContains(
  "trust",
  /data-trust-passport-standing-decision-details="collapsed"[\s\S]*?debugId="trust-score\.standing-decision-details\.toggle"[\s\S]*?aria-expanded=\{standingDecisionDetailsOpen\}[\s\S]*?Decision support details[\s\S]*?standingDecisionDetailsOpen \?[\s\S]*?What this evidence helps you decide[\s\S]*?These lines show what this record can and cannot support before a recipient asks for live confirmation\.[\s\S]*?passportVm\.trustQuestions\.map[\s\S]*?\{item\.meaning\}/,
  "Trust Passport decision-use summary must stay behind the stable Decision support details disclosure and show plain meaning lines, not status labels alone."
);

assertNotContains(
  "trust",
  /3\. What this reading says/,
  "Trust Passport first lane must not return to generic reading commentary where decision-use evidence belongs."
);

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
      "Current evidence reading must explain that the reading is about the record state, not character judgement.",
  },
].forEach(({ key, pattern, message }) => {
  assertContains(key, pattern, message);
});

assertContains(
  "trust",
  /const activePostureLabel =[\s\S]*?firstTruthy\([\s\S]*?activeBand[\s\S]*?safeStr\(currentBand\)\.toUpperCase\(\)\.slice\(0, 2\)[\s\S]*?\) \|\| "GSN"/,
  "Trust Passport current evidence tile must use a compact band marker instead of the full reading phrase."
);

assertNotContains(
  "trust",
  /const activePostureLabel =[\s\S]*?passportVm\.verdict\.label[\s\S]*?Evidence posture/,
  "Trust Passport current evidence tile must not render the full reading phrase inside the narrow mobile marker."
);

assertContains(
  "trust",
  /Your evidence reading is steady right now[\s\S]*?improve the evidence reading[\s\S]*?Your evidence reading needs action and repair[\s\S]*?Your evidence reading is looking strong[\s\S]*?strengthen your evidence record[\s\S]*?weakened the evidence reading[\s\S]*?Your evidence reading needs urgent repair/,
  "Trust Passport fallback reading copy must frame state as evidence reading, not trust position or trust strength."
);
assertNotContains(
  "trust",
  /Your trust position|trust strength|strengthen your standing|improve your standing/i,
  "Trust Passport fallback reading copy must not use trust-position, standing, or trust-strength verdict wording."
);
assertContains(
  "viewModel",
  /Stability still depends on active membership status, role, member\/sponsor confirmation, and activity evidence\./,
  "Trust Passport community stability fallback must describe membership status and evidence, not active standing."
);
assertContains(
  "viewModel",
  /evidenceScope:[\s\S]*?readingScope: "aggregate_with_primary_anchor" \| "primary_anchor_only"[\s\S]*?communityFootprintCount\?: string \| number \| null[\s\S]*?activeCommunityEvidenceCount = Math\.max\(activeClans, communityFootprintCount\)[\s\S]*?Aggregate Passport reading supports a decision, but it is not proof that every community gives the same judgement/,
  "Trust Passport view model must carry an explicit aggregate evidence-scope contract."
);
assertNotContains(
  "viewModel",
  /active standing/i,
  "Trust Passport view model must not present active standing as the basis of the evidence reading."
);
assertContains(
  "trust",
  /Support already allocated to active commitments\./,
  "Trust Passport finance discipline card must describe locked support as allocated support, not standing behind commitments."
);
assertNotContains(
  "trust",
  /Support already standing behind active commitments/i,
  "Trust Passport finance discipline card must not use standing wording for locked support."
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
      "Trust Passport current evidence surfaces must not reintroduce morally loaded low-evidence labels.",
      match[0]
    );
  }
});

[
  "Identity & Evidence Reading",
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
    "title: \"Local community evidence\"",
    "to: routes.openTrust",
    "debugId: \"trust-score.surface.local-community-trust\"",
    "title: \"Cross-community consistency\"",
    "to: routes.cciReading",
    "debugId: \"trust-score.surface.cross-community-consistency\"",
  ],
  "Trust Passport local/cross-community evidence surface cards must keep their route targets and stable debug IDs."
);

assertOrderedSnippets(
  "documentLane",
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
  /community_footprint[\s\S]*?communityRoleCounts[\s\S]*?roleCountLabel\(label, count\)[\s\S]*?identityCommunitySummaryRows[\s\S]*?Recorded communities[\s\S]*?Current roles[\s\S]*?data-trust-passport-community-footprint="true"[\s\S]*?Community Portfolio[\s\S]*?Active Communities: \{communityFootprint\.length\}[\s\S]*?passportVm\.evidenceScope\.boundary[\s\S]*?data-trust-passport-identity-community-summary="true"/,
  "Trust Passport Identity & Community Overview must show a compact community portfolio, role counts, evidence-scope boundary, and identity/community summary."
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
  "documentLane",
  /Awaiting issue|classText: "Pending"|TrustSlip: \{trustSlipStatus \|\| "Pending"\}/,
  "Trust Passport Documents lane visible source must not reintroduce stale pending/issue placeholders for missing evidence."
);
assertNotContains(
  "viewModel",
  /Awaiting issue|Identity status not shown|Community membership record not shown|trustSlipStatus: clean\(input\.trustSlipStatus, "Pending"\)/,
  "Trust Passport view model must not reintroduce stale placeholder-style identity fallbacks."
);

assertContains(
  "trust",
  /const \[identityEvidenceOpen, setIdentityEvidenceOpen\][\s\S]*?buildIdentityEvidenceCompletion[\s\S]*?Complete ID checks[\s\S]*?Open public community record[\s\S]*?data-trust-passport-identity-evidence-meter="true"[\s\S]*?setIdentityEvidenceOpen\(\(open\) => !open\)[\s\S]*?stableHeight=\{isCompact \? 42 : 44\}[\s\S]*?fullWidth[\s\S]*?debugId="trust-score\.identity-evidence-meter\.toggle"[\s\S]*?isCompact \? "Evidence" : "Identity evidence"[\s\S]*?identityEvidenceStageWord\(identityEvidence\)[\s\S]*?identityEvidenceStagePhrase\(identityEvidence\)[\s\S]*?identityEvidenceOpen \?[\s\S]*?identityEvidenceStageShort\(identityEvidence\)[\s\S]*?Recorded helps\. Verified builds confidence\.[\s\S]*?Recorded evidence raises readiness\. Verified evidence raises confidence\./,
  "Trust Passport Identity & Community Overview must keep the reusable identity evidence meter collapsed behind a compact toggle and must describe evidence posture without visible numeric scoring."
);

assertContains(
  "trust",
  /TrustDocumentConfidenceRibbon[\s\S]*?trustPassportConfidenceRibbonItems[\s\S]*?Passport view[\s\S]*?Identity evidence[\s\S]*?What we checked[\s\S]*?Community history[\s\S]*?Check path/,
  "Trust Passport front package must expose a Trust Document Language confidence ribbon."
);

assertContains(
  "trust",
  /data-gsn-trust-document-certificate="trust-passport"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?title="Audit Details"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This passport confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This passport does not confirm"[\s\S]*?TrustDocumentFingerprint[\s\S]*?label="Trust Passport record reference"/,
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
