/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const text = read(file);

  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected entry copy/response pattern was not found.",
    });
  }
}

function assertVisibleStringsDoNotContain(file, pattern, message) {
  const text = read(file);
  const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;

  while ((match = stringPattern.exec(text))) {
    const value = match[2];
    if (!pattern.test(value)) continue;

    findings.push({
      file,
      line: text.slice(0, match.index).split(/\r?\n/).length,
      message,
      text: value.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const entryPages = [
  "src/pages/CoverPage.tsx",
  "src/pages/WelcomePage.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/CreateEntryPage.tsx",
  "src/pages/JoinEntryPage.tsx",
  "src/pages/JoinRequestPendingPage.tsx",
  "src/pages/JoinApprovalPage.tsx",
  "src/pages/MemberActivationPage.tsx",
  "src/pages/ActivateMembershipPage.tsx",
];

entryPages.forEach((file) => {
  assertVisibleStringsDoNotContain(
    file,
    /\b(?:MVP|payload|endpoint|internal|module|configuration|backend|access token)\b/i,
    "Normal entry strings must not expose builder or backend language."
  );
});

entryPages.forEach((file) => {
  assertVisibleStringsDoNotContain(
    file,
    /\b(?:wrong route|next route|route you need|raw GSN ID|session token)\b/i,
    "Normal entry strings must describe pages, steps, and GSN IDs without route/raw wording."
  );
});

assertContains(
  "src/pages/CoverPage.tsx",
  /Global Support Network[\s\S]*?debugId="cover\.continue"[\s\S]*?debugId="cover\.about-gsn"[\s\S]*?About GSN & I/,
  "Cover must keep the GSN brand and the two traceable entry actions."
);

assertContains(
  "src/pages/WelcomePage.tsx",
  /Choose how you want to continue[\s\S]*?Sign in[\s\S]*?Create a new community[\s\S]*?Join an existing community/,
  "Welcome must speak in user choices: sign in, create, or join."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /setMsg\("Sign-in successful\. Opening your workspace\.\.\."\)[\s\S]*?Sign in to continue where you left off[\s\S]*?noticeStyle\("error"\)[\s\S]*?noticeStyle\("success"\)/,
  "Sign In must show direct purpose plus visible success and error responses."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /function signInSessionError[\s\S]*browser did not keep you signed in[\s\S]*Return to Welcome, open Sign in again[\s\S]*same message returns[\s\S]*Activate Membership to confirm this account is active[\s\S]*member record check[\s\S]*pause and report this sign-in recovery message[\s\S]*live system could not open your member session[\s\S]*Return to Welcome, open Sign in again[\s\S]*same message returns/,
  "Sign In session recovery errors must explain the problem and give a first safe recovery step without exposing backend/API/CORS language."
);

assertVisibleStringsDoNotContain(
  "src/pages/LoginPage.tsx",
  /\b(?:backend session service|API or CORS setting|member-session check|try again in a moment|Refresh once)\b/i,
  "Sign In session recovery copy must not expose builder-facing service language."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /code === "recovery_not_configured"[\s\S]*?nextAction === "manual_review"[\s\S]*?Owner review needed[\s\S]*?Do not keep retrying from this screen[\s\S]*?Check recovery/,
  "Sign In password recovery must turn missing recovery prompts into a manual-review blocker instead of promising unavailable recovery questions."
);

assertVisibleStringsDoNotContain(
  "src/pages/JoinByInvitePage.tsx",
  /\bguided public route\b/i,
  "Join-by-invite public copy must call the next step an entry, not a route."
);

assertVisibleStringsDoNotContain(
  "src/pages/InviteLandingPage.tsx",
  /\bfounder create route\b/i,
  "Invite landing copy must describe founder creation in user terms, not route language."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /buildActionBlockedMessage[\s\S]*?showError\(feedbackTargetForFinish[\s\S]*?buildActionSuccessMessage[\s\S]*?Opening First Circle now/,
  "Create Community must explain blockers and show a success handoff before the next page."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /secure sign-in step is no longer active[\s\S]*could not confirm the secure sign-in step/,
  "Create Community restored-draft recovery must explain sign-in loss without exposing backend language."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /noticeStyle\("error"\)[\s\S]*?noticeStyle\("success"\)[\s\S]*?Join request submitted successfully\.[\s\S]*?activation will set your password, phone check, and private recovery[\s\S]*?debugId=\{pendingCta\.debugId\}/,
  "Join Entry must show visible submitted/error states, explain the post-approval recovery procedure, and route the user to pending approval."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /invite code GSN needs[\s\S]*?Paste the invite code in the field on this page[\s\S]*?invite check to finish[\s\S]*?fresh GSN join link[\s\S]*?reopen the full invite link/,
  "Join Entry invite-code errors must point users to the visible invite-code recovery controls and inviter fallback."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /GSN could not send this join request yet[\s\S]*?Check the required details and invite code[\s\S]*?ask the inviter or community helper to check the invite/,
  "Join Entry generic submit failures must give a first safe recovery step."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /could not reopen this saved join request from the browser record[\s\S]*?Enter the phone number again on this invite[\s\S]*?original invite or approval message with the request ID[\s\S]*?community helper to check the saved request/,
  "Join Entry saved-request resume failures must explain the browser-record problem and the first recovery path."
);

assertContains(
  "src/pages/JoinRequestPendingPage.tsx",
  /Waiting for community action[\s\S]*?debugId=\{approvalCta\.debugId\}[\s\S]*?Open approval status[\s\S]*?debugId="join-pending\.review-details\.toggle"/,
  "Pending Approval must tell the user what is happening and offer status/detail actions."
);

assertContains(
  "src/pages/JoinRequestPendingPage.tsx",
  /Request ID is missing[\s\S]*?cannot reopen the exact approval record[\s\S]*?Return to\s+Welcome[\s\S]*?original invite or approval message[\s\S]*?contains the request ID/,
  "Pending Approval must explain the missing-request-ID blocker in place and give the first safe recovery step."
);

assertContains(
  "src/pages/JoinApprovalPage.tsx",
  /Your request has been approved[\s\S]*?Continue to activation to set your password and recovery protection[\s\S]*?debugId=\{activationCta\.debugId\}[\s\S]*?Open activation[\s\S]*?debugId=\{pendingCta\.debugId\}/,
  "Join Approval must explain approved and pending states, name recovery protection, and offer the correct next action."
);

assertContains(
  "src/pages/JoinApprovalPage.tsx",
  /Your request was not approved at this time[\s\S]*?Ask the inviting community what to update[\s\S]*?Return to Welcome[\s\S]*?fresh invite/,
  "Join Approval rejected-state copy must explain what happened and the first safe recovery step."
);

assertContains(
  "src/pages/JoinApprovalPage.tsx",
  /Approval status could not load[\s\S]*?Return to\s+Welcome[\s\S]*?original invite or\s+approval message[\s\S]*?contains the request ID[\s\S]*?debugId=\{welcomeCta\.debugId\}/,
  "Join Approval load failures must explain the first safe recovery step and keep a stable return action."
);

assertContains(
  "src/pages/JoinApprovalPage.tsx",
  /GSN could not read the final approval state from this link[\s\S]*?Return to Welcome[\s\S]*?original invite or approval message[\s\S]*?contains the request ID/,
  "Join Approval unknown-status copy must explain the problem and first safe recovery step."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /Membership activated\. Verify this phone next[\s\S]*?Membership activated\. Set private recovery next[\s\S]*?debugId="member-activation\.notice-action"[\s\S]*?member-activation\.verify-phone[\s\S]*?member-activation\.set-recovery[\s\S]*?member-activation\.build-first-circle/,
  "Member Activation must answer success visibly, send unverified members to phone verification, and send verified members to private recovery before First Circle growth."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /Add approved GSN ID or request ID[\s\S]*?Enter either the GSN ID shown after approval or the request ID from approval status/,
  "Member Activation missing-identifier copy must name the approved GSN ID/request ID clearly."
);

assertContains(
  "src/pages/ActivateMembershipPage.tsx",
  /Activation completed, but your signed-in session did not start\. Please sign in again\./,
  "Activation fallback errors must explain session start failure without exposing token language."
);

if (findings.length > 0) {
  console.error("Entry copy/response audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Entry copy/response audit passed.");
