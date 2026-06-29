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
];

entryPages.forEach((file) => {
  assertVisibleStringsDoNotContain(
    file,
    /\b(?:MVP|payload|endpoint|internal|module|configuration|backend)\b/i,
    "Normal entry strings must not expose builder or backend language."
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
  /function signInSessionError[\s\S]*secure sign-in service needs checking[\s\S]*member record check[\s\S]*secure sign-in connection needs checking/,
  "Sign In session recovery errors must explain the problem without exposing backend/API/CORS language."
);

assertVisibleStringsDoNotContain(
  "src/pages/LoginPage.tsx",
  /\b(?:backend session service|API or CORS setting|member-session check)\b/i,
  "Sign In session recovery copy must not expose builder-facing service language."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /buildActionBlockedMessage[\s\S]*?showError\(feedbackTargetForFinish[\s\S]*?buildActionSuccessMessage[\s\S]*?Opening First Circle now/,
  "Create Community must explain blockers and show a success handoff before the next route."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /secure sign-in step is no longer active[\s\S]*could not confirm the secure sign-in step/,
  "Create Community restored-draft recovery must explain sign-in loss without exposing backend language."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /noticeStyle\("error"\)[\s\S]*?noticeStyle\("success"\)[\s\S]*?Join request submitted successfully\.[\s\S]*?debugId=\{pendingCta\.debugId\}/,
  "Join Entry must show visible submitted/error states and route the user to pending approval."
);

assertContains(
  "src/pages/JoinRequestPendingPage.tsx",
  /Waiting for community action[\s\S]*?debugId=\{approvalCta\.debugId\}[\s\S]*?Open approval status[\s\S]*?debugId="join-pending\.review-details\.toggle"/,
  "Pending Approval must tell the user what is happening and offer status/detail actions."
);

assertContains(
  "src/pages/JoinApprovalPage.tsx",
  /Your request has been approved[\s\S]*?Continue to activation[\s\S]*?debugId=\{activationCta\.debugId\}[\s\S]*?Open activation[\s\S]*?debugId=\{pendingCta\.debugId\}/,
  "Join Approval must explain approved and pending states and offer the correct next action."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /Membership activated\. Verify this phone next[\s\S]*?Membership activated successfully\. Build your First Circle next[\s\S]*?debugId="member-activation\.notice-action"[\s\S]*?member-activation\.verify-phone[\s\S]*?member-activation\.build-first-circle/,
  "Member Activation must answer success visibly, send unverified members to phone verification, and preserve First Circle as the next community-growth step after verification."
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
