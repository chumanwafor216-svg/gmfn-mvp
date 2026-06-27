/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function readRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const findings = [];

const adminOpsFiles = [
  "src/pages/AdminIdentityRiskPage.tsx",
  "src/pages/AdminTrustEventsPage.tsx",
  "src/pages/AdminTrustGraphPage.tsx",
  "src/pages/AdminIncompleteLoansPage.tsx",
  "src/pages/ExposureAdminPage.tsx",
  "src/pages/ExposurePage.tsx",
  "src/pages/SystemOperationsPage.tsx",
  "src/pages/CommunityJoinRequestsPage.tsx",
  "src/pages/NotificationsPage.tsx",
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

function assertRepoContains(file, pattern, message) {
  const text = readRepo(file);

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
          "Admin / Operations stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

adminOpsFiles.forEach(assertStableActionsHaveDebugIds);

for (const file of adminOpsFiles) {
  assertNotContains(
    file,
    /to=["']\/cover["']|to=["']\/welcome["']/,
    "Admin / Operations actions must not send signed-in users directly to Cover or Welcome."
  );
}

assertContains(
  "src/pages/SystemOperationsPage.tsx",
  /debugId="system-operations\.toggle\.overview"[\s\S]*?debugId="system-operations\.toggle\.intake"[\s\S]*?debugId="system-operations\.toggle\.signals"[\s\S]*?debugId="system-operations\.route\.bank-console"/,
  "System Operations toggles and route actions must remain traceable."
);

assertContains(
  "src/pages/SystemOperationsPage.tsx",
  /settlement-ready[\s\S]*?waiting for finance review[\s\S]*?clear through finance evidence[\s\S]*?Support decisions \$\{toNum\(row\?\.approved_guarantors\)\}\/\$\{toNum[\s\S]*?Pool finance review pending/,
  "System Operations must frame finance queues as review and reconciliation readings, not settlement, confirmation, or broad approval."
);

assertNotContains(
  "src/pages/SystemOperationsPage.tsx",
  /finance reading as settled|waiting for confirmation\. Confirm|Confirm them before the money queue drifts|expectations settle|`Approved \$\{toNum\(row\?\.approved_guarantors\)\}\/\$\{toNum|Pool confirmation pending/,
  "System Operations must not make internal admin queues sound like final settlement, payment confirmation, or broad loan approval."
);

assertContains(
  "src/pages/AdminTrustGraphPage.tsx",
  /debugId="admin-trust-graph\.toggle-overview"[\s\S]*?debugId="admin-trust-graph\.toggle-structure"[\s\S]*?debugId="admin-trust-graph\.route\.analytics"[\s\S]*?debugId="admin-trust-graph\.route\.command-center"/,
  "Admin Trust Graph toggles and route actions must remain traceable."
);

assertContains(
  "src/pages/AdminTrustEventsPage.tsx",
  /debugId="admin-trust-events\.route\.analytics"[\s\S]*?debugId="admin-trust-events\.route\.graph"[\s\S]*?debugId="admin-trust-events\.route\.identity-risk"[\s\S]*?debugId="admin-trust-events\.route\.command-center"/,
  "Admin Trust Events route actions must remain traceable."
);

assertContains(
  "src/pages/AdminIncompleteLoansPage.tsx",
  /debugId="admin-incomplete-loans\.copy-queue"[\s\S]*?debugId="admin-incomplete-loans\.route\.system-operations"[\s\S]*?debugId="admin-incomplete-loans\.route\.bank-console"[\s\S]*?debugId="admin-incomplete-loans\.route\.command-center"/,
  "Admin Incomplete Loans queue and route actions must remain traceable."
);

assertContains(
  "src/pages/AdminIncompleteLoansPage.tsx",
  /support decisions, coverage gaps[\s\S]*?does not approve the whole loan, authorize release, or show that money moved[\s\S]*?Missing support decisions[\s\S]*?Locked support coverage[\s\S]*?Support decisions/,
  "Admin Incomplete Loans must frame the queue as support-decision and coverage review, not whole-loan approval, release authority, or money movement."
);

assertNotContains(
  "src/pages/AdminIncompleteLoansPage.tsx",
  /Approved guarantors:|Missing approvals|Approval progress|approved \/ \{toNum\(loan\?\.guarantors_required\)\} required|Pending guarantors:|Coverage already held|money movement looks wrong/,
  "Admin Incomplete Loans must not use broad approval or custody wording for support-decision coverage review."
);

assertContains(
  "src/pages/ExposureAdminPage.tsx",
  /debugId="exposure-admin\.toggle\.overview"[\s\S]*?debugId="exposure-admin\.toggle\.queues"[\s\S]*?debugId="exposure-admin\.route\.system-operations"[\s\S]*?debugId="exposure-admin\.route\.bank-console"/,
  "Exposure Admin toggles and route actions must remain traceable."
);

assertContains(
  "src/pages/ExposureAdminPage.tsx",
  /Support decisions[\s\S]*?Pending pool finance review[\s\S]*?practical risk reading; it is not settlement, release authority, or evidence that money moved[\s\S]*?locked support coverage/,
  "Exposure Admin must frame exposure as a risk reading and support-coverage review, not settlement, release authority, or payment proof."
);

assertNotContains(
  "src/pages/ExposureAdminPage.tsx",
  /locked money|Pending pool confirmation|pool confirmation|Clean bank events|`Approved \$\{toNum\(row\.approved_count\)\}/,
  "Exposure Admin must not use broad money, confirmation, or approval wording for exposure readings."
);

assertContains(
  "src/pages/ExposurePage.tsx",
  /debugId="exposure\.run-overdue"[\s\S]*?debugId="exposure\.refresh"[\s\S]*?debugId="exposure\.load-cci"[\s\S]*?debugId="exposure\.open-trust-analytics"/,
  "Exposure operational actions must remain traceable."
);

assertContains(
  "src/pages/ExposurePage.tsx",
  /Exposure is a recorded risk reading from locked support coverage minus release records[\s\S]*?not settlement, release authority, or evidence that money moved/,
  "Legacy Exposure page must frame exposure as a recorded risk reading, not settlement, release authority, or payment proof."
);

assertNotContains(
  "src/pages/ExposurePage.tsx",
  /Exposure = sum\(locked|approved guarantees/,
  "Legacy Exposure page must not describe exposure as broad approved-guarantee settlement math."
);

assertContains(
  "src/pages/CommunityJoinRequestsPage.tsx",
  /debugId=\{communityHomeCta\.debugId\}[\s\S]*?debugId=\{marketplaceCta\.debugId\}[\s\S]*?debugId="community-join-requests\.refresh"[\s\S]*?debugId="community-join-requests\.approve"/,
  "Community Join Requests navigation, refresh, and approval actions must remain traceable."
);

assertContains(
  "src/pages/NotificationsPage.tsx",
  /debugId="notifications\.show-urgent"[\s\S]*?debugId="notifications\.focus\.primary"[\s\S]*?debugId="notifications\.toggle-buckets"[\s\S]*?debugId="notifications\.selected\.open"/,
  "Notifications focus, selected notice, and feed actions must remain traceable."
);

assertContains(
  "src/pages/AdminIdentityRiskPage.tsx",
  /debugId=\{`admin-identity-risk\.\$\{g\.userId\}\.details`\}/,
  "Admin Identity Risk disclosure rows must remain traceable."
);

assertContains(
  "src/pages/AdminIdentityRiskPage.tsx",
  /postAdminIdentityReconciliation[\s\S]*?owner_confirmed: reconcileOwnerConfirmed[\s\S]*?execute,/,
  "Admin Identity Risk reconciliation must send owner confirmation and execute mode to the backend."
);

assertContains(
  "src/pages/AdminIdentityRiskPage.tsx",
  /debugId="admin-identity-risk\.reconcile\.preview"[\s\S]*?debugId="admin-identity-risk\.reconcile\.execute"[\s\S]*?debugId="admin-identity-risk\.reconcile\.raw"/,
  "Admin Identity Risk reconciliation preview, execute, and raw-result controls must remain traceable."
);

assertContains(
  "src/pages/AdminIdentityRiskPage.tsx",
  /Preview merge[\s\S]*?Execute merge[\s\S]*?Full reconciliation record/,
  "Admin Identity Risk reconciliation must keep preview-first and full-record review language visible."
);

assertContains(
  "src/pages/AdminIdentityRiskPage.tsx",
  /Owner confirmed both records are the same person[\s\S]*?!reconcileOwnerConfirmed/,
  "Admin Identity Risk execute action must stay disabled until owner confirmation is checked."
);

assertContains(
  "src/lib/api.ts",
  /export async function postAdminIdentityReconciliation[\s\S]*?owner_confirmed\?: boolean;[\s\S]*?execute\?: boolean;[\s\S]*?return httpJson\("\/identity-risk\/admin\/reconcile-duplicate", "POST", payload\);/,
  "Frontend API client must keep the admin duplicate-reconciliation route and owner-confirmation payload fields."
);

assertRepoContains(
  "gmfn_backend/app/api/routes/identity_risk.py",
  /class AdminIdentityReconcileIn\(BaseModel\):[\s\S]*?owner_confirmed: bool = False[\s\S]*?execute: bool = False[\s\S]*?@router\.post\("\/admin\/reconcile-duplicate"\)[\s\S]*?_require_admin\(current_user\)[\s\S]*?return reconcile_duplicate_identity\([\s\S]*?owner_confirmed=bool\(payload\.owner_confirmed\)[\s\S]*?execute=bool\(payload\.execute\)/,
  "Backend identity-risk route must stay admin-only and pass owner confirmation into duplicate reconciliation."
);

assertRepoContains(
  "gmfn_backend/app/services/identity_reconciliation_service.py",
  /PENDING_APPROVAL_SENTINEL[\s\S]*?def reconcile_duplicate_identity\([\s\S]*?if execute and not owner_confirmed:[\s\S]*?Owner confirmation is required[\s\S]*?identity\.duplicate_reconciled[\s\S]*?skipped_conflict/,
  "Identity reconciliation service must keep the no-delete retirement path, owner-confirmed execute gate, audit event, and skipped-conflict warning path."
);

assertRepoContains(
  "gmfn_backend/tests/test_identity_reconciliation.py",
  /test_admin_identity_reconciliation_dry_run_does_not_mutate[\s\S]*?test_admin_identity_reconciliation_requires_owner_confirmation_for_execute[\s\S]*?test_admin_identity_reconciliation_executes_owner_confirmed_merge[\s\S]*?identity\.duplicate_reconciled/,
  "Identity reconciliation must keep tests for dry-run safety, owner confirmation, execution, and audit logging."
);

if (findings.length > 0) {
  console.error("Admin / Operations action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Admin / Operations action audit passed.");
