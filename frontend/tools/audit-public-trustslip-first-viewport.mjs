/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  publicPaper: "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
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
  /const supportPurpose = \/guarantor\|guarantee\|support\/i\.test\(decisionPackPurpose\)[\s\S]*?const employmentPurpose = \/employment\|work\|job\/i\.test\(decisionPackPurpose\)[\s\S]*?const housingPurpose = \/housing\|tenant\|rent\/i\.test\(decisionPackPurpose\)[\s\S]*?const tradePurpose = \/trade\|supplier\|skilled\|market\/i\.test\(decisionPackPurpose\)[\s\S]*?const decisionFirstAnswer = !validNow[\s\S]*?"Community recognition supported; guarantee still needs confirmation"[\s\S]*?"Suitable for employment screening"[\s\S]*?"Community recognition visible; housing still needs confirmation"[\s\S]*?"Suitable for a low-risk trade check"[\s\S]*?const decisionFirstFacts:[\s\S]*?label: "Who\?"[\s\S]*?label: "Next step"[\s\S]*?const decisionBoundaryRows:[\s\S]*?\["Final decision", "Yours"\][\s\S]*?const decisionReasonLine = !validNow[\s\S]*?"Evidence is strong enough for community recognition, but not yet strong enough for financial guarantee\. Request live community confirmation before relying\."[\s\S]*?const decisionTranslationRows: Array<\[string, string\]> = \[[\s\S]*?\["Active Community ID", communityConnectionFinding\][\s\S]*?\["Recommended action", recommendedActionFinding\]/,
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
  /DecisionFactorTable rows=\{compact \? decisionTranslationRows\.filter\(\(\[label\]\) => label === "Active Community ID" \|\| label === \(supportPurpose \? "Repayment\/support evidence" : "Purpose evidence"\) \|\| label === "Current witnesses" \|\| label === "Recommended action"\) : decisionTranslationRows\}/,
  "Public TrustSlip phone first viewport must show only the three essential decision factors before deeper evidence drawers."
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
  "publicPaper",
  /data-gsn-public-decision-first="one-answer-four-facts"[\s\S]*?Decision Summary[\s\S]*?\{decisionDisplayAnswer\}[\s\S]*?\{decisionReasonLine\}[\s\S]*?data-gsn-public-evidence-translation="decision-why"[\s\S]*?Evidence behind this recommendation[\s\S]*?<DecisionFactorTable rows=\{compact \? decisionTranslationRows\.filter\(\(\[label\]\) => label === "Active Community ID" \|\| label === \(supportPurpose \? "Repayment\/support evidence" : "Purpose evidence"\) \|\| label === "Current witnesses" \|\| label === "Recommended action"\) : decisionTranslationRows\} compact=\{compact\} \/>[\s\S]*?data-gsn-public-decision-first-facts="four-quick-facts"[\s\S]*?display: compact \? "none" : "grid"[\s\S]*?decisionFirstFacts\.map[\s\S]*?data-gsn-public-decision-boundary="compact"[\s\S]*?Decision Boundary[\s\S]*?GSN checked \{evidenceScopeIsWider \? "primary and wider community signals" : "the primary community signal"\}[\s\S]*?title="Full evidence and record details"[\s\S]*?data-gsn-public-mobile-full-evidence="collapsed-summary"/,
  "Public TrustSlip phone viewport must render the answer, reason, decision-factor findings, desktop-only quick facts, compact boundary, and collapsed supporting details."
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

if (findings.length) {
  findings.forEach((finding) => {
    console.error(
      `[audit-public-trustslip-first-viewport] ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  });
  process.exit(1);
}

console.log("Public TrustSlip first-viewport contract passed.");
