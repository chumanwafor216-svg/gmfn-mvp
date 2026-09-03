/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  publicPaper: "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  routePage: "src/pages/TrustSlipVerifyPage.tsx",
  app: "src/App.tsx",
  api: "src/lib/api.ts",
  profileImage: "src/lib/profileImage.ts",
  package: "package.json",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);

const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const source = sourceByKey[key];
  findings.push({
    file: files[key],
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 320),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}

function assertOrder(key, orderedPatterns, message) {
  const source = sourceByKey[key];
  let cursor = -1;
  const seen = [];

  for (const item of orderedPatterns) {
    const scoped = source.slice(cursor + 1);
    const match = scoped.match(item.pattern);
    if (!match || match.index === undefined) {
      addFinding(
        key,
        cursor,
        message,
        `Missing after ${seen.join(" -> ") || "start"}: ${item.label}`
      );
      return;
    }
    cursor = cursor + 1 + match.index + match[0].length;
    seen.push(item.label);
  }
}

assertContains(
  "package",
  /"audit:public-trustslip-first-viewport": "node tools\/audit-public-trustslip-first-viewport\.mjs"/,
  "package.json must expose the named public TrustSlip first-viewport audit."
);

assertOrder(
  "publicPaper",
  [
    { label: "public decision pack hero", pattern: /<header style=\{publicVerifyHero\(compact\)\}>[\s\S]*?Public Decision Pack/ },
    { label: "decision first answer", pattern: /data-gsn-public-decision-first="one-answer-four-facts"/ },
    { label: "decision evidence translation", pattern: /data-gsn-public-evidence-translation="decision-why"/ },
    { label: "visible evidence snapshot", pattern: /data-gsn-public-decision-evidence-snapshot="visible-public-safe-answers"/ },
    { label: "desktop quick facts", pattern: /data-gsn-public-decision-first-facts="four-quick-facts"/ },
    { label: "compact decision boundary", pattern: /data-gsn-public-decision-boundary="compact"/ },
    { label: "decision reading", pattern: /data-debug-id="trust-slip-verify\.public\.decision-pack-reading"/ },
    { label: "decision evidence details", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="Decision evidence details"/ },
    { label: "decision profile cage", pattern: /data-gsn-decision-pack-profile="public-purpose-filter"/ },
    { label: "audit details disclosure", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="Audit Details"/ },
    { label: "more details cage", pattern: /data-gsn-public-more-details="authority-evidence-limits"/ },
    { label: "authority strip", pattern: /<TrustPaperAuthorityStrip/ },
    { label: "confidence ribbon", pattern: /<TrustDocumentConfidenceRibbon items=\{trustSlipConfidenceRibbonItems\} \/>/ },
    { label: "community evidence checked", pattern: /<CommunityProofPanel[\s\S]*?title="Community evidence checked"/ },
    { label: "security disclosure", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="What this cannot prove"/ },
  ],
  "Public TrustSlip first viewport must lead with recipient decision, immediate evidence translation, and collapsed supporting proof before heavier security disclosure."
);

