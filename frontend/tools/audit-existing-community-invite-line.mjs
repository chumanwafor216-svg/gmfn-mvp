/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

function readFromRoot(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const text = readFromRoot(file);
  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected existing-community invite-line pattern was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = readFromRoot(file);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
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

const findings = [];

assertContains(
  "frontend/src/App.tsx",
  /const CreateEntryPage = React\.lazy\(\(\) => import\("\.\/pages\/CreateEntryPage"\)\);[\s\S]*?const JoinEntryPage = React\.lazy\(\(\) => import\("\.\/pages\/JoinEntryPage"\)\);[\s\S]*?<Route path="\/create" element=\{<CreateEntryPage \/>\} \/>[\s\S]*?<Route path="\/join" element=\{<JoinEntryPage \/>\} \/>[\s\S]*?<Route path="\/join\/:code" element=\{<JoinEntryPage \/>\} \/>[\s\S]*?path="\/start\/join\/:code"[\s\S]*?element=\{<JoinEntryPage \/>\}[\s\S]*?path="\/start\/invite\/:code"[\s\S]*?element=\{<JoinEntryPage \/>\}/,
  "Create-community and existing-community invite routes must stay separate: /create uses CreateEntryPage, while /join and /start/join invite links use JoinEntryPage."
);

assertContains(
  "frontend/src/App.tsx",
  /path="\/invite\/:code"[\s\S]*?element=\{<JoinEntryPage \/>\}/,
  "Legacy invite URLs must keep opening the existing-community JoinEntryPage instead of the create-community entry lane."
);

assertContains(
  "frontend/src/App.tsx",
  /path="\/get-invite\/:code"[\s\S]*?element=\{<JoinEntryPage \/>\}/,
  "Legacy get-invite URLs must keep opening the existing-community JoinEntryPage instead of the create-community entry lane."
);

assertContains(
  "frontend/src/App.tsx",
  /path="create-community" element=\{<Navigate to="\/create" replace \/>/,
  "Authenticated create-community alias must still canonicalize to the create-community lane, not the existing-community invite form."
);

assertContains(
  "frontend/src/App.tsx",
  /path="new-community" element=\{<Navigate to="\/create" replace \/>/,
  "Authenticated new-community alias must still canonicalize to the create-community lane, not the existing-community invite form."
);

assertContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /const canUseNewMemberForm =\s*currentMemberChecked && !usingExistingIdentity;/,
  "Existing-community Join Entry must not hide the request form just because a stale token exists in localStorage."
);

assertNotContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /const canUseNewMemberForm =[\s\S]*?!has(?:Authenticated|Stored)Session[\s\S]*?!usingExistingIdentity;/,
  "Existing-community Join Entry must not restore the old stale-token gate that hid the request form after invite validation."
);

assertNotContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /Sign in \/ use GSN ID|Sign in to reuse|Open sign in|Sign in again|signInConflictCta|I am new/,
  "Existing-community Join Entry must not restore the old sign-in detour for invite recipients; existing members should type their GSN ID here."
);

assertContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /showJoinPathLauncher[\s\S]*?Already a member\?[\s\S]*?Use GSN ID[\s\S]*?New to GSN[\s\S]*?joinPathChoice === "existing"[\s\S]*?Existing GSN ID[\s\S]*?First name[\s\S]*?Surname[\s\S]*?Phone number[\s\S]*?Work, business, or trade[\s\S]*?requestJoinWithExistingGsnId[\s\S]*?Send with GSN ID[\s\S]*?formOpen &&[\s\S]*?joinPathChoice === "new"[\s\S]*?canOpenForm[\s\S]*?canUseNewMemberForm[\s\S]*?!hasExistingGsnClaim[\s\S]*?First name[\s\S]*?Surname[\s\S]*?Phone number[\s\S]*?Country[\s\S]*?Date of birth[\s\S]*?Place of birth[\s\S]*?Submit request/,
  "A ready existing-community invite must first present one guided choice, then reveal either direct existing GSN ID submission or the new-member request form without dumping both paths at once."
);

assertContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /inviteAcknowledged[\s\S]*?debugId="join-entry\.acknowledge-invite"[\s\S]*?Continue[\s\S]*?\{inviteAcknowledged \? \([\s\S]*?Join request form/,
  "Existing-community invites must show the invitation first and only open the request area after the invite is acknowledged."
);

assertContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /import GSNBrandMark[\s\S]*?function BrandedInvitationPaper[\s\S]*?<GSNBrandMark[\s\S]*?Community invitation[\s\S]*?Official GSN invite[\s\S]*?<BrandedInvitationPaper/,
  "Existing-community invites must render as a branded GSN invitation paper with a visible GSN mark/watermark, not a plain message block."
);

