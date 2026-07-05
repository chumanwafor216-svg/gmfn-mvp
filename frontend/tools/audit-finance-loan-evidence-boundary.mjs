/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  routes: "src/lib/appRoutes.ts",
  targets: "src/lib/actionTargetRoutes.ts",
  loanReadiness: "src/pages/LoanReadinessPage.tsx",
  loanDecision: "src/pages/LoanDecisionPage.tsx",
  loanWorkbench: "src/components/LoanWorkbenchPage.tsx",
  loanDecisionPanel: "src/components/LoanDecisionPanel.tsx",
  snapshotPaper: "src/lib/gsnSnapshotPaper.ts",
  package: "package.json",
  map: "../docs/GSN_EVIDENCE_DISPLAY_IMPLEMENTATION_MAP_DRAFT.md",
  financeProtocol: "../docs/GSN_COMMUNITY_FINANCE_ENGINE_PROTOCOL_2026-06-30.md",
  backendReadinessRoute: "../gmfn_backend/app/api/routes/loan_readiness.py",
  backendReadinessService: "../gmfn_backend/app/services/loan_readiness_service.py",
  backendDecisionRoute: "../gmfn_backend/app/api/routes/loan_decision.py",
  backendDecisionService:
    "../gmfn_backend/app/services/loan_decision_intelligence_service.py",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);

const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const source = sourceByKey[key];
  findings.push({
    file: files[key],
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 340),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}