assertContains(
  "publicPaper",
  /<TrustDocumentDisclosureSection[\s\S]*?title="Audit Details"[\s\S]*?summary="Open for technical record checks, community evidence, security, and limits\."[\s\S]*?data-gsn-public-more-details="authority-evidence-limits"[\s\S]*?<TrustPaperAuthorityStrip[\s\S]*?<TrustDocumentConfidenceRibbon items=\{trustSlipConfidenceRibbonItems\} \/>[\s\S]*?<CommunityProofPanel[\s\S]*?title="Community evidence checked"[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="What this cannot prove"/,
  "Public TrustSlip heavier authority, community-evidence, security, and limit layers must live behind one Audit Details disclosure."
);

assertContains(
  "publicPaper",
  /function publicVerifyHero\(compact: boolean\): React\.CSSProperties \{[\s\S]*?gridTemplateColumns: compact \? "minmax\(0, 1fr\)" : "190px minmax\(0, 1fr\)"[\s\S]*?minHeight: compact \? "auto" : 220[\s\S]*?padding: compact \? "12px 14px 18px" : "34px 44px 42px"/,
  "Public verify hero must keep a bounded mobile first viewport and the institutional desktop composition."
);

assertContains(
  "publicPaper",
  /Public Decision Pack[\s\S]*?fontSize: compact \? 28 : 58[\s\S]*?fontSize: compact \? 12\.5 : 20[\s\S]*?Public Decision Pack for a safer next decision\./,
  "Public verify hero must keep compact mobile headline/body sizing and a short Decision Pack framing."
);

assertContains(
  "publicPaper",
  /const supportPurpose = \/guarantor\|guarantee\|support\/i\.test\(decisionPackPurpose\)[\s\S]*?const employmentPurpose = \/employment\|work\|job\/i\.test\(decisionPackPurpose\)[\s\S]*?const housingPurpose = \/housing\|tenant\|rent\/i\.test\(decisionPackPurpose\)[\s\S]*?const tradePurpose = \/trade\|supplier\|skilled\|market\/i\.test\(decisionPackPurpose\)[\s\S]*?const decisionFirstAnswer = !validNow[\s\S]*?const decisionFirstFacts:[\s\S]*?label: "Who\?"[\s\S]*?label: "Next step"[\s\S]*?const decisionBoundaryRows:[\s\S]*?\["Final decision", "Yours"\][\s\S]*?const decisionPackDefinition = findDecisionPack\(decisionPackPurpose\) \|\| DEFAULT_DECISION_PACK[\s\S]*?const purposeDecisionReading = buildDecisionPackDecisionReading\(decisionPackDefinition[\s\S]*?const decisionDisplayAnswer = purposeDecisionReading\.headline \|\| decisionFirstAnswer[\s\S]*?const decisionReasonLine = purposeDecisionReading\.conclusion[\s\S]*?const decisionBecauseRows: Array<\[string, string\]> = purposeDecisionReading\.because[\s\S]*?`Because \$\{index \+ 1\}`[\s\S]*?const decisionTranslationRows: Array<\[string, string\]> = \[[\s\S]*?\.\.\.decisionBecauseRows[\s\S]*?\["Recommended action", recommendedActionFinding\]/,
  "Public TrustSlip first viewport must state what decision the evidence supports, explain why, keep quick facts, and preserve the compact decision boundary."
);


assertContains(
  "publicPaper",
  /function DecisionFactorTable[\s\S]*?gridTemplateColumns: compact[\s\S]*?\? "1fr"[\s\S]*?fontSize: compact \? 12\.2 : 13[\s\S]*?fontWeight: 930/,
  "Decision factor rows must stack on phone so institutional text does not squeeze into narrow columns."
);

assertContains(
  "publicPaper",
  /function paperDataRow\(compact = false\): React\.CSSProperties \{[\s\S]*?gridTemplateColumns: compact \? "1fr" : "minmax\(0, 1fr\) auto"[\s\S]*?alignItems: compact \? "start" : "center"[\s\S]*?textAlign: compact \? "left" : "right"[\s\S]*?justifySelf: compact \? "start" : "end"[\s\S]*?fontSize: compact \? 13 : undefined/,
  "Opened detail rows must stack label and value on phone so official record text stays mature and readable."
);

assertContains(
  "publicPaper",
  /gridTemplateColumns: compact \? "1fr" : "1fr 1fr"[\s\S]*?Community confidence/,
  "Opened verification paper status facts must stack on phone."
);
assertContains(
  "publicPaper",
  /gridTemplateColumns: compact \? "1fr" : "1fr 92px"[\s\S]*?Public link:/,
  "Opened verification paper QR and public-link row must stack on phone."
);

assertContains(
  "publicPaper",
  /DecisionFactorTable rows=\{compact \? decisionTranslationRows\.filter\(\(\[label\]\) => label === "Because 1" \|\| label === "Because 2"\) : decisionTranslationRows\}/,
  "Public TrustSlip phone first viewport must show only the immediate because rows before the visible evidence snapshot and deeper evidence drawer."
);

assertContains(
  "publicPaper",
  /title=\{decisionPackPurpose\}[\s\S]*?summary="Open for evidence sources, gaps, checks, and evidence boundaries\."[\s\S]*?defaultOpen=\{!compact\}[\s\S]*?data-debug-id="trust-slip-verify\.public\.decision-pack-reading"/,
  "Decision Pack detail must be a closed phone drawer and an open desktop section."
);

assertContains(
  "publicPaper",
  /title="Verification paper details"[\s\S]*?summary="Open for holder, public reading, community evidence, QR, and confirmation request\."[\s\S]*?defaultOpen=\{!compact\}[\s\S]*?publicVerifyShell\("#F8FBFF", compact\)/,
  "Legacy verification paper details must sit behind a phone drawer instead of exposing the whole paper at once."
);
assertContains(
  "routePage",
  /const isLiteRoute =[\s\S]*?endsWith\("\/lite"\)[\s\S]*?noPublicCodeSupplied \|\| isLiteRoute \|\| isCardRoute \? null : <TrustSlipVerifyBoundary compact=\{isCompact\} \/>/,
  "The public lite TrustSlip route must open as a focused card/paper without the extra boundary support section."
);

assertContains(
  "publicPaper",
  /const isLite = variant === "lite"[\s\S]*?!isLite \? publicActions : null/,
  "The public lite TrustSlip paper must not expose the extra public action block under the card."
);
assertContains(
  "app",
  /<Route path="\/t\/:code\/card" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code\/card" element=\{<TrustSlipVerifyPage \/>\} \/>/,
  "The public route table must include a card-only TrustSlip identity route for live QR checks."
);

assertContains(
  "routePage",
  /const isCardRoute =[\s\S]*?endsWith\("\/card"\)[\s\S]*?variant=\{isCardRoute \? "card" : isLiteRoute \? "lite" : "full"\}[\s\S]*?noPublicCodeSupplied \|\| isLiteRoute \|\| isCardRoute \? null : <TrustSlipVerifyBoundary compact=\{isCompact\} \/>/,
  "The TrustSlip verify page must render /card as a focused card-only public view without the extra boundary support section."
);

assertContains(
  "publicPaper",
  /variant\?: "full" \| "lite" \| "card"[\s\S]*?const isCard = variant === "card"[\s\S]*?data-gsn-public-identity-card-only="true"/,
  "The public paper must support a card-only public identity surface."
);

assertContains(
  "publicPaper",
  /data-gsn-public-identity-card-only="true"[\s\S]*?profileImageUrl[\s\S]*?alt=\{`\$\{holderName\} public GSN identity`\}/,
  "The card-only public identity surface must render the holder photo when a public profile image is available."
);

assertContains(
  "publicPaper",
  /const publicVerifyUrl =[\s\S]*?<QRCodeSVG\s+value=\{publicVerifyUrl\}[\s\S]*?Verify record/,
  "The card-only public identity surface must show a verification-record QR separate from the live card route."
);

assertContains(
  "publicPaper",
  /data-gsn-public-decision-first="one-answer-four-facts"[\s\S]*?Decision First[\s\S]*?\{decisionDisplayAnswer\}[\s\S]*?\{decisionReasonLine\}[\s\S]*?data-gsn-public-evidence-translation="decision-why"[\s\S]*?Why this recommendation\?[\s\S]*?<DecisionFactorTable rows=\{compact \? decisionTranslationRows\.filter\(\(\[label\]\) => label === "Because 1" \|\| label === "Because 2"\) : decisionTranslationRows\} compact=\{compact\} \/>[\s\S]*?data-gsn-public-decision-evidence-snapshot="visible-public-safe-answers"[\s\S]*?Visible evidence for this decision[\s\S]*?<DecisionFactorTable rows=\{publicDecisionEvidenceSnapshotDisplayRows\} compact=\{compact\} \/>[\s\S]*?data-gsn-public-decision-first-facts="four-quick-facts"[\s\S]*?display: compact \? "none" : "grid"[\s\S]*?Quick Decision[\s\S]*?quickDecisionFacts\.map[\s\S]*?title="Full evidence and record details"[\s\S]*?data-gsn-public-mobile-full-evidence="collapsed-summary"[\s\S]*?data-gsn-public-decision-support="meaning-next-action"[\s\S]*?What this means[\s\S]*?Next recommended action[\s\S]*?data-gsn-public-decision-boundary="compact"[\s\S]*?Decision Boundary[\s\S]*?GSN checked \{evidenceScopeIsWider \? "primary and wider community signals" : "the primary community signal"\}/,
  "Public TrustSlip phone viewport must render the answer, reason, recommendation findings, desktop quick decision, collapsed supporting details, meaning/action strip, and compact boundary."
);
assertContains(
  "publicPaper",
  /data-gsn-public-reader-confirmation-options="membership-community-witness"[\s\S]*?Choose what to confirm next[\s\S]*?Confirm membership[\s\S]*?debugId="trust-slip-verify\.public\.confirm-membership-first-view"[\s\S]*?debugId="trust-slip-verify\.public\.confirm-membership-unavailable"[\s\S]*?Ask community[\s\S]*?debugId="trust-slip-verify\.public\.request-confirmation-first-view"[\s\S]*?Review witnesses[\s\S]*?debugId="trust-slip-verify\.public\.review-witness-evidence-first-view"[\s\S]*?id="trust-slip-verify-community-known-as"/,
  "Public TrustSlip first viewport must protect the three reader confirmation choices: membership credential, scoped community answer, and witness/activity evidence review."
);



assertContains(
  "publicPaper",
  /function PublicReadingTile[\s\S]*?if \(compact\)[\s\S]*?data-gsn-public-reading-tile-density="compact"[\s\S]*?padding: 8[\s\S]*?minHeight: 84[\s\S]*?gridTemplateColumns: "32px minmax\(0, 1fr\)"[\s\S]*?fontSize: 10\.5[\s\S]*?return \([\s\S]*?minHeight: 132/,
  "Public reading tiles must keep compact phone density while preserving the larger desktop rhythm."
);

assertContains(
  "publicPaper",
  /title="Full evidence and record details"[\s\S]*?data-gsn-public-mobile-full-evidence="collapsed-summary"[\s\S]*?title="Core evidence reading"[\s\S]*?rows=\{communityActivityMeaningRows\}[\s\S]*?title="Decision evidence summary"[\s\S]*?rows=\{decisionPackEvidenceSummaryRows\}[\s\S]*?title="Live record checks"/,
  "Mobile Full Evidence drawer must lead with the core activity meaning and decision evidence summary before live code checks."
);

assertContains(
  "publicPaper",
  /title=\{decisionPackPurpose\}[\s\S]*?defaultOpen=\{!compact\}[\s\S]*?Decision Pack reading[\s\S]*?What does the community activity mean\?[\s\S]*?GSN reads the public-safe community activity first[\s\S]*?title="Core evidence reading"[\s\S]*?rows=\{communityActivityMeaningRows\}[\s\S]*?title="Decision evidence summary"[\s\S]*?rows=\{decisionPackEvidenceSummaryRows\}[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="Decision evidence details"[\s\S]*?summary="Open for evidence sources, categories, gaps, checks, and evidence boundaries\."[\s\S]*?data-gsn-decision-pack-profile="public-purpose-filter"[\s\S]*?Evidence source map[\s\S]*?Where can GSN point for this decision\?/,
  "Decision Pack reading must show the actual community activity meaning and decision evidence summary before source-map details stay collapsed."
);

assertContains(
  "api",
  /import \{ configuredPublicApiOrigin, isPrivateFrontendHost \} from "\.\/publicLinks";[\s\S]*?normalized === "\/api"[\s\S]*?hostname && !isPrivateFrontendHost\(hostname\)[\s\S]*?return configuredPublicApiOrigin\(\)/,
  "Production frontend API calls must resolve relative /api to the public API origin instead of the static frontend host."
);

assertContains(
  "profileImage",
  /import \{ isPrivateFrontendHost, publicApiOrigin \} from "\.\/publicLinks";[\s\S]*?!hostname \|\| isPrivateFrontendHost\(hostname\)[\s\S]*?return origin[\s\S]*?return publicApiOrigin\(\)/,
  "Production public profile images returned as relative /uploads paths must resolve against the API origin, while local dev can keep the Vite proxy origin."
);

assertContains(
  "routePage",
  /getTrustSlipVerify[\s\S]*?getTrustSlipVerification[\s\S]*?getTrustSlipByCode[\s\S]*?getTrustSlipPublic[\s\S]*?getTrustSlipPublicByCode/,
  "Public TrustSlip loading must keep API fallback names after the canonical verifyTrustSlip call."
);
assertContains(
  "routePage",
  /const verifyResult = await callFirstAvailable\([\s\S]*?\[\[codeToUse\]\][\s\S]*?\);/,
  "Public TrustSlip loading must pass the TrustSlip code as a string only, so fallback attempts do not call /verify/[object Object] or append object query params."
);
if (findings.length) {
  findings.forEach((finding) => {
    console.error(
      `[audit-public-trustslip-first-viewport] ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  });
  process.exit(1);
}

console.log("Public TrustSlip first-viewport contract passed.");
