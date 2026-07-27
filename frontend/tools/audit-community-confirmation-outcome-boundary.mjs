/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  outcome: "src/pages/CommunityConfirmationOutcomePage.tsx",
  policy: "src/pages/CommunityConfirmationPolicyPage.tsx",
  inbox: "src/pages/CommunityConfirmationInboxPage.tsx",
  communityProofPanel: "src/components/CommunityProofPanel.tsx",
  communityProof: "src/lib/communityProof.ts",
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

[
  "inbox",
  "outcome",
].forEach((key) => {
  assertNotContains(
    key,
    /No trust change|Positive trust signal|negative trust signal|clear trust signal|public trust signal|specific trust decision|first trust check|trade trust check|entry trust check|changes GSN's trust reading|without changing trust|moving the trust reading/i,
    "Community confirmation surfaces must frame responses as evidence and decision support, not broad trust signals or trust decisions."
  );
});

assertContains(
  "inbox",
  /No evidence-reading change[\s\S]*?Positive evidence signal[\s\S]*?Negative evidence signal[\s\S]*?clear community evidence[\s\S]*?public evidence signal[\s\S]*?changes GSN's evidence reading only/,
  "Community Confirmation Inbox must keep evidence-reading and evidence-signal wording."
);

assertContains(
  "outcome",
  /privacy-safe community response for this specific decision-support request/i,
  "Community Confirmation Outcome subtitle must frame the public paper as decision support, not a trust decision."
);

assertContains(
  "outcome",
  /low-risk first evidence check[\s\S]*?Merchant or small trade evidence check[\s\S]*?Service or home-entry evidence check/,
  "Community Confirmation Outcome reason labels must frame public responses as evidence checks, not trust checks."
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
  /const safeDecisionActionText =[\s\S]*?Suitable for low-risk reliance\. Ask for more evidence before high-risk decisions\.[\s\S]*?Wait for more community responses before relying on this outcome\.[\s\S]*?Do not rely on this alone\. Ask for fresh community confirmation\.[\s\S]*?proceed with confidence\|use this confirmation for judgement[\s\S]*?: safeDecisionActionText;/,
  "Community Confirmation Outcome must replace overconfident supplied decision notes with safer next-action wording."
);

assertOrder(
  "outcome",
  [
    { label: "decision summary", pattern: /Decision Summary/ },
    { label: "outcome details disclosure", pattern: /<TrustDocumentDisclosureSection/ },
    { label: "outcome details title", pattern: /title="Outcome Details"/ },
    { label: "outcome details summary", pattern: /summary="Open for community evidence, who was confirmed, what was requested, and response counts\."/ },
    { label: "shared community proof panel", pattern: /<CommunityProofPanel/ },
    { label: "confirmation response wording", pattern: /memberWitnessLabel="Confirmation response"/ },
    { label: "whole-community vote boundary", pattern: /not a whole-community vote or separate member-witness credential count/ },
    { label: "identity details", pattern: /Who is being confirmed\?/ },
    { label: "request details", pattern: /What was requested\?/ },
    { label: "community response details", pattern: /Community response/ },
    { label: "outcome details close", pattern: /<\/TrustDocumentDisclosureSection>/ },
    { label: "public actions", pattern: /Public actions/ },
  ],
  "Community Confirmation Outcome must keep the decision summary first and collapse proof, identity, request, and response details before public actions."
);
assertContains(
  "communityProofPanel",
  /data-gsn-community-proof-layer="true"[\s\S]*?data-gsn-community-proof-item=\{item\.key\}/,
  "Community Confirmation Outcome must use the shared Community Proof panel markers."
);

