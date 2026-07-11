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
  /debugId="login\.open-help"[\s\S]*?debugId="login\.submit"[\s\S]*?debugId="login\.activate-approved"[\s\S]*?debugId="login\.password-recovery\.open"[\s\S]*?debugId="login\.password-recovery\.start"[\s\S]*?debugId="login\.password-recovery\.reset"[\s\S]*?debugId="login\.password-recovery\.back"[\s\S]*?debugId="login\.start-community"/,
  "Login help, submit, activation, password recovery, and start-community actions must remain traceable."
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
  /debugId="member-activation\.about"[\s\S]*?debugId="member-activation\.guide"[\s\S]*?debugId="member-activation\.finish"[\s\S]*?member-activation\.verify-phone[\s\S]*?member-activation\.build-first-circle[\s\S]*?debugId="member-activation\.trust"/,
  "Member Activation actions must remain traceable."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /const nextRoute = needsPhoneVerification[\s\S]*?routes\.identityPhone[\s\S]*?routes\.buildFirstCircle[\s\S]*?Verify this phone next[\s\S]*?navigate\(nextRoute[\s\S]*?Verify phone[\s\S]*?Build first circle/,
  "Member Activation success must route unverified joined members to phone verification before First Circle, while keeping First Circle as the primary next action once phone is verified."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /setActivated\(true\);[\s\S]*?setSuccess\(/,
  "Member Activation must show a visible success response after activation."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /^(?![\s\S]*navigate\(routes\.dashboard, \{ replace: true \}\);)[\s\S]*$/m,
  "Member Activation must not auto-navigate to Dashboard after success."
);

assertContains(
  "src/pages/ProfilePage.tsx",
  /updateMyProfile[\s\S]*?debugId="profile\.save-account"[\s\S]*?debugId="profile\.refresh"/,
  "Profile actions must remain traceable."
);

assertContains(
  "src/lib/api.ts",
  /export async function updateMyProfile[\s\S]*?\/auth\/me\/profile[\s\S]*?display_name/,
  "Profile display-name save must use the account profile endpoint, not local-only storage."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /debugId: "my-gmfn\.route\.dashboard"[\s\S]*?debugId: "my-gmfn\.route\.finance"[\s\S]*?debugId="my-gmfn\.hero\.dashboard"[\s\S]*?debugId="my-gmfn\.tab\.guide"[\s\S]*?debugId="my-gmfn\.settings\.save"/,
  "My GSN and I hero, guide, route, and settings actions must remain traceable."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /getMyTrustSlipSummary[\s\S]*?getTrustSlipSummary[\s\S]*?getTrustSlipMeSummary[\s\S]*?getMyTrustSlip[\s\S]*?normalizeIdentityTrustSlip/,
  "My GSN and I hero must load TrustSlip identity evidence instead of relying only on shallow account placeholders."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /buildIdentityEvidenceCompletion[\s\S]*?buildTrustPassportViewModel[\s\S]*?Identity evidence[\s\S]*?Active communities[\s\S]*?Trust Passport[\s\S]*?Photo\/selfie[\s\S]*?Main context/,
  "My GSN and I hero must align its visible status labels with Trust Passport evidence and avoid placeholder-only status copy."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /const sourceIdentityStatusLabel[\s\S]*?trustSlipSummary\?\.identity_status_label[\s\S]*?trustSlipSummary\?\.identity_context\?\.identity_status_label[\s\S]*?identityStatusLabel: sourceIdentityStatusLabel[\s\S]*?if \(sourceIdentityStatusLabel\)[\s\S]*?if \(passportVm\.identity\.identityVerified === true\) return "Identity recorded";[\s\S]*?if \(identityEvidence\.score >= 55\) return `\$\{identityEvidence\.label\} recorded`;[\s\S]*?if \(identityEvidence\.score > 0\) return `\$\{identityEvidence\.label\} building`;/,
  "My GSN and I hero must not let the Trust Passport view-model default 'Identity evidence building' override stronger recorded identity evidence."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /const trustPassportStatus = useMemo\(\(\) => \{[\s\S]*?if \(passportVm\.identity\.identityVerified === true\) return "Identity verified";[\s\S]*?if \(identityEvidence\.score >= 55\) return `\$\{identityEvidence\.label\} record`;[\s\S]*?passportVm\.verdict\.evidenceLabel !== "Evidence still building"[\s\S]*?if \(identityEvidence\.score >= 35\) return "Evidence record building";/,
  "My GSN and I Trust Passport hero status must use the evidence score before falling back to generic building language."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /label: "Marketplace"[\s\S]*?debugId: "my-gmfn\.route\.marketplace"[\s\S]*?label: "Finance"[\s\S]*?detail: "Money records and payment evidence\."[\s\S]*?icon: "financeInstitution"[\s\S]*?to: routes\.finance[\s\S]*?debugId: "my-gmfn\.route\.finance"[\s\S]*?label: "Loans & Support"/,
  "My GSN and I route list must keep Finance visible between Marketplace and Loans & Support."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /data-my-gmfn-selected-capability="true"[\s\S]*data-my-gmfn-decision-guide-tools="collapsed"[\s\S]*StableDisclosureSummary[\s\S]*debugId="my-gmfn\.profile\.decision-guide-tools"[\s\S]*Find another decision[\s\S]*htmlFor="my-gmfn-capability-search"[\s\S]*?Search by decision[\s\S]*?id="my-gmfn-capability-search"[\s\S]*?htmlFor="my-gmfn-capability-category"[\s\S]*?Category filter[\s\S]*?id="my-gmfn-capability-category"[\s\S]*?htmlFor="my-gmfn-capability-select"[\s\S]*?Choose capability[\s\S]*?id="my-gmfn-capability-select"[\s\S]*?aria-label="Choose GSN capability"/,
  "My GSN and I decision guide must show the focused capability first and keep search, category filter, and dropdown selector inside collapsed decision-guide tools."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /The real-world problem[\s\S]*?Why it is dangerous[\s\S]*?How GSN changes the decision[\s\S]*?Which GSN tools cooperate[\s\S]*?Where you use them[\s\S]*?Evidence created/,
  "My GSN and I profile decision guide must stay concrete enough to explain daily GSN use as real-world problem, danger, changed decision, tool cooperation, app location, and evidence created."
);

assertContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /realWorld: "Buyers, sellers, suppliers, and service providers often meet through messages, referrals, or marketplace posts with thin identity context\."[\s\S]*?danger: "A good-looking offer can hide a weak seller, a false buyer, an unreliable supplier, or a trade that leaves no usable record afterwards\."[\s\S]*?decision: "GSN lets both sides read shop identity, member context, TrustSlip evidence, and trade history before committing\."[\s\S]*?tools: "Public Shop -> Merchant Verification -> TrustSlip -> Merchant Release Rail -> Shop Diary -> Vault\."[\s\S]*?where: "Marketplace -> Members & Trade; Shop -> Public Shop \/ Vault; Trust -> TrustSlip\."[\s\S]*?evidence: "Shop identity, shelf activity, followers, trade records, verification links, and public shop record\."/,
  "The Evidence-Backed Buying and Selling capability must keep the owner's requested decision-story depth."
);

assertNotContains(
  "src/pages/CoverPage.tsx",
  /GMFN_CAPABILITIES|gmfnCapabilities/,
  "Cover page 22-things content must remain separate from the authenticated My GSN and I capability guide."
);

assertNotContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /Choose the route that matches|protected routes|welcome route/,
  "Public My GSN and I guide copy must speak in page/user terms, not route language."
);

assertNotContains(
  "src/pages/MyGMFNAndIPage.tsx",
  /Awaiting issue|Identity pending|Photo not shown|GSN ID status|Member: \{displayName\}|Community: \{communityLabel\}/,
  "My GSN and I hero must not show stale placeholder statuses or repeat member/community chips under the evidence grid."
);

assertContains(
  "src/pages/BuildFirstCirclePage.tsx",
  /GSN ID: \{gmfnId \|\| "Not issued yet"\}/,
  "Build First Circle must show an honest missing-GSN-ID label instead of stale issue-tracking language."
);

assertNotContains(
  "src/pages/BuildFirstCirclePage.tsx",
  /Awaiting issue/,
  "Build First Circle must not display stale issue-tracking language for missing GSN IDs."
);

assertContains(
  "src/lib/firstCircle.ts",
  /gmfnId[\s\S]*?\? `I recently joined GSN and received my GSN ID \$\{gmfnId\}\.`[\s\S]*?: "I recently joined GSN\. My GSN ID is not issued yet\."/,
  "First Circle copied invite messages must not claim a GSN ID was received when no issued ID exists."
);

assertNotContains(
  "src/lib/firstCircle.ts",
  /received my GSN ID \$\{gmfnId \|\| "Pending"\}|safeStr\(params\.gmfnId\) \|\| "Pending"/,
  "First Circle invite copy must not export a fake Pending GSN ID."
);

assertContains(
  "src/pages/JoinApprovalPage.tsx",
  /\{gmfnId \|\| "Not issued yet"\}/,
  "Join Approval must show an honest missing-GSN-ID label after approval when the issued ID is not present yet."
);

assertNotContains(
  "src/pages/JoinApprovalPage.tsx",
  /Awaiting issue/,
  "Join Approval must not display stale issue-tracking language for missing GSN IDs."
);

assertNotContains(
  "src/pages/MemberActivationPage.tsx",
  /session token/i,
  "Member Activation fallback copy must explain sign-in recovery without exposing token language."
);

assertNotContains(
  "src/pages/ProfilePage.tsx",
  /Backend profile storage/i,
  "Profile save copy must not expose backend-storage language to users."
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
