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

function assertAsciiOnly(file, message) {
  const text = read(file);
  text.split(/\r?\n/).forEach((line, index) => {
    if ([...line].some((char) => char.charCodeAt(0) > 127)) {
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
  const actionPattern = /<Stable(?:Button|CtaLink|DisclosureSummary)\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 900);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Loans-domain stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

[
  "src/pages/LoansPage.tsx",
  "src/pages/LoanReadinessPage.tsx",
  "src/pages/LoanSuggestionsPage.tsx",
  "src/pages/LoanWorkbenchPage.tsx",
  "src/pages/LoanSummaryPage.tsx",
  "src/pages/LoanDecisionPage.tsx",
  "src/pages/GuarantorInboxPage.tsx",
  "src/pages/GuarantorEarningsPage.tsx",
  "src/pages/RepaymentPage.tsx",
  "src/pages/RevenueAllocationPage.tsx",
].forEach(assertStableActionsHaveDebugIds);

assertContains(
  "src/pages/LoansPage.tsx",
  /function responsiveGridColumns\(minWidth: number\): string \{[\s\S]*?repeat\(auto-fit, minmax\(min\(100%, \$\{minWidth\}px\), 1fr\)\)/,
  "Loans page must use container-safe grids so phone route cards cannot collapse into narrow vertical text columns."
);

assertContains(
  "src/layout/AppLayout.tsx",
  /function buildLoansItems\(\): NavLinkItem\[\] \{[\s\S]*?return \[makeLoansItem\(\)\];[\s\S]*?\}[\s\S]*?Open the guided support workspace first\. Deeper tools stay inside the support flow\./,
  "Global Tools menu must keep Loans & Support as one guided entry instead of exposing readiness, suggestions, workbench, or earnings as first-level choices."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /gridTemplateColumns: responsiveGridColumns\(260\)[\s\S]*?debugId="loans\.route\.start-support"[\s\S]*?debugId="loans\.route\.money-in"[\s\S]*?debugId="loans\.route\.money-out"[\s\S]*?debugId="loans\.deeper-support-tools\.summary"[\s\S]*?Deeper support tools[\s\S]*?gridTemplateColumns: responsiveGridColumns\(260\)[\s\S]*?debugId="loans\.route\.readiness"[\s\S]*?debugId="loans\.route\.suggestions"[\s\S]*?debugId="loans\.route\.guarantor-inbox"[\s\S]*?debugId="loans\.route\.notifications"[\s\S]*?debugId="loans\.route\.guarantor-earnings"[\s\S]*?debugId="loans\.route\.marketplace"/,
  "Loans live support modules must keep primary actions visible, deeper tools behind a disclosure, and every route action traceable."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /src\?\.is_guarantor \? "Supporter" : ""/,
  "Loans overview must translate backend is_guarantor role data into the user-facing Supporter label."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /debugId="loans\.hero\.start-support"[\s\S]*?stableHeight=\{isCompact \? 58 : 68\}[\s\S]*?fullWidth=\{isCompact\}[\s\S]*?height: isCompact \? 58 : 68,[\s\S]*?minHeight: isCompact \? 58 : 68,[\s\S]*?maxHeight: isCompact \? 58 : 68,[\s\S]*?Start Support Request/,
  "Loans first phone viewport must expose a fixed-height Start Support Request CTA in the hero before the user reaches the deeper route grid."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /import \{ brandClampLines, brandSingleLine \} from "\.\.\/styles\/gmfnBrand";[\s\S]*?function routeTileStyle\(primary = false, compact = false\): React\.CSSProperties \{[\s\S]*?height: compact \? 66 : 88,[\s\S]*?maxHeight: compact \? 66 : 88,[\s\S]*?overflow: "hidden",[\s\S]*?function routeTitleStyle\(compact = false\): React\.CSSProperties \{[\s\S]*?brandSingleLine\(\)[\s\S]*?function routeHelperStyle\(compact = false\): React\.CSSProperties \{[\s\S]*?brandClampLines\(2\)/,
  "Loans overview route labels must keep fixed phone-safe heights and clamped text so they cannot turn labels into one-letter columns or overlap route cards."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /import \{[\s\S]*GsnLegacyIcon[\s\S]*GsnIconName[\s\S]*\} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*function routeIcon\([\s\S]*<GsnLegacyIcon[\s\S]*debugId="loans\.route\.money-out"/,
  "Loans & Support must use 3D GSN icons for visible lane/action icons, including Money Out."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /routeIconCircle\(primary = false[\s\S]*?linear-gradient\(180deg, rgba\(255,255,255,0\.98\)[\s\S]*?<GsnLegacyIcon name="financeInstitution" size=\{64\}[\s\S]*?iconLabel\("repaymentSchedule", "Active support"\)[\s\S]*?iconLabel\("financeInstitution", "Pool"\)[\s\S]*?routeIcon\("evidence"\)/,
  "Loans & Support must use light icon tiles plus repayment, certificate/evidence, and finance-institution 3D meanings for the visible support summary."
);

assertAsciiOnly(
  "src/pages/LoansPage.tsx",
  "Loans & Support source must not reintroduce emoji/mojibake display glyphs for core icons."
);

assertContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /GsnLegacyIcon[\s\S]*UK sort code[\s\S]*value=\{destination\.sortCode\}[\s\S]*debugId="money-out\.save-destination"[\s\S]*destinationNotice/,
  "Loans & Support Money Out must keep 3D GSN icons, expose UK sort code beside the payout save action, and show the save response locally."
);

assertAsciiOnly(
  "src/pages/WithdrawalInstructionsPage.tsx",
  "Money Out source must not reintroduce emoji/mojibake display glyphs for core icons."
);

assertContains(
  "src/pages/GuarantorEarningsPage.tsx",
  /const GUARANTOR_EARNINGS_PAYOUT_TRUTH =[\s\S]*?not an automatic payout[\s\S]*?guided Money Out process[\s\S]*?Closed-support records: \$\{totals\.settledCount\}[\s\S]*?copySummary\(\)[\s\S]*?GUARANTOR_EARNINGS_PAYOUT_TRUTH[\s\S]*?const amountLabel = settled \? "RECORDED EARNED VALUE" : "POTENTIAL SHARE"[\s\S]*?debugId="guarantor-earnings\.route\.money-out"[\s\S]*?does not pay it out by itself/,
  "Supporter Value must tell users that earned supporter value is a visible record, not an automatic payout, and must keep closed-support records from sounding like settlement or payout completion."
);

assertNotContains(
  "src/pages/GuarantorEarningsPage.tsx",
  /Review visible guarantor value|Review visible supporter value, settled items|Settled support creates clearer earnings|`Settled items: \$\{totals\.settledCount\}`|<span style=\{badge\(false\)\}>Settled:|const amountLabel = settled \? "EARNED" : "POTENTIAL SHARE"/,
  "Supporter Value must not restore broad settlement or earned-value labels."
);

assertContains(
  "src/pages/RepaymentPage.tsx",
  /createRepaymentClaim[\s\S]*?type RepaymentMode = "full" \| "part";[\s\S]*?paid_amount\?: string \| number \| null;[\s\S]*?remaining_amount\?: string \| number \| null;[\s\S]*?bank_event_id\?: number \| string \| null;[\s\S]*?meta\?: any;[\s\S]*?meta_json\?: any;[\s\S]*?const \[repaymentMode, setRepaymentMode\] = useState<RepaymentMode>\("full"\);[\s\S]*?const \[partAmount, setPartAmount\] = useState\(""\);[\s\S]*?const requestedRepaymentAmount = useMemo[\s\S]*?repaymentMode === "full"[\s\S]*?Math\.min\(requested, outstandingAmount\)[\s\S]*?currentExpectedPaymentMeta[\s\S]*?plannedInstallments[\s\S]*?repaymentPlanTruth[\s\S]*?planned repayment step[\s\S]*?currentExpectedPaymentBankEventId[\s\S]*?matched_bank_event_id[\s\S]*?bank_event_id[\s\S]*?amount: String\(requestedRepaymentAmount\.toFixed\(2\)\)[\s\S]*?createRepaymentClaim\(numericLoanId[\s\S]*?Admin confirmation is still needed[\s\S]*?debugId="repayment\.mode\.full"[\s\S]*?debugId="repayment\.mode\.part"[\s\S]*?Part-payment amount[\s\S]*?Paid so far:[\s\S]*?Still left:[\s\S]*?Plan:[\s\S]*?Declare paid/,
  "Repayment page must expose full-balance and part-payment choices, show backend planned repayment metadata when present, show paid/left reconciliation amounts, generate instructions for the selected amount, and send borrower declarations to the repayment-claim backend instead of only setting local state."
);

assertContains(
  "src/pages/RepaymentPage.tsx",
  /expected_total_amount\?: string \| number \| null;[\s\S]*?expected_remaining_amount\?: string \| number \| null;[\s\S]*?const repaymentChoiceLabel[\s\S]*?const selectedRepaymentAmountText[\s\S]*?Choice: \{repaymentChoiceLabel\}[\s\S]*?Selected: \{selectedRepaymentAmountText\}[\s\S]*?Outstanding: \{fmtMoney\(outstandingAmount, currency\)\}[\s\S]*?Selected payment amount[\s\S]*?Full balance tracking[\s\S]*?Expected total:[\s\S]*?Expected still left:[\s\S]*?For part payments, this keeps the full support balance visible until reconciliation closes it/,
  "Repayment page must make the selected payment amount, outstanding balance, expected total, and expected remaining balance visible for pilot evidence screenshots."
);

assertContains(
  "src/lib/api.ts",
  /export async function createRepaymentClaim[\s\S]*?\/loans\/\$\{encodeURIComponent\(String\(loanId\)\)\}\/repayment-claim[\s\S]*?payment_reference: String\(payload\.payment_reference \|\| ""\)\.trim\(\)/,
  "Frontend API must expose the borrower repayment-claim endpoint used by RepaymentPage."
);

assertNotContains(
  "src/pages/RepaymentPage.tsx",
  /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
  "Repayment page must not restore spaced-out micro-label typography."
);

assertNotContains(
  "src/pages/GuarantorEarningsPage.tsx",
  /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
  "Guarantor Earnings page must not restore spaced-out micro-label typography."
);

assertContains(
  "src/lib/communityMoney.ts",
  /export type CommunitySettlementDestination = \{[\s\S]*sortCode: string;[\s\S]*country: string;[\s\S]*currency: string;[\s\S]*noteWithSortCode[\s\S]*sort_code: normalizeSortCode\(destination\.sortCode\)/,
  "Community money destination must carry sort code, country, and currency through shared frontend logic."
);

assertContains(
  "src/lib/communityMoney.ts",
  /let viaWrapper = null;[\s\S]*updateWithdrawalDestination\(payload\)[\s\S]*if \(!viaWrapper[\s\S]*saveWithdrawalDestination\(payload\)/,
  "Community money destination saves must update existing server records before falling back to create/local behavior."
);

assertContains(
  "src/lib/api.ts",
  /sort_code\?: string \| null;[\s\S]*bank_sort_code\?: string \| null;[\s\S]*cleaned\.sort_code = sortCode;[\s\S]*cleaned\.bank_sort_code = sortCode;/,
  "Withdrawal destination API payloads must keep sort_code and bank_sort_code aliases."
);

const backendWithdrawalDestination = readRepo(
  "gmfn_backend/app/api/routes/withdrawal_destinations.py"
);

if (
  !/sort_code: Optional\[str\][\s\S]*bank_sort_code: Optional\[str\][\s\S]*"sort_code": sort_code or None[\s\S]*_note_with_sort_code/.test(
    backendWithdrawalDestination
  )
) {
  findings.push({
    file: "gmfn_backend/app/api/routes/withdrawal_destinations.py",
    line: 1,
    message:
      "Backend withdrawal destination route must accept, preserve, and echo sort_code without requiring a schema migration.",
    text: "Expected sort_code/bank_sort_code payload support was not found.",
  });
}

[
  "src/pages/LoanReadinessPage.tsx",
  "src/pages/LoanSuggestionsPage.tsx",
  "src/pages/LoanWorkbenchPage.tsx",
].forEach((file) => {
  assertContains(
    file,
    /import \{ brandClampLines \} from "\.\.\/styles\/gmfnBrand";[\s\S]*?function routeTileStyle\(primary = false\): React\.CSSProperties \{[\s\S]*?height: 104,[\s\S]*?maxHeight: 104,[\s\S]*?overflow: "hidden",[\s\S]*?function routeTileTitleStyle\(\): React\.CSSProperties \{[\s\S]*?brandClampLines\(2\)[\s\S]*?function routeTileDetailStyle\(\): React\.CSSProperties \{[\s\S]*?brandClampLines\(2\)/,
    `${file} route cards must keep fixed phone-safe heights and clamped title/detail text.`
  );
});

assertContains(
  "src/pages/LoanReadinessPage.tsx",
  /display: isCompact \? "none" : "flex"[\s\S]*?debugId="loan-readiness\.front-next"[\s\S]*?stableHeight=\{isCompact \? 58 : 72\}[\s\S]*?height: isCompact \? 58 : 72,[\s\S]*?maxHeight: isCompact \? 58 : 72,[\s\S]*?loanReadinessRouteHeading\("navigation", recommendedNext\.ctaLabel\)/,
  "Loan Readiness must keep a compact first-viewport recommended next action and hide the decorative community image on phone."
);

assertContains(
  "src/pages/LoanSuggestionsPage.tsx",
  /display: isCompact \? "none" : "flex"[\s\S]*?debugId="loan-suggestions\.front-next"[\s\S]*?stableHeight=\{isCompact \? 58 : 72\}[\s\S]*?height: isCompact \? 58 : 72,[\s\S]*?maxHeight: isCompact \? 58 : 72,[\s\S]*?loanSuggestionsRouteHeading\("navigation", nextRoute\.ctaLabel\)/,
  "Loan Suggestions must keep a compact first-viewport recommended next action and hide the decorative community image on phone."
);

assertContains(
  "src/pages/GuarantorInboxPage.tsx",
  /debugId="guarantor-inbox\.front-next"[\s\S]*?stableHeight=\{isCompact \? 58 : 72\}[\s\S]*?height: isCompact \? 58 : 72,[\s\S]*?maxHeight: isCompact \? 58 : 72,[\s\S]*?guarantorInboxRouteHeading\("navigation", nextStep\.ctaLabel\)/,
  "Guarantor Inbox must keep a compact first-viewport recommended next action before the evidence snapshot and deeper queue sections."
);

assertContains(
  "src/pages/GuarantorEarningsPage.tsx",
  /debugId="guarantor-earnings\.front-next"[\s\S]*?stableHeight=\{isCompact \? 58 : 72\}[\s\S]*?height: isCompact \? 58 : 72,[\s\S]*?maxHeight: isCompact \? 58 : 72,[\s\S]*?guarantorEarningsRouteHeading\("navigation", nextStep\.ctaLabel\)/,
  "Guarantor Earnings must keep a compact first-viewport recommended next action before payout truth, evidence snapshot, and deeper earnings sections."
);

assertContains(
  "src/pages/LoanWorkbenchPage.tsx",
  /display: isCompact \? "none" : "block"[\s\S]*?stableHeight=\{isCompact \? 50 : 52\}[\s\S]*?debugId="loan-workbench\.front-refresh"[\s\S]*?stableHeight=\{isCompact \? 50 : 52\}[\s\S]*?debugId="loan-workbench\.front-copy-loan-id"[\s\S]*?debugId="loan-workbench\.refresh"[\s\S]*?debugId="loan-workbench\.copy-loan-id"/,
  "Loan Workbench must keep compact front Refresh and Copy ID actions while preserving the deeper work-item controls."
);

assertContains(
  "src/pages/LoanSummaryPage.tsx",
  /import \{ brandClampLines \} from "\.\.\/styles\/gmfnBrand";[\s\S]*?function routeTileStyle\(primary = false\): React\.CSSProperties \{[\s\S]*?height: 104,[\s\S]*?maxHeight: 104,[\s\S]*?overflow: "hidden",[\s\S]*?function routeTileTitleStyle\(\): React\.CSSProperties \{[\s\S]*?brandClampLines\(2\)[\s\S]*?function routeTileDetailStyle\(\): React\.CSSProperties \{[\s\S]*?brandClampLines\(2\)[\s\S]*?display: isCompact \? "none" : "block"[\s\S]*?debugId="loan-summary\.copy-summary"[\s\S]*?stableHeight=\{52\}[\s\S]*?debugId="loan-summary\.copy-audit-link"[\s\S]*?stableHeight=\{52\}[\s\S]*?debugId="loan-summary\.route\.workbench"[\s\S]*?stableHeight=\{104\}/,
  "Loan Summary must hide the compact decorative image, keep copy actions in the hero, and keep fixed phone-safe route cards."
);

assertContains(
  "src/pages/RepaymentPage.tsx",
  /stableHeight=\{isCompact \? 52 : 54\}[\s\S]*?debugId="repayment\.front-generate-instruction"[\s\S]*?stableHeight=\{isCompact \? 52 : 54\}[\s\S]*?debugId="repayment\.front-copy-reference"[\s\S]*?debugId="repayment\.generate-instruction"[\s\S]*?debugId="repayment\.copy-reference"/,
  "Repayment must keep Generate and Copy Reference available in the first active-process card while preserving the deeper instruction controls."
);

assertContains(
  "src/pages/RevenueAllocationPage.tsx",
  /stableHeight=\{52\}[\s\S]*?debugId="revenue-allocation\.front-load"[\s\S]*?stableHeight=\{52\}[\s\S]*?debugId="revenue-allocation\.front-copy-summary"[\s\S]*?debugId="revenue-allocation\.load"[\s\S]*?debugId="revenue-allocation\.copy-summary"/,
  "Revenue Allocation must keep Load and Copy Summary available before the stats grid while preserving the deeper current-action card."
);

assertContains(
  "src/pages/LoansPage.tsx",
  /startSupport: routeTarget\([\s\S]*?"marketplace"[\s\S]*?"loans\.route\.start-support"[\s\S]*?"marketplace-loans-support"[\s\S]*?readiness: routeTarget\([\s\S]*?"loanReadiness"[\s\S]*?suggestions: routeTarget\([\s\S]*?"loanSuggestions"[\s\S]*?guarantorInbox: routeTarget\([\s\S]*?"guarantorInbox"[\s\S]*?notifications: routeTarget\([\s\S]*?"notifications"[\s\S]*?guarantorEarnings: routeTarget\([\s\S]*?"guarantorEarnings"/,
  "Loans route targets must keep their intended support, readiness, suggestions, guarantor, inbox, and earnings destinations."
);

assertNotContains(
  "src/pages/LoansPage.tsx",
  /gridTemplateColumns: isCompact \? "1fr" : "repeat\(3, minmax\(0, 1fr\)\)"/,
  "Loans live route modules must not return to the old three-column grid that squeezed phone text."
);

if (findings.length > 0) {
  console.error("Loans action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Loans action audit passed.");
