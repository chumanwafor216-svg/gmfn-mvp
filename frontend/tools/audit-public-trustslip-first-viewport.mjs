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
    { label: "four quick facts", pattern: /data-gsn-public-decision-first-facts="four-quick-facts"/ },
    { label: "compact decision boundary", pattern: /data-gsn-public-decision-boundary="compact"/ },
    { label: "why received", pattern: /data-debug-id="trust-slip-verify\.public\.recipient-access-record"/ },
    { label: "why trusted", pattern: /data-gsn-public-record-trust-reasons="decision-pack"/ },
    { label: "decision reading", pattern: /data-debug-id="trust-slip-verify\.public\.decision-pack-reading"/ },
    { label: "decision evidence details", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="Decision evidence details"/ },
    { label: "decision profile cage", pattern: /data-gsn-decision-pack-profile="public-purpose-filter"/ },
    { label: "audit details disclosure", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="Audit Details"/ },
    { label: "more details cage", pattern: /data-gsn-public-more-details="authority-evidence-limits"/ },
    { label: "authority strip", pattern: /<TrustPaperAuthorityStrip/ },
    { label: "confidence ribbon", pattern: /<TrustDocumentConfidenceRibbon items=\{trustSlipConfidenceRibbonItems\} \/>/ },
    { label: "community evidence checked", pattern: /<CommunityProofPanel[\s\S]*?title="Community evidence checked"/ },
    { label: "security disclosure", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="TrustSlip security and limits"/ },
  ],
  "Public TrustSlip first viewport must lead with recipient decision support before heavier proof and security disclosure."
);

