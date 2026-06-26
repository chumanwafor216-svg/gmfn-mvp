/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const source = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(index, message, text = "Expected pattern was not found.") {
  findings.push({
    file: marketplaceFile,
    line: index >= 0 ? lineAt(index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  addFinding(-1, message);
}

function sectionBetween(startPattern, endPattern) {
  const start = source.search(startPattern);
  if (start === -1) return { text: "", start: -1 };
  const rest = source.slice(start);
  const end = rest.search(endPattern);
  return {
    text: end === -1 ? rest : rest.slice(0, end),
    start,
  };
}

assertContains(
  /case "support":[\s\S]*?<path d="M5\.5 13\.5h3\.3l2\.3 2\.2[\s\S]*?<path d="M8\.2 6\.9c0-1\.4/,
  "Support Requests must use the stable guided-help pictogram, not the old generic people mark."
);

assertContains(
  /debugId="marketplace\.tile\.support"[\s\S]*?aria-label="Open Support Requests, guarantors and loans"[\s\S]*?openMarketplaceSection\(\s*event,\s*"support",\s*"marketplace-loans-support"\s*\)[\s\S]*?<MarketplaceGlyph name="support"[\s\S]*?Support & Loans[\s\S]*?Get help and manage loans[\s\S]*?Support Requests[\s\S]*?Loan Process/,
  "Support & Loans grouped card must stay a guided support launcher and open only the support section."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?support: "marketplace-loans-support"/,
  "Support Requests section anchor must remain marketplace-loans-support."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"[\s\S]*?function touchedMarketplaceSectionState[\s\S]*?\[key\]: true/,
  "Opening Support Requests must focus only the support lane, not visually open Members too."
);

assertContains(
  /const isMoneyOutSupportFlow =[\s\S]*?routeSupportFlow === "money-out" && routeFocus === "support"[\s\S]*?if \(hash !== "marketplace-loans-support" && !isMoneyOutSupportFlow\) return[\s\S]*?setSectionsOpen\(focusedMarketplaceSectionState\("support"\)\)[\s\S]*?scheduleMarketplaceSectionScroll\("marketplace-loans-support", \{[\s\S]*?force: true[\s\S]*?\}\)/,
  "Money Out over-balance handoff must land inside the Support Requests lane, not leave the user on the general marketplace surface."
);

assertContains(
  /const storedWithdrawalTask = readLocalJSON<PersistedWithdrawalTask \| null>\([\s\S]*?withdrawalTaskStorageKey\(activeCommunityId, currentGmfnId\)[\s\S]*?const storedAmount = safeStr\(storedWithdrawalTask\?\.amountInput\)[\s\S]*?const defaultPurpose = storedAmount \? "Withdrawal support" : ""[\s\S]*?setLoanAmount\([\s\S]*?storedAmount[\s\S]*?setLoanPurpose\([\s\S]*?storedNote \|\| defaultPurpose/,
  "Money Out support handoff must prefill the Support Requests amount and purpose when stored handoff data exists."
);

assertContains(
  /function handleStartLoanDraft\(\)[\s\S]*?if \(!safeStr\(loanRepaymentCadence\)\)[\s\S]*?Choose how you plan to repay[\s\S]*?if \(!safeStr\(loanPurpose\)\)[\s\S]*?State what the support is for\./,
  "Support Requests must require a purpose before creating a backend support draft."
);

const supportSection = sectionBetween(
  /id="marketplace-loans-support"/,
  /<\/MarketplaceShell>/
);

if (!supportSection.text) {
  addFinding(-1, "Support Requests detail section must exist before the shell closes.");
} else {
  const actionIds = [
    ...supportSection.text.matchAll(/debugId="(marketplace\.support\.[^"]+)"/g),
  ].map((match) => match[1]);
  const expectedStaticActionIds = [
    "marketplace.support.toggle",
    "marketplace.support.start-request",
    "marketplace.support.refresh-fit",
    "marketplace.support.cancel-draft",
    "marketplace.support.deeper-pages.summary",
    "marketplace.support.loan-readiness",
    "marketplace.support.loan-suggestions",
    "marketplace.support.loan-workbench",
    "marketplace.support.finance",
    "marketplace.support.full-loans",
    "marketplace.support.send-guarantor-requests",
  ];

  for (const debugId of expectedStaticActionIds) {
    if (!actionIds.includes(debugId)) {
      addFinding(
        supportSection.start,
        "Support Requests detail section is missing an expected action.",
        debugId
      );
    }
  }

  [
    /Support Requests/,
    /Ask this marketplace for support when your withdrawal needs[\s\S]*?backing/,
    /What this support area does/,
    /ask the selected marketplace for support/,
    /Selected marketplace[\s\S]*?ID: \{activeCommunityId \|\| "not ready"\}[\s\S]*?GSN ID: \{currentGmfnId \|\| "not ready"\}/,
    /From Money Out/,
    /This withdrawal needs support here[\s\S]*?Requested:[\s\S]*?Support needed:/,
    /Step \{step\}/,
    /Start request[\s\S]*?Amount, duration, repayment, purpose/,
    /Check supporters[\s\S]*?GSN shows who can back the request/,
    /Send requests[\s\S]*?Send only after the draft is ready/,
    /Start a support request/,
    /Enter the amount, duration, repayment plan, and purpose[\s\S]*?creates one support draft/,
    /No draft yet/,
    /Supporters: \{requiredGuarantorCount \|\| "not checked"\}/,
    /Fit: \{suggestedSupporters\.length\}/,
    /Repayment plan[\s\S]*?marketplaceFieldTouchProps\("marketplace\.support\.repayment-cadence"\)[\s\S]*?Weekly[\s\S]*?Every 2 weeks[\s\S]*?Monthly/,
    /Agreement preview[\s\S]*?Requested[\s\S]*?Service fee[\s\S]*?You receive[\s\S]*?Repay by[\s\S]*?Plan: \{agreementRepaymentCadence\}/,
    /Support window[\s\S]*?Supporters have a response window[\s\S]*?expire unanswered requests[\s\S]*?release locked[\s\S]*?support after the grace window/,
    /\{loanDraftId \? \([\s\S]*?debugId="marketplace\.support\.deeper-pages\.summary"[\s\S]*?More support tools/,
    /debugId="marketplace\.support\.start-request"[\s\S]*?handleStartLoanDraft/,
    /debugId="marketplace\.support\.loan-readiness"[\s\S]*?Check readiness/,
    /debugId="marketplace\.support\.loan-suggestions"[\s\S]*?Find supporters/,
    /debugId="marketplace\.support\.loan-workbench"[\s\S]*?Support workbench/,
    /debugId="marketplace\.support\.full-loans"[\s\S]*?Full support view/,
    /debugId="marketplace\.support\.loan-readiness"[\s\S]*?openMarketplaceCta\(event, "loanReadiness"\)/,
    /debugId="marketplace\.support\.loan-suggestions"[\s\S]*?openMarketplaceCta\(event, "loanSuggestions"\)/,
    /debugId="marketplace\.support\.loan-workbench"[\s\S]*?openMarketplaceCta\(event, "loanWorkbench"\)/,
    /debugId="marketplace\.support\.finance"[\s\S]*?openMarketplaceCta\(event, "finance"\)/,
    /debugId="marketplace\.support\.full-loans"[\s\S]*?openMarketplaceCta\(event, "loans"\)/,
    /debugId="marketplace\.support\.send-guarantor-requests"[\s\S]*?showGuarantorRequestBlockedNotice/,
    /firstTruthy\(item\?\.purpose, item\?\.title, "Support item"\)/,
    /Requested by: \$\{item\.borrower_name\}/,
    /Supporter: \$\{item\.guarantor_name\}/,
  ].forEach((pattern) => {
    if (!pattern.test(supportSection.text)) {
      addFinding(
        supportSection.start,
        "Support Requests detail section is missing an expected guided support element.",
        pattern.toString()
      );
    }
  });

  if (/(Owner Shop|Trusted Trade|Trust Passport|TrustSlip|CCI|ROSCA|Money Pool)/.test(supportSection.text)) {
    addFinding(
      supportSection.start,
      "Support Requests detail section must not expose other major lane responsibilities.",
      "Support may link to Finance and Loans, but must not expose shop, trade, trust, ROSCA, or Money Pool lane content."
    );
  }

  if (/(Loan and support item|No visible loan or support item|Borrower:|Guarantor:)/.test(supportSection.text)) {
    addFinding(
      supportSection.start,
      "Support Requests visible item cards must use simple support wording, not borrower/guarantor labels.",
      "Use Support item, Requested by, and Supporter."
    );
  }
}

if (findings.length > 0) {
  console.error("Marketplace Support Requests lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace Support Requests lane audit passed.");
