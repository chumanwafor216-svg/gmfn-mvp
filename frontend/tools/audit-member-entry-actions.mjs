/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

const memberEntryFiles = [
  "src/pages/ProfilePage.tsx",
  "src/pages/CoverPage.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/CreateEntryPage.tsx",
  "src/pages/JoinEntryPage.tsx",
  "src/pages/JoinRequestPendingPage.tsx",
  "src/pages/JoinApprovalPage.tsx",
  "src/pages/MemberActivationPage.tsx",
  "src/pages/MyGMFNAndIPage.tsx",
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
          "Member / Entry stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

memberEntryFiles.forEach(assertStableActionsHaveDebugIds);

assertContains(
  "src/pages/CoverPage.tsx",
  /debugId="cover\.continue"[\s\S]*?debugId="cover\.about-gsn"/,
  "Cover primary actions must remain traceable."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /debugId="login\.open-help"[\s\S]*?debugId="login\.submit"[\s\S]*?debugId="login\.activate-approved"[\s\S]*?debugId="login\.start-community"/,
  "Login help, submit, activation, and start-community actions must remain traceable."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /debugId="create-entry\.existing-member\.toggle"[\s\S]*?debugId="create-entry\.guide\.primary"[\s\S]*?debugId="create-entry\.details\.submit"[\s\S]*?debugId="create-entry\.community\.submit"/,
  "Create Community entry actions must remain traceable."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /function entryActionRowStyle\(height = 56\)[\s\S]*?gridAutoRows: `\$\{height\}px`[\s\S]*?function entryActionStyle\(height = 56\)[\s\S]*?maxHeight: height[\s\S]*?function otpDigits[\s\S]*?const normalizedOtpCode = otpDigits\(otpCode\)[\s\S]*?inputMode="numeric"[\s\S]*?autoComplete="one-time-code"[\s\S]*?name="entry-phone-code"[\s\S]*?stableHeight=\{56\}[\s\S]*?debugId="create-entry\.verification\.confirm-code"/,
  "Create Community phone confirmation must keep a numeric one-time-code field and fixed-height verification actions."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /debugId="join-entry\.resume-saved-request"[\s\S]*?debugId="join-entry\.existing-identity"[\s\S]*?debugId="join-entry\.submit-new-request"/,
  "Join Entry request actions must remain traceable."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /debugId="member-activation\.about"[\s\S]*?debugId="member-activation\.guide"[\s\S]*?debugId="member-activation\.finish"[\s\S]*?debugId="member-activation\.trust"/,
  "Member Activation actions must remain traceable."
);

assertContains(
  "src/pages/ProfilePage.tsx",
  /debugId="profile\.save-local"[\s\S]*?debugId="profile\.refresh"/,
  "Profile actions must remain traceable."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /debugId="my-gmfn\.public\.continue-top"[\s\S]*?debugId="my-gmfn\.route\.dashboard"[\s\S]*?debugId="my-gmfn\.settings\.save"/,
  "My GSN and I public, route, and settings actions must remain traceable."
);

assertContains(
  "src/pages/DashboardPage.tsx",
  /debugId="dashboard\.trust-detail\.toggle"/,
  "Dashboard trust detail toggle must remain traceable."
);

if (findings.length > 0) {
  console.error("Member / Entry action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Member / Entry action audit passed.");
