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
  "Recognised Community Identity",
  "Governed Membership and Roles",
  "Invite and QR Entry",
  "Official Announcements and Response Evidence",
  "Meetings, Attendance and Decision Memory",
  "TrustPassport and TrustSlip Evidence",
  "Community Marketplace and Public Shop",
  "DemandBox and Ask Community",
  "Support, Welfare and Contribution Records",
  "Opportunity and Activity Analytics",
  "Documents, Downloads and Bridges",
  "Continuity, Handover and Institutional Memory",
];

for (const title of capabilityTitles) {
  assertTextIncludes(
    "frontend/src/lib/gmfnCapabilities.ts",
    `title: "${title}"`,
    "The capability registry must keep the GSN Core Capabilities source set."
  );

  assertTextIncludes(
    "frontend/tools/generate-static-gsn-pdfs.py",
    `"${title}"`,
    "The public executive-summary PDF generator must mirror the GSN Core Capabilities titles."
  );

  assertTextIncludes(
    "docs/community-setup-pack/GSN_CORE_CAPABILITY_SET_2026-09-14.md",
    title,
    "The setup pack must include each GSN Core Capability title."
  );

  assertTextIncludes(
    "docs/community-setup-pack/core_capability_set.json",
    `"title": "${title}"`,
    "The machine-readable core capability source must include each title."
  );
}

for (const oldTitle of [
  "Release Before Payment",
  "Evidence-Backed Buying and Selling",
  "Cross-Community Trade",
  "Fraud Reduction Before Action",
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
  "Community Economic Power",
  "Institutional Community Domain",
]) {
  assertTextExcludes(
    "frontend/src/lib/gmfnCapabilities.ts",
    `title: "${oldTitle}"`,
    "The public/app-facing registry must not drift back to the retired 23-title mirror."
  );

  assertTextExcludes(
    "frontend/tools/generate-static-gsn-pdfs.py",
    `"${oldTitle}"`,
    "The public executive-summary PDF generator must not drift back to the retired 23-title mirror."
  );
}

for (const value of [
  "GSN Core Capabilities",
  "Decision guide",
  "TrustPassport and TrustSlip Evidence",
  "Opportunity and Activity Analytics",
  "Boundary: API-paid verification",
]) {
  assertTextIncludes(
    "frontend/tools/generate-static-gsn-pdfs.py",
    value,
    "The public executive summary PDF generator must mirror the GSN Core Capabilities and keep the paid-verification boundary."
  );
}

assertContains(
  "frontend/src/lib/gmfnCapabilities.ts",
  /export const GMFN_CAPABILITY_COUNT = GMFN_CAPABILITIES\.length;/,
  "The capability count must remain derived from the registry, not hardcoded."
);

assertContains(
  "frontend/src/lib/gmfnCapabilities.ts",
  /Recognised Community Identity[\s\S]*?Governed Membership and Roles[\s\S]*?Invite and QR Entry[\s\S]*?Continuity, Handover and Institutional Memory[\s\S]*?safeStr\(capability\.decisionGuideLine\)/,
  "The shared registry must provide the stable GSN Core Capabilities and the dashboard guide helper must prefer their decision lines."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /GSN Decision Guide[\s\S]*?real-world decisions GSN helps people make[\s\S]*?why those[\s\S]*?decisions are risky[\s\S]*?which tools cooperate[\s\S]*?evidence[\s\S]*?remains afterwards/,
  "The public and signed-in My GSN guides must keep the institutional decision-guide heading."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /data-my-gmfn-capabilities-shell="collapsed"[\s\S]*?GSN Core Capabilities[\s\S]*?data-my-gmfn-selected-capability="true"[\s\S]*?data-my-gmfn-setup-pack-shell="collapsed"[\s\S]*?GSN Setup Pack[\s\S]*?Full bank stays behind the setup pack[\s\S]*?data-my-gmfn-major-domains-shell="collapsed"/,
  "The signed-in command-centre guide must show the core set first and keep the full bank behind the setup-pack disclosure."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /data-my-gmfn-selected-capability="true"[\s\S]*selectedCapabilityDetail\.summary[\s\S]*The real-world problem[\s\S]*selectedCapabilityDetail\.realWorld[\s\S]*Why it is dangerous[\s\S]*selectedCapabilityDetail\.danger[\s\S]*How GSN changes the decision[\s\S]*selectedCapabilityDetail\.decision[\s\S]*Which GSN tools cooperate[\s\S]*selectedCapabilityDetail\.tools[\s\S]*Where you use them[\s\S]*selectedCapabilityDetail\.where[\s\S]*Evidence created[\s\S]*selectedCapabilityDetail\.evidence/,
  "The signed-in My GSN and I core capability card must keep the decision-story shape."
);

for (const value of [
  "selectedCapabilityId",
  "selectedCapability",
  "capabilitySearch",
  "capabilityCategory",
  "CAPABILITY_MAP_CATEGORIES",
  'data-my-gmfn-decision-guide-tools="collapsed"',
  "my-gmfn.profile.decision-guide-tools",
  "Find another decision",
  'id="my-gmfn-capability-select"',
  'id="my-gmfn-capability-search"',
  'id="my-gmfn-capability-category"',
  "Choose capability",
  "{item.id}. {item.title}",
  "my-gmfn.profile.setup-pack",
  "GSN_CORE_CAPABILITY_SET_2026-09-14.pdf",
  "GSN_IN_REAL_LIFE_MASTER_CAPABILITY_BANK.pdf",
]) {
  assertTextIncludes(
    "frontend/src/pages/MyGMFNAndIPage.tsx",
    value,
    "The signed-in My GSN and I guide must provide focused core capability controls plus controlled setup-pack access."
  );
}

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
    "The public My GSN and I guide must default to one focused core capability with previous/next controls and keep the full core list optional."
  );
}

for (const value of [
  "numbered things GSN does",
  "{capabilityCount} things GSN does",
  "{GMFN_CAPABILITY_COUNT} things GSN does",
  "numbered things GSN can do for you",
]) {
  assertTextExcludes(
    "frontend/src/pages/MyGMFNAndIPage.tsx",
    value,
    "The My GSN page must not drift back to fixed-number or childish capability wording."
  );
}

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  /1: "Gives a real group a recognised GSN identity[\s\S]*?6: "Lets members carry bounded TrustPassport[\s\S]*?10: "Helps leaders read attention[\s\S]*?12: "Keeps community identity/,
  "The visible core capability lines must protect the new salient GSN model."
);

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

assertContains(
  "docs/community-setup-pack/GSN_CORE_CAPABILITY_SET_2026-09-14.md",
  /This document replaces the old public habit of presenting GSN as a fixed-number capability list\.[\s\S]*?The 44-module `GSN in Real Life` bank remains useful, but it should not be the default public front\./,
  "The setup pack must record the fixed-23 retirement and controlled full-bank boundary."
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
  [/path="demand-box"\s+element=\{<DemandBoxPage \/>/, "DemandBox"],
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
