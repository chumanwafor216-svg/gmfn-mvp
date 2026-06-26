/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendRoot, "..");

const findings = [];

function readRepo(relativePath) {
  const absolutePath = join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    findings.push({
      file: relativePath,
      message: "Expected mirror file was not found.",
      text: absolutePath,
    });
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function assertContains(file, pattern, message) {
  const text = readRepo(file);
  if (!pattern.test(text)) {
    findings.push({ file, message, text: "Expected pattern was not found." });
  }
}

function assertTextIncludes(file, value, message) {
  const text = readRepo(file);
  if (!text.includes(value)) {
    findings.push({ file, message, text: value });
  }
}

const capabilityTitles = [
  "Release Before Payment",
  "Trusted Buying and Selling",
  "Cross-Community Trade",
  "Fraud Reduction Before Action",
  "Spotlight Visibility",
  "Reputation-Based Visibility",
  "Marketplace Presence Across Communities",
  "People-Backed Loans",
  "Supporting Others",
  "Emergency Support",
  "Diaspora Trust Bridge",
  "Trust Savings (ROSCA Support)",
  "Contribution Tracking",
  "Continuity Across Distance",
  "Portable Trust Identity",
  "Reputation Mobility",
  "One Global Shop",
  "Service Economy Participation",
  "Trust-Based Hiring",
  "Demand Box",
  "Community Economic Power",
  "Commitment Builder",
];

for (const title of capabilityTitles) {
  assertTextIncludes(
    "frontend/src/lib/gmfnCapabilities.ts",
    `title: "${title}"`,
    "The capability registry must keep the full 22-capability mirror."
  );

  assertTextIncludes(
    "docs/GSN_DOCUMENT_TO_SYSTEM_GAP_REVIEW_2026-06-26.md",
    title,
    "The document-to-system gap review must include every capability."
  );
}

assertContains(
  "frontend/src/lib/gmfnCapabilities.ts",
  /export const GMFN_CAPABILITY_COUNT = GMFN_CAPABILITIES\.length;/,
  "The capability count must remain derived from the registry, not hardcoded."
);

assertContains(
  "docs/GSN_99_PERCENT_MIRROR_COMPLETION_PLAN_2026-06-26.md",
  /Automatic bank payout and protected trade release are planned integrations, not something we should claim as fully live until tested end to end\./,
  "The 99 percent mirror plan must keep the pilot truth about automatic payout and protected trade release."
);

assertContains(
  "docs/GSN_DOCUMENT_TO_SYSTEM_GAP_REVIEW_2026-06-26.md",
  /The uploaded documents are not an exact replica of the current GSN system\.[\s\S]*?The MVP is also deeper than the documents in practical finance plumbing\./,
  "The gap review must preserve the devil's-advocate truth: documents and app are close, but not exact replicas."
);

assertContains(
  "docs/GSN_DOCUMENT_TO_SYSTEM_GAP_REVIEW_2026-06-26.md",
  /Backend loan creation already has amount, duration, repayment cadence, service fee, net disbursed, guarantor pool, platform revenue, guarantors required, pool-used calculation, commitment trust event, guarantor suggestions, guarantor requests, approvals, repayment schedule, repayment expected payments, and stale support expiry\./,
  "The gap review must keep the confirmed backend support-engine truth."
);

assertContains(
  "docs/GSN_99_PERCENT_MIRROR_COMPLETION_PLAN_2026-06-26.md",
  /The real support email must be configured before exposing it publicly\./,
  "The mirror plan must not allow a fake public support email."
);

assertContains(
  "frontend/src/components/GsnSupportContact.tsx",
  /VITE_GSN_SUPPORT_EMAIL[\s\S]*?if \(!email\) return null;/,
  "The support contact bridge must hide until a real support email is configured."
);

assertContains(
  "frontend/.env.production.example",
  /VITE_GSN_SUPPORT_EMAIL=/,
  "The production env example must expose the real-support-email configuration slot."
);

for (const [pattern, label] of [
  [/path="trust"\s+element=\{<TrustScorePage \/>/, "Trust Passport"],
  [/path="trust-slip"\s+element=\{<TrustSlipPage \/>/, "TrustSlip"],
  [/path="finance"\s+element=\{<FinancePage \/>/, "Finance"],
  [/path="payment\/pool"\s+element=\{<PaymentInstructionsPage \/>/, "Money In"],
  [/path="withdrawal-instructions"\s+element=\{<WithdrawalInstructionsPage \/>/, "Money Out"],
  [/path="loans"\s+element=\{<LoansPage \/>/, "Loans"],
  [/path="marketplace"\s+element=\{<MarketplacePage \/>/, "Marketplace"],
  [/path="demand-box"\s+element=\{<DemandBoxPage \/>/, "Demand Box"],
  [/path="shop"\s+element=\{<PreserveRedirect to=\{APP_ROUTES\.SHOP_ME\} \/>/, "Shop"],
]) {
  assertContains(
    "frontend/src/App.tsx",
    pattern,
    `${label} route must remain present for the institutional capability mirror.`
  );
}

if (findings.length > 0) {
  console.error("Capability mirror audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Capability mirror audit passed.");
