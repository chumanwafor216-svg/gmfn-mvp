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
    /Start one guided support request inside this selected/,
    /What this support area does/,
    /one guided community request/,
    /Step \{step\}/,
    /Start request[\s\S]*?Enter amount, days, and reason here/,
    /Check fit[\s\S]*?Review guarantor need and suggested supporters/,
    /Continue flow[\s\S]*?Open readiness or workbench only when needed/,
    /Start a support request/,
    /Start one request, then let GSN show the next fit or guarantor[\s\S]*?Deeper loan pages stay behind details/,
    /No draft yet/,
    /Guarantors: \{requiredGuarantorCount \|\| "not checked"\}/,
    /Fit: \{suggestedSupporters\.length\}/,
    /Repayment plan[\s\S]*?marketplaceFieldTouchProps\("marketplace\.support\.repayment-cadence"\)[\s\S]*?Weekly[\s\S]*?Every 2 weeks[\s\S]*?Monthly/,
    /Agreement preview[\s\S]*?Requested[\s\S]*?Service fee[\s\S]*?You receive[\s\S]*?Repay by[\s\S]*?Plan: \{agreementRepaymentCadence\}/,
    /debugId="marketplace\.support\.deeper-pages\.summary"[\s\S]*?Deeper support pages/,
    /debugId="marketplace\.support\.start-request"[\s\S]*?handleStartLoanDraft/,
    /debugId="marketplace\.support\.loan-readiness"[\s\S]*?openMarketplaceCta\(event, "loanReadiness"\)/,
    /debugId="marketplace\.support\.loan-suggestions"[\s\S]*?openMarketplaceCta\(event, "loanSuggestions"\)/,
    /debugId="marketplace\.support\.loan-workbench"[\s\S]*?openMarketplaceCta\(event, "loanWorkbench"\)/,
    /debugId="marketplace\.support\.finance"[\s\S]*?openMarketplaceCta\(event, "finance"\)/,
    /debugId="marketplace\.support\.full-loans"[\s\S]*?openMarketplaceCta\(event, "loans"\)/,
    /debugId="marketplace\.support\.send-guarantor-requests"[\s\S]*?showGuarantorRequestBlockedNotice/,
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
