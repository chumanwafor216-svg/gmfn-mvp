/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  finance: "src/pages/FinancePage.tsx",
  appRoutes: "src/lib/appRoutes.ts",
  actionTargets: "src/lib/actionTargetRoutes.ts",
  appLayout: "src/layout/AppLayout.tsx",
  communityMoney: "src/lib/communityMoney.ts",
  moneyInPage: "src/pages/PaymentInstructionsPage.tsx",
  moneyOutPage: "src/pages/WithdrawalInstructionsPage.tsx",
  package: "package.json",
  protocol: "../docs/GUIDED_WORK_SURFACE_PROTOCOL.md",
};

const sourceByFile = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);
const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(file, source, index, message, text = "Expected pattern was not found.") {
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByFile[key];
  if (pattern.test(source)) return;
  addFinding(files[key], source, -1, message, text);
}

assertContains(
  "finance",
  /moneyIn: routeTarget\("moneyIn", selectedClanId, "finance\.route\.money-in-target"\)[\s\S]*?moneyOut: routeTarget\("moneyOut", selectedClanId, "finance\.route\.money-out-target"\)/,
  "Finance must resolve Money In and Money Out through shared CTA intents with selected-community context."
);

assertContains(
  "finance",
  /id: "money-in"[\s\S]*?label: "Money In"[\s\S]*?detail: "Open guided pay-in\."[\s\S]*?action: \(\) => openFinanceRoute\(routes\.moneyIn\)[\s\S]*?debugId=\{`finance\.tool\.\$\{item\.id\}`\}/,
  "Finance Money In launcher must clearly open the guided pay-in route and keep its stable tool debug id."
);

