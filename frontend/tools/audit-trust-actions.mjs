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

function assertFunctionNotContains(file, functionName, forbiddenPattern, message) {
  const text = read(file);
  const startPattern = new RegExp(`def ${functionName}\\b`);
  const startMatch = startPattern.exec(text);
  if (!startMatch) {
    findings.push({
      file,
      line: 1,
      message,
      text: `Function ${functionName} was not found.`,
    });
    return;
  }
  const rest = text.slice(startMatch.index + 1);
  const nextFunction = /\ndef [A-Za-z0-9_]+\b/.exec(rest);
  const body = text.slice(
    startMatch.index,
    nextFunction ? startMatch.index + 1 + nextFunction.index : text.length
  );
  if (forbiddenPattern.test(body)) {
    findings.push({
      file,
      line: text.slice(0, startMatch.index).split(/\r?\n/).length,
      message,
      text: body.match(forbiddenPattern)?.[0] || "Forbidden pattern found.",
    });
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
  "src/lib/gsnSnapshotPaper.ts",
  /Limitation: opens a public GSN community record only\. Not a bank guarantee, credit approval, protected-domain approval, or evidence that every claim is true\./,
  "Community verification copied packages must frame the link as opening a public community record, not as protected-domain approval."
);

assertNotContains(
  "src/lib/gsnSnapshotPaper.ts",
  /verifies a public GSN community record/i,
  "Community verification copied packages must not claim that the package itself verifies the community record."
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
  /trustSlipVerify: routeTarget\([\s\S]*?"merchantVerify"[\s\S]*?"trust-score\.route\.trust-slip-verify"[\s\S]*?const verifyAppPath = useMemo\([\s\S]*?trustSlipVerifyAppPath\(trustSlipCode, routes\.trustSlipVerify\)[\s\S]*?onClick=\{\(\) => openTrustRoute\(verifyAppPath\)\}[\s\S]*?debugId="trust-score\.verify"/,
  "Trust Passport verify action must open the signed-in TrustSlip Verify page and carry the visible code when one is available."
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
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  /import GSNBrandMark from "\.\.\/\.\.\/components\/GSNBrandMark";[\s\S]*?function officialPaperWatermark\(compact: boolean\): React\.ReactNode[\s\S]*?<GSNBrandMark width=\{compact \? 132 : 190\} height=\{compact \? 166 : 238\} \/>[\s\S]*?\{officialPaperWatermark\(compact\)\}/,
  "TrustSlip Verify public paper must use the official GSN mark as an institutional watermark."
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
  "src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  /documentCardTitle\("financeInstitution", "Contribution payment record"\)/,
  "TrustSlip Verify contribution payment evidence must use an institutional finance icon, not a weak wallet signal."
);

[
  "src/pages/TrustSlipVerifyPage.tsx",
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  "src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  "src/pages/trustSlipVerify/TrustSlipVerifyResultCard.tsx",
].forEach((file) => {
  assertNotContains(
    file,
    /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
    "TrustSlip Verify evidence surfaces must not use spaced-out micro-label typography."
  );
});

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
  /communityVerifyPath \? \([\s\S]*?<StableCtaLink[\s\S]*?to=\{communityVerifyPath\}[\s\S]*?kind="primary"[\s\S]*?debugId="trust-slip-verify\.public\.open-community-record"[\s\S]*?\) : \([\s\S]*?<SecondaryButton[\s\S]*?Public community record is not ready yet[\s\S]*?debugId="trust-slip-verify\.public\.open-community-record"/,
  "TrustSlip Verify community record action must be visually highlighted when a community verification route is available and must explain itself when unavailable."
);

assertContains(
  "src/lib/trustDocumentActionGuide.ts",
  /Printing this page is useful for carrying the current public reading\./,
  "TrustSlip Verify action guidance must carry the public reading, not call the page a broad confirmation."
);

assertContains(
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  /function lockedActionFrame\(compact: boolean\)[\s\S]*?gridTemplateRows:[\s\S]*?overflowAnchor: "none"[\s\S]*?rowValue\(communityConfirmationRows, "Eligible response pool"\)[\s\S]*?no eligible responders are set up[\s\S]*?Why this is locked/,
  "TrustSlip Verify must explain why instant community confirmation is locked in a reserved stable action frame when the eligible response pool is empty."
);

assertContains(
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  /membershipCurrentnessLabel[\s\S]*?memberWitnessCurrentnessScope[\s\S]*?communityEvidenceCurrentnessLabel[\s\S]*?communityRecordCurrentnessScope[\s\S]*?label="Supporting evidence"[\s\S]*?title=\{memberWitnessCurrentness\}[\s\S]*?Witness currentness: \$\{memberWitnessCurrentnessScope\}[\s\S]*?Community record: \$\{communityRecordCurrentness\}/,
  "TrustSlip Verify public paper must show membership evidence currentness inside supporting community evidence."
);

assertContains(
  "src/pages/trustSlipVerify/trustSlipVerifyViewModel.ts",
  /membershipCurrentnessLabel[\s\S]*?membershipCurrentnessScope[\s\S]*?Evidence currentness: \$\{membershipCurrentnessLabel\}/,
  "TrustSlip Verify view model must carry membership currentness into the public reader view."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /const membershipCurrentnessLabel = firstTruthy\([\s\S]*?membership_currentness_label[\s\S]*?Witness renewal not started[\s\S]*?const membershipCurrentnessScope = firstTruthy\([\s\S]*?membership_currentness_scope[\s\S]*?Evidence currentness: \$\{membershipCurrentnessLabel\}[\s\S]*?Currentness: \$\{membershipCurrentnessLabel\}[\s\S]*?membershipCurrentnessLabel=\{membershipCurrentnessLabel\}[\s\S]*?membershipCurrentnessScope=\{membershipCurrentnessScope\}/,
  "Signed-in TrustSlip page must carry member-witness evidence currentness into the holder and reader views."
);

assertContains(
  "src/components/TrustSlipReaderBlock.tsx",
  /membershipCurrentnessLabel[\s\S]*?membershipCurrentnessScope[\s\S]*?Currentness: \{currentnessText\}[\s\S]*?Evidence currentness: \{currentnessScopeText\}/,
  "Signed-in TrustSlip reader block must show membership evidence currentness beside community witness evidence."
);

assertContains(
  "src/pages/TrustScorePage.tsx",
  /const membershipCurrentnessLabel = firstTruthy\([\s\S]*?membership_currentness_label[\s\S]*?Witness renewal not started[\s\S]*?membershipCurrentnessScope[\s\S]*?Witness currentness[\s\S]*?passportVm\.identity\.membershipCurrentnessLabel[\s\S]*?passportVm\.identity\.membershipCurrentnessScope/,
  "Trust Passport Community Confirmation lane must show member-witness evidence currentness from TrustSlip context."
);

assertContains(
  "src/lib/trustPassportViewModel.ts",
  /membershipCurrentnessLabel[\s\S]*?membershipCurrentnessScope[\s\S]*?Witness renewal not started[\s\S]*?Witness currentness: \$\{membershipCurrentnessLabel\}[\s\S]*?witness currentness: \$\{membershipCurrentnessLabel\}/,
  "Trust Passport view model must carry witness currentness through the community stability reading."
);

assertContains(
  "src/lib/trustDocumentSnapshots.ts",
  /membershipCurrentnessLabel[\s\S]*?membershipCurrentnessScope[\s\S]*?cleanLine\([\s\S]*?"Witness currentness"[\s\S]*?cleanLine\("Currentness note", params\.membershipCurrentnessScope\)/,
  "Copied Trust Passport snapshots must include witness currentness beside community evidence."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /debugId="trust-slip\.community-confirmation\.request"[\s\S]*?communityVerifyPath \? \([\s\S]*?<StableCtaLink[\s\S]*?to=\{communityVerifyPath\}[\s\S]*?kind="primary"[\s\S]*?debugId="trust-slip\.community-confirmation\.open-community-record"[\s\S]*?\) : \([\s\S]*?<SecondaryButton[\s\S]*?The public community record is not ready yet[\s\S]*?debugId="trust-slip\.community-confirmation\.open-community-record"/,
  "TrustSlip community record action must be highlighted when ready and explain itself when unavailable."
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
  "src/pages/CommunityConfirmationOutcomePage.tsx",
  /Responses are counted against the contacts asked, not as a whole-community vote[\s\S]*?\$\{responsesReceived\} of \$\{requestsSent\} requested contacts responded/,
  "Community confirmation outcome page must explain response counts as requested-contact evidence, not whole-community voting."
);

assertContains(
  "src/pages/CommunityConfirmationOutcomePage.tsx",
  /It is linked to a recorded GSN community record\.[\s\S]*?Not a whole-community vote\./,
  "Community confirmation outcome limitations must avoid implying the response is a whole-community decision."
);

assertContains(
  "src/pages/CommunityConfirmationOutcomePage.tsx",
  /function decisionStatusLabel\(value: any\)[\s\S]*?raw === "settled"[\s\S]*?return "Resolved"[\s\S]*?Provider marked this confirmation decision as resolved after review[\s\S]*?Mark resolved/,
  "Community confirmation outcome follow-up status must present settled decisions as resolved review outcomes, not financial settlement."
);

assertNotContains(
  "src/pages/CommunityConfirmationOutcomePage.tsx",
  /Mark settled|marked this confirmation decision as settled|Status: \{labelize\(decisionSnapshot\.status\)\}/,
  "Community confirmation outcome must not show provider follow-up status as financial-sounding settlement."
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
  "src/lib/actionTargetRoutes.ts",
  /PUBLIC_ROUTE_PREFIXES = \[[\s\S]*?"community-confirmations"[\s\S]*?\][\s\S]*?function normalizePublicRouteTarget[\s\S]*?matchesRoutePrefix\(lowerPath, PUBLIC_ROUTE_PREFIXES\)[\s\S]*?return `\/\$\{normalizedPath\}\$\{parsed\.search\}\$\{parsed\.hash\}`[\s\S]*?export function normalizeActionTargetPath/,
  "Shared action-target normalization must allow community confirmation public result links to open their public paper instead of being forced back into the app shell."
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
  /communityVerifyPath \? \([\s\S]*?to=\{communityVerifyPath\}[\s\S]*?kind="primary"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="trust-slip\.community-confirmation\.open-community-record"[\s\S]*?\) : \([\s\S]*?The public community record is not ready yet[\s\S]*?debugId="trust-slip\.community-confirmation\.open-community-record"/,
  "TrustSlip page community record action must be visually highlighted when available and must explain itself when unavailable."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /Community Verification[\s\S]*?Public QR check for community identity only[\s\S]*?Community ID[\s\S]*?Community type[\s\S]*?Status[\s\S]*?Public record[\s\S]*?Public face[\s\S]*?GSN record[\s\S]*?Next evidence[\s\S]*?Relay[\s\S]*?Request confirmation[\s\S]*?Copy link[\s\S]*?Privacy protection/,
  "CommunityVerifyPage must present a compact public verification record, one primary confirmation action, and a privacy boundary."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /title: "Trust anchor"[\s\S]*?Names are display labels; the Community ID is what the reader should check[\s\S]*?Public view only[\s\S]*?Member credentials stay separate[\s\S]*?Admin evidence stays private[\s\S]*?external-registration references[\s\S]*?not exposed on this public page/,
  "CommunityVerifyPage must implement the Community Public Face anchor rule and public/member/admin privacy boundary using existing data only."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const communityAnchor = firstTruthy\(record\?\.community_code, record\?\.community_id, "Not shown"\);[\s\S]*?Community ID anchor[\s\S]*?\{communityAnchor\}[\s\S]*?Check this ID first\. The community name is display text, not the trust anchor\./,
  "CommunityVerifyPage hero must surface the Community ID as the visible trust anchor before treating the community name as display text."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const confirmationActionTitle = requestConfirmationAvailable[\s\S]*?Controlled confirmation available[\s\S]*?Controlled confirmation not available yet[\s\S]*?const confirmationActionBody = requestConfirmationAvailable[\s\S]*?without exposing private member contacts[\s\S]*?cannot receive controlled confirmation from this public page yet[\s\S]*?scoped member credential, TrustSlip, acknowledged affiliate record, or fresh community evidence[\s\S]*?title=\{confirmationActionTitle\}[\s\S]*?body=\{confirmationActionBody\}/,
  "CommunityVerifyPage must explain the controlled confirmation action and its unavailable state instead of leaving visitors with a silent disabled button."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /title: "Trust anchor"[\s\S]*?title: "What this means"[\s\S]*?title: "What remains unchecked"[\s\S]*?title: "Hidden by design"[\s\S]*?Private member lists, raw phone numbers, verifier names, witness details, disputes, and admin records are not shown on this public page[\s\S]*?title: "Next safe step"[\s\S]*?title: "Reader decision"/,
  "CommunityVerifyPage public reading must follow the Community Public Face order: anchor, meaning, unchecked limits, hidden private evidence, next action, and reader decision."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const publicFaceScope = firstTruthy\([\s\S]*?not a full community profile, member list, service guarantee, or community health report/,
  "CommunityVerifyPage public-face note must stay scoped and must not read like a full community profile or health score."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const nextEvidenceScope = firstTruthy\([\s\S]*?scoped member credential, TrustSlip, acknowledged affiliate record, or controlled community confirmation[\s\S]*?Do not rely on the display name alone/,
  "CommunityVerifyPage next-evidence guidance must tell visitors what evidence to request without relying on names alone."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const claimBoundaryScope =[\s\S]*?person, shop, line, subgroup, or affiliate sharing this community record[\s\S]*?own scoped member credential, TrustSlip, acknowledged affiliate record, or controlled confirmation[\s\S]*?community anchor, not their private membership record[\s\S]*?title: "Claim boundary"[\s\S]*?body: claimBoundaryScope/,
  "CommunityVerifyPage must separate the public community anchor from individual, shop, line, subgroup, and affiliate claims."
);

assertContains(
  "../gmfn_backend/app/services/community_confirmation_service.py",
  /official_affiliate_label = "No parent-domain affiliate claim on this record"[\s\S]*?Parent-domain acknowledgement needs its own[\s\S]*?record[\s\S]*?official_affiliate_label = "Acknowledged affiliate under parent domain"[\s\S]*?acknowledged as an affiliate[\s\S]*?acknowledged affiliate record[\s\S]*?acknowledged affiliate records/,
  "Public community verification payload must present affiliate claims as parent-domain acknowledgement, not broad official approval."
);

assertNotContains(
  "../gmfn_backend/app/services/community_confirmation_service.py",
  /No official affiliate claim on this record|Affiliate approval needs its own parent-domain acknowledgement|Approved affiliate under parent domain|acknowledged as an approved affiliate|approved affiliate record|approved affiliate records/,
  "Public community verification payload must not use broad approved-affiliate wording."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /No parent-domain affiliate claim on this record[\s\S]*?Parent-domain acknowledgement needs its own record/,
  "CommunityVerifyPage fallback affiliate copy must stay scoped to parent-domain acknowledgement."
);

assertNotContains(
  "src/pages/CommunityVerifyPage.tsx",
  /No official affiliate claim on this record|Affiliate approval needs its own parent-domain acknowledgement|approved affiliate record|approved affiliate records/,
  "CommunityVerifyPage fallback guidance must use acknowledged affiliate wording."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const recordStartedScope = firstTruthy\([\s\S]*?date this community record entered GSN[\s\S]*?not the date the real-world community was founded or formally registered/,
  "CommunityVerifyPage GSN record date must not be framed as the real-world founding or registration date."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const mobilityScope = firstTruthy\([\s\S]*?outside the original room[\s\S]*?does not transfer trust or approve a transaction/,
  "CommunityVerifyPage trust-mobility note must frame the Community ID as a portable anchor, not automatic trust transfer or transaction approval."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /title="Trust mobility"[\s\S]*?body=\{`\$\{mobilityLabel\}\. \$\{mobilityScope\}`\}/,
  "CommunityVerifyPage must render the trust-mobility note in the public evidence section."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const readerDecisionScope = firstTruthy\([\s\S]*?serious trade, lending, membership, shop, line, welfare, or affiliate decisions[\s\S]*?current scoped evidence before acting/,
  "CommunityVerifyPage reader-decision guidance must keep serious decisions tied to current scoped evidence."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /title: "Reader decision"[\s\S]*?body: `\$\{readerDecisionLabel\}\. \$\{readerDecisionScope\}`/,
  "CommunityVerifyPage must render a reader-decision boundary in the public reading."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /const publicRecord = firstTruthy\(record\?\.public_record, "Recorded in GSN"\);/,
  "CommunityVerifyPage public-record fallback must say Recorded in GSN, not Verified in GSN."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /requestPublicCommunityVerificationConfirmation[\s\S]*?requestingConfirmation[\s\S]*?debugId="community-verify\.request-confirmation"/,
  "CommunityVerifyPage Request confirmation button must call the controlled relay endpoint and hold a stable busy state."
);

assertContains(
  "src/pages/CommunityVerifyPage.tsx",
  /async function copyLink\(\) \{[\s\S]*?safeCopy\(publicLink\)[\s\S]*?GSN community verification link copied\./,
  "CommunityVerifyPage Copy link must copy only the public verification URL, not a long headed-paper package for QR visitors."
);

assertContains(
  "src/lib/api.ts",
  /requestPublicCommunityVerificationConfirmation[\s\S]*?\/verify\/community\/\$\{encodeURIComponent\(String\(communityKey\)\)\}\/confirmation-request/,
  "CommunityVerifyPage request confirmation must call the controlled public verification relay endpoint."
);

assertContains(
  "src/lib/api.ts",
  /export type CommunityExternalRegistrationEvidencePayload[\s\S]*?listCommunityExternalRegistrationEvidence[\s\S]*?\/clans\/\$\{encodeURIComponent\(String\(communityId\)\)\}\/external-registration-records[\s\S]*?recordCommunityExternalRegistrationEvidence[\s\S]*?\/clans\/\$\{encodeURIComponent\(String\(communityId\)\)\}\/external-registration-records/,
  "Community external-registration evidence must have private admin API helpers for listing and recording evidence without treating it as public verification."
);

assertContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /External registration evidence[\s\S]*?support for review[\s\S]*?This does not[\s\S]*?verify leadership, membership, consent, or public Community ID ownership[\s\S]*?GSN stores a fingerprint, not this raw text[\s\S]*?no verification effect[\s\S]*?Fingerprint:[\s\S]*?Raw reference stored:/,
  "CommunityConfirmationPolicyPage external-registration panel must frame CAC/company-registration as supporting evidence only and show fingerprint/presence facts instead of raw public exposure."
);

assertContains(
  "../gmfn_backend/app/api/routes/community_confirmations.py",
  /@router\.post\("\/verify\/community\/\{community_key\}\/confirmation-request"\)[\s\S]*?create_public_community_verification_confirmation_request/,
  "Public community verification confirmation requests must have a backend route, not a page-local placeholder."
);

assertContains(
  "../gmfn_backend/app/services/community_confirmation_service.py",
  /def request_public_community_verification_confirmation[\s\S]*?community_verification\.request_confirmation[\s\S]*?community_verification\.confirmation_requested[\s\S]*?private_contacts_exposed/,
  "Public community verification confirmation must create a controlled notification and TrustEvent without exposing private contacts."
);

assertNotContains(
  "src/pages/CommunityVerifyPage.tsx",
  /Verified in GSN|confirms the GSN community ID domain|This record confirms the community identity|proof anchor|What this proves|active_member_count|instant_pulse_available|public_policy|plain_language|hidden_by_design|Show publicly|Keep protected|Full member list|Raw member phone numbers|Member phone numbers|Sponsor details|Internal disputes|Private relay contacts|Internal trust history|Save PDF|buildGsnCommunityVerifyLinkPackage|CAC|company-registration|registration_reference|registered_name/,
  "CommunityVerifyPage must not render private-ish community confirmation internals, protected-category inventories, dossier-style public export actions, or long copy packages."
);

assertNotContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /GSN member proof|Community member proof|Credential not confirmed|confirms active membership|What this proves/i,
  "Community member public credential must show the active membership record and witness strength, not overstate it as broad confirmation."
);

assertContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /const trustReadingScope = firstTruthy\([\s\S]*?active membership, witness strength, renewal status, and broad community activity together[\s\S]*?not a universal trust score, guarantee, credit approval, or transaction permission/,
  "Community member public credential must read the member trust picture as community-scoped evidence, not a universal score or approval."
);

assertContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /const memberAnchor = firstTruthy\(credential\?\.member_gsn_id, cleanMemberKey, "Not shown"\);[\s\S]*?const communityAnchor = firstTruthy\([\s\S]*?credential\?\.community_code[\s\S]*?credential\?\.community_id[\s\S]*?cleanCommunityKey[\s\S]*?"Not shown"[\s\S]*?Community-scoped credential[\s\S]*?Read this member only inside this Community ID[\s\S]*?not a\s+universal trust score, transaction approval, or parent-domain[\s\S]*?membership claim[\s\S]*?\{fact\("Member GSN ID", memberAnchor\)\}[\s\S]*?\{fact\("Community ID", communityAnchor\)\}/,
  "Community member public credential must visibly anchor the member GSN ID to one Community ID before any wider trust reading."
);

assertContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /title: "Trust inside this community"[\s\S]*?body: `\$\{trustReadingLabel\}\. \$\{trustReadingScope\}`/,
  "Community member public credential must render the community-scoped trust reading."
);

assertContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /const currentnessScope = firstTruthy\([\s\S]*?no current witness validity window[\s\S]*?TrustSlip, or live community confirmation before a serious decision/,
  "Community member public credential must explain evidence currentness instead of exposing only a raw renewal label."
);

assertContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /const witnessStrengthBoundary =[\s\S]*?Low, missing, expired, withdrawn, or disputed witness evidence[\s\S]*?weaker evidence until renewed[\s\S]*?title: "Evidence currentness"[\s\S]*?body: `\$\{currentnessLabel\}\. \$\{currentnessScope\} \$\{witnessStrengthBoundary\}`/,
  "Community member public credential must render evidence currentness and keep weak, missing, expired, withdrawn, or disputed witness evidence visibly weaker."
);

assertContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /It does not certify shop, line, subgroup, payment, loan, or[\s\S]*?parent-domain approval claims\./,
  "Community member public credential must separate scoped membership evidence from shop, subgroup, payment, loan, and parent-domain claims."
);

assertContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /title: "Before goods or money move"[\s\S]*?Check the Community ID, witness strength, renewal, activity summary, TrustSlip, and live community confirmation together[\s\S]*?missing or stale[\s\S]*?fresh evidence first/,
  "Community member public credential must give a careful reader decision before goods, credit, or money moves."
);

assertNotContains(
  "src/pages/CommunityMemberVerifyPage.tsx",
  /title: "Confirmed"/,
  "Community member public credential must not title a scoped record card as confirmed."
);

assertNotContains(
  "src/pages/CommunityVerifyPage.tsx",
  /Public proof record|member or group proof|credential proof|Community ID Domain proof/i,
  "Community public verification must frame the QR page as a public community record, not blanket certainty."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /verified community context/i,
  "Marketplace trust front desk must not call the selected community context verified unless a specific protected-domain evidence state is being rendered."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /Verified Community|Trust proof on request|Request TrustSlip for live proof|merchant verification proof|fresh proof from the owner|Hide proof|Community ID confirms/i,
  "Public Shop must frame shop/community trust as evidence and records, not blanket confirmation from ID presence alone."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /Shop and community IDs do not show member-witness currentness[\s\S]*?by themselves/,
  "Public Shop verification panel must not let shop/community IDs stand in for current member-witness evidence."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /Before credit, goods, or money move[\s\S]*?not approval to release goods or credit/,
  "Public Shop verification panel must keep the trade decision boundary before goods, credit, or money move."
);

assertNotContains(
  "src/pages/TrustSlipPage.tsx",
  /Verified member|Phone and community membership are verified|Identity confirmed by active community membership|Identity verified|Verified history|Merchant view verified|What verification confirms|concise outward-facing proof|safe to rely on|Profile image is not identity proof/,
  "TrustSlip must not present phone verification plus community membership as a fully verified member identity."
);

assertNotContains(
  "src/pages/TrustScorePage.tsx",
  /Community confirmed|Community not confirmed|Continuity confirmed|confirmed by the community layer|missing proof|need proof/i,
  "TrustScore must present community and continuity status as records/evidence, not blanket confirmation."
);

assertNotContains(
  "src/pages/TrustTimelinePage.tsx",
  /need proof|save\s+proof\s+for a review/i,
  "Trust Timeline must frame exported trust history as supporting evidence, not blanket certainty."
);

assertNotContains(
  "src/pages/TrustCommandCentrePage.tsx",
  /Needs proof|Evidence proof|Required proof not named/i,
  "Trust Command Centre pilot readiness must frame open items as evidence to capture, not blanket certainty."
);

assertContains(
  "src/pages/TrustCommandCentrePage.tsx",
  /Check database and service health[\s\S]*?Check community-admin exposure access[\s\S]*?Review pledge progress and coverage[\s\S]*?exposure reading[\s\S]*?Buffer:/,
  "Trust Command Centre overview must frame admin readings as checks, pledge progress, exposure readings, and buffer signals."
);

assertNotContains(
  "src/pages/TrustCommandCentrePage.tsx",
  /Confirm database and service health|Confirm community-admin exposure access|Review approval progress and coverage|Exposure totals could not be confirmed|Available: \$\{formatNumber\(exposureTotals\.available\)\}|exposed`/,
  "Trust Command Centre must not use broad confirmation, approval, or exposure-identity wording for admin readings."
);

assertNotContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /Not proof yet|Public proof|safer proof to share/i,
  "Community confirmation policy must frame witness requests and public credentials as evidence/records, not blanket certainty."
);

assertContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /Parent community admin recorded this affiliation \$\{decisionLabel\}[\s\S]*?Affiliation \$\{decisionLabel\} recorded[\s\S]*?parent-domain acknowledged affiliate[\s\S]*?Acknowledged affiliate[\s\S]*?Acknowledgement says the parent domain accepts this group[\s\S]*?Acknowledge only groups[\s\S]*?busyLabel="Acknowledging\.\.\."[\s\S]*?Acknowledge/,
  "Community confirmation policy parent-domain affiliation must present public acceptance as acknowledgement, not broad approval."
);

assertNotContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /official affiliate|Approved affiliate|Approval says the parent domain accepts this group|Approve only groups|busyLabel="Approving\.\.\."|>\s*\{labelWithIcon\("check", "Approve", "navy"\)\}/,
  "Community confirmation policy parent-domain affiliation must not use broad approval wording for acknowledgement."
);

assertContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /This records one witness event; it is not parent-domain[\s\S]*?approval or a guarantee for every claim\./,
  "Community confirmation policy witness review must separate one witness event from parent-domain approval."
);

assertContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /witness response[\s\S]*?response link[\s\S]*?Witness response link copied[\s\S]*?response package[\s\S]*?respond to a request[\s\S]*?One-time witness response code[\s\S]*?Record witness[\s\S]*?responds with the one-time code[\s\S]*?Witness response[\s\S]*?one-time response[\s\S]*?QR\/OTP response[\s\S]*?response[\s\S]*?lane[\s\S]*?Scan to respond[\s\S]*?Copy response link/,
  "Community confirmation policy witness-request lane must present verifier action as a response/record, not broad approval."
);

assertContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /const canShareMemberWitnessRequest = Boolean\(memberWitnessRequest\?\.oneTimeCode\);[\s\S]*?\{memberWitnessRequest && canShareMemberWitnessRequest \? \([\s\S]*?Request ready[\s\S]*?One-time code[\s\S]*?Share package[\s\S]*?Copy one-time code/,
  "Community confirmation policy must only show requester-side witness package/code controls when the backend returned a one-time code."
);

assertContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /function memberWitnessErrorMessage\(error: any, fallback: string\): string[\s\S]*?current community witness standing[\s\S]*?Choose a community admin or a member[\s\S]*?yearly member-witness limit[\s\S]*?Choose another member with[\s\S]*?current witness standing/,
  "Community confirmation policy must translate member-witness standing and yearly-limit backend rejections into clear next steps."
);

assertNotContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /Choose the active member you want to ask for a witness approval|copying its approval link|Witness approval link copied|witness approval link|sharing its approval package|Witness request approved\.|approve or decline a request|One-time witness approval code|Approve witness|assigned verifier approves with the one-time code|label="Approval"|one-time approval|QR\/OTP approval|approval\s+lane|Scan to approve|Copy approval link/,
  "Community confirmation policy witness-request lane must not use approval-style copy for member witness responses."
);

assertContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /witness records[\s\S]*?witness-strength summary[\s\S]*?Member witness records[\s\S]*?Member for witness[\s\S]*?Ask for witness[\s\S]*?QR\/OTP response is live[\s\S]*?member-witness packages[\s\S]*?member-backed witness evidence/,
  "Community confirmation policy member-witness lane must frame the flow as witness records, not blanket verification."
);

assertNotContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /witness verification|witness verification summary|Member witness verification|Member to verify|Ask to verify me|verification packages|member-backed community verification/,
  "Community confirmation policy member-witness lane must not describe witness records as broad member verification."
);

assertContains(
  "src/pages/CommunityConfirmationPolicyPage.tsx",
  /Witness strength is current only while the witness records remain active[\s\S]*?Expired, withdrawn, or disputed witness records[\s\S]*?weaker evidence until renewed\./,
  "Community confirmation policy witness strength must explain renewal, withdrawal, and dispute currentness."
);

assertContains(
  "src/pages/CommunityConfirmationInboxPage.tsx",
  /A review resolution changes GSN's trust reading only; it is not parent-domain[\s\S]*?certification, legal approval, or permission to release goods, credit, or money\./,
  "Community confirmation inbox review cases must separate internal trust-reading decisions from parent-domain or transaction authority."
);

assertNotContains(
  "src/pages/CommunityConfirmationInboxPage.tsx",
  /Confirmed clean|review confirms the person behaved well/,
  "Community confirmation inbox review labels must avoid absolute clean-person language."
);

assertContains(
  "src/pages/CommunityConfirmationInboxPage.tsx",
  /Your answer records what you personally know; it is not parent-domain certification or a whole-community vote\./,
  "Community confirmation inbox responder lane must scope individual answers as personal knowledge, not certification."
);

assertNotContains(
  "src/pages/CommunityConfirmationInboxPage.tsx",
  /Confirm \{subjectName\(row\)\}|Can confirm/,
  "Community confirmation inbox responder lane must avoid certification-like confirm labels."
);

assertNotContains(
  "src/pages/CreateEntryPage.tsx",
  /SMS proof|Optional proof|phone proof|founder proof|ID proof|Bank and wallet proof recorded|add optional proof/i,
  "Create Entry must frame founder onboarding material as evidence, not blanket certainty."
);

assertNotContains(
  "src/pages/DemandBoxPage.tsx",
  /Response proof expected|proof expectation|what proof|No extra proof/i,
  "Demand Box must frame response requirements as evidence expectations, not blanket certainty."
);

assertContains(
  "src/pages/DemandBoxPage.tsx",
  /Trust-credit openness[\s\S]*?is a request preference, not approval to release goods, credit, or[\s\S]*?money\./,
  "Demand Box trust-credit language must separate request preference from release approval."
);

assertNotContains(
  "src/pages/DemandBoxPage.tsx",
  /Trust credit allowed|Allow trust credit where appropriate/,
  "Demand Box must not describe trust credit preference as approval or allowance."
);

assertContains(
  "src/pages/DemandBoxPage.tsx",
  /cancel it when the need is resolved/,
  "Demand Box must describe non-finance need closure as resolved, not settled."
);

assertNotContains(
  "src/pages/DemandBoxPage.tsx",
  /need is settled/i,
  "Demand Box must not use settlement language for non-finance demand closure."
);

assertContains(
  "src/pages/LoanReadinessPage.tsx",
  /Support Readiness is decision support only; it does not approve a loan, approve a guarantor, or authorize release of goods, credit, or money\./,
  "Loan Readiness must separate support-readiness guidance from loan, guarantor, or money-release approval."
);

assertContains(
  "src/pages/LoanSuggestionsPage.tsx",
  /Fit suggestions are decision support only; they do not approve a guarantor, approve a loan, or authorize release of goods, credit, or money\./,
  "Loan Suggestions must separate fit guidance from guarantor, loan, or money-release approval."
);

assertNotContains(
  "src/pages/LoanReadinessPage.tsx",
  /Readiness decides whether/,
  "Loan Readiness must help the user decide; it must not imply the page itself decides support movement."
);

assertContains(
  "src/pages/GuarantorInboxPage.tsx",
  /Approving here records your guarantor pledge response only; it does not approve the loan or authorize release of goods, credit, or money\./,
  "Guarantor Inbox must separate pledge response approval from whole-loan or money-release approval."
);

assertContains(
  "src/pages/GuarantorInboxPage.tsx",
  /Approving a request records your pledge response only; it is not[\s\S]*?whole-loan approval or permission to release goods, credit, or money\./,
  "Guarantor Inbox guidance must explain that a guarantor approval is only a pledge response."
);

assertNotContains(
  "src/pages/GuarantorInboxPage.tsx",
  /Support approved\. GSN|guarantorInboxActionText\("check", "Approve", 20\)|guarantorInboxActionText\("refresh", "Approving", 20\)/,
  "Guarantor Inbox must not use broad approve wording for pledge-response actions."
);

assertContains(
  "src/pages/LoanSummaryPage.tsx",
  /this records a guarantor pledge decision, not whole-loan approval or release authority\./,
  "Loan Summary guarantor decisions must be scoped as pledge decisions, not whole-loan approval or release authority."
);

assertContains(
  "src/pages/LoanSummaryPage.tsx",
  /Guarantor pledge decision recorded\. This is not whole-loan approval or release authority\./,
  "Loan Summary success feedback must not imply a guarantor row approval approves the whole loan."
);

assertNotContains(
  "src/pages/LoanSummaryPage.tsx",
  /Guarantor approved successfully\.|Approved guarantors|busyApprove \? "Approving" : "Approve"/,
  "Loan Summary must not use broad guarantor-approval wording where it means pledge decision."
);

assertContains(
  "src/pages/LoanSummaryPage.tsx",
  /Allocation preview only; it is not payment instruction,[\s\S]*?settlement confirmation, or evidence that money has moved\./,
  "Loan Summary revenue allocation preview must not read as payment instruction, settlement confirmation, or money movement."
);

assertContains(
  "src/pages/LoanSummaryPage.tsx",
  /Net disbursed preview/,
  "Loan Summary must label net disbursed figures as preview figures."
);

assertNotContains(
  "src/pages/LoanSummaryPage.tsx",
  /Net disbursed(?! preview)/,
  "Loan Summary must not label preview figures as plain net disbursed."
);

assertContains(
  "src/pages/RevenueAllocationPage.tsx",
  /Returned allocation reading only; not payment instruction,[\s\S]*?settlement confirmation, or evidence that money moved\./,
  "Revenue Allocation must separate returned allocation readings from payment instruction, settlement confirmation, or money movement."
);

assertContains(
  "src/pages/RevenueAllocationPage.tsx",
  /Net disbursed preview/,
  "Revenue Allocation must label net disbursed figures as preview figures."
);

assertNotContains(
  "src/pages/RevenueAllocationPage.tsx",
  /Net disbursed(?! preview)/,
  "Revenue Allocation must not label preview figures as plain net disbursed."
);

assertContains(
  "src/pages/LoanWorkbenchPage.tsx",
  /Workbench readings and suggested pledges are decision support only; they do not approve a loan, approve a guarantor, or authorize release of goods, credit, or money\./,
  "Loan Workbench must separate readings and suggested pledges from loan, guarantor, or money-release approval."
);

assertContains(
  "src/pages/LoanWorkbenchPage.tsx",
  /Candidate quality and guarantor request state stay together here;[\s\S]*?fit rows do not approve a guarantor or authorize release\./,
  "Loan Workbench guarantor-fit lane must not let fit rows read as approval or release authority."
);

assertNotContains(
  "src/pages/LoanWorkbenchPage.tsx",
  /Confirm the item, then use the summary or supporter section\.|`Approved: \$\{String\(item\.approved\)\}`/,
  "Loan Workbench must not use broad confirmation or approved-count wording for fit/suggestion evidence."
);

assertContains(
  "src/pages/RepaymentPage.tsx",
  /this route does not confirm money received, close a loan, or release guarantor exposure\./,
  "Repayment route must separate payment declaration from money receipt, loan closure, and guarantor-exposure release."
);

assertContains(
  "src/pages/RepaymentPage.tsx",
  /Only admin or finance reconciliation can confirm closure and release guarantor exposure\./,
  "Repayment full-balance guidance must keep closure and guarantor-release authority with reconciliation."
);

assertNotContains(
  "src/pages/RepaymentPage.tsx",
  /After reconciliation, the loan can close and guarantor exposure can release\.|Generate the instruction, copy it, then wait for reconciliation\.|Stay here until the repayment is waiting or confirmed\./,
  "Repayment route must not use broad closure, waiting, or confirmation wording without the reconciliation authority boundary."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /declare it here so the route can move into reconciliation; this does not confirm money received\./,
  "Money In payment instruction must separate member declaration from confirmed money receipt."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /Payment declaration recorded\. Waiting for reconciliation to confirm the money trail\./,
  "Money In success notice must frame the action as a declaration awaiting reconciliation."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /moneyInActionText\("check", paymentConfirmed \? "Declared" : "Declare paid"\)/,
  "Money In action label must say Declare paid, not Confirm paid."
);

assertNotContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /confirm payment here|Confirm paid|Payment has been confirmed|Payment marked as made|payment is confirmed|Member confirmation time|Not confirmed|Matching records|\["4", "Confirm"\]/,
  "Money In must not make a member payment declaration read as confirmed receipt."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /Finance shows this payment as confirmed; use the related service only where its route says it is available\./,
  "Finance payment confirmation must be scoped to finance records, not broad service entitlement."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /Pay with the exact reference so finance can reconcile it\./,
  "Finance waiting-payment guidance must point to reconciliation, not generic system confirmation."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /Payments waiting for finance confirmation[\s\S]*?Finance confirmed: \{expectedPaymentStateCounts\.confirmed\}/,
  "Finance reconciliation panel must label confirmed payments as finance-confirmed."
);

assertNotContains(
  "src/pages/FinancePage.tsx",
  /You can use the service this payment unlocked\.|Pay with the exact reference so the system can confirm it\.|Waiting for confirmation:|No payment is waiting for confirmation right now\.|<th style=\{tableHeadCell\(\)\}>Confirmed<\/th>|\["Confirmed"/,
  "Finance page must not use broad confirmation wording for reconciliation records."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /Support exposure recorded as released from past backing\. This page reports the record; it does not release exposure by itself\./,
  "Finance release totals must read as recorded release/exposure readings, not page-level release authority."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /Guarantee release records[\s\S]*?Recorded releases[\s\S]*?Recorded release total/,
  "Finance release labels must frame released amounts as records/readings."
);

assertNotContains(
  "src/pages/FinancePage.tsx",
  /Support already released from past backing\.|\["Guarantees released"|\["Total released"|\["Released total"/,
  "Finance page must not make release totals sound like active release authority."
);

assertContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /Direct withdrawal request recorded\. Community confirmation is still review evidence; payout execution and money movement are not complete here\./,
  "Withdrawal Instructions must separate request recording and community confirmation from payout execution."
);

assertContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /Review amount, rail, and payout account before submitting a request\./,
  "Withdrawal Instructions must frame the pre-submit step as review, not confirmation of money movement."
);

assertNotContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /waiting for community confirmation before money movement is complete|Confirm amount, rail, and payout account before submitting\./,
  "Withdrawal Instructions must not imply community confirmation completes payout movement."
);

assertContains(
  "src/pages/PayoutDetailsPage.tsx",
  /This destination record is ready for the Money Out route, but it does not approve or execute a withdrawal\./,
  "Payout Details must separate destination readiness from withdrawal approval or payout execution."
);

assertContains(
  "src/pages/PayoutDetailsPage.tsx",
  /Review the payout destination record for the Money Out route\. This record does not approve or execute a withdrawal\./,
  "Payout Details copied summary must carry the same approval/execution boundary."
);

assertNotContains(
  "src/pages/PayoutDetailsPage.tsx",
  /Review the payout destination saved for approved withdrawals\.|This destination is ready for approved withdrawals\.|Use Withdrawal Instructions when approval is ready\.|Save the destination for approved withdrawals\./,
  "Payout Details must not make a saved destination sound like approved withdrawal status."
);

assertContains(
  "src/pages/VaultControlPage.tsx",
  /Vault quote agreed: \$\{selectedVaultAgreementText\}\. Quote agreement is not payment confirmation\./,
  "Vault Control must separate quote agreement from payment confirmation."
);

assertContains(
  "src/pages/VaultControlPage.tsx",
  /bank or finance reconciliation must confirm the payment before Vault blocks become available\./,
  "Vault Control must keep Vault block availability behind payment confirmation, not quote agreement."
);

assertContains(
  "src/pages/VaultControlPage.tsx",
  /No private block is active yet\. Generate a payment code above, complete the bank transfer, and Vault blocks become available here only after payment confirmation\./,
  "Vault Control empty state must not imply a bank transfer alone unlocks blocks."
);

assertNotContains(
  "src/pages/VaultControlPage.tsx",
  /Vault quote confirmed:|Confirm this quote first\. GSN will generate the payment code[\s\S]*?before Vault opens\.|Confirm this Vault quote first|Confirm the Vault quote first|paid blocks will unlock here|Private paid blocks|\{confirmedVaultSlots\} \/ \{VAULT_SLOT_LIMIT\} paid slots|Paid position/,
  "Vault Control must not blur quote agreement, payment-code generation, and payment-confirmed Vault access."
);

assertContains(
  "src/pages/PaymentRailsPage.tsx",
  /Rail status is not payment approval, settlement confirmation, or evidence that money moved; action should still happen on the guided Money In and Money Out routes\./,
  "Payment Rails must separate rail visibility/status from payment approval, settlement, or money movement."
);

assertContains(
  "src/pages/PaymentRailsPage.tsx",
  /Status-active: \{loading \? "\.\.\." : activeCount\}[\s\S]*?Inbound status-active[\s\S]*?Outbound status-active/,
  "Payment Rails active counts must read as status-active rail signals, not money-action readiness."
);

assertNotContains(
  "src/pages/PaymentRailsPage.tsx",
  /<span style=\{badge\(false\)\}>Active:|<div style=\{sectionLabel\(\)\}>Inbound active<\/div>|<div style=\{sectionLabel\(\)\}>Outbound active<\/div>/,
  "Payment Rails must not present active rails as broad action readiness."
);

assertContains(
  "src/pages/GuarantorEarningsPage.tsx",
  /Earned guarantor value is recorded here for visibility\. It is not an automatic payout,[\s\S]*?Closed-support records: \$\{totals\.settledCount\}[\s\S]*?Closed-support records: \{totals\.settledCount\}[\s\S]*?const amountLabel = settled \? "RECORDED EARNED VALUE" : "POTENTIAL SHARE"/,
  "Guarantor Earnings must frame closed support as recorded earned value, not settlement or automatic payout."
);

assertNotContains(
  "src/pages/GuarantorEarningsPage.tsx",
  /Review visible guarantor value, settled items|Settled support creates clearer earnings|`Settled items: \$\{totals\.settledCount\}`|<span style=\{badge\(false\)\}>Settled:|const amountLabel = settled \? "EARNED" : "POTENTIAL SHARE"/,
  "Guarantor Earnings must not make earnings records sound like settlement or payout completion."
);

assertContains(
  "src/pages/SystemOperationsPage.tsx",
  /settlement-ready[\s\S]*?waiting for finance review[\s\S]*?clear through finance evidence[\s\S]*?Pledge decisions \$\{toNum\(row\?\.approved_guarantors\)\}\/\$\{toNum[\s\S]*?Pool finance review pending/,
  "System Operations must frame admin money/support queues as review and reconciliation readings."
);

assertNotContains(
  "src/pages/SystemOperationsPage.tsx",
  /finance reading as settled|waiting for confirmation\. Confirm|Confirm them before the money queue drifts|expectations settle|`Approved \$\{toNum\(row\?\.approved_guarantors\)\}\/\$\{toNum|Pool confirmation pending/,
  "System Operations must not make internal admin queues sound like final settlement, payment confirmation, or broad loan approval."
);

assertContains(
  "src/pages/AdminIncompleteLoansPage.tsx",
  /pledge decisions, coverage gaps[\s\S]*?does not approve the whole loan, authorize release, or show that money moved[\s\S]*?Missing pledge decisions[\s\S]*?Locked pledge coverage[\s\S]*?Pledge decisions/,
  "Admin Incomplete Loans must frame the queue as pledge-decision and coverage review, not whole-loan approval, release authority, or money movement."
);

assertNotContains(
  "src/pages/AdminIncompleteLoansPage.tsx",
  /Approved guarantors:|Missing approvals|Approval progress|approved \/ \{toNum\(loan\?\.guarantors_required\)\} required|Pending guarantors:|Coverage already held|money movement looks wrong/,
  "Admin Incomplete Loans must not use broad approval or custody wording for pledge-decision coverage review."
);

assertContains(
  "src/pages/ExposureAdminPage.tsx",
  /Pledge decisions[\s\S]*?Pending pool finance review[\s\S]*?practical risk reading; it is not settlement, release authority, or evidence that money moved[\s\S]*?locked pledge coverage/,
  "Exposure Admin must frame exposure as a risk reading and pledge-coverage review, not settlement, release authority, or payment proof."
);

assertNotContains(
  "src/pages/ExposureAdminPage.tsx",
  /locked money|Pending pool confirmation|pool confirmation|Clean bank events|`Approved \$\{toNum\(row\.approved_count\)\}/,
  "Exposure Admin must not use broad money, confirmation, or approval wording for exposure readings."
);

assertContains(
  "src/pages/ExposurePage.tsx",
  /Exposure is a recorded risk reading from locked pledge coverage minus release records[\s\S]*?not settlement, release authority, or evidence that money moved/,
  "Legacy Exposure page must frame exposure as a recorded risk reading, not settlement, release authority, or payment proof."
);

assertNotContains(
  "src/pages/ExposurePage.tsx",
  /Exposure = sum\(locked|approved guarantees/,
  "Legacy Exposure page must not describe exposure as broad approved-guarantee settlement math."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /finance-confirmed \$\{confirmed\}/,
  "Bank Console reconciliation counts must label confirmed rows as finance-confirmed."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /Reconciliation run recorded:[\s\S]*?settlement-ready[\s\S]*?not settlement or evidence that money moved/,
  "Bank Console must frame matching as recorded finance review, not settlement or money movement."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /review matched records[\s\S]*?matched record is visible/,
  "Bank Console guidance must keep matched-record review language."
);

assertNotContains(
  "src/pages/BankConsolePage.tsx",
  /Reconciliation complete|treating the rail as settled|`confirmed \$\{confirmed\}`|confirm matches|settlement easier to defend|check whether it matched/,
  "Bank Console must not make reconciliation runs sound like settlement completion or money movement."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /Show proof|TrustSlip proof|ID, proof|proof routes|identity, proof|"proof", "verify"/i,
  "Marketplace helper copy must point to evidence/records, not blanket certainty."
);

assertNotContains(
  "src/pages/TrustPage.tsx",
  /Driver's licence proof|licence proof|reflects the proofs|onboarding proofs/i,
  "Legacy Trust page must describe starter identity material as evidence, not blanket certainty."
);

[
  "src/lib/dashboardUserGuidance.ts",
  "src/lib/gmfnCapabilities.ts",
  "src/lib/marketWisdom.ts",
  "src/pages/CCIReadingPage.tsx",
  "src/lib/guidance.ts",
  "src/lib/identityEvidenceCompletion.ts",
  "src/lib/trustBandLanguage.ts",
  "src/lib/joinInviteMessaging.ts",
  "src/pages/MyGMFNAndIPage.tsx",
  "src/pages/SystemOperationsPage.tsx",
  "src/pages/IdentityIntegrityPage.tsx",
].forEach((file) => {
  assertNotContains(
    file,
    /want proof|for proof|easy to prove|visible proof|smaller proof|steady proof|need proof|identity proof|still needs proof|more proof|current proof|stronger proof|proof of bad behaviour|proof of credibility|good name as proof|identity and proof|clearer proof|phone proof ready|phone proof|verified phone proof|next clean proof|missing proofs|portable TrustSlip proof/i,
    "Shared trust guidance must frame portable trust as records/evidence, not blanket certainty."
  );
});

[
  "src/lib/marketWisdom.ts",
  "src/lib/trustDocumentActionGuide.ts",
  "src/lib/trustDocumentFamilyMap.ts",
  "src/lib/trustDocumentUseCases.ts",
  "src/lib/trustDocumentSnapshots.ts",
  "src/lib/gsnSnapshotPaper.ts",
  "src/pages/CommunityMemberVerifyPage.tsx",
  "src/pages/IdentityIntegrityPage.tsx",
  "src/pages/TrustScorePage.tsx",
  "src/pages/TrustSlipPage.tsx",
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  "src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  "src/pages/trustSlipVerify/trustSlipVerifyViewModel.ts",
].forEach((file) => {
  assertNotContains(
    file,
    /Portable proof|Carry one clean proof|proves whether|community proof|supporting community proof|trust proof|public proof|verified history behind the claim|No verified history is visible|confirms current public validity|confirms the public TrustSlip status|It proves the reading was recorded|View proof/i,
    "TrustSlip Verify/document-family copy must frame public checks as records and evidence, not blanket certainty."
  );
});

assertFunctionNotContains(
  "../gmfn_backend/app/api/routes/trust_slips.py",
  "verify_trust_slip_public",
  /verifies TrustSlip validity only/i,
  "TrustSlip public verify payload must say it checks public validity, not that it verifies broad TrustSlip validity."
);

assertNotContains(
  "src/pages/DashboardPage.tsx",
  /verified identity|TrustSlip keeps later proof|Response proof expected/i,
  "Dashboard identity copy must not turn a GSN ID record into a blanket verified-identity claim."
);

assertNotContains(
  "src/lib/trustPassportViewModel.ts",
  /Phone and community membership are verified|Identity confirmed by active community membership|Identity verified|verified history|some proof is not verified|identity proof|more proof|risk to the proof/,
  "Trust Passport view-model fallbacks must treat active community membership as recorded evidence, not identity verification."
);

assertNotContains(
  "../gmfn_backend/app/api/routes/entry.py",
  /Phone proof is ready|attach this proof|Bank or wallet proof|starter identity proofs|further proof/i,
  "Entry onboarding messages must frame starter trust material as evidence, not blanket certainty."
);

assertNotContains(
  "../gmfn_backend/app/core/trust_policy.py",
  /Onboarding identity proofs|licence proof recorded/i,
  "Trust policy labels must frame starter identity material as evidence, not blanket certainty."
);

assertNotContains(
  "../gmfn_backend/app/api/routes/clans.py",
  /leadership proof|proof for tomorrow|public Community ID proof/i,
  "Community/domain copy must frame public trust as records/evidence, not blanket certainty."
);

assertNotContains(
  "src/lib/trustDocumentGuide.ts",
  /public-proof|repair", "proof"|proof", "community/i,
  "Trust document guide copy must describe public records/evidence, not old certainty-context language."
);

assertNotContains(
  "src/lib/gsnIconAssets.ts",
  /certificate proof icon|QR proof record/i,
  "Icon metadata should follow evidence/record language instead of old certainty framing."
);

[
  "../gmfn_backend/app/api/routes/pilot_readiness.py",
  "../gmfn_backend/app/api/routes/protocol_status.py",
].forEach((file) => {
  assertNotContains(
    file,
    /proof not captured|Needs proof|Repayment proof|capture proof|phone proof|end-to-end proof|reconciliation proof|backend proof|UI proof|route proof|which proofs|accepted proof|backend proof protected|route-consistency proof|until proof|screenshot proof/i,
    "Pilot readiness/protocol copy must describe readiness material as evidence or validation, not blanket certainty."
  );
});

assertNotContains(
  "../gmfn_backend/app/api/routes/entry_verification.py",
  /Phone proof is now connected/i,
  "Signed-in phone verification messages must describe phone evidence, not blanket phone certainty."
);

assertNotContains(
  "../gmfn_backend/app/api/routes/admin.py",
  /Phone proof is ready|phone proof is not complete|before this proof can support trust/i,
  "Admin pilot and identity-review messages must frame phone/photo material as evidence, not blanket certainty."
);

assertNotContains(
  "../gmfn_backend/app/api/routes/marketplace.py",
  /TrustSlip proof|live TrustSlip proof/i,
  "Marketplace API messages must ask for current TrustSlip evidence, not blanket TrustSlip certainty."
);

assertNotContains(
  "../gmfn_backend/app/services/trust_score_service.py",
  /onboarding proofs|Starter identity proofs/i,
  "TrustScore API explanations must frame starter standing as identity evidence, not blanket certainty."
);

assertNotContains(
  "../gmfn_backend/app/api/routes/trust_slips.py",
  /Open scoped proof/i,
  "TrustSlip HTML member links must open scoped credentials, not old scoped wording."
);

[
  "src/lib/gsnSnapshotPaper.ts",
  "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
].forEach((file) => {
  assertNotContains(
    file,
    /proof that every claim is true|proof the offer is still available/i,
    "Public paper limitation notes must use evidence boundary language, not old certainty framing."
  );
});

assertNotContains(
  "../gmfn_backend/app/schemas/merchant_release.py",
  /verified TrustSlip/i,
  "Merchant release schema comments must frame TrustSlip as reviewed evidence, not as automatic release authority."
);

assertNotContains(
  "../gmfn_backend/app/api/routes/withdrawal_destinations.py",
  /against your verified identity|Payout proof is recorded/i,
  "Payout destination copy must describe phone-verified identity records precisely, not broad verified identity."
);

assertNotContains(
  "../gmfn_backend/app/services/trust_slips_services.py",
  /final proof|confirmed proof/i,
  "TrustSlip service plain language must frame readiness as evidence and confirmation boundaries, not final certainty."
);

assertNotContains(
  "src/pages/CommunityConfirmationOutcomePage.tsx",
  /Supporting proof only/i,
  "Community confirmation outcomes must frame scoped credentials as supporting evidence, not blanket certainty."
);

[
  "../README.md",
  "../docs/PROJECT_PROTOCOL.md",
  "../docs/SCREEN_SPECS.md",
  "../docs/GSN_COMMUNITY_PUBLIC_FACE_SPEC_2026-06-19.md",
  "../docs/GSN_VERIFIED_COMMUNITY_DOMAIN_SPEC_2026-06-18.md",
  "../docs/GSN_TRUST_INFRASTRUCTURE_GAP_AUDIT_2026-06-18.md",
  "../docs/GSN_REFRAME_WORKSHOP_AND_MARKET_ENTRY_PLAYBOOK_2026-06-18.md",
  "../docs/GSN_PRODUCTION_POLISH_STANDARD.md",
  "../docs/INSTITUTIONAL_EVIDENCE_SURFACE_INVENTORY.md",
  "../docs/APP_WIDE_AUDIT_PROTOCOL.md",
  "../docs/DESIGN_SYSTEM.md",
  "../docs/UX_ACCEPTANCE_CHECKLIST.md",
  "../docs/PILOT_EVIDENCE_PACK_CHECKLIST.md",
  "../docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md",
  "../docs/INNOVATION_POLICY_LOGIC_2026-04-20.md",
].forEach((file) => {
  assertNotContains(
    file,
    /\bproofs?\b|record confirms|proves active|proof state|provider-verified proof|confirmed proof/i,
    "Current doctrine docs must frame portable/community trust as evidence, records, or credentials, not blanket certainty."
  );
});

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /Identity check[\s\S]*?Phone verified[\s\S]*?Phone verified; community membership recorded/,
  "TrustSlip must describe the holder check as phone identity plus recorded community membership, not full member verification."
);

assertFunctionNotContains(
  "../gmfn_backend/app/services/community_confirmation_service.py",
  "public_community_verification",
  /Verified in GSN|This record confirms the community identity|proof anchor|active_member_count|contactable_reference_count|instant_pulse_available|public_policy|plain_language|phone_e164|sponsor_signal_count|hidden_by_design|full member list|raw member phone numbers|sponsor details|internal disputes|private relay contacts|internal trust history/,
  "public_community_verification must return only whitelisted public community fields and no protected-category inventory."
);

assertFunctionNotContains(
  "../gmfn_backend/app/services/community_confirmation_service.py",
  "public_community_member_verification",
  /confirms active membership/i,
  "Public community member credential payload must frame membership as a record plus witness evidence, not broad confirmation."
);

assertContains(
  "../gmfn_backend/app/services/community_confirmation_service.py",
  /def public_community_member_verification[\s\S]*?trust_reading_scope = \([\s\S]*?not a universal trust score[\s\S]*?transaction permission[\s\S]*?community_trust_reading_label[\s\S]*?community_trust_reading_scope/,
  "Public community member credential payload must expose a scoped trust reading with a clear non-approval boundary."
);

assertContains(
  "../gmfn_backend/app/services/community_confirmation_service.py",
  /def public_community_member_verification[\s\S]*?currentness_scope = \([\s\S]*?witness evidence[\s\S]*?membership_currentness_label[\s\S]*?membership_currentness_scope/,
  "Public community member credential payload must expose a currentness reading for witness validity."
);

assertFunctionNotContains(
  "../gmfn_backend/app/services/trust_slips_services.py",
  "get_trust_slip_payload",
  /Phone and community membership are verified|Identity confirmed by active community membership/,
  "TrustSlip payload must not describe active community membership as full identity/member verification."
);

assertContains(
  "../gmfn_backend/app/services/trust_slips_services.py",
  /def _membership_currentness_reading[\s\S]*?recorded validity window[\s\S]*?membership_currentness_label[\s\S]*?membership_currentness_scope/,
  "TrustSlip payload must carry the same membership currentness reading as public community member credentials."
);

assertNotContains(
  "../docs/GSN_VERIFIED_COMMUNITY_DOMAIN_SPEC_2026-06-18.md",
  /official groups|official group affiliation fees|official endorsement|official custodians|official parent body|official parent endorsement|official association standing|official parent-community standing|Result after approval|Verified Affiliate Group under|official affiliation|official umbrella recognition|official membership credential|official parent-domain evidence/i,
  "Verified Community Domain doctrine must use protected-domain and parent-domain acknowledgement language, not broad official-status wording."
);

assertNotContains(
  "../docs/GSN_VERIFIED_COMMUNITY_DOMAIN_SPEC_2026-06-18.md",
  /verification fee to recover the domain cost|Official community membership credential|officially verified under a protected community|verified affiliate group|A group may verify its own members|verify members internally|internal group verification creates local belonging|field staff-assisted verification|Verification is human-trust based|Witnesses do not sell verification|They support verification|community domain issues verification|audit trail for every verification|assisted verification|Personal verification records the person|Internal\s+group verification records local belonging|Official membership\s+credential makes that trust|verified affiliate;/i,
  "Verified Community Domain doctrine must distinguish internal witness/belonging evidence from protected-domain membership credentials."
);

assertNotContains(
  "../docs/GSN_REFRAME_WORKSHOP_AND_MARKET_ENTRY_PLAYBOOK_2026-06-18.md",
  /members verify one another as witnesses|claim official standing under the protected community domain/i,
  "Reframe playbook must describe member witness evidence and parent-domain acknowledged standing without broad verification or official-status wording."
);

assertContains(
  "../docs/GSN_TRUST_INFRASTRUCTURE_GAP_AUDIT_2026-06-18.md",
  /## 6\. Completion Ledger[\s\S]*?doctrine cleanup and finished\s+product capability[\s\S]*?Community public face[\s\S]*?Partially built, not complete[\s\S]*?GSN_COMMUNITY_PUBLIC_FACE_SPEC_2026-06-19\.md[\s\S]*?CommunityVerifyPage[\s\S]*?Community ID trust anchor[\s\S]*?Still needs full route QA against the spec[\s\S]*?Trusted commerce[\s\S]*?Built but still easy to read as commerce-first[\s\S]*?The gap challenge is not finished/,
  "Trust infrastructure gap audit must keep a completion ledger separating closed doctrine work from remaining product work."
);

assertContains(
  "../docs/GSN_COMMUNITY_PUBLIC_FACE_SPEC_2026-06-19.md",
  /## 2\. Anchor Rule[\s\S]*?Names are not the trust anchor[\s\S]*?Community ID[\s\S]*?protected Community ID Domain[\s\S]*?parent-domain acknowledged affiliate record[\s\S]*?## 3\. Public Variant[\s\S]*?## 4\. Member Variant[\s\S]*?## 5\. Admin Or Custodian Variant[\s\S]*?CAC or external registration is recorded context, not GSN verification by\s+itself[\s\S]*?## 13\. Unabated Truth[\s\S]*?not finished because a spec exists/,
  "Community Public Face spec must preserve the ID/domain anchor, public/member/admin variants, CAC boundary, and not-finished truth."
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
