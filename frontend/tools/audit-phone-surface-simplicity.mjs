/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  pageTopNav: "src/components/PageTopNav.tsx",
  supportContact: "src/components/GsnSupportContact.tsx",
  loans: "src/pages/LoansPage.tsx",
  moneyIn: "src/pages/PaymentInstructionsPage.tsx",
  moneyOut: "src/pages/WithdrawalInstructionsPage.tsx",
  adminTrustEvents: "src/pages/AdminTrustEventsPage.tsx",
  adminIncompleteLoans: "src/pages/AdminIncompleteLoansPage.tsx",
  adminIdentityRisk: "src/pages/AdminIdentityRiskPage.tsx",
  adminCommunityOwnership: "src/pages/AdminCommunityOwnershipPage.tsx",
  revenueAllocation: "src/pages/RevenueAllocationPage.tsx",
  exposureAdmin: "src/pages/ExposureAdminPage.tsx",
  trustAnalytics: "src/pages/TrustAnalyticsPage.tsx",
  adminTrustGraph: "src/pages/AdminTrustGraphPage.tsx",
  systemOperations: "src/pages/SystemOperationsPage.tsx",
  communityConfirmationInbox: "src/pages/CommunityConfirmationInboxPage.tsx",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, relativePath]) => [
    key,
    readFileSync(join(frontendRoot, relativePath), "utf8"),
  ])
);
const findings = [];

function assertContains(key, pattern, message) {
  if (pattern.test(source[key])) return;
  findings.push({ file: files[key], message });
}