assertContains(
  "publicPaper",
  /<TrustDocumentDisclosureSection[\s\S]*?title="Audit Details"[\s\S]*?summary="Open for technical record checks, community evidence, security, and limits\."[\s\S]*?data-gsn-public-more-details="authority-evidence-limits"[\s\S]*?<TrustPaperAuthorityStrip[\s\S]*?<TrustDocumentConfidenceRibbon items=\{trustSlipConfidenceRibbonItems\} \/>[\s\S]*?<CommunityProofPanel[\s\S]*?title="Community evidence checked"[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="TrustSlip security and limits"/,
  "Public TrustSlip heavier authority, community-evidence, security, and limit layers must live behind one Audit Details disclosure."
);

assertContains(
  "publicPaper",
  /function publicVerifyHero\(compact: boolean\): React\.CSSProperties \{[\s\S]*?gridTemplateColumns: compact \? "minmax\(0, 1fr\)" : "190px minmax\(0, 1fr\)"[\s\S]*?minHeight: compact \? "auto" : 220[\s\S]*?padding: compact \? "18px 18px 26px" : "34px 44px 42px"/,
  "Public verify hero must keep a bounded mobile first viewport and the institutional desktop composition."
);

assertContains(
  "publicPaper",
  /Public Decision Pack[\s\S]*?fontSize: compact \? 34 : 58[\s\S]*?fontSize: compact \? 14 : 20[\s\S]*?Public Decision Pack for a safer next decision\./,
  "Public verify hero must keep compact mobile headline/body sizing and a short Decision Pack framing."
);

assertContains(
  "publicPaper",
  /const decisionFirstAnswer = !validNow[\s\S]*?"Verification required"[\s\S]*?"Known across evidence contexts"[\s\S]*?"Known by community"[\s\S]*?"Evidence still building"[\s\S]*?const decisionFirstFacts:[\s\S]*?label: "Who\?"[\s\S]*?label: "What we checked"[\s\S]*?label: "Evidence"[\s\S]*?label: "Next step"[\s\S]*?const decisionBoundaryRows:[\s\S]*?\["What we checked", activeCommunityContexts > 1 \? "Primary \+ wider" : "Primary shown"\][\s\S]*?\["Guarantee", "No"\][\s\S]*?\["Government ID", "No"\][\s\S]*?\["Credit approval", "No"\][\s\S]*?\["Final decision", "Yours"\]/,
  "Public TrustSlip first viewport must compute one big answer, four quick facts, and a compact decision boundary."
);

assertContains(
  "publicPaper",
  /data-gsn-public-decision-first="one-answer-four-facts"[\s\S]*?Decision Summary[\s\S]*?\{decisionFirstAnswer\}[\s\S]*?Use this as decision support for \{decisionPackPurpose\}[\s\S]*?data-gsn-public-decision-first-facts="four-quick-facts"[\s\S]*?decisionFirstFacts\.map[\s\S]*?data-gsn-public-decision-boundary="compact"[\s\S]*?What this cannot prove[\s\S]*?decisionBoundaryRows\.map/,
  "Public TrustSlip first viewport must render the answer, four facts, and compact decision boundary before supporting details."
);

assertContains(
  "publicPaper",
  /data-debug-id="trust-slip-verify\.public\.recipient-access-record"[\s\S]*?gridTemplateColumns: compact \? "40px minmax\(0, 1fr\)" : "54px minmax\(0, 1fr\)"[\s\S]*?padding: compact \? 9 : 14[\s\S]*?Why you received this[\s\S]*?\{recipientAccessRecord\.status\}[\s\S]*?gridTemplateColumns: "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?\["Recipient", recipientAccessRecord\.recipientLabel\][\s\S]*?\["Decision Pack", decisionPackPurpose\][\s\S]*?\["Scope", recipientAccessRecord\.scope\][\s\S]*?\["Access date", recipientAccessRecord\.accessedAtLabel\]/,
  "Recipient access record must remain compact, decision-scoped, and fed by view-model labels after the first answer."
);


assertContains(
  "publicPaper",
  /Why you received this[\s\S]*?\{recipientAccessRecord\.status\}/,
  "Recipient access record must render the human status supplied by the view model."
);
assertContains(
  "publicPaper",
  /const recordTrustReasonTiles = \[[\s\S]*?Public code[\s\S]*?Current window[\s\S]*?Check path[\s\S]*?Live confirmation[\s\S]*?\];[\s\S]*?data-gsn-public-record-trust-reasons="decision-pack"[\s\S]*?Why this record can be trusted[\s\S]*?current, traceable, and limited[\s\S]*?do not guarantee the holder or replace your own judgement[\s\S]*?data-gsn-public-record-trust-reasons-grid="compact-two-by-two"[\s\S]*?gridTemplateColumns: compact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(4, minmax\(0, 1fr\)\)"/,
  "Trustability reasons must stay grouped as code/currentness/check-path/live-confirmation signals without overclaiming."
);

assertContains(
  "publicPaper",
  /function PublicReadingTile[\s\S]*?if \(compact\)[\s\S]*?data-gsn-public-reading-tile-density="compact"[\s\S]*?padding: 8[\s\S]*?minHeight: 84[\s\S]*?gridTemplateColumns: "32px minmax\(0, 1fr\)"[\s\S]*?fontSize: 10\.5[\s\S]*?return \([\s\S]*?minHeight: 132/,
  "Public reading tiles must keep compact phone density while preserving the larger desktop rhythm."
);

assertContains(
  "publicPaper",
  /Decision Pack reading[\s\S]*?Can I make a better decision with this evidence\?[\s\S]*?This document exists to reduce uncertainty, not eliminate risk\.[\s\S]*?GSN provides trustworthy evidence; the recipient remains responsible for the decision\.[\s\S]*?Opened by \$\{decisionPackRecipient\}\. Read this as decision support, not a private investigation report\.[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="Decision evidence details"[\s\S]*?summary="Open for purpose-filtered signals, categories, gaps, checks, and evidence boundaries\."[\s\S]*?data-gsn-decision-pack-profile="public-purpose-filter"/,
  "Decision Pack reading must keep the quick judgement read visible while purpose-filtered categories, gaps, checks, and boundaries stay collapsed."
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