function assertNotContains(key, pattern, message) {
  const source = sourceByKey[key];
  source.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file: files[key],
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

assertContains(
  "app",
  /const LoanReadinessPage = React\.lazy\([\s\S]*?import\("\.\/pages\/LoanReadinessPage"\)[\s\S]*?<Route\s+path="loan-readiness"\s+element=\{<LoanReadinessPage \/>\}\s+\/>/,
  "Loan Readiness must stay a signed-in app route rendered by LoanReadinessPage."
);

assertContains(
  "app",
  /path="\/loan-readiness"[\s\S]*?PreserveRedirect to=\{APP_ROUTES\.LOAN_READINESS\}/,
  "Top-level /loan-readiness must redirect to the signed-in app route."
);

assertContains(
  "routes",
  /LOAN_READINESS: "\/app\/loan-readiness"/,
  "Canonical Loan Readiness route must remain /app/loan-readiness."
);

assertContains(
  "targets",
  /LOAN_READINESS: APP_ROUTES\.LOAN_READINESS[\s\S]*?"loan-readiness": ACTION_TARGETS\.LOAN_READINESS[\s\S]*?loanReadiness: "LOAN_READINESS"/,
  "Shared action targets must keep Loan Readiness normalized to the signed-in route."
);

assertContains(
  "map",
  /Finance \/ Support Readiness \| `\/app\/loan-readiness`[\s\S]*?Decision-support readiness, support pressure, repayment\/contribution discipline snapshots[\s\S]*?Must not read as loan approval, bank approval, guarantee, auto-debit, payment movement, or goods release authority/,
  "Evidence display map must classify Finance / Support Readiness as decision support, not approval or release authority."
);

assertContains(
  "map",
  /Loan Decision Intelligence \| loan decision routes\/panels[\s\S]*?Structured support\/loan decision intelligence[\s\S]*?Decision intelligence must stay explanation\/support, not automatic approval/,
  "Evidence display map must classify Loan Decision Intelligence as support/explanation, not automatic approval."
);

assertContains(
  "financeProtocol",
  /The movement and custody of money remain outside GSN[\s\S]*?GSN does not lend money\.[\s\S]*?GSN records, organizes, verifies, and preserves the trust evidence/,
  "Finance protocol must keep the non-lender/non-custodial boundary."
);

assertContains(
  "loanReadiness",
  /sectionLabel="Support Readiness"[\s\S]*?title="Support Readiness"[\s\S]*?subtitle="Use this stage to see whether the next support move is clean enough to continue/,
  "Loan Readiness page must remain a support-readiness reading, not an approval page."
);

assertContains(
  "loanReadiness",
  /Support Readiness is decision support only; it does not approve support, choose a supporter, or authorize release of goods, credit, or money\./,
  "Loan Readiness explanation must say readiness is decision support only."
);

assertContains(
  "loanReadiness",
  /buildGsnSupportEvidenceShareText\([\s\S]*?routeName: "Support Readiness"[\s\S]*?status: readiness\.level[\s\S]*?detailLines:\s*\[[\s\S]*?Readiness:/,
  "Loan Readiness copied evidence must use the shared GSN support evidence share helper."
);

assertContains(
  "snapshotPaper",
  /Limitation: support evidence only\. Not a guarantee, lending approval, receipt, or payout\./,
  "Support evidence snapshot package must keep its non-guarantee/non-approval/non-payout limitation."
);

assertContains(
  "snapshotPaper",
  /GSN support evidence is not approval, a guarantee, a receipt, or payout authority\./,
  "Compact support evidence share text must keep its non-approval limitation."
);

assertContains(
  "loanWorkbench",
  /async function fetchJson\(path: string\) \{[\s\S]*?headers: token \? \{ Authorization: `Bearer \$\{token\}` \} : \{\}[\s\S]*?fetchJson\(`\/api\/loans\/\$\{encodeURIComponent\(loanId\)\}\/decision-intelligence`\)/,
  "Loan Workbench decision-intelligence reads must remain bearer-token protected in the frontend."
);

assertContains(
  "loanDecisionPanel",
  /Decision intelligence is support evidence for review\. It is not loan[\s\S]*?approval, bank approval, payment movement, auto-debit authority, payout[\s\S]*?authority, or release authority\./,
  "Loan Decision Panel must visibly limit decision intelligence so recommendation/confidence cannot read as approval."
);

assertContains(
  "loanDecisionPanel",
  /<div className="text-slate-500">Support reading<\/div>[\s\S]*?\{data\.decision\.recommendation\}/,
  "Loan Decision Panel must label the recommendation as a support reading."
);

assertNotContains(
  "loanDecisionPanel",
  />Recommendation</,
  "Loan Decision Panel must not restore the bare Recommendation label without the support-reading boundary."
);

assertContains(
  "loanDecision",
  /subtitle="Read each support item in a calmer decision view before moving back into workbench action\."[\s\S]*?Read support outcomes without confusion[\s\S]*?workbench or the support summary/,
  "Loan Decision page must keep decision reading separate from workbench action and Finance."
);

assertContains(
  "backendReadinessRoute",
  /@router\.get\("\/readiness\/plan"\)[\s\S]*?current_user: User = Depends\(get_current_user\)[\s\S]*?build_loan_readiness_plan/,
  "Loan readiness plan backend route must stay signed-in."
);

assertContains(
  "backendReadinessService",
  /"readiness": \{[\s\S]*?"recommendation": recommendation[\s\S]*?"readiness_score": str\(_q2\(readiness_score\)\)[\s\S]*?"coverage": \{[\s\S]*?"coverable_now": bool\(coverable_now\)[\s\S]*?"top_candidates": suggested_top_candidates/,
  "Loan readiness service must return readiness/coverage/candidates, not approval or payment movement."
);

assertContains(
  "backendDecisionRoute",
  /@router\.get\("\/\{loan_id\}\/decision-intelligence"\)[\s\S]*?current_user: User = Depends\(get_current_user\)[\s\S]*?if not _is_admin\(current_user\) and borrower_user_id != current_user_id:[\s\S]*?raise HTTPException\(status_code=403[\s\S]*?build_loan_decision_intelligence/,
  "Loan decision intelligence backend route must stay signed-in and scoped to admin or borrower."
);

assertContains(
  "backendDecisionService",
  /"decision": \{[\s\S]*?"recommendation": recommendation[\s\S]*?"confidence_score": str\(confidence_score\)[\s\S]*?"reasons": reasons[\s\S]*?"coverage": \{[\s\S]*?"remaining_gap_after_suggestions"/,
  "Loan decision intelligence service must return recommendation/confidence/reasons/coverage, not approval or payment movement."
);

assertContains(
  "backendDecisionRoute",
  /result\["viewer_user_id"\] = current_user_id[\s\S]*?result\["viewer_role"\] = str\(getattr\(current_user, "role", ""\) or ""\)/,
  "Loan decision intelligence route must return viewer context after authorization."
);

assertContains(
  "package",
  /"audit:finance-loan-evidence-boundary": "node tools\/audit-finance-loan-evidence-boundary\.mjs"/,
  "Finance loan evidence boundary audit must stay registered in package scripts."
);

if (findings.length > 0) {
  console.error("Finance / loan evidence boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Finance / loan evidence boundary audit passed: Support Readiness and Decision Intelligence stay signed-in, decision-support evidence, not approval, payout, payment movement, auto-debit, or release authority."
);