assertContains(
  "frontend/src/lib/joinInviteMessaging.ts",
  /GSN helps trusted communities keep one identity, one record, and one review path[\s\S]*?If you are interested, continue and send a request/,
  "Existing-community invite message must keep the relationship-based explanation before the request form."
);

assertContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /showUnclearSessionRecovery[\s\S]*?old saved access state[\s\S]*?debugId="join-entry\.use-existing-gsn-after-unclear-session"[\s\S]*?Use GSN ID[\s\S]*?debugId="join-entry\.clear-unclear-session-open-form"[\s\S]*?New to GSN/,
  "Unclear stored-session state must explain the problem and offer existing-GSN-ID recovery or new-request recovery without a sign-in detour."
);

assertContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /function joinEntryIconText\([\s\S]*?width: "100%"[\s\S]*?style=\{\{ display: "inline-grid", flex: "0 0 auto" \}\}[\s\S]*?wordBreak: "normal"[\s\S]*?function entryChoiceActionStyle[\s\S]*?height: 52[\s\S]*?boxSizing: "border-box"[\s\S]*?touchAction: "manipulation"/,
  "Existing-community invite buttons must keep stable centered icon/text geometry on phone."
);

assertContains(
  "frontend/src/pages/JoinEntryPage.tsx",
  /async function requestJoinWithExistingIdentity\([\s\S]*?submitJoinRequest\(\{[\s\S]*?invite_code: safeInviteCode[\s\S]*?async function requestJoinWithExistingGsnId\([\s\S]*?existing_gmfn_id: safeExistingGsnId[\s\S]*?first_name: safeFirstName[\s\S]*?surname: safeSurname[\s\S]*?phone_e164: safePhone[\s\S]*?\{ includeAuth: false \}/,
  "Public Join Entry must submit a typed existing GSN ID without stale auth, while verified in-app existing identity joins still use the authenticated path."
);

assertContains(
  "frontend/src/lib/api.ts",
  /export async function submitJoinRequest\([\s\S]*?options\?: \{ includeAuth\?: boolean \}[\s\S]*?const tok = options\?\.includeAuth === false \? null : getAccessToken\(\);/,
  "The join-request API helper must support public unauthenticated submission for existing-community invite forms."
);

assertContains(
  "frontend/src/pages/MarketplacePage.tsx",
  /personalizedJoinInviteUrl\(inviteLink,[\s\S]*?inviterName: joinSenderDisplayName[\s\S]*?recipientName: joinRecipientName[\s\S]*?communityCode: activeJoinCommunityCode[\s\S]*?communityName: activeJoinCommunityName[\s\S]*?marketplaceName: activeCommunityName[\s\S]*?message: joinInviteNote/,
  "Marketplace invite sharing must keep the personalized existing-community join URL context needed by JoinEntryPage."
);

assertNotContains(
  "frontend/src/pages/MarketplacePage.tsx",
  /compactJoinInviteUrl\(inviteLink\)|compactJoinInviteUrl\(personalizedInviteLink\)/,
  "Marketplace invite sharing must not strip existing-community invite form context back to a compact URL."
);

assertContains(
  "gmfn_backend/app/api/routes/clans.py",
  /def create_join_request\([\s\S]*?submitted_existing_gmfn_id = _safe_str\(payload\.existing_gmfn_id\)\.upper\(\)[\s\S]*?claimed_existing_identity_user[\s\S]*?existing_identity_join = bool\([\s\S]*?claimed_existing_identity_user is not None[\s\S]*?existing_gsn_id_required[\s\S]*?Enter that GSN ID/,
  "Backend join-request creation must reuse typed existing GSN IDs and block duplicate-phone creation without requiring the invite recipient to sign in."
);

assertContains(
  "gmfn_backend/tests/test_join_requests.py",
  /test_public_join_request_existing_gmfn_id_reuses_global_identity[\s\S]*?existing_gmfn_id[\s\S]*?identity_reused[\s\S]*?test_public_join_request_unknown_existing_gmfn_id_does_not_create_identity[\s\S]*?existing_gsn_id_not_found/,
  "Backend tests must keep coverage for public typed-GSN-ID reuse and unknown-GSN-ID rejection."
);

if (findings.length > 0) {
  console.error("Existing-community invite line audit failed:");
  for (const finding of findings) {
    const loc = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    console.error(`- ${loc} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log(
  "Existing-community invite line audit passed: create-community and join-existing-community stay separate, ready invite forms stay visible, stale auth is bypassed for public submit, and backend duplicate-ID protection remains caged."
);
