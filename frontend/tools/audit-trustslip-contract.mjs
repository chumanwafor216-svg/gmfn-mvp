/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const trustSlipPage = readFileSync(join(frontendRoot, "src/pages/TrustSlipPage.tsx"), "utf8");
const apiClient = readFileSync(join(frontendRoot, "src/lib/api.ts"), "utf8");

const findings = [];

function assertContains(text, pattern, message) {
  if (!pattern.test(text)) findings.push(message);
}

function assertNotContains(text, pattern, message) {
  if (pattern.test(text)) findings.push(message);
}

function firstIndex(pattern) {
  const match = pattern.exec(trustSlipPage);
  return match ? match.index : -1;
}

assertContains(
  trustSlipPage,
  /type TrustSlipVisibilityScope = "community_specific" \| "all_visible_communities";/,
  "TrustSlip must keep a visibility-scope type separate from the issuing community."
);
assertContains(
  trustSlipPage,
  /const \[visibilityScope, setVisibilityScope\]/,
  "TrustSlip must keep visibilityScope state."
);
assertContains(
  trustSlipPage,
  /const \[selectedIssuingCommunityOptionId, setSelectedIssuingCommunityOptionId\]/,
  "TrustSlip must keep selected issuing-community state."
);
assertContains(
  trustSlipPage,
  /const issuingCommunityId = positiveNumberId\(selectedVerificationCommunityId\);/,
  "TrustSlip must derive a numeric issuingCommunityId from the selected real community."
);
assertContains(
  trustSlipPage,
  /if \(!activeIssuingCommunityId\)[\s\S]*Choose an active community before generating TrustSlip/,
  "Generate must stop locally when no legitimate issuing community exists."
);
assertContains(
  trustSlipPage,
  /community_id: activeIssuingCommunityId,/,
  "Generate must send a numeric activeIssuingCommunityId as community_id."
);
assertNotContains(
  trustSlipPage,
  /community_id:\s*[^\n]*all_visible_communities/,
  "All-visible sentinel must never be sent as community_id."
);
assertNotContains(
  trustSlipPage,
  /clan_id:\s*[^\n]*all_visible_communities/,
  "All-visible sentinel must never be sent as clan_id."
);
assertNotContains(
  trustSlipPage,
  /const fallbackTrustSlipIssueCommunityId/,
  "TrustSlip must not restore the old fallback issuing-community variable."
);
assertNotContains(
  trustSlipPage,
  /positiveNumberId\(verificationCommunityOptions\[0\]\?\.id\)/,
  "Generate must not silently pick the first visible community as an issuing fallback."
);
assertContains(
  trustSlipPage,
  /const confirmedSummary = buildConfirmedTrustSlipIssueSummary\([\s\S]*?const issuedCode = trustSlipCodeFromResult\(confirmedSummary \|\| reissueResult\);/,
  "Successful generation must establish an actual TrustSlip code from the response or fresh summary."
);
assertContains(
  trustSlipPage,
  /if \(!confirmedSummary \|\| !issuedCode\)[\s\S]*setTrustSlipSetupSubmitted\(false\)[\s\S]*return;/,
  "Failed issuance must remain in setup instead of opening the paper."
);
assertContains(
  trustSlipPage,
  /setTrustSlipSetupSubmitted\(true\);[\s\S]*setActiveTrustSlipPaperPack\("share"\);/,
  "Successful issuance must open the Share pack/result state."
);
assertContains(
  trustSlipPage,
  /const hasUsableTrustSlipShare = Boolean\([\s\S]*?trustSlipCode && shortVerifyPath && shortVerifyUrl[\s\S]*?\);[\s\S]*?const canCreateShareInvitation =[\s\S]*?hasUsableTrustSlipShare[\s\S]*?!trustSlipNeedsSelectedCommunityRefresh[\s\S]*?!trustSlipShareBlockedByCurrentness[\s\S]*?const hasUsableCurrentTrustSlipShare =\s*canCreateShareInvitation && Boolean\(shareInvitationPath && shareInvitationUrl\);/,
  "Share/Open actions must require a usable TrustSlip code and a persisted purpose-bound short share invitation."
);
assertContains(
  trustSlipPage,
  /createTrustSlipShareInvitation\([\s\S]*?decision_pack: selectedPurposeOption\.key[\s\S]*?verification_scope: visibilityScope[\s\S]*?verification_community_id:/,
  "TrustSlip holder must create server-side purpose-bound share invitations instead of query-packed links."
);
assertContains(
  apiClient,
  /createTrustSlipShareInvitation[\s\S]*?\/trust-slips\/me\/share-invitations[\s\S]*?getTrustSlipShareInvitation[\s\S]*?\/trust-slips\/share-invitations\//,
  "API client must expose create/resolve calls for TrustSlip share invitations."
);
assertContains(
  trustSlipPage,
  /setMemberCommunityOptions\(\(current\) => \(data\.clans\.length \? data\.clans : current\)\)/,
  "Later empty community refreshes must not erase an already-valid membership list."
);
assertContains(
  trustSlipPage,
  /listMyClans\(\)/,
  "TrustSlip community options must keep sourcing legitimate memberships from /clans/me."
);
assertContains(
  apiClient,
  /const selectedCommunityId = Number\(rawSelectedCommunityId \?\? 0\);[\s\S]*community_id: hasSelectedCommunityId \? selectedCommunityId : undefined/,
  "API client must keep the numeric guard before POST /trust-slips/me/reissue."
);

const firstCommunityOptions = firstIndex(/\{verificationCommunityOptions\.map\(\(option\) => \(/);
const firstAllVisible = firstIndex(/<option value="all_visible_communities">All visible community context<\/option>/);
if (firstCommunityOptions < 0 || firstAllVisible < 0 || firstCommunityOptions > firstAllVisible) {
  findings.push("TrustSlip setup selector must render named communities before all-visible context.");
}

const holderSection = trustSlipPage.indexOf('data-gsn-trustslip-verification-scope="holder"');
if (holderSection < 0) {
  findings.push("TrustSlip holder selector section was not found.");
} else {
  const holderText = trustSlipPage.slice(holderSection, holderSection + 2600);
  const holderCommunityIndex = holderText.search(/\{verificationCommunityOptions\.map\(\(option\) => \(/);
  const holderAllVisibleIndex = holderText.search(/<option value="all_visible_communities">All visible community context<\/option>/);
  if (holderCommunityIndex < 0 || holderAllVisibleIndex < 0 || holderCommunityIndex > holderAllVisibleIndex) {
    findings.push("TrustSlip holder selector must render named communities before all-visible context.");
  }
}

if (findings.length) {
  console.error("TrustSlip contract audit failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("TrustSlip contract audit passed.");