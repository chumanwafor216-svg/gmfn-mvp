/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  outcome: "src/pages/CommunityConfirmationOutcomePage.tsx",
  service: "../gmfn_backend/app/services/community_confirmation_service.py",
  package: "package.json",
  protectedFreeze: "tools/audit-protected-button-freeze.mjs",
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
    text: String(text).replace(/\s+/g, " ").slice(0, 300),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}

function assertNotContains(key, pattern, message) {
  const source = sourceByKey[key];
  const match = source.match(pattern);
  if (!match || match.index === undefined) return;
  addFinding(key, match.index, message, match[0]);
}

function assertOrder(key, orderedPatterns, message) {
  const source = sourceByKey[key];
  let cursor = -1;
  const seen = [];

  for (const item of orderedPatterns) {
    const scopedSource = source.slice(cursor + 1);
    const match = scopedSource.match(item.pattern);
    if (!match || match.index === undefined) {
      addFinding(
        key,
        cursor,
        message,
        `Missing after ${seen.join(" -> ") || "start"}: ${item.label}`
      );
      return;
    }
    cursor = cursor + 1 + match.index;
    seen.push(item.label);
  }
}

assertContains(
  "app",
  /path="\/community-confirmations\/public\/:token"[\s\S]*?<CommunityConfirmationOutcomePage \/>/,
  "Community Confirmation Outcome must remain a named public route with its route-local page."
);

assertContains(
  "outcome",
  /getPublicCommunityConfirmation/,
  "Community Confirmation Outcome must load the public confirmation paper through the public API wrapper."
);

assertContains(
  "outcome",
  /TrustDocumentBoundaryPanel[\s\S]*TrustDocumentConfidenceRibbon[\s\S]*TrustDocumentDisclosureSection[\s\S]*TrustDocumentFingerprint[\s\S]*TrustDocumentSecurityPanel/,
  "Community Confirmation Outcome must keep the trust-document primitives that frame the paper as evidence, not as approval."
);

assertContains(
  "outcome",
  /const outcomeConfirmsList = \[[\s\S]*?Public confirmation link code and request status shown on this page[\s\S]*?Community name and Community ID\/code[\s\S]*?aggregate response counts[\s\S]*?QR and public link reopen this same confirmation outcome[\s\S]*?\];/,
  "The public paper must keep a clear 'this confirms' boundary list."
);

assertContains(
  "outcome",
  /const outcomeDoesNotConfirmList = \[[\s\S]*?Whole-community vote or approval by every member[\s\S]*?Private responder names, contacts, notes, or private review details[\s\S]*?Payment received, bank guarantee, escrow, loan approval, or credit approval[\s\S]*?Permission to release goods, money, credit, or services[\s\S]*?\];/,
  "The public paper must keep a clear 'this does not confirm' boundary list."
);

assertContains(
  "outcome",
  /response\.private_contacts_exposed \? "Check privacy" : "Contacts hidden"/,
  "The visible privacy badge must still surface the private_contacts_exposed boundary."
);

assertContains(
  "outcome",
  /Private contacts, verifier names, phone numbers, shop details, payment records, and credit approval stay hidden\./,
  "The public paper must plainly say private contacts and transaction-sensitive records stay hidden."
);

assertNotContains(
  "outcome",
  /\b(PageTopNav|BottomNav|AppLayout)\b/,
  "The public outcome page must not import or render authenticated app navigation chrome."
);

assertContains(
  "outcome",
  /if \(!requestId \|\| decisionSnapshot \|\| !getAccessToken\(\)\) return;/,
  "Signed-in decision snapshots must not load for anonymous public visitors."
);

assertContains(
  "outcome",
  /if \(!reviewCaseId \|\| !getAccessToken\(\)\) \{[\s\S]*?setReviewEvidence\(\[\]\);[\s\S]*?return;/,
  "Private review evidence must clear and stop loading when the public visitor has no access token."
);

assertContains(
  "outcome",
  /debugId="community-confirmation-outcome\.record-decision"[\s\S]*?Record your decision[\s\S]*?Signed-in action/,
  "Decision recording controls must stay inside an explicit signed-in disclosure."
);

assertContains(
  "outcome",
  /debugId="community-confirmation-outcome\.decision\.partial-release"[\s\S]*?debugId="community-confirmation-outcome\.decision\.did-not-release"[\s\S]*?debugId="community-confirmation-outcome\.decision\.deferred"/,
  "Decision action inventory changed; re-audit the signed-in public-route boundary before accepting drift."
);

assertContains(
  "outcome",
  /debugId="community-confirmation-outcome\.request-status\.close"[\s\S]*?debugId="community-confirmation-outcome\.request-status\.review"[\s\S]*?debugId="community-confirmation-outcome\.request-status\.cancel"/,
  "Request lifecycle action inventory changed; re-audit the signed-in public-route boundary before accepting drift."
);

assertOrder(
  "outcome",
  [
    { label: "review case gate", pattern: /\{outcome\.review_case \? \(/ },
    { label: "private review evidence disclosure", pattern: /debugId="community-confirmation-outcome\.review-evidence"/ },
    { label: "add private review evidence action", pattern: /debugId="community-confirmation-outcome\.review-evidence\.add"/ },
    { label: "review resolve clean", pattern: /debugId="community-confirmation-outcome\.review\.resolve-clean"/ },
    { label: "review resolve caution", pattern: /debugId="community-confirmation-outcome\.review\.resolve-caution"/ },
    { label: "review dismiss", pattern: /debugId="community-confirmation-outcome\.review\.dismiss"/ },
  ],
  "Private review controls must remain under the review-case gate and in the expected signed-in inventory order."
);

assertContains(
  "service",
  /def public_confirmation_outcome\(db: Session, \*, public_token: str\) -> Dict\[str, Any\]:[\s\S]*?"review_case": _review_case_public_item\([\s\S]*?include_private_note=False[\s\S]*?"private_contacts_exposed": False[\s\S]*?"privacy_note": "GSN shows a controlled community outcome\. It does not expose private member phone numbers\."[\s\S]*?"decision_note": "This is evidence for judgement, not a guarantee, payment instruction, or automatic approval\."/,
  "Backend public confirmation outcome must withhold private review notes, keep contacts hidden, and include explicit privacy and decision notes."
);

assertContains(
  "package",
  /"audit:community-confirmation-outcome-boundary": "node tools\/audit-community-confirmation-outcome-boundary\.mjs"/,
  "Community Confirmation Outcome boundary audit must stay registered in package scripts."
);

assertContains(
  "protectedFreeze",
  /audit-community-confirmation-outcome-boundary\.mjs/,
  "Community Confirmation Outcome boundary audit must stay included in the protected button freeze cage."
);

if (findings.length > 0) {
  console.error("Community Confirmation Outcome boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Community Confirmation Outcome boundary audit passed: public evidence framing, privacy notes, anonymous data guards, signed-in controls, and backend public payload privacy are caged."
);
