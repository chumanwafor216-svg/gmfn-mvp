/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const shopControlFile = "src/pages/ShopControlPage.tsx";
const shopControlSpotlightWorkflowFile =
  "src/pages/shopControl/ShopControlSpotlightWorkflow.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const stableButtonFile = "src/components/StableButton.tsx";
const ownerShopHandlesFile = "src/lib/ownerShopHandles.ts";
const shopControlPageSource = readFileSync(
  join(frontendRoot, shopControlFile),
  "utf8"
);
const shopControlSpotlightWorkflowSource = readFileSync(
  join(frontendRoot, shopControlSpotlightWorkflowFile),
  "utf8"
);
const shopControlSource = shopControlPageSource.replace(
  /<ShopControlSpotlightWorkflow[\s\S]*?\/>/,
  shopControlSpotlightWorkflowSource
);
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const stableButtonSource = readFileSync(
  join(frontendRoot, stableButtonFile),
  "utf8"
);
const ownerShopHandlesSource = readFileSync(
  join(frontendRoot, ownerShopHandlesFile),
  "utf8"
);
const findings = [];

const expectedSourceActions = {
  PrimaryButton: 12,
  SecondaryButton: 24,
  SubtleButton: 3,
  StableButton: 5,
  StableCtaLink: 10,
  total: 54,
};
const expectedNativeFieldCount = 26;
const expectedFileInputActionRoots = 2;
const expectedMobileTaskShellBreakdown = {
  top: 2,
  drawer: 5,
  pageTools: 8,
  bottom: 0,
};
const expectedMobileTaskShellActions = Object.values(
  expectedMobileTaskShellBreakdown
).reduce((sum, count) => sum + count, 0);
const expectedWholeRouteActionRoots =
  expectedSourceActions.total +
  expectedFileInputActionRoots +
  expectedMobileTaskShellActions;

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function debugIdFrom(block) {
  return (
    block.match(/debugId="([^"]+)"/)?.[1] ||
    block.match(/debugId=\{`([^`]+)`\}/)?.[1] ||
    block.match(/debugId=\{([^}]+)\}/)?.[1] ||
    ""
  ).replace(/\s+/g, " ");
}

function assertShopContains(
  pattern,
  message,
  text = "Expected Shop Control pattern was not found."
) {
  if (pattern.test(shopControlSource)) return;
  findings.push({
    file: shopControlFile,
    line: 1,
    message,
    text,
  });
}

function assertLayoutContains(
  pattern,
  message,
  text = "Expected Shop Control app-shell pattern was not found."
) {
  if (pattern.test(appLayoutSource)) return;
  findings.push({
    file: appLayoutFile,
    line: 1,
    message,
    text,
  });
}

function assertStableButtonContains(
  pattern,
  message,
  text = "Expected StableButton system-level pattern was not found."
) {
  if (pattern.test(stableButtonSource)) return;
  findings.push({
    file: stableButtonFile,
    line: 1,
    message,
    text,
  });
}

function assertOwnerShopHandlesContains(
  pattern,
  message,
  text = "Expected owner shop handle registry pattern was not found."
) {
  if (pattern.test(ownerShopHandlesSource)) return;
  findings.push({
    file: ownerShopHandlesFile,
    line: 1,
    message,
    text,
  });
}

const actionPattern =
  /<(PrimaryButton|SecondaryButton|SubtleButton|StableButton|StableCtaLink)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(shopControlSource))) {
  const block = match[0];
  actions.push({
    tag: match[1],
    id: debugIdFrom(block),
    line: lineAt(shopControlSource, match.index),
    block,
  });
}

const sourceCounts = {
  PrimaryButton: actions.filter((action) => action.tag === "PrimaryButton")
    .length,
  SecondaryButton: actions.filter((action) => action.tag === "SecondaryButton")
    .length,
  SubtleButton: actions.filter((action) => action.tag === "SubtleButton")
    .length,
  StableButton: actions.filter((action) => action.tag === "StableButton")
    .length,
  StableCtaLink: actions.filter((action) => action.tag === "StableCtaLink")
    .length,
};
sourceCounts.total = Object.values(sourceCounts).reduce(
  (sum, count) => sum + count,
  0
);

for (const [key, value] of Object.entries(expectedSourceActions)) {
  if (sourceCounts[key] === value) continue;
  findings.push({
    file: shopControlFile,
    line: 1,
    message: `Shop Control ${key} source action inventory changed from ${value} to ${sourceCounts[key]}. Re-audit the new or removed controls on phone before accepting this baseline.`,
    text: actions
      .map((action) => `${action.line}:${action.id || "missing-debugId"}`)
      .join(", "),
  });
}

const nativeFields = [];
const nativeFieldPattern = /<(input|select|textarea)\b/g;
while ((match = nativeFieldPattern.exec(shopControlSource))) {
  nativeFields.push({
    line: lineAt(shopControlSource, match.index),
    type: match[1],
  });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({
    file: shopControlFile,
    line: 1,
    message: `Shop Control native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit every input/select/textarea as a mobile tap or typing surface before accepting this baseline.`,
    text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: shopControlFile,
      line: action.line,
      message: "Every Shop Control stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^shop-control\./.test(action.id)) {
    findings.push({
      file: shopControlFile,
      line: action.line,
      message: "Shop Control page actions must stay in the shop-control debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

}

const expectedActionOrder = [
  "shop-control.spotlight.setup.continue",
  "shop-control.spotlight.setup.cancel",
  "shop-control.spotlight.free-lane",
  "shop-control.spotlight.paid-lane",
  "shop-control.spotlight.media.image",
  "shop-control.spotlight.media.video",
  "shop-control.spotlight.media.both",
  "shop-control.spotlight.upload.preview",
  "shop-control.spotlight.upload.cancel",
  "shop-control.spotlight.preview.back",
  "shop-control.spotlight.preview.publish",
  "shop-control.spotlight.preview.cancel",
  "shop-control.hero-shortcut.${item.label.toLowerCase().replace(/\\s+/g, \"-\")}",
  "shop-control.vault.pay-1-slot",
  "shop-control.vault.pay-6-slots",
  "shop-control.vault.manage-offers",
  "shop-control.vault.create-link",
  "shop-control.verify.pay",
  "shop-control.verify.trust-slip",
  "shop-control.verify.public",
  "shop-control.subscription.open",
  "shop-control.subscription.publisher",
  "shop-control.package.extra-shop-block",
  "shop-control.package.extra-members",
  "shop-control.package.rosca-cycle",
  "shop-control.package.meeting-pack",
  "shop-control.rosca.start-cycle",
  "shop-control.rosca.record-payout",
  "shop-control.meeting.create-reminder",
  "shop-control.meeting.share-whatsapp",
  "shop-control.meeting.open-attendance",
  "shop-control.meeting.copy-attendance-link",
  "shop-control.meeting.record-attendance",
  "shop-control.meeting.bluetooth-check",
  "shop-control.meeting.record-summary",
  "shop-control.details.save",
  "shop-control.details.manage-products",
  "shop-control.analytics-panel.${panel.key}",
  "shop-control.opportunity-engine.panel.${panel.key}",
  "shop-control.vault-layer.manage-offers",
  "shop-control.vault-layer.create-link",
  "shop-control.vault-link.${item.id}.copy",
  "shop-control.vault-link.${item.id}.open",
  "shop-control.vault-link.${item.id}.extend",
  "shop-control.vault-link.${item.id}.revoke",
];
let cursor = -1;

for (const debugId of expectedActionOrder) {
  const next = shopControlSource.indexOf(debugId, cursor + 1);
  if (next === -1) {
    findings.push({
      file: shopControlFile,
      line: 1,
      message:
        "Shop Control front-to-inner action inventory is missing an expected action.",
      text: debugId,
    });
    continue;
  }

  if (next < cursor) {
    findings.push({
      file: shopControlFile,
      line: lineAt(shopControlSource, next),
      message:
        "Shop Control front-to-inner action order changed. Re-audit phone button flow before accepting this reorder.",
      text: debugId,
    });
  }

  cursor = next;
}

const rawActionPattern = /<(button|a|summary)\b|role="button"/g;
while ((match = rawActionPattern.exec(shopControlSource))) {
  findings.push({
    file: shopControlFile,
    line: lineAt(shopControlSource, match.index),
    message:
      "Shop Control must not bypass shared stable primitives with raw button, anchor, summary, or role=button controls.",
    text: shopControlSource
      .slice(match.index, match.index + 160)
      .replace(/\s+/g, " "),
  });
}

const fileInputActionRoots = [];
const fileInputPattern = /<input\b[\s\S]*?type="file"[\s\S]*?\/>/g;
while ((match = fileInputPattern.exec(shopControlSource))) {
  const block = match[0];
  if (/data-gmfn-action-root="true"/.test(block)) {
    fileInputActionRoots.push({
      line: lineAt(shopControlSource, match.index),
      id: block.match(/data-cta-id="([^"]+)"/)?.[1] || "",
      block,
    });
  }
}

if (fileInputActionRoots.length !== expectedFileInputActionRoots) {
  findings.push({
    file: shopControlFile,
    line: 1,
    message: `Shop Control file-input action-root inventory changed from ${expectedFileInputActionRoots} to ${fileInputActionRoots.length}. Re-audit upload tap handling before accepting this baseline.`,
    text: fileInputActionRoots
      .map((field) => `${field.line}:${field.id || "missing-data-cta-id"}`)
      .join(", "),
  });
}

const expectedFileInputIds = [
  "shop-control.spotlight.image-file",
  "shop-control.spotlight.video-file",
];
for (const expectedId of expectedFileInputIds) {
  if (fileInputActionRoots.some((field) => field.id === expectedId)) continue;
  findings.push({
    file: shopControlFile,
    line: 1,
    message:
      "Shop Control spotlight upload fields must keep stable data-cta-id values.",
    text: expectedId,
  });
}

const allActionRootMarkers =
  shopControlSource.match(/data-gmfn-action-root|data-cta-id/g)?.length || 0;
if (allActionRootMarkers !== expectedFileInputActionRoots * 2) {
  findings.push({
    file: shopControlFile,
    line: 1,
    message:
      "Shop Control data-gmfn-action-root/data-cta-id markers must stay limited to the two audited file-upload controls.",
    text: `Found ${allActionRootMarkers} action-root marker attributes.`,
  });
}

assertShopContains(
  /const ShopControlSpotlightWorkflow = React\.lazy\(\(\) => import\("\.\/shopControl\/ShopControlSpotlightWorkflow"\)\);[\s\S]*?const spotlightWorkflowSection = spotlightOpen \? \([\s\S]*?<React\.Suspense[\s\S]*?handleCreateSpotlight/,
  "Shop Control must lazy-load the Spotlight workflow only after the publisher lane opens while keeping publish state in the parent."
);

assertShopContains(
  /SHOP_CONTROL_SHORTCUTS[\s\S]*?from "\.\.\/lib\/ownerShopHandles";[\s\S]*?const SHOP_CONTROL_SHORTCUT_ICONS:[\s\S]*?"shop-billboard": "shop"[\s\S]*?"shop-diaries": "document"[\s\S]*?"shop-summary": "chart"[\s\S]*?"community-package": "financeInstitution"[\s\S]*?const shopHeroShortcuts:[\s\S]*?SHOP_CONTROL_SHORTCUTS\.map/,
  "Shop Control hero shortcuts must focus owner shop control: billboard, 12 Shop Diaries, summary, and Marketplace Capacity."
);

assertOwnerShopHandlesContains(
  /id: "community-package"[\s\S]*?label: "Marketplace Capacity"[\s\S]*?detail: "Extra member places, shop blocks, ROSCA, and meeting pack"[\s\S]*?SHOP_CONTROL_SHORTCUTS[\s\S]*?id: "community-package"[\s\S]*?label: "Marketplace capacity"/,
  "Shared owner-shop handles must expose the capacity lane as Marketplace Capacity while keeping the legacy community-package id."
);

assertOwnerShopHandlesContains(
  /function ownerShopLayerForTarget\(targetId: string\):[\s\S]*?normalized\.includes\("gallery"\)[\s\S]*?return "products";[\s\S]*?normalized\.includes\("package"\)[\s\S]*?return "paid-tools";/,
  "Shop Control hash routing must open gallery/diary links on the products layer and package links on the paid-tools package layer."
);

assertOwnerShopHandlesContains(
  /normalized\.includes\("merchant"\)[\s\S]*?normalized\.includes\("verify"\)[\s\S]*?normalized\.includes\("release"\)[\s\S]*?return "paid-tools";[\s\S]*?normalized\.includes\("spotlight"\)/,
  "Shop Control hash routing must open Merchant Release hashes on the paid-tools layer where the rail is rendered."
);

assertShopContains(
  /function isMerchantReleaseControlTarget[\s\S]*?OWNER_SHOP_HASHES\.merchantRelease[\s\S]*?normalized\.includes\("merchant"\)[\s\S]*?normalized\.includes\("verify"\)[\s\S]*?normalized\.includes\("release"\)[\s\S]*?const merchantReleaseHashFocused = useMemo[\s\S]*?isMerchantReleaseControlTarget\(decodeURIComponent\(rawTargetId\)\)/,
  "Shop Control must detect Merchant Release hash focus from either hash or section query."
);

assertShopContains(
  /merchantReleaseHashFocused \? "Merchant Release Rail" : "Optional paid tools"[\s\S]*?This is a paid verification and release-evidence activity[\s\S]*?order: merchantReleaseHashFocused \? 2 : 0[\s\S]*?id="shop-control-merchant-release-rail"[\s\S]*?order: merchantReleaseHashFocused \? 1 : 0/,
  "Merchant Release hash focus must lead with the Merchant Release rail instead of only showing the generic optional paid tools page."
);

assertShopContains(
  /setActiveOwnerLayer\(ownerShopLayerForTarget\(targetId\)\)/,
  "Shop Control must use the shared ownerShopLayerForTarget hash router."
);

assertShopContains(
  /function heroShortcutIconTile\([\s\S]*?width: 38,[\s\S]*?height: 38,[\s\S]*?background: "rgba\(255,255,255,0\.98\)"[\s\S]*?<GsnLegacyIcon name=\{name\} size=\{32\} \/>/,
  "Shop Control hero shortcuts must use larger white 3D icon tiles instead of tiny unframed glyphs."
);

assertShopContains(
  /const spotlightLaneIcon: GsnIconName = spotlightModeIsPaid[\s\S]*?\? "financeInstitution"[\s\S]*?: "megaphone";[\s\S]*?controlIconTile\("financeInstitution", spotlightPriorityMode === "paid"\)[\s\S]*?labelWithIcon\("financeInstitution", "Spotlight Subscription"\)/,
  "Shop Control paid spotlight and subscription surfaces must use institutional finance imagery instead of generic card imagery."
);

assertShopContains(
  /debugId="shop-control\.spotlight\.media\.both"[\s\S]*?inlineIcon\("image"\)[\s\S]*?inlineIcon\("video"\)[\s\S]*?<span>Picture \+ video<\/span>/,
  "Shop Control Picture + video choice must show both picture and video 3D meaning icons."
);

assertShopContains(
  /function inputStyle\(\): React\.CSSProperties \{[\s\S]*?minHeight: 48,[\s\S]*?fontFamily: "inherit",[\s\S]*?fontSize: 16,[\s\S]*?lineHeight: 1\.35,[\s\S]*?appearance: "none",[\s\S]*?WebkitAppearance: "none",[\s\S]*?touchAction: "manipulation",[\s\S]*?overflowAnchor: "none"/,
  "Shop Control native text fields must keep a system-level stable mobile input style to prevent browser focus zoom and tap jump."
);

assertShopContains(
  /function textAreaStyle\(\): React\.CSSProperties \{[\s\S]*?\.\.\.inputStyle\(\),[\s\S]*?minHeight: 96,[\s\S]*?resize: "none",[\s\S]*?overflow: "auto",[\s\S]*?lineHeight: 1\.45/,
  "Shop Control textareas must keep fixed resize behavior so the shop details card does not move under touch."
);

assertShopContains(
  /ShopTrafficSourceVisualPanel[\s\S]*?Where your attention came from[\s\S]*?Spotlight[\s\S]*?Shop gallery[\s\S]*?Product card[\s\S]*?The attention journey[\s\S]*?Try a simple 7-day experiment[\s\S]*?Attention is not a sale/,
  "Shop Control traffic sources must keep the picture-led attention-source summary."
);
assertShopContains(
  /function ShopEconomicEngineVisualPanel[\s\S]*?Shop & Marketplace[\s\S]*?Spotlight[\s\S]*?DemandBox[\s\S]*?Community context[\s\S]*?Trade evidence[\s\S]*?Trust layer/,
  "Shop Control Opportunity Engine must keep the picture-led GSN Economic Engine overview."
);
assertShopContains(
  /function ShopEconomicEngineVisualPanel[\s\S]*?Economic overview[\s\S]*?GSN[\s\S]*?Economic Engine[\s\S]*?Next evidence[\s\S]*?GSN shows recorded evidence/,
  "Shop Control Opportunity Engine must keep the recorded-evidence boundary on the GSN Economic Engine overview."
);
assertShopContains(
  /function ShopEconomicEngineVisualPanel[\s\S]*?compactWorkingNow[\s\S]*?title: "Shop"[\s\S]*?title: "Community"[\s\S]*?Evidence only: not sales, payment, delivery or trust proof/,
  "Shop Control Economic overview must keep a compact mobile layout with short labels and one boundary line."
);
assertShopContains(
  /<ShopEconomicEngineVisualPanel[\s\S]*?liveSignalCount=\{opportunityEngineLiveSignalCount\}[\s\S]*?demandOpenCount=\{openDemandSignalCount\}[\s\S]*?trustRecordsReady=\{tradeOutcomeReleasedRecords > 0\}/,
  "Shop Control Opportunity Engine must wire the GSN Economic Engine overview to live shop signals."
);
assertShopContains(
  /function ShopOpportunityLensesVisualPanel[\s\S]*?Economic demand[\s\S]*?Social movement[\s\S]*?Trust and safety[\s\S]*?Operations[\s\S]*?Governance and outside context[\s\S]*?Opportunity lenses[\s\S]*?Read local signals[\s\S]*?Local evidence only/,
  "Shop Control Opportunity Engine must keep the picture-led Opportunity lenses view."
);
assertShopContains(
  /function ShopOpportunityLensesVisualPanel[\s\S]*?compactLenses[\s\S]*?title: "Demand"[\s\S]*?title: "Outside"[\s\S]*?Local evidence only: not sales proof, trust approval, or a public conclusion/,
  "Shop Control Opportunity lenses must keep a compact mobile layout with short labels and one boundary line."
);
assertShopContains(
  /<ShopOpportunityLensesVisualPanel[\s\S]*?liveSignalCount=\{opportunityEngineLiveSignalCount\}[\s\S]*?demandOpenCount=\{openDemandSignalCount\}[\s\S]*?tradeRecords=\{tradeOutcomeRecords7Days\}/,
  "Shop Control Opportunity lenses visual must stay wired to live shop signals."
);
assertShopContains(
  /function ShopOpportunityLensesVisualPanel[\s\S]*?primaryLenses = compactLenses\.slice\(0, 4\)[\s\S]*?Governed sources only[\s\S]*?Local evidence only: not sales proof, trust approval, or a public conclusion/,
  "Shop Control Opportunity lenses phone view must keep one compact collection and one boundary."
);
assertShopContains(
  /opportunityEngineSignalTiles\.map[\s\S]*?display: activeOpportunityEnginePanel === "overview" && !isCompact \? "grid" : "none"/,
  "Shop Control Economic overview must hide repeated detail stacks on phone."
);
assertShopContains(
  /display: isCompact \? "none" : "grid"[\s\S]*?opportunityEngineLensRows\.map/,
  "Shop Control Opportunity lenses must hide repeated lens detail rows on phone."
);
assertShopContains(
  /function ShopFirstTradeRecordVisualPanel[\s\S]*?Agree terms[\s\S]*?Release item[\s\S]*?Confirm payment[\s\S]*?Record outcome[\s\S]*?Build your first trade record[\s\S]*?Nothing recorded yet[\s\S]*?What counts as evidence[\s\S]*?A record supports a decision/,
  "Shop Control protected trade analytics must keep the picture-led first trade record guide."
);
assertShopContains(
  /<ShopFirstTradeRecordVisualPanel[\s\S]*?protectedTrades=\{tradeOutcomeRecords7Days\}[\s\S]*?releasedRecords=\{tradeOutcomeReleasedRecords\}[\s\S]*?receiptRecords=\{tradeOutcomeReceiptConfirmedRecords\}[\s\S]*?disputeRecords=\{tradeOutcomeDisputeRecords\}/,
  "Shop Control first trade record guide must stay wired to live protected-trade counts."
);
assertShopContains(
  /function ShopBusinessReturnReadinessVisualPanel[\s\S]*?compactMissing = missingEvidence\.slice\(0, 4\)[\s\S]*?Return readiness[\s\S]*?Missing: cost, outcomes, repeat value\.[\s\S]*?Readiness only: not return, profit or investor-grade evidence/,
  "Shop Control return evidence must keep a compact mobile business return view with one boundary."
);
assertShopContains(
  /function ShopBusinessReturnReadinessVisualPanel[\s\S]*?Business return readiness[\s\S]*?Promotion evidence[\s\S]*?Cost & effort[\s\S]*?Business return[\s\S]*?What is still needed[\s\S]*?Next: build the trail[\s\S]*?Readiness only/,
  "Shop Control return evidence must keep the picture-led desktop business return readiness view."
);
assertShopContains(
  /function ShopOpportunityReadingVisualPanel[\s\S]*?Opportunity reading[\s\S]*?Guidance changes with evidence\.[\s\S]*?Not a forecast[\s\S]*?Market Wisdom snapshot[\s\S]*?Snapshot only: not sales proof, public trend or automatic decision/,
  "Shop Control Opportunity Engine Wisdom must keep a compact mobile opportunity reading view with one boundary."
);
assertShopContains(
  /function ShopOpportunityReadingVisualPanel[\s\S]*?Now[\s\S]*?90 days[\s\S]*?1 year[\s\S]*?2-5 years[\s\S]*?Opportunity reading[\s\S]*?Guidance, not a forecast[\s\S]*?Market Wisdom snapshot[\s\S]*?Snapshot only/,
  "Shop Control Opportunity Engine Wisdom must keep the picture-led desktop opportunity reading view."
);
assertShopContains(
  /activeOpportunityEnginePanel === "wisdom" && !isCompact[\s\S]*?Opportunity reading[\s\S]*?activeOpportunityEnginePanel === "wisdom" && !isCompact[\s\S]*?opportunityEngineWisdomSnapshot/,
  "Shop Control Wisdom must hide repeated detailed reading rows on phone."
);
assertShopContains(
  /activeOpportunityEnginePanel === "return-evidence"[\s\S]*?display: isCompact \? "none" : "flex"[\s\S]*?display: isCompact \? "none" : "block"[\s\S]*?ShopBusinessReturnReadinessVisualPanel[\s\S]*?display: isCompact \? "none" : "grid"[\s\S]*?shop-control\.opportunity-engine\.unit-economics/,
  "Shop Control Return evidence must hide repeated desktop evidence rows on phone."
);
assertShopContains(
  /function ShopEvidenceCaptureChecklistVisualPanel[\s\S]*?Evidence checklist[\s\S]*?Build records before judging return\.[\s\S]*?Checklist only: not a saved report, sales proof, billing right or trust score/,
  "Shop Control Experiments must keep a compact mobile evidence checklist with one boundary."
);
assertShopContains(
  /activeOpportunityEnginePanel === "experiments" && isCompact[\s\S]*?<ShopEvidenceCaptureChecklistVisualPanel[\s\S]*?captureRows=\{opportunityEngineCaptureChecklistRows\}[\s\S]*?aggregatorReady=\{Boolean\(shopAttentionSummary\?\.opportunity_engine\?\.aggregator_ready\)\}/,
  "Shop Control Experiments compact visual must stay wired to live Opportunity Engine evidence rows."
);
assertShopContains(
  /display: activeOpportunityEnginePanel === "experiments" && !isCompact \? "block" : "none"[\s\S]*?shop-control\.opportunity-engine\.capture-checklist[\s\S]*?display: activeOpportunityEnginePanel === "experiments" && !isCompact \? "block" : "none"[\s\S]*?shop-control\.opportunity-engine\.experiment-plan/,
  "Shop Control Experiments must hide detailed checklist, ledger, output-card and experiment rows on phone."
);
assertShopContains(
  /display: isCompact && activeOpportunityEnginePanel !== "overview" \? "none" : "flex"[\s\S]*?Economic overview[\s\S]*?<ShopEconomicEngineVisualPanel/,
  "Shop Control Advanced Analytics must hide only the overview intro/visual above compact sub-tabs, not the active tab body."
);
assertShopContains(
  /display: activeOpportunityEnginePanel === "signals" \? "grid" : "none"[\s\S]*?Small Seller Helper/,
  "Shop Control Small Seller Helper must stay scoped to the Signals lane."
);
assertShopContains(
  /\? `\$\{demandContextLabel\}\. DemandBox is context only\.`/,
  "Shop Control Community Needs must keep short compact phone copy."
);
assertShopContains(
  /<ShopBusinessReturnReadinessVisualPanel[\s\S]*?visitors=\{attentionVisitors7Days\}[\s\S]*?productOpens=\{attentionProductOpens7Days\}[\s\S]*?contactTaps=\{attentionContactTaps7Days\}[\s\S]*?tradeRecords=\{tradeOutcomeRecords7Days\}/,
  "Shop Control business return readiness visual must stay wired to live shop signals."
);
assertShopContains(
  /<ShopOpportunityReadingVisualPanel[\s\S]*?spotlightSeen=\{attentionSpotlightImpressions7Days\}[\s\S]*?eligibleAccounts=\{attentionPossibleSpotlightReach\}[\s\S]*?visitors=\{attentionVisitors7Days\}[\s\S]*?demandOpenCount=\{openDemandSignalCount\}[\s\S]*?tradeRecords=\{tradeOutcomeRecords7Days\}/,
  "Shop Control Opportunity reading visual must stay wired to live shop signals."
);
assertShopContains(
  /ShopVisualSummaryCard[\s\S]*?Shop health at a glance[\s\S]*?Shop items[\s\S]*?Spotlight[\s\S]*?DemandBox[\s\S]*?Protected trade/,
  "Shop Control analytics must keep the picture-led shop health summary for low-literacy owner review."
);

assertShopContains(
  /Try this next[\s\S]*?Share once[\s\S]*?Wait 7 days[\s\S]*?Ask buyers/,
  "Shop Control analytics must keep the visual next-step plan."
);

assertShopContains(
  /function ShopEvidenceLayerStrip[\s\S]*?Evidence grows in layers[\s\S]*?<ShopEvidenceLayerStrip isCompact=\{isCompact\}/,
  "Shop Control analytics must keep the evidence layer strip."
);

assertShopContains(
  /Attention is not proof of sales, payment, delivery or trust/,
  "Shop Control analytics must keep the simple no-sales-proof boundary near the visual summary."
);

assertShopContains(
  /function ShopLearnBeforeScalePanel[\s\S]*?Record cost[\s\S]*?One change[\s\S]*?Set date[\s\S]*?Save result[\s\S]*?7 days[\s\S]*?30 days[\s\S]*?90 days[\s\S]*?Learn before you scale[\s\S]*?<ShopLearnBeforeScalePanel isCompact=\{isCompact\}/,
  "Opportunity Engine must keep the learn-before-scale picture panel with 7, 30, and 90 day windows."
);
if (/letterSpacing:\s*[1-9]/.test(shopControlSource)) {
  findings.push({
    file: shopControlFile,
    line: lineAt(shopControlSource, shopControlSource.search(/letterSpacing:\s*[1-9]/)),
    message: "Shop Control must not use spaced-out uppercase section labels on phone-polished surfaces.",
    text: shopControlSource.match(/letterSpacing:\s*[1-9][^,\n]*/)?.[0] || "",
  });
}

if (/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢|ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½/.test(shopControlSource)) {
  findings.push({
    file: shopControlFile,
    line: lineAt(shopControlSource, shopControlSource.search(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢|ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½/)),
    message: "Shop Control must not show mojibake/broken encoding characters in user-facing copy.",
    text: shopControlSource.match(/.*(?:ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢|ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½).*/)?.[0]?.trim() || "",
  });
}

assertShopContains(
  /activeOwnerLayer === "products" \? \(\s*<section\s*id="shop-control-gallery-tools"/,
  "Shop Control overview must not expose the embedded product/gallery workspace before the owner opens Shop gallery."
);

assertShopContains(
  /id="shop-control-gallery-tools"[\s\S]*?Shop Gallery Tools[\s\S]*?Control the public shop billboard and 12 Shop Diaries[\s\S]*?open Marketplace Capacity[\s\S]*?debugId="shop-control\.gallery\.shop-billboard"[\s\S]*?debugId="shop-control\.gallery\.community-package"[\s\S]*?Marketplace capacity/,
  "Shop Control gallery tools must expose billboard control and Marketplace Capacity from the 12 Shop Diaries lane."
);

if (
  /activeOwnerLayer === "overview"\s*\|\|\s*activeOwnerLayer === "products"\s*\?\s*\(\s*<section\s*id="shop-control-gallery-tools"/.test(
    shopControlSource
  )
) {
  findings.push({
    file: shopControlFile,
    line: 1,
    message:
      "Shop Control must not render Shop gallery tools on the plain overview.",
    text: "Render #shop-control-gallery-tools only when activeOwnerLayer is products.",
  });
}

assertShopContains(
  /Marketplace capacity[\s\S]*?Add capacity when the marketplace needs more[\s\S]*?Generate the exact capacity reference[\s\S]*?Other capacity units: GBP 1[\s\S]*?Latest capacity reference[\s\S]*?debugId="shop-control\.package\.rosca-cycle"[\s\S]*?debugId="shop-control\.rosca\.start-cycle"[\s\S]*?debugId="shop-control\.rosca\.record-payout"/,
  "Shop Control must keep Marketplace Capacity wording and connect the ROSCA capacity action to the ROSCA cycle and payout controls."
);

assertShopContains(
  /debugId="shop-control\.package\.meeting-pack"[\s\S]*?debugId="shop-control\.meeting\.create-reminder"[\s\S]*?debugId="shop-control\.meeting\.share-whatsapp"[\s\S]*?debugId="shop-control\.meeting\.interest-yes"[\s\S]*?debugId="shop-control\.meeting\.interest-maybe"[\s\S]*?debugId="shop-control\.meeting\.interest-no"[\s\S]*?debugId="shop-control\.meeting\.open-attendance"[\s\S]*?debugId="shop-control\.meeting\.copy-attendance-link"[\s\S]*?debugId="shop-control\.meeting\.record-attendance"[\s\S]*?debugId="shop-control\.meeting\.bluetooth-check"[\s\S]*?debugId="shop-control\.meeting\.record-summary"/,
  "Shop Control meeting/reminder controls must keep reminder, WhatsApp share, planning response, attendance check-in, and summary action roots together."
);

assertShopContains(
  /Attendance registry[\s\S]*?QRCodeSVG[\s\S]*?Bluetooth check[\s\S]*?Presence Evidence only/,
  "Shop Control meeting attendance must expose QR rendering, an explicit Bluetooth chooser action, and a Presence Evidence boundary."
);

assertShopContains(
  /async function recordBluetoothPresenceAttendance[\s\S]*?navigator as NavigatorWithBluetooth[\s\S]*?requestDevice[\s\S]*?Device identifier was not stored by GSN UI/,
  "Shop Control Bluetooth attendance must use an explicit browser chooser and keep device identifiers out of stored UI evidence."
);

assertShopContains(
  /onClick=\{\(\) => recordMeetingAttendanceCheckin\("qr"\)\}[\s\S]*?activeAttendanceIsBluetooth \? "QR fallback" : "Record my attendance"/,
  "Shop Control must not record proximity attendance from the ordinary attendance button; Bluetooth evidence requires the explicit chooser."
);

assertLayoutContains(
  /if \(pathname === "\/app\/shop-control"\) \{[\s\S]*?title: "Shop Control"[\s\S]*?actions: \[[\s\S]*?makeCommunityItem\(\)[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeDashboardItem\(\)[\s\S]*?\]/,
  "Shop Control task mode must keep Community, Marketplace, and Dashboard as its focused escape actions."
);

assertLayoutContains(
  /function shouldKeepBottomRailInTaskMode\(pathname: string\): boolean \{[\s\S]*?return \([\s\S]*?pathname === "\/app\/loans"[\s\S]*?\);[\s\S]*?\}[\s\S]*?const showMobileBottomRail =[\s\S]*?isMobile && \(!taskMode \|\| shouldKeepBottomRailInTaskMode\(location\.pathname\)\)/,
  "Shop Control focused-task mode must keep the mobile bottom rail hidden unless the route is explicitly allowlisted."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.open-navigation"[\s\S]*?debugId="app-layout\.mobile\.open-tools"/,
  "Shop Control mobile route surface must count the two fixed top navigator buttons: Menu and Tools."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-navigation"[\s\S]*?mobileDrawerGroups\.map[\s\S]*?debugId=\{`app-layout\.drawer\.\$\{group\.debugKey\}[\s\S]*?debugId="app-layout\.drawer\.logout"/,
  "Shop Control mobile drawer must count close, three focused route links, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-tools"[\s\S]*?debugId="app-layout\.tools\.share-trustslip\.toggle"[\s\S]*?TRUST_SLIP_SHARE_PURPOSES\.map[\s\S]*?debugId=\{`app-layout\.tools\.trustslip-purpose\.\$\{purpose\.key\}`\}[\s\S]*?debugId="app-layout\.tools\.trustslip-refresh"[\s\S]*?debugId="app-layout\.tools\.trustslip-share"/,
  "Shop Control mobile Tools panel must count the guided TrustSlip verification controls as part of the outer navigator surface."
);

