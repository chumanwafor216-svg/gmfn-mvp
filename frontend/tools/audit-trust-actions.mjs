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
  /debugId="trust-slip-verify\.copy-code"[\s\S]*?debugId="trust-slip-verify\.copy-link"[\s\S]*?debugId="trust-slip-verify\.copy-gmfn-id"[\s\S]*?debugId="trust-slip-verify\.route\.trust"/,
  "TrustSlip Verify page actions must keep traceable copy and Trust Passport actions."
);

assertContains(
  "src/pages/TrustSlipPage.tsx",
  /debugId="trust-slip\.community-confirmation\.request"[\s\S]*?debugId="trust-slip\.community-confirmation\.open-community-record"[\s\S]*?debugId="trust-slip\.community-confirmation\.open-outcome"/,
  "TrustSlip community-confirmation actions must stay traceable and grouped."
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
