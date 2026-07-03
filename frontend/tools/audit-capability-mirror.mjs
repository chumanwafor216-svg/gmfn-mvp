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

function assertTextExcludes(file, value, message) {
  const text = readRepo(file);
  if (text.includes(value)) {
    findings.push({ file, message, text: value });
  }
}

const capabilityTitles = [
  "Release Before Payment",
  "Evidence-Backed Buying and Selling",
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
  "Institutional Community Domain",
];

for (const title of capabilityTitles) {
  assertTextIncludes(
    "frontend/src/lib/gmfnCapabilities.ts",
    `title: "${title}"`,
    "The capability registry must keep the full 23-capability mirror."
  );

  assertTextIncludes(
    "docs/GSN_DOCUMENT_TO_SYSTEM_GAP_REVIEW_2026-06-26.md",
    title,
    "The document-to-system gap review must include every capability."
  );

  assertTextIncludes(
    "frontend/tools/generate-static-gsn-pdfs.py",
    `"${title}"`,
    "The public executive-summary PDF generator must mirror the exact 23-capability registry titles."
  );
}

for (const value of [
  "things GSN does",
  "Commitment Builder",
  "Institutional Community Domain",
  "Boundary: API-paid verification",
]) {
  assertTextIncludes(
    "frontend/tools/generate-static-gsn-pdfs.py",
    value,
    "The public executive summary PDF generator must mirror all 23 GSN capabilities and keep the paid-verification boundary."
  );
}

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /GSN Capability Map[\s\S]*?See the problems GSN solves, the tools that solve them, and where[\s\S]*?each tool lives in the app/,
  "The public and signed-in My GSN guides must use the institutional capability-map heading."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /GSN Capability Map[\s\S]*?This map explains capability; it is[\s\S]*?not proof[\s\S]*?member[\s\S]*?shop[\s\S]*?payout[\s\S]*?paid verification[\s\S]*?protected[\s\S]*?trade release/,
  "The signed-in My GSN and I capability map must keep an institutional boundary against overclaiming live approvals, payout, paid verification, or protected trade release."
);

for (const value of [
  "selectedCapabilityId",
  "selectedCapability",
  "capabilitySearch",
  "capabilityCategory",
  "CAPABILITY_MAP_CATEGORIES",
  'id="my-gmfn-capability-select"',
  'id="my-gmfn-capability-search"',
  'id="my-gmfn-capability-category"',
  "Choose capability",
  "{item.id}. {item.title}",
]) {
  assertTextIncludes(
    "frontend/src/pages/MyGMFNAndIPage.tsx",
    value,
    "The signed-in My GSN and I capability map must provide a native dropdown plus one focused capability card on phone instead of exposing all capability cards at once."
  );
}

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /data-my-gmfn-selected-capability="true"[\s\S]*selectedCapabilityDetail\.helps[\s\S]*Problem it solves[\s\S]*GSN tools involved[\s\S]*Where to open it[\s\S]*What evidence it creates/,
  "The signed-in My GSN and I capability map must show one selected institutional card with problem, tool, location, and evidence fields."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /stepCapability[\s\S]*Show previous GSN capability[\s\S]*Previous[\s\S]*Show next GSN capability[\s\S]*Next/,
  "The signed-in My GSN and I capability map must let readers move backward and forward through capabilities without reopening the dropdown."
);

for (const value of [
  "publicCapabilityId",
  "publicSelectedCapability",
  "showAllPublicCapabilities",
  'data-my-gmfn-public-selected-capability="true"',
  "stepPublicCapability",
  "Show previous public GSN capability",
  "Show next public GSN capability",
  "my-gmfn.public.toggle-all-capabilities",
]) {
  assertTextIncludes(
    "frontend/src/pages/MyGMFNAndIPage.tsx",
    value,
    "The public My GSN and I guide must default to one focused capability with previous/next controls and keep the full capability list optional."
  );
}