assertLayoutContains(
  /function mobileIconButton\(\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?overflow: "hidden"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"[\s\S]*?function MobileTopIcon/,
  "Shop Control mobile top Menu and Tools buttons must keep fixed 44px geometry."
);

assertLayoutContains(
  /function drawerLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 48,[\s\S]*?minHeight: 48,[\s\S]*?maxHeight: 48[\s\S]*?pointerEvents: "auto"[\s\S]*?overflow: "hidden"[\s\S]*?textOverflow: "ellipsis"/,
  "Shop Control mobile drawer buttons must keep fixed 48px geometry."
);

assertLayoutContains(
  /function actionsLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?pointerEvents: "auto"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"/,
  "Shop Control mobile Tools panel buttons must keep fixed 44px geometry."
);

assertStableButtonContains(
  /const CLICK_DEBOUNCE_MS = 360[\s\S]*?const stableMovementLock: React\.CSSProperties = \{[\s\S]*?transform: "none"[\s\S]*?transition: "none"[\s\S]*?overflowAnchor: "none"/,
  "Shop Control depends on StableButton's debounce and movement lock for non-jumpy owner controls."
);

assertStableButtonContains(
  /data-gmfn-action-root="true"[\s\S]*?data-cta-id=\{resolvedDebugId\}[\s\S]*?onPointerDownCapture=\{guardedPointerDownCapture\}[\s\S]*?onPointerDown=\{guardedPointerDown\}[\s\S]*?onClick=\{handleClick\}/,
  "Shop Control stable buttons must keep action-root IDs and guarded pointer/click handling."
);

assertStableButtonContains(
  /<OriginLink[\s\S]*?data-gmfn-action-root="true"[\s\S]*?data-cta-id=\{resolvedDebugId\}[\s\S]*?onPointerDownCapture=\{guardedPointerDownCapture\}[\s\S]*?onPointerDown=\{guardedPointerDown\}[\s\S]*?onClickCapture=\{guardedClickCapture\}[\s\S]*?onClick=\{handleClick\}/,
  "Shop Control stable links must keep action-root IDs and guarded pointer/click handling."
);

if (findings.length > 0) {
  console.error("Shop Control button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Shop Control button inventory audit passed: ${sourceCounts.PrimaryButton} PrimaryButton, ` +
    `${sourceCounts.SecondaryButton} SecondaryButton, ` +
    `${sourceCounts.SubtleButton} SubtleButton, ` +
    `${sourceCounts.StableButton} StableButton, ` +
    `${sourceCounts.StableCtaLink} StableCtaLink, ` +
    `${nativeFields.length} native fields (${expectedFileInputActionRoots} file-input action roots), ` +
    `${expectedMobileTaskShellActions} focused mobile app-shell controls ` +
    `(${expectedMobileTaskShellBreakdown.top} top, ${expectedMobileTaskShellBreakdown.drawer} drawer, ` +
    `${expectedMobileTaskShellBreakdown.pageTools} tools, ${expectedMobileTaskShellBreakdown.bottom} bottom), ` +
    `${expectedWholeRouteActionRoots} whole-route mobile action roots total, ` +
    `plus ${expectedNativeFieldCount - expectedFileInputActionRoots} ordinary native fields.`
);
