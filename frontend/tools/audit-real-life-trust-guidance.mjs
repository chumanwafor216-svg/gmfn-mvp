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
      text: "Expected real-life trust guidance pattern was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);

  if (pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Forbidden real-life trust guidance pattern was found.",
    });
  }
}

assertContains(
  "src/lib/realLifeTrustGuidance.ts",
  /RealLifeTrustScenario[\s\S]*?join-request[\s\S]*?pending-approval[\s\S]*?no-community-home[\s\S]*?borrowing-readiness[\s\S]*?finance-readiness[\s\S]*?shop-control-readiness[\s\S]*?trust-passport-repair[\s\S]*?marketplace-access[\s\S]*?marketplace-money-readiness[\s\S]*?marketplace-support-readiness[\s\S]*?marketplace-trade-boundary[\s\S]*?marketplace-public-link-readiness[\s\S]*?support-request/,
  "Real-life trust guidance scenarios must stay in a shared frontend library."
);

assertContains(
  "src/lib/realLifeTrustGuidance.ts",
  /unbanked and underbanked[\s\S]*?community evidence[\s\S]*?bank file may not show/,
  "The shared guidance must preserve the unbanked and underbanked real-life trust rationale."
);

assertContains(
  "src/lib/realLifeTrustGuidance.ts",
  /GSN records evidence and membership status[\s\S]*?The community still decides admission/,
  "Join guidance must keep admission authority with the community."
);

assertContains(
  "src/lib/realLifeTrustGuidance.ts",
  /not a loan approval, bank account, or government identity/,
  "Community Home guidance must keep the finance and government-ID boundary."
);

assertNotContains(
  "src/lib/realLifeTrustGuidance.ts",
  /\b(?:guaranteed approval|credit approved|bank verified|government verified)\b/i,
  "Real-life trust guidance must not overpromise approval, banking, or government verification."
);

assertNotContains(
  "src/lib/realLifeTrustGuidance.ts",
  /\b(?:GSN holds funds|GSN guarantees transfer|delivery guaranteed|escrow secured|manual trust edit)\b/i,
  "Real-life trust guidance must not overpromise custody, transfer, delivery, escrow, or manual trust editing."
);

assertContains(
  "src/components/RealLifeMeaningGuide.tsx",
  /data-gsn-real-life-meaning/,
  "RealLifeMeaningGuide must expose a stable real-life meaning marker."
);

assertContains(
  "src/components/RealLifeMeaningGuide.tsx",
  /Meaning[\s\S]*?Why it matters[\s\S]*?First step[\s\S]*?If skipped/,
  "RealLifeMeaningGuide must render the four-part real-life meaning structure."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("join-request"[\s\S]*?resolvedCommunityName/,
  "Join Entry must show real-life meaning before a membership request is sent."
);

assertContains(
  "src/pages/JoinRequestPendingPage.tsx",
  /RealLifeMeaningGuide[\s\S]*?tone="dark"[\s\S]*?getRealLifeTrustGuidance\("pending-approval"[\s\S]*?communityName/,
  "Pending Approval must explain the real-life meaning of the waiting state."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("no-community-home"\)/,
  "Empty Community Home must explain why community context comes before deeper tools."
);

assertContains(
  "src/pages/LoanReadinessPage.tsx",
  /RealLifeMeaningGuide[\s\S]*?tone="dark"[\s\S]*?getRealLifeTrustGuidance\("borrowing-readiness"\)/,
  "Loan Readiness must explain the real-life boundary before support-readiness decisions."
);

assertContains(
  "src/pages/SupportPage.tsx",
  /RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("support-request"\)/,
  "Help Desk must explain the real-life value of creating a support evidence trail."
);

assertContains(
  "src/pages/IdentityIntegrityPage.tsx",
  /RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("identity-evidence"\)/,
  "Identity & Integrity must explain how evidence creates user trust without overpromising verification."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /No community is active in Marketplace yet[\s\S]*?RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("marketplace-access"\)[\s\S]*?debugId="marketplace\.empty\.community-home"/,
  "Marketplace blocked access must explain the real-life meaning of choosing a community before commerce tools."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("finance-readiness"\)[\s\S]*?Choose what you need now/,
  "Finance must explain real-life finance evidence boundaries before users choose money lanes."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /identityLockNotice[\s\S]*?RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("shop-control-readiness"\)/,
  "Shop Control identity-lock blockers must explain why protected shop actions wait for identity confidence."
);

assertContains(
  "src/pages/TrustScorePage.tsx",
  /Repair or Next Step[\s\S]*?RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("trust-passport-repair"\)[\s\S]*?First thing to check/,
  "Trust Passport repair must explain that repair strengthens evidence instead of manually editing trust."
);

assertContains(
  "src/pages/marketplace/MarketplaceMoneySection.tsx",
  /!communitySettlementReady \|\| !payoutReady[\s\S]*?RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("marketplace-money-readiness"\)/,
  "Marketplace Money blockers must explain rail and payout readiness before money movement."
);

assertContains(
  "src/pages/marketplace/MarketplaceSupportSection.tsx",
  /supportLoanDeskOpen[\s\S]*?RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("marketplace-support-readiness"\)[\s\S]*?Start a support request/,
  "Marketplace Support lane must explain evidence readiness before users share support pressure."
);

assertContains(
  "src/pages/marketplace/MarketplaceTradeEvidenceSection.tsx",
  /Trade Evidence[\s\S]*?RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("marketplace-trade-boundary"\)[\s\S]*?marketplace\.trade\.evidence-module/,
  "Marketplace Trade Evidence lane must explain trade evidence boundaries before trade recording."
);

assertContains(
  "src/pages/marketplace/MarketplaceToolsSection.tsx",
  /Access & Public Links[\s\S]*?RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("marketplace-public-link-readiness"\)[\s\S]*?marketplace\.links\.choose\.verify/,
  "Marketplace Links/Repost lane must explain scoped public-link readiness before sharing outward."
);

if (findings.length > 0) {
  console.error("Real-life trust guidance audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Real-life trust guidance audit passed.");