assertContains(
  "communityProof",
  /memberWitnessLabel\?: unknown;[\s\S]*?memberWitnessDetail\?: unknown;[\s\S]*?label: memberWitnessLabel[\s\S]*?memberWitnessDetail \|\|[\s\S]*?Evidence for your decision[\s\S]*?not government ID, payment approval, credit approval, or a guarantee of future behaviour/,
  "Shared Community Proof must support honest confirmation-response wording while preserving the decision boundary."
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
  /import \{ useLocation, useParams \} from "react-router-dom";[\s\S]*?import \{ revealElementWithoutJump \} from "\.\.\/lib\/mobileRevealStability";[\s\S]*?notificationDecisionFocus[\s\S]*?focus === "decision"[\s\S]*?decisionActionRef\.current[\s\S]*?target\.open = true;[\s\S]*?revealElementWithoutJump\(target,[\s\S]*?community-confirmation-outcome-record-decision[\s\S]*?data-gsn-community-confirmation-outcome-notification-focus="true"/,
  "Outcome notification focus must open and reveal the signed-in decision section without changing the public paper route."
);
assertContains(
  "outcome",
  /debugId="community-confirmation-outcome\.record-decision"[\s\S]*?Record your decision[\s\S]*?Signed-in action/,
  "Decision recording controls must stay inside an explicit signed-in disclosure."
);
assertContains(
  "outcome",
  /const \[publicActionsOpen, setPublicActionsOpen\] = useState\(false\);[\s\S]*?Public actions[\s\S]*?debugId="community-confirmation-outcome\.refresh"[\s\S]*?debugId="community-confirmation-outcome\.more-public-actions"[\s\S]*?\{publicActionsOpen \? \([\s\S]*?data-gsn-community-confirmation-outcome-secondary-actions="open"[\s\S]*?debugId="community-confirmation-outcome\.copy-link"[\s\S]*?debugId="community-confirmation-outcome\.print"/,
  "Community Confirmation Outcome must keep secondary public copy/print actions hidden behind More public actions."
);

assertOrder(
  "outcome",
  [
    { label: "public actions heading", pattern: /Public actions/ },
    { label: "refresh primary action", pattern: /debugId="community-confirmation-outcome\.refresh"/ },
    { label: "more public actions toggle", pattern: /debugId="community-confirmation-outcome\.more-public-actions"/ },
    { label: "secondary action panel", pattern: /data-gsn-community-confirmation-outcome-secondary-actions="open"/ },
    { label: "copy public link", pattern: /debugId="community-confirmation-outcome\.copy-link"/ },
    { label: "print public paper", pattern: /debugId="community-confirmation-outcome\.print"/ },
  ],
  "Community Confirmation Outcome public actions must keep refresh first and secondary copy/print behind the compact toggle."
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
  "outcome",
  /function formatCountdown\(totalSeconds: number\): string \{[\s\S]*?const days = Math\.floor\(safe \/ 86400\);[\s\S]*?return `\$\{days\}d \$\{hours\}h`;[\s\S]*?return `\$\{hours\}h \$\{String\(minutes\)\.padStart\(2, "0"\)\}m`;/,
  "Community Confirmation Outcome countdown must display long confirmation windows in days/hours instead of giant minute counts."
);

assertContains(
  "policy",
  /Use enough time for real community members to see, think, and respond\.[\s\S]*?\["72 hours", 259200\][\s\S]*?\["5 days", 432000\][\s\S]*?\["7 days", 604800\]/,
  "Community Confirmation Policy page must offer real social response windows starting at 72 hours."
);

assertNotContains(
  "policy",
  /\["5 min", 300\]|\["1 day", 86400\]|Short for quick checks/,
  "Community Confirmation Policy page must not expose the old 5-minute or 1-day response-window choices."
);

assertContains(
  "service",
  /COMMUNITY_CONFIRMATION_RESPONSE_WINDOW_SECONDS = 72 \* 60 \* 60[\s\S]*?INSTANT_WINDOW_SECONDS = COMMUNITY_CONFIRMATION_RESPONSE_WINDOW_SECONDS[\s\S]*?response_window_seconds=COMMUNITY_CONFIRMATION_RESPONSE_WINDOW_SECONDS[\s\S]*?if normalized_mode == "instant_pulse"[\s\S]*?else max\([\s\S]*?COMMUNITY_CONFIRMATION_RESPONSE_WINDOW_SECONDS/,
  "Backend community confirmation requests must keep instant and policy windows at a minimum of 72 hours."
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