assertContains(
  "pageTopNav",
  /isAuthenticatedPhone[\s\S]*?location\.pathname\.startsWith\("\/app\/"\)[\s\S]*?if \(compactLinks\.length === 0\) return null;[\s\S]*?data-gmfn-page-top-nav="compact"/,
  "Authenticated phone routes must not repeat the app-shell title card when no route-local navigation remains."
);
assertContains(
  "pageTopNav",
  /const compactLinks = \[[\s\S]*?resolvedBackTo && resolvedBackLabel[\s\S]*?\.\.\.\(nextLinks \|\| \[\]\)[\s\S]*?\.\.\.\(utilityLinks \|\| \[\]\)/,
  "The compact phone row must preserve required back, next, and utility routes."
);
assertContains(
  "supportContact",
  /compact\?: boolean[\s\S]*?if \(compact\)[\s\S]*?stableHeight=\{44\}[\s\S]*?Email support/,
  "Shared phone support contact must collapse to one compact Email support action."
);
assertContains(
  "loans",
  /data-gmfn-loans-surface="primary"[\s\S]*?Active \$\{activeLoans\.length\}[\s\S]*?Waiting \$\{guarantorInbox\.length\}[\s\S]*?Request support/,
  "Loan Support phone hero must show only community state, two counts, and one primary request action."
);
assertContains(
  "loans",
  /\{!isCompact \|\| hasActiveSupportFocus \? \([\s\S]*?isCompact \? "More tools" : "More support tools"[\s\S]*?compact=\{isCompact\}/,
  "Loan Support must hide a calm phone focus card and keep secondary tools and help compact."
);
assertContains(
  "moneyIn",
  /<GsnSupportContact[\s\S]*?context="Money In"[\s\S]*?compact=\{isCompact\}/,
  "Money In must use the compact shared phone support action."
);
assertContains(
  "moneyOut",
  /<GsnSupportContact[\s\S]*?context="Money Out"[\s\S]*?compact=\{isCompact\}/,
  "Money Out must use the compact shared phone support action."
);
assertContains(
  "adminTrustEvents",
  /What needs review\?[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)[\s\S]*?A negative delta is a review signal, not proof of wrongdoing[\s\S]*?debugId="admin-trust-events\.deeper-analysis\.summary"[\s\S]*?Open deeper analysis/,
  "Admin Trust Events must keep one compact review summary and collapse secondary analysis destinations."
);
assertContains(
  "adminIncompleteLoans",
  /What needs attention\?[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)[\s\S]*?Locked support coverage is a recorded support position[\s\S]*?debugId="admin-incomplete-loans\.queue-tools\.summary"[\s\S]*?Queue tools/,
  "Admin Incomplete Support must keep one compact attention summary and collapse secondary queue tools."
);
assertContains(
  "adminIdentityRisk",
  /What needs review\?[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)[\s\S]*?not proof of fraud, wrongdoing, or duplicate identity[\s\S]*?debugId="admin-identity-risk\.guide\.summary"[\s\S]*?debugId="admin-identity-risk\.phone-review\.summary"[\s\S]*?debugId="admin-identity-risk\.reconcile\.summary"/,
  "Admin Identity Risk must keep one compact evidence summary and collapse guidance, recovery, and reconciliation controls."
);
assertContains(
  "adminCommunityOwnership",
  /data-gsn-community-ownership-summary="true"[\s\S]*?data-gsn-community-ownership-lane-chooser="true"[\s\S]*?debugId="admin-community-ownership\.lane-owner"[\s\S]*?debugId="admin-community-ownership\.lane-steward"[\s\S]*?debugId="admin-community-ownership\.lane-cleanup"[\s\S]*?debugId="admin-community-ownership\.lane-lifecycle"/,
  "Admin Community Ownership must keep one compact decision summary followed by its four-case chooser."
);
assertContains(
  "adminCommunityOwnership",
  /data-gsn-community-ownership-work="steward"[\s\S]*?display: activeLane === "steward"[\s\S]*?data-gsn-community-ownership-work="cleanup"[\s\S]*?display: activeLane === "cleanup"[\s\S]*?data-gsn-community-ownership-work="community-lifecycle"[\s\S]*?lifecycleScope === "community"[\s\S]*?data-gsn-community-ownership-work="domain-owner"[\s\S]*?ownerScope === "domain"[\s\S]*?data-gsn-community-ownership-work="domain-lifecycle"[\s\S]*?lifecycleScope === "domain"/,
  "Admin Community Ownership must reveal only the selected case lane and selected record scope."
);
assertContains(
  "revenueAllocation",
  /data-gsn-revenue-allocation-summary="true"[\s\S]*?What needs review\?[\s\S]*?Community[\s\S]*?Support ID[\s\S]*?State[\s\S]*?Boundary[\s\S]*?data-gsn-revenue-allocation-action="true"[\s\S]*?debugId="revenue-allocation\.load"[\s\S]*?Load allocation[\s\S]*?debugId="revenue-allocation\.copy-summary"/,
  "Revenue Allocation must keep one compact review summary and one lookup action before closed evidence and route details."
);
assertContains(
  "exposureAdmin",
  /data-gsn-exposure-summary="true"[\s\S]*?What needs attention\?[\s\S]*?Community[\s\S]*?At-risk members[\s\S]*?Action queue[\s\S]*?Total exposure[\s\S]*?data-gsn-exposure-priority="true"[\s\S]*?debugId="exposure-admin\.review-priority"[\s\S]*?Review action queue[\s\S]*?Review pressure details/,
  "Exposure Admin must keep one compact attention summary and one state-aware review action before closed pressure, queue, and next-page details."
);
assertContains(
  "trustAnalytics",
  /data-gsn-trust-analytics-summary="true"[\s\S]*?What does the record show\?[\s\S]*?Community[\s\S]*?Recorded events[\s\S]*?Built or protected[\s\S]*?Weakened or repair[\s\S]*?data-gsn-trust-analytics-priority="true"[\s\S]*?debugId="trust-analytics\.priority-review"[\s\S]*?Review recent timeline[\s\S]*?Read the guide/,
  "Trust Analytics must keep one compact record summary and one state-aware review action before closed mix, timeline, and guidance details."
);
assertContains(
  "adminTrustGraph",
  /data-gsn-trust-graph-summary="true"[\s\S]*?What does the relationship record show\?[\s\S]*?Community[\s\S]*?Graph feed[\s\S]*?Evidence signals[\s\S]*?Watch or flagged[\s\S]*?data-gsn-trust-graph-priority="true"[\s\S]*?debugId="admin-trust-graph\.review-priority"[\s\S]*?Review evidence signals[\s\S]*?Read structure limits/,
  "Admin Trust Graph must keep one honest relationship-evidence summary and one state-aware action before closed structure, signal, and next-page details."
);
assertContains(
  "systemOperations",
  /data-gsn-system-operations-summary="true"[\s\S]*?What needs attention\?[\s\S]*?Community[\s\S]*?Entry needing help[\s\S]*?Immediate queue[\s\S]*?Identity cases[\s\S]*?debugId="system-operations\.priority-action"[\s\S]*?data-gsn-system-operations-overview="true"[\s\S]*?data-gsn-system-operations-intake="true"[\s\S]*?data-gsn-system-operations-signals="true"/,
  "System Operations must keep one compact queue summary and one state-aware action before closed operational detail."
);
assertContains(
  "communityConfirmationInbox",
  /data-gsn-community-confirmation-summary="true"[\s\S]*?What needs your answer\?[\s\S]*?debugId="community-confirmation-inbox\.priority-action"[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/,
  "Community Confirmation Inbox must keep one compact answer summary with one state-aware action and three request counts."
);
assertContains(
  "communityConfirmationInbox",
  /data-gsn-community-confirmation-tools="true"[\s\S]*?data-gsn-community-confirmation-review-cases="true"[\s\S]*?data-gsn-community-confirmation-relay-settings="true"[\s\S]*?data-gsn-community-confirmation-requests="true"/,
  "Community Confirmation Inbox must keep tools, reviewer work, and relay settings closed before the request task."
);
assertContains(
  "communityConfirmationInbox",
  /data-gsn-community-confirmation-request-navigator="true"[\s\S]*?one person and one decision at a time[\s\S]*?data-gsn-community-confirmation-request-evidence="true"[\s\S]*?data-gsn-community-confirmation-private-note="true"[\s\S]*?data-gsn-community-confirmation-response-groups="true"/,
  "Community Confirmation Inbox must show one request at a time, with evidence and optional private context collapsed before the grouped decision choices."
);

if (findings.length > 0) {
  console.error("Phone surface simplicity audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Phone surface simplicity audit passed.");