assertContains(
  "finance",
  /Other finance lanes[\s\S]*?label: "Money Out"[\s\S]*?detail: "Open guided payout\."[\s\S]*?action: \(\) => openFinanceRoute\(routes\.moneyOut\)[\s\S]*?debugId=\{`finance\.mini-tool\.\$\{tool\.label\.toLowerCase\(\)\.replace/,
  "Finance Money Out launcher must clearly open the guided payout route and keep its stable mini-tool debug id."
);

assertContains(
  "appRoutes",
  /MONEY_IN: "\/app\/payment\/pool"[\s\S]*?MONEY_OUT: "\/app\/withdrawal-instructions"/,
  "App route registry must keep Money In and Money Out mapped to the live route pages."
);

assertContains(
  "actionTargets",
  /moneyIn: "MONEY_IN"[\s\S]*?moneyOut: "MONEY_OUT"/,
  "Shared CTA intent registry must keep Money In and Money Out as first-class intents."
);

assertContains(
  "moneyInPage",
  /sectionLabel="Money In"[\s\S]*?title="Payment Instructions"[\s\S]*?debugId="money-in\.generate-instruction"[\s\S]*?debugId="money-in\.route\.money-out"/,
  "Money In route page must remain a guided payment-instruction page with a traceable route to Money Out after completion."
);

assertContains(
  "appLayout",
  /if \(pathname === "\/app\/payment\/pool"\) \{[\s\S]*?title: "Money In"[\s\S]*?actions: \[[\s\S]*?makeFinanceItem\(\)[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?\{ label: "Notifications", to: "\/app\/notifications" \}[\s\S]*?makeCommunityItem\(\)[\s\S]*?makeDashboardItem\(\)/,
  "Money In focused task tools must keep a direct Notifications action so attention items do not require leaving the task through Welcome or a generic drawer."
);

assertContains(
  "moneyInPage",
  /Paying into[\s\S]*?Community: \{communityLabel\}[\s\S]*?Community ID: \{publicCommunityCode\}[\s\S]*?GSN ID: \{currentGmfnId \|\| "Not issued yet"\}/,
  "Money In route page must visibly show community name, community ID, and GSN ID before generating a reference."
);

assertContains(
  "moneyInPage",
  /Reference ready\. Pay this account with the exact reference\.[\s\S]*?Pay-in account is not ready for this marketplace\. Add the receiving account first\.[\s\S]*?A bank match or later finance reconciliation can confirm this[\s\S]*?payment\.[\s\S]*?Upload proof here if automatic matching is not live yet\./,
  "Money In route page must keep the pay-account panel direct, marketplace-scoped, and honest about finance-review proof upload."
);

assertContains(
  "moneyInPage",
  /Use the exact reference\. Upload proof here if automatic matching is not live yet\.[\s\S]*?Payment noted\. GSN finance still needs a bank match or proof review before this is confirmed\./,
  "Money In route page must describe the finance-match and proof-review fallback in user-facing language."
);

assertContains(
  "moneyInPage",
  /const moneyInCanWidenRoutes = Boolean\(matchedEvent\);[\s\S]*?const moneyInTaskStillActive = !moneyInCanWidenRoutes;/,
  "Money In next routes must reopen only after a visible matching payment event, not after the local I-paid note."
);

assertContains(
  "moneyInPage",
  /label: "Status"[\s\S]*?Matched by bank[\s\S]*?Payment noted[\s\S]*?Ready to pay/,
  "Money In result summary must show a simple user-facing status."
);

assertContains(
  "moneyOutPage",
  /sectionLabel="Money Out"[\s\S]*?title="Normal Withdrawal"[\s\S]*?debugId="money-out\.continue-direct"[\s\S]*?debugId="money-out\.route\.finance"/,
  "Money Out route page must remain a normal withdrawal page with a traceable route back to Finance."
);

assertContains(
  "communityMoney",
  /export async function requestPoolWithdrawal[\s\S]*?return postJson\([\s\S]*?"\/pool\/withdrawals\/request"[\s\S]*?payload\.clanId[\s\S]*?\);[\s\S]*?\n\}/,
  "Money Out API helper must preserve backend withdrawal rejection details instead of swallowing them."
);

assertContains(
  "moneyOutPage",
  /const withdrawableNowText = safeStr\([\s\S]*?moneySurface\?\.withdrawableNow \|\| effectiveAvailableText[\s\S]*?parseMoneyNumber\(withdrawableNowText\)[\s\S]*?your withdrawable balance is \$\{withdrawableNowText\}/,
  "Money Out must use backend withdrawable_now, not only effective_available, when deciding whether support is required."
);

assertContains(
  "moneyOutPage",
  /catch \(err: any\) \{[\s\S]*?insufficient \(withdrawable\|effective\) pool balance[\s\S]*?persistSupportHandoff\(\)[\s\S]*?navigateWithOrigin\(navigate, routes\.supportStart, location\)/,
  "Money Out must route stale backend insufficient-balance rejections into Support Requests."
);

assertContains(
  "moneyOutPage",
  /if \(requiresSupport\) \{[\s\S]*?navigateWithOrigin\(navigate, routes\.supportStart, location\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?await handleDirectWithdrawal\(\);/,
  "Money Out Continue must route over-limit requests to Support Requests and create a normal withdrawal request reference directly when the amount fits."
);

assertContains(
  "moneyOutPage",
  /Add your payout account first so GSN knows where this withdrawal should go\.[\s\S]*?Withdrawal request reference created\. Keep it visible; GSN finance reviews and reconciles before money moves\./,
  "Money Out normal withdrawal must require a payout account and keep request-reference creation separate from money movement."
);

assertContains(
  "moneyOutPage",
  /Withdrawal amount[\s\S]*?This is your money\. No purpose is needed for a normal withdrawal\.[\s\S]*?Reference can be created/,
  "Money Out normal withdrawal must stay purpose-free and create a request reference when the amount fits."
);

assertContains(
  "moneyOutPage",
  /Connections monitor[\s\S]*?debugId="money-out\.route\.finance"[\s\S]*?debugId="money-out\.route\.payout-details"[\s\S]*?debugId="money-out\.route\.marketplace"/,
  "Money Out post-result connections must stay limited to normal-withdrawal follow-ups."
);

if (/debugId="money-out\.route\.(readiness|workbench|loans|payment-rails|notifications)"/.test(sourceByFile.moneyOutPage)) {
  addFinding(
    files.moneyOutPage,
    sourceByFile.moneyOutPage,
    sourceByFile.moneyOutPage.search(/debugId="money-out\.route\.(readiness|workbench|loans|payment-rails|notifications)"/),
    "Money Out normal withdrawal must not expose deeper support/loan/admin routes after a direct withdrawal result."
  );
}

assertContains(
  "package",
  /"audit:finance-money-movement-lanes"/,
  "Finance Money In / Money Out lane audit must stay registered in package scripts."
);

assertContains(
  "protocol",
  /For Finance Money In \/ Money Out lane work[\s\S]*?audit:finance-money-movement-lanes/,
  "Guided work protocol must require the Money In / Money Out lane audit for this pair."
);

if (findings.length > 0) {
  console.error("Finance Money In / Money Out lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Finance Money In / Money Out lane audit passed.");
