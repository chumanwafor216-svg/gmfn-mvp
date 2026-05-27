/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

const trustDomainFiles = [
  "src/components/CompanionLayer.tsx",
  "src/pages/TrustPage.tsx",
  "src/pages/TrustScorePage.tsx",
  "src/pages/TrustSlipPage.tsx",
  "src/pages/TrustSlipVerifyPage.tsx",
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  "src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  "src/pages/CCIReadingPage.tsx",
  "src/pages/OpenTrustPage.tsx",
  "src/pages/TrustTimelinePage.tsx",
  "src/pages/TrustCommandCentrePage.tsx",
  "src/pages/CommunityVerifyPage.tsx",
  "src/pages/CommunityConfirmationOutcomePage.tsx",
  "src/pages/CommunityConfirmationInboxPage.tsx",
  "src/pages/CommunityConfirmationPolicyPage.tsx",
];

function assertContains(file, pattern, message) {
  const text = read(file);

  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);

  text.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

function assertStableActionsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern =
    /<(?:PrimaryButton|SecondaryButton|SubtleButton|DangerButton|StableButton|StableCtaLink|StableDisclosureSummary)\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 1100);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Trust-domain stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

trustDomainFiles.forEach(assertStableActionsHaveDebugIds);

for (const file of trustDomainFiles) {
  assertNotContains(
    file,
    /to=["']\/cover["']/,
    "Trust-domain actions must not send trust users directly to Cover."
  );
}

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /function trustSlipVerifyFrontendPath\(code: string, fallback = ""\): string \{[\s\S]*?return `\/trust-slips\/verify\/\$\{encodeURIComponent\(cleanCode\)\}\/page`;[\s\S]*?return rawFallback\.startsWith\("\/trust-slips\/verify"\) \? rawFallback : "";/,
  "TrustSlip verify links must prefer the public TrustSlip verification paper with a code and reject unrelated fallback routes."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /navigateWithOrigin\(navigate, verifyPath, location\)[\s\S]*?debugId="trust-slip\.paper\.open-verify"[\s\S]*?navigateWithOrigin\(navigate, verifyPath, location\)[\s\S]*?debugId="trust-slip\.paper\.verify"/,
  "TrustSlip paper verify actions must use the resolved public verify path, not a bare app route."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /TRUST_SLIP_MOBILE_SCROLL_CLEARANCE[\s\S]*?function trustSlipScrollClearance\(isCompact: boolean\)[\s\S]*?scrollMarginTop: isCompact \? TRUST_SLIP_MOBILE_SCROLL_CLEARANCE : 24[\s\S]*?if \(location\.hash\) return undefined;[\s\S]*?window\.scrollTo\(\{ left: 0, top: 0, behavior: "auto" \}\);/,
  "TrustSlip must reset non-hash route loads and reserve mobile scroll clearance so sticky app chrome cannot hide paper section headings."
);

assertContains(
  "src/lib/api.ts",
  /export async function reissueMyTrustSlip[\s\S]*?\/trust-slips\/me\/reissue[\s\S]*?force: params\?\.force \?\? true/,
  "TrustSlip refresh must have an API client path that can request a fresh public code/date instead of only reloading the current slip."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /await api\.reissueMyTrustSlip\(\{[\s\S]*?reason: "holder_requested_fresh_public_trustslip"[\s\S]*?force: true[\s\S]*?Fresh TrustSlip issued\./,
  "TrustSlip page refresh must force a fresh public TrustSlip so the QR, issued date, and expiry update for a new sharing session."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /fetchTrustSlipPageData\(selectedClanId, \{[\s\S]*?networkFirst: true[\s\S]*?\}\)[\s\S]*?mergeFreshTrustSlipSummary\(data\.summary, reissueResult\)/,
  "TrustSlip refresh must reload the current slip network-first and seed the visible code/date from the reissue response so stale helper responses cannot keep an old QR/date on screen."
);

assertContains(
  "src/pages/TrustScorePage.tsx",
  /if \(verifyPath\) \{[\s\S]*?openTrustRoute\(verifyPath\);[\s\S]*?Open TrustSlip first and refresh or generate the current TrustSlip\.[\s\S]*?openTrustRoute\(routes\.trustSlip\);[\s\S]*?debugId="trust-score\.verify"/,
  "Trust Passport verify action must open a coded verify path when available and fall back to TrustSlip preparation when no code is visible."
);

assertContains(
  "src/pages/TrustSlipVerifyPage.tsx",
  /if \(!codeToUse && isAppRoute && typeof \(api as any\)\.getMyTrustSlip === "function"\) \{[\s\S]*?const mySlip = await \(api as any\)\.getMyTrustSlip\(\)\.catch\(\(\) => null\);[\s\S]*?codeToUse = firstTruthy\(mySlip\?\.code, mySlip\?\.trust_slip_code\);/,
  "Signed-in TrustSlip Verify must try the current member TrustSlip before showing a missing-code state."
);

assertContains(
  "src/pages/TrustSlipVerifyPage.tsx",
  /isAppRoute \? \([\s\S]*?<PageTopNav[\s\S]*?backTo=\{routes\.trustSlip\}[\s\S]*?\) : \(/,
  "Signed-in TrustSlip Verify must keep the app TrustSlip back route instead of presenting public-entry actions."
);

assertContains(
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  /debugId="trust-slip-verify\.community-confirmation\.open-outcome"[\s\S]*?debugId="trust-slip-verify\.community-confirmation\.request"/,
  "TrustSlip Verify public paper must keep traceable community-confirmation actions."
);

assertContains(
  "src/pages/TrustSlipVerifyPage.tsx",
  /setConfirmationOutcome\(result\);[\s\S]*?result\?\.public_token[\s\S]*?navigateWithOrigin\([\s\S]*?`\/community-confirmations\/public\/\$\{encodeURIComponent\(String\(result\.public_token\)\)\}`/,
  "TrustSlip Verify must move a live community confirmation request into the focused public outcome lane instead of leaving the result buried in the TrustSlip page."
);

assertContains(
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  /<div style=\{\{ \.\.\.sectionLabel\(\), color: "#64748B" \}\}>Holder<\/div>[\s\S]*?\{holderName\}[\s\S]*?GSN ID: \{gsnId\}/,
  "TrustSlip Verify public paper must show the holder name in the Holder field and keep the GSN ID as a separate identifier."
);

assertContains(
  "src/pages/trustSlipVerify/trustSlipVerifyData.ts",
  /if \(record\.is_current === false\) \{[\s\S]*?title: "Needs fresh TrustSlip"[\s\S]*?replaced by a newer TrustSlip/,
  "TrustSlip Verify must warn when a public paper has been superseded by a newer TrustSlip instead of presenting old issue dates as current."
);

assertContains(
  "src/pages/TrustSlipVerifyPage.tsx",
  /debugId="trust-slip-verify\.copy-code"[\s\S]*?debugId="trust-slip-verify\.copy-link"[\s\S]*?debugId="trust-slip-verify\.copy-gmfn-id"[\s\S]*?debugId="trust-slip-verify\.route\.trust"/,
  "TrustSlip Verify page actions must keep traceable copy and Trust Passport actions."
);

assertContains(
  "src/pages/TrustSlipVerifyPage.tsx",
  /to=\{communityVerifyPath \|\| "#"\}[\s\S]*?kind=\{communityVerifyPath \? "primary" : "soft"\}[\s\S]*?debugId="trust-slip-verify\.public\.open-community-record"/,
  "TrustSlip Verify community record action must be visually highlighted when a community verification route is available."
);

assertContains(
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  /function lockedActionFrame\(compact: boolean\)[\s\S]*?gridTemplateRows:[\s\S]*?overflowAnchor: "none"[\s\S]*?rowValue\(communityConfirmationRows, "Eligible response pool"\)[\s\S]*?no eligible responders are set up[\s\S]*?Why this is locked/,
  "TrustSlip Verify must explain why instant community confirmation is locked in a reserved stable action frame when the eligible response pool is empty."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /debugId="trust-slip\.community-confirmation\.request"[\s\S]*?debugId="trust-slip\.community-confirmation\.open-community-record"[\s\S]*?debugId="trust-slip\.community-confirmation\.open-outcome"/,
  "TrustSlip community-confirmation actions must stay traceable and grouped."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /setConfirmationOutcome\(result\);[\s\S]*?result\?\.public_token[\s\S]*?navigateWithOrigin\([\s\S]*?`\/community-confirmations\/public\/\$\{encodeURIComponent\(String\(result\.public_token\)\)\}`/,
  "TrustSlip page must move a live community confirmation request into the focused public outcome lane instead of leaving the result buried in the TrustSlip page."
);

assertContains(
  "src/pages/CommunityConfirmationOutcomePage.tsx",
  /function formatCountdown\(totalSeconds: number\)[\s\S]*?loadOutcome\(\{ silent: true \}\)[\s\S]*?Public Paper[\s\S]*?Community Confirmation[\s\S]*?Expired request[\s\S]*?Time\s+left[\s\S]*?Community response[\s\S]*?Public actions/,
  "Community confirmation outcome page must keep the focused public-paper layout with countdown, response counts, and public actions."
);

assertContains(
  "src/lib/companion.ts",
  /navigator\.vibrate[\s\S]*?export function buildUrgentCompanionNotificationDecision[\s\S]*?urgent-community-confirmation/,
  "Companion alerts must support urgent no-cash community confirmation notifications with phone vibration when browser support allows it."
);

assertContains(
  "src/components/CompanionLayer.tsx",
  /URGENT_CONFIRMATION_KIND = "community_confirmation\.request_to_respond"[\s\S]*?URGENT_CONFIRMATION_OUTCOME_KINDS[\s\S]*?community_confirmation\.outcome_updated[\s\S]*?community_confirmation\.request_expired[\s\S]*?URGENT_CONFIRMATION_POLL_MS = 15000[\s\S]*?getMyNotifications\(20, true\)[\s\S]*?runUrgentCompanionNotificationCycle/,
  "The workspace companion layer must poll unread urgent community confirmation request and outcome notifications and raise no-cash phone/browser alerts while the app is open."
);

assertContains(
  "src/lib/guidance.ts",
  /text\.includes\("community_confirmation\.request_to_respond"\)[\s\S]*?text\.includes\("community_confirmation\.outcome_updated"\)[\s\S]*?text\.includes\("community_confirmation\.request_expired"\)[\s\S]*?return "actNow";/,
  "Community confirmation request and requester outcome notifications must be classified as Act Now guidance."
);

assertContains(
  "src/pages/NotificationsPage.tsx",
  /PUBLIC_ROUTE_PREFIXES = \[[\s\S]*?"community-confirmations"[\s\S]*?\]/,
  "Notifications must allow community confirmation public result links to open their public paper instead of being forced back into the app shell."
);

assertContains(
  "src/lib/guidance.ts",
  /PUBLIC_ROUTE_PREFIXES = \[[\s\S]*?"community-confirmations"[\s\S]*?\]/,
  "Guidance notification targets must allow community confirmation public result links to open their public paper."
);

assertContains(
  "../gmfn_backend/app/api/routes/community_confirmations.py",
  /def _optional_current_user[\s\S]*?requester_user_id=\(/,
  "Community confirmation requests must capture the signed-in requester when one exists so outcome notifications can return them to the result paper."
);

assertContains(
  "../gmfn_backend/app/services/community_confirmation_service.py",
  /def _confirmation_public_outcome_action_url[\s\S]*?community_confirmation\.outcome_updated[\s\S]*?community_confirmation\.request_expired[\s\S]*?community_confirmation\.requester_notified/,
  "Community confirmation outcomes and expiries must notify the signed-in requester and record that requester notification in Trust Events."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /to=\{communityVerifyPath \|\| "#"\}[\s\S]*?kind=\{communityVerifyPath \? "primary" : "soft"\}[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="trust-slip\.community-confirmation\.open-community-record"/,
  "TrustSlip page community record action must be visually highlighted when a community verification route is available."
);

assertContains(
  "src/pages/CommunityConfirmationInboxPage.tsx",
  /debugId=\{`community-confirmation-inbox\.review-cases\.\$\{row\.reviewCaseId\}\.assignment-claim`\}[\s\S]*?debugId=\{`community-confirmation-inbox\.review-cases\.\$\{row\.reviewCaseId\}\.assignment-release`\}[\s\S]*?debugId=\{`community-confirmation-inbox\.review-cases\.\$\{row\.reviewCaseId\}\.assignment-manual`\}/,
  "Community confirmation review assignment actions must stay separately traceable."
);

assertContains(
  "src/pages/TrustCommandCentrePage.tsx",
  /debugId=\{`trust-command\.route\.\$\{card\.label\.toLowerCase\(\)\.replace/,
  "Trust command centre route tiles must keep generated debug IDs for route tracing."
);

if (findings.length > 0) {
  console.error("Trust action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Trust action audit passed.");