for (const value of [
  "23 things GSN does",
  "{capabilityCount} things GSN does",
  "{GMFN_CAPABILITY_COUNT} things GSN does",
]) {
  assertTextExcludes(
    "frontend/src/pages/MyGMFNAndIPage.tsx",
    value,
    "The My GSN page must not drift back to childish things-GSN-does wording."
  );
}

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /publicSelectedCapability \? \([\s\S]*data-my-gmfn-public-selected-capability="true"[\s\S]*publicCapabilityLine\(publicSelectedCapability\)[\s\S]*showAllPublicCapabilities \? \(/,
  "The public My GSN and I guide must show a selected reader card before the optional full capability list."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /finance: routeTarget\("finance"[\s\S]*label: "Finance"[\s\S]*Money records and payment evidence[\s\S]*icon: "financeInstitution"[\s\S]*debugId: "my-gmfn\.route\.finance"/,
  "The signed-in My GSN and I app route list must include Finance with the finance-institution icon and a stable debug id."
);

assertTextExcludes(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  "22 things GSN can do for you",
  "The public My GSN and I guide must not drift back to casual 22-capability wording."
);

assertTextExcludes(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  "Things GSN Can Do For You",
  "The signed-in My GSN and I guide must not drift back to casual capability-map wording."
);

assertContains(
  "frontend/src/lib/gmfnCapabilities.ts",
  /export const GMFN_CAPABILITY_COUNT = GMFN_CAPABILITIES\.length;/,
  "The capability count must remain derived from the registry, not hardcoded."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /5: "Gives approved shop updates a clearer place to be seen without pretending visibility is verification\."[\s\S]*?8: "Turns support requests into recorded drafts with amount, purpose, duration, supporters, and fit signals\."[\s\S]*?17: "Gives one shop a public home for shelf items, spotlight, WhatsApp, verification, and trust signals\."[\s\S]*?18: "Helps informal service work become visible through demand, evidence, community context, and follow-up\."[\s\S]*?23: "Gives schools, unions, churches, cooperatives, markets, and associations a structured domain/,
  "The capability visible card lines must avoid implying that public visibility, lending, shop presence, service work, or institutional domains are already verified trust."
);

for (const oldLine of [
  "Helps trusted value get seen first.",
  "Turns visible trust into people-backed lending confidence.",
  "Gives one trusted identity one wider shop presence.",
  "Makes informal service work more visible and trusted.",
]) {
  assertTextExcludes(
    "frontend/src/pages/MyGMFNAndIPage.tsx",
    oldLine,
    "The visible 22-capability card lines must not overclaim trust, lending, or service verification."
  );
}

for (const oldPdfLine of [
  "trusted commerce",
  "trusted members to stand behind another person",
]) {
  assertTextExcludes(
    "frontend/tools/generate-static-gsn-pdfs.py",
    oldPdfLine,
    "The public executive-summary PDF source must not use blanket trusted-commerce or trusted-member wording."
  );
}

assertTextIncludes(
  "frontend/tools/generate-static-gsn-pdfs.py",
  "evidence-backed commerce",
  "The public executive-summary PDF source must use evidence-backed commerce wording."
);

assertTextIncludes(
  "frontend/tools/generate-static-gsn-pdfs.py",
  "eligible community members to stand behind another person",
  "The public executive-summary PDF source must frame supporter standing as eligibility, not blanket trusted-member certification."
);

assertContains(
  "docs/GSN_99_PERCENT_MIRROR_COMPLETION_PLAN_2026-06-26.md",
  /paid\/API verification integrations[\s\S]*?automatic bank payout[\s\S]*?protected trade release-before-payment/,
  "The 99 percent mirror plan must keep the pilot truth about paid/API verification, automatic payout, and protected trade release."
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
  "frontend/src/pages/DashboardPage.tsx",
  /Your Focus Commitments[\s\S]*?Turn savings, business, repayment, or service targets into[\s\S]*?visible follow-through[\s\S]*?Two active commitments maximum keeps execution clear and reviewable\./,
  "Dashboard Focus Commitments must present Commitment Builder as visible execution discipline, not only a generic task list."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /ROSCA linked responsibilities[\s\S]*?does not create personal commitment evidence by itself\./,
  "Dashboard Focus Commitments must explain that ROSCA-linked responsibilities are shown there without overstating personal commitment evidence."
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
