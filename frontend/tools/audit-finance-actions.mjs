/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

const financeFiles = [
  "src/pages/FinancePage.tsx",
  "src/pages/PaymentRailsPage.tsx",
  "src/pages/PaymentInstructionsPage.tsx",
  "src/pages/WithdrawalInstructionsPage.tsx",
  "src/pages/RevenueAllocationPage.tsx",
  "src/pages/BankConsolePage.tsx",
  "src/pages/PayoutDetailsPage.tsx",
  "src/components/PaymentInstructionsPanel.tsx",
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
          "Finance stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

financeFiles.forEach(assertStableActionsHaveDebugIds);

for (const file of financeFiles) {
  assertNotContains(
    file,
    /to=["']\/cover["']|to=["']\/welcome["']/,
    "Finance actions must not send signed-in users directly to Cover or Welcome."
  );
}

assertContains(
  "src/pages/FinancePage.tsx",
  /debugId=\{`finance\.tool\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`finance\.mini-tool\.\$\{tool\.label\.toLowerCase\(\)\.replace\(/,
  "Finance main tool grids must keep item-based debug IDs."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /import \{ GsnLegacyIcon, type GsnIconName \} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*?import \{ brandClampLines, brandSingleLine \} from "\.\.\/styles\/gmfnBrand";[\s\S]*?type FinanceGlyphName[\s\S]*?FINANCE_GLYPH_ICON_MAP[\s\S]*?satisfies Record<FinanceGlyphName, GsnIconName>[\s\S]*?function FinanceGlyph\([\s\S]*?<GsnLegacyIcon[\s\S]*?function financeToolButtonStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?const compactHeight = 48;[\s\S]*?height: isCompact \? compactHeight : desktopHeight,[\s\S]*?maxHeight: isCompact \? compactHeight : desktopHeight,[\s\S]*?overflow: "hidden",[\s\S]*?function financeMiniToolButtonStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?const compactHeight = 78;[\s\S]*?height: isCompact \? compactHeight : desktopHeight,[\s\S]*?maxHeight: isCompact \? compactHeight : desktopHeight,[\s\S]*?overflow: "hidden",[\s\S]*?brandClampLines\(2\)[\s\S]*?brandSingleLine\(\)/,
  "Finance tool and mini-tool cards must keep fixed phone-safe heights, clamped text, and 3D GSN icon marks so labels cannot stretch or overlap action surfaces."
);

assertNotContains(
  "src/pages/FinancePage.tsx",
  /[\u{1F300}-\u{1FAFF}]|radial-gradient|overflowWrap: "anywhere"|where its route says/u,
  "Finance page must not use emoji marks, radial glow surfaces, harsh anywhere wrapping, or route wording on phone-critical surfaces."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /to=\{routes\.loans\}[\s\S]*?debugId="finance\.open-loans"/,
  "Finance Loans & Support action must stay routed to the Loans surface."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /\["Support committed", safeStr\(clanLiquidity\?\.pledgedTotal \|\| "0"\)\]/,
  "Finance community money context must show committed support wording instead of pledged total wording."
);

assertNotContains(
  "src/pages/FinancePage.tsx",
  /\["Pledged total"/,
  "Finance community money context must not show pledge wording to users."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /Earnings from backing others[\s\S]*?title=\{`Support \$\{safeStr\(item\?\.loan_id \|\| "-"\)\}`\}[\s\S]*?<th style=\{tableHeadCell\(\)\}>Support ID<\/th>/,
  "Finance supporter-value rows must label backend loan IDs as support IDs in visible copy."
);

assertNotContains(
  "src/pages/FinancePage.tsx",
  /title=\{`Loan \$\{safeStr\(item\?\.loan_id \|\| "-"\)\}`\}|<th style=\{tableHeadCell\(\)\}>Loan ID<\/th>/,
  "Finance supporter-value rows must not restore old visible Loan ID labels."
);

assertContains(
  "src/pages/FinancePage.tsx",
  /"Support item"[\s\S]*?remaining on support you requested[\s\S]*?title=\{safeStr\(row\.title \|\| `Support \$\{row\.id \|\| index \+ 1\}`\)\}[\s\S]*?\{safeStr\(row\.title \|\| `Support \$\{row\.id \|\| index \+ 1\}`\)\}/,
  "Finance requested-support records must use support/requested wording for fallback titles and watch notices."
);

assertNotContains(
  "src/pages/FinancePage.tsx",
  /Loan support item|showing on borrower records|row\.title \|\| `Loan \$\{row\.id \|\| index \+ 1\}`/,
  "Finance requested-support records must not restore old loan/borrower fallback wording."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /debugId="money-in\.generate-instruction"[\s\S]*?debugId="money-in\.refresh-route"[\s\S]*?debugId="money-in\.reset-task"[\s\S]*?debugId="money-in\.copy-reference"[\s\S]*?debugId="money-in\.copy-instruction"[\s\S]*?debugId="money-in\.confirm-paid"/,
  "Money In core instruction actions must remain traceable without duplicating the generate panel."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /const MONEY_IN_CURRENCY_OPTIONS = \[[\s\S]*?code: "NGN"[\s\S]*?code: "USD"[\s\S]*?code: "GBP"[\s\S]*?code: "EUR"[\s\S]*?<select[\s\S]*?aria-label="Payment currency"/,
  "Money In must expose a real currency selector instead of a fixed currency chip."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /createPoolDepositInstruction\([\s\S]*?currency: selectedCurrency/,
  "Money In must submit the selected currency when generating a pool payment instruction."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /function moneyInIdentityBlocker[\s\S]*?Your member GSN ID is not visible here yet\. Sign in again or finish member activation, then return to Money In\.[\s\S]*?identityBlockerText[\s\S]*?moneyInIdentityReady[\s\S]*?disabled=\{generatingInstruction \|\| !moneyInIdentityReady\}/,
  "Money In must clearly block reference generation until the signed-in member has a visible member GSN ID."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /function resolveMoneyInMemberGmfnId\(me: any, currentClan: any\): string \{[\s\S]*?me\?\.gmfn_id[\s\S]*?currentClan\?\.member_gmfn_id[\s\S]*?\(api as any\)\.getStoredGmfnId\?\.\(\)[\s\S]*?const currentGmfnId = useMemo\(\(\) => \{[\s\S]*?resolveMoneyInMemberGmfnId\(me, currentClan\)[\s\S]*?const gmfnId = resolveMoneyInMemberGmfnId\(meRes, clanRes\);/,
  "Money In must fall back to selected-community and stored member GSN IDs when the live profile response is partial, matching Marketplace identity parity."
);

assertNotContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /Community or member identity is not ready\./,
  "Money In must not use the vague old identity blocker; it must name the missing community or GSN ID step."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /debugId="money-in\.route\.finance"[\s\S]*?debugId="money-in\.route\.money-out"[\s\S]*?debugId="money-in\.route\.payment-rails"[\s\S]*?debugId="money-in\.route\.payout-details"[\s\S]*?debugId="money-in\.route\.loans"/,
  "Money In next-route actions must keep their route-specific debug IDs."
);

assertContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /Current payment actions[\s\S]*?Keep this pay-in focused[\s\S]*?Next pages[\s\S]*?Payment focus[\s\S]*?Related pages reopen after this pay-in has reached a visible conclusion\./,
  "Money In visible copy must describe payment progress in plain language instead of route-state wording."
);

assertNotContains(
  "src/pages/PaymentInstructionsPage.tsx",
  /Current route actions|Keep the route focused|Next routes|Route focus|Related routes reopen|Money In route refreshed|pay-in route/,
  "Money In must not expose route-state wording in user-facing payment guidance."
);

assertContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /debugId="money-out\.front-awaiting-pool"[\s\S]*?debugId="money-out\.front-continue-direct"[\s\S]*?debugId="money-out\.front-open-support"[\s\S]*?debugId="money-out\.front-copy-summary"[\s\S]*?debugId="money-out\.front-reset-task"[\s\S]*?debugId="money-out\.continue-direct"[\s\S]*?debugId="money-out\.open-support"[\s\S]*?debugId="money-out\.copy-summary"[\s\S]*?debugId="money-out\.route\.finance"/,
  "Money Out core withdrawal and follow-on route actions must remain traceable."
);

assertContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /function defaultCollapseState\(\): CollapseState \{[\s\S]*?rail: true,[\s\S]*?\}[\s\S]*?function isPlaceholderRailValue\(value: any\): boolean \{[\s\S]*?to be assigned[\s\S]*?gsn settlement rail[\s\S]*?function settlementReady\(settlement: CommunityMoneySettlement \| null\): boolean \{[\s\S]*?hasBankAccount[\s\S]*?hasMobileMoney[\s\S]*?hasInternationalRail[\s\S]*?const communityRailReady = settlementReady\(communitySettlement\);[\s\S]*?\(\) => visibleSettlementLines\(communitySettlement\)/,
  "Money Out community rail must stay collapsed by default and must not treat placeholder GSN settlement labels as real filled bank details."
);

assertNotContains(
  "src/pages/WithdrawalInstructionsPage.tsx",
  /communitySettlement\?\.bankName \|\|\s*communitySettlement\?\.accountName \|\|\s*communitySettlement\?\.accountNumber|Money Out route|route state|Support route|this route decides|Related routes/,
  "Money Out community rail readiness and copy packages must not use placeholder bank/account labels or route-state wording."
);

assertContains(
  "src/pages/PaymentRailsPage.tsx",
  /debugId="payment-rails\.front-money-in"[\s\S]*?debugId="payment-rails\.front-money-out"[\s\S]*?debugId="payment-rails\.front-readiness"[\s\S]*?debugId="payment-rails\.route\.money-in"[\s\S]*?debugId="payment-rails\.route\.money-out"[\s\S]*?debugId="payment-rails\.route\.readiness"[\s\S]*?debugId="payment-rails\.route\.workbench"/,
  "Payment Rails route actions must keep finance-route debug IDs."
);

assertContains(
  "src/pages/PaymentRailsPage.tsx",
  /guided Money In and Money Out pages[\s\S]*?guidance shown there[\s\S]*?guided Money In or Money Out page[\s\S]*?Next pages/,
  "Payment Rails visible copy must send users to guided pages, not route mechanics."
);

assertNotContains(
  "src/pages/PaymentRailsPage.tsx",
  /Money In and Money Out routes|route shown there|Money In or Money Out route|Next routes|Hide raw|Show raw/,
  "Payment Rails must not expose route-state wording in user-facing rail guidance."
);

assertContains(
  "src/pages/RevenueAllocationPage.tsx",
  /debugId="revenue-allocation\.route\.loan-summary"[\s\S]*?debugId="revenue-allocation\.route\.workbench"[\s\S]*?debugId="revenue-allocation\.route\.finance"[\s\S]*?debugId="revenue-allocation\.route\.loans"[\s\S]*?debugId="revenue-allocation\.route\.money-out"/,
  "Revenue Allocation route actions must keep finance-route debug IDs."
);

assertContains(
  "src/pages/RevenueAllocationPage.tsx",
  /Next support steps[\s\S]*?Move from allocation reading into the next support or finance page you need\./,
  "Revenue Allocation visible copy must describe next support steps, not support routes."
);

assertContains(
  "src/pages/RevenueAllocationPage.tsx",
  /status: firstTruthy\(src\?\.status, src\?\.allocation_status, "Status not recorded yet"\)[\s\S]*?\["Status", safeStr\(allocation\.status \|\| "Status not recorded yet"\)\]/,
  "Revenue Allocation must show honest missing-status language instead of inventing a pending allocation status."
);

assertNotContains(
  "src/pages/RevenueAllocationPage.tsx",
  /allocation_status, "pending"|\["Status", safeStr\(allocation\.status \|\| "pending"\)\]/,
  "Revenue Allocation must not reintroduce fake pending status fallbacks when allocation status is missing."
);

assertNotContains(
  "src/pages/RevenueAllocationPage.tsx",
  /Next support routes/,
  "Revenue Allocation must not expose route wording in the support-step heading."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /debugId="bank-console\.next-step"[\s\S]*?debugId="bank-console\.refresh"[\s\S]*?debugId="bank-console\.ingest"[\s\S]*?debugId="bank-console\.reconcile"/,
  "Bank Console next-step and operational actions must remain traceable."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /finance-confirmed \$\{confirmed\}/,
  "Bank Console reconciliation counts must label confirmed rows as finance-confirmed."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /Reconciliation run recorded:[\s\S]*?settlement-ready[\s\S]*?not settlement or evidence that money moved/,
  "Bank Console reconciliation language must frame matching as a recorded finance review, not settlement or money movement."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /review matched records[\s\S]*?matched record is visible/,
  "Bank Console guidance must frame matching as visible matched-record review."
);

assertContains(
  "src/lib/api.ts",
  /export async function reviewExpectedPaymentProof[\s\S]*?\/admin\/bank\/expected-payments\/\$\{encodeURIComponent[\s\S]*?\/finance-review[\s\S]*?decision: payload\.decision/,
  "Bank Console must keep a dedicated expected-payment finance review API client."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /async function reviewExpectedProof[\s\S]*?reviewExpectedPaymentProof\(\{[\s\S]*?expected_payment_id: expectedPaymentId[\s\S]*?decision/,
  "Bank Console must send proof review decisions through the dedicated finance review handler."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /canReviewProof = hasProof && !isConfirmed && isCommunityDomainPayment[\s\S]*?debugId=\{`bank-console\.expected\.\$\{safeStr\(row\.id\)\}\.approve-proof`\}[\s\S]*?Approve after check[\s\S]*?debugId=\{`bank-console\.expected\.\$\{safeStr\(row\.id\)\}\.reject-proof`\}[\s\S]*?Reject proof/,
  "Bank Console must keep proof review actions scoped to submitted, unconfirmed Community Domain expected payments."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /function expectedPaymentTypeLabel[\s\S]*?Community Domain subscription[\s\S]*?function communityDomainPaymentInfo[\s\S]*?payment_intent/,
  "Bank Console must preserve readable Community Domain subscription metadata for finance review rows."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /Community Domain finance handoff[\s\S]*?subscription activation[\s\S]*?Approval can activate[\s\S]*?does not[\s\S]*?donations, registrations, event fees, ROSCA[\s\S]*?Spotlight, Shop Diary/,
  "Bank Console Community Domain payment rows must explain activation scope and must not imply uploaded proof approves domain activity payments."
);

assertContains(
  "src/pages/BankConsolePage.tsx",
  /paper is evidence[\s\S]*?not automatic[\s\S]*?proof[\s\S]*?money movement/,
  "Bank Console proof-review copy must state that uploaded paper is review evidence, not automatic proof that money moved."
);

assertNotContains(
  "src/pages/BankConsolePage.tsx",
  /Reconciliation complete|treating the rail as settled|`confirmed \$\{confirmed\}`|confirm matches|settlement easier to defend|check whether it matched/,
  "Bank Console must not make reconciliation runs sound like settlement completion or money movement."
);

assertContains(
  "src/pages/PayoutDetailsPage.tsx",
  /debugId="payout-details\.front-save"[\s\S]*?debugId="payout-details\.front-copy-summary"[\s\S]*?debugId="payout-details\.save"[\s\S]*?debugId="payout-details\.copy-summary"[\s\S]*?debugId="payout-details\.clear-local"[\s\S]*?debugId="payout-details\.open-money-out"[\s\S]*?debugId="payout-details\.open-loans"/,
  "Payout Details save/copy/clear/follow-on actions must remain traceable."
);

assertContains(
  "src/components/PaymentInstructionsPanel.tsx",
  /debugId="payment-instructions-panel\.copy-reference"/,
  "Embedded payment instruction panel copy action must stay traceable."
);

if (findings.length > 0) {
  console.error("Finance action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance action audit passed.");
