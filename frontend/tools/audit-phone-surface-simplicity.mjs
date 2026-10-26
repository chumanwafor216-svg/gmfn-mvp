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

if (findings.length > 0) {
  console.error("Phone surface simplicity audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.message}`);
  }
  process.exit(1);
}

console.log("Phone surface simplicity audit passed.");
