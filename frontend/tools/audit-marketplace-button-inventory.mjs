/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const appRoutesFile = "src/lib/appRoutes.ts";
const ctaTargetsFile = "src/lib/ctaTargets.ts";
const actionTargetRoutesFile = "src/lib/actionTargetRoutes.ts";
const source = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const appRoutesSource = readFileSync(join(frontendRoot, appRoutesFile), "utf8");
const ctaTargetsSource = readFileSync(join(frontendRoot, ctaTargetsFile), "utf8");
const actionTargetRoutesSource = readFileSync(
  join(frontendRoot, actionTargetRoutesFile),
  "utf8"
);
const findings = [];
const expectedStableActionCount = 61;
const expectedNativeFieldCount = 13;
const expectedSourceBreakdown = {
  front: 17,
  body: 44,
};
const expectedVisibleIntentActionCount = 13;
const expectedMobileShellBreakdown = {
  top: 2,
  drawer: 30,
  pageTools: 8,
  bottom: 7,
};
const expectedMobileShellActionCount = Object.values(
  expectedMobileShellBreakdown
).reduce((sum, count) => sum + count, 0);
const expectedWholeMobileRouteActionCount =
  expectedStableActionCount + expectedMobileShellActionCount;

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  findings.push({
    file: marketplaceFile,
    line: 1,
    message,
    text: "Expected Marketplace button inventory pattern was not found.",
  });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

function assertLayoutContains(pattern, message) {
  if (pattern.test(appLayoutSource)) return;
  findings.push({
    file: appLayoutFile,
    line: 1,
    message,
    text: "Expected Marketplace app-shell action inventory pattern was not found.",
  });
}

function assertFileContains(file, text, pattern, message) {
  if (pattern.test(text)) return;
  findings.push({
    file,
    line: 1,
    message,
    text: "Expected pattern was not found.",
  });
}

function sectionBetween(startPattern, endPattern) {
  const start = source.search(startPattern);
  if (start === -1) return "";
  const rest = source.slice(start);
  const end = rest.search(endPattern);
  return end === -1 ? rest : rest.slice(0, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactDebugId(debugId) {
  return {
    label: debugId,
    pattern: new RegExp(`debugId="${escapeRegExp(debugId)}"`),
  };
}

function dynamicDebugId(label, pattern) {
  return { label, pattern };
}

function marketplaceActionArea(debugId) {
  if (
    /^marketplace\.empty\./.test(debugId) ||
    /^marketplace\.tile\./.test(debugId) ||
    /^marketplace\.row\./.test(debugId) ||
    debugId === "marketplace.extra-tools.toggle" ||
    /^marketplace\.intent\./.test(debugId)
  ) {
    return "front";
  }

  if (/^marketplace\./.test(debugId)) return "body";

  return "unknown";
}

const actionPattern = /<Stable(?:Button|CtaLink)\b[\s\S]*?(?:\/>|<\/Stable(?:Button|CtaLink)>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  const debugMatch = block.match(/debugId=(?:"([^"]+)"|\{`([^`]+)`\}|\{([^}]+)\})/);
  actions.push({
    line: lineAt(match.index),
    debugId: debugMatch?.[1] || debugMatch?.[2] || debugMatch?.[3] || "",
    block,
  });
}

const nativeFieldPattern = /<(input|select|textarea)\b[\s\S]*?(?:\/>|<\/(?:select|textarea)>)/g;
const nativeFields = [];
while ((match = nativeFieldPattern.exec(source))) {
  const block = match[0];
  nativeFields.push({
    line: lineAt(match.index),
    type: match[1],
    block,
  });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: `Marketplace native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit every input/select/textarea as a mobile tap surface before accepting this baseline.`,
    text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", "),
  });
}

for (const field of nativeFields) {
  if (!/\{\s*\.\.\.marketplaceFieldTouchProps\(\s*"[^"]+"\s*\)\s*\}/.test(field.block)) {
    findings.push({
      file: marketplaceFile,
      line: field.line,
      message: "Every Marketplace native input/select/textarea must use marketplaceFieldTouchProps because mobile field taps can leak into neighbouring route buttons.",
      text: field.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

assertContains(
  /function marketplaceFieldTouchProps\(debugId: string\)[\s\S]*?"data-gmfn-action-root": "true"[\s\S]*?"data-cta-id": debugId[\s\S]*?"data-gmfn-debug-id": debugId[\s\S]*?onPointerDownCapture: stopMarketplaceTap[\s\S]*?onPointerDown: stopMarketplaceTap[\s\S]*?onPointerUpCapture: stopMarketplaceTap[\s\S]*?onPointerUp: stopMarketplaceTap[\s\S]*?onMouseDownCapture: stopMarketplaceTap[\s\S]*?onMouseDown: stopMarketplaceTap[\s\S]*?onClickCapture: stopMarketplaceTap[\s\S]*?onClick: stopMarketplaceTap/,
  "Marketplace native field tap roots must use stable action-root metadata and pointer/mouse/click guards without touch double-fire handlers."
);

if (actions.length !== expectedStableActionCount) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: `Marketplace Stable action inventory changed from ${expectedStableActionCount} to ${actions.length}. Re-audit the new or removed action on phone before accepting this baseline.`,
    text: actions.map((action) => `${action.line}:${action.debugId || "missing-debugId"}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.debugId) {
    findings.push({
      file: marketplaceFile,
      line: action.line,
      message: "Every Marketplace stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/style=/.test(action.block)) {
    findings.push({
      file: marketplaceFile,
      line: action.line,
      message: "Every Marketplace stable action must declare route-local phone-safe geometry.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const sourceBreakdown = actions.reduce(
  (counts, action) => {
    const area = marketplaceActionArea(action.debugId);
    counts[area] = (counts[area] || 0) + 1;
    return counts;
  },
  { front: 0, body: 0, unknown: 0 }
);

if (
  sourceBreakdown.front !== expectedSourceBreakdown.front ||
  sourceBreakdown.body !== expectedSourceBreakdown.body ||
  sourceBreakdown.unknown !== 0
) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: "Marketplace action inventory front/body split changed. Re-count visible phone actions before accepting this baseline.",
    text:
      `front=${sourceBreakdown.front}/${expectedSourceBreakdown.front}, ` +
      `body=${sourceBreakdown.body}/${expectedSourceBreakdown.body}, ` +
      `unknown=${sourceBreakdown.unknown}`,
  });
}

const intentItemsBlock = source.match(
  /const MARKETPLACE_INTENT_ITEMS: MarketplaceIntentItem\[\] = \[[\s\S]*?\n\];/
);
const visibleIntentActionCount = intentItemsBlock
  ? (intentItemsBlock[0].match(/\bid: "/g) || []).length -
    (intentItemsBlock[0].match(/visible: false/g) || []).length
  : 0;

if (visibleIntentActionCount !== expectedVisibleIntentActionCount) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: "Marketplace visible intent-button count changed. Re-audit the expanded More marketplace tools panel on phone.",
    text: `visible intent buttons=${visibleIntentActionCount}/${expectedVisibleIntentActionCount}`,
  });
}

assertContains(
  /debugId="marketplace\.tile\.money"[\s\S]{0,260}aria-label="Open Money In, Money Out, dues and contributions"[\s\S]{0,260}openMarketplaceSection\(event, "money", "marketplace-money-routes"\)[\s\S]{0,520}<MarketplaceGlyph name="pool"[\s\S]{0,260}Money Pool[\s\S]{0,260}Start here: dues and money routes/,
  "Marketplace Money Pool tile must open the money section only, with a clear label that cannot be confused with Trust Passport."
);

assertContains(
  /Start with Money Pool[\s\S]{0,520}Check this community's pool first,[\s\S]{0,260}Money[\s\S]{0,80}Out, or Finance from that lane/,
  "Marketplace front door must keep a non-button Money Pool start-here guide before deeper operating lanes."
);

assertContains(
  /debugId="marketplace\.tile\.rosca"[\s\S]{0,300}aria-label="Open ROSCA contribution cycles for this marketplace"[\s\S]{0,320}openMarketplaceSection\(event, "rosca", "marketplace-rosca"\)[\s\S]{0,520}<MarketplaceGlyph name="rosca"[\s\S]{0,260}ROSCA[\s\S]{0,260}Member savings circle/,
  "Marketplace ROSCA tile must open the ROSCA section only and stay visible as its own Marketplace emblem."
);

assertContains(
  /debugId="marketplace\.tile\.support"[\s\S]{0,300}aria-label="Open Support Requests, guarantors and loans"[\s\S]{0,320}openMarketplaceSection\(\s*event,\s*"support",\s*"marketplace-loans-support"\s*\)[\s\S]{0,520}<MarketplaceGlyph name="support"[\s\S]{0,260}Support Requests[\s\S]{0,260}Guided help request/,
  "Marketplace Support Requests tile must open the support section only."
);

assertContains(
  /debugId="marketplace\.tile\.trust"[\s\S]{0,300}aria-label="Open this marketplace trust summary"[\s\S]{0,180}onClick=\{toggleProfileDetails\}/,
  "Marketplace Trust tile must toggle the local marketplace trust summary, not hijack the Money Pool tile or route directly to Trust Passport."
);

assertContains(
  /debugId="marketplace\.tile\.members"[\s\S]*?aria-label="Open trusted trade, members and visible shops"[\s\S]*?openMarketplaceSection\(\s*event,\s*"members",\s*"marketplace-members-shops"\s*\)[\s\S]*?<MarketplaceGlyph name="trade"[\s\S]*?Trusted Trade[\s\S]*?Known members and shops/,
  "Marketplace Trusted Trade tile must open the members/shops trade lane with community-bound wording."
);

assertContains(
  /debugId="marketplace\.row\.money"[\s\S]{0,300}aria-label="Open Money In and Money Out for this marketplace"[\s\S]{0,300}openMarketplaceSection\(event, "money", "marketplace-money-routes"\)/,
  "Marketplace Money In / Money Out row must open the money section only."
);

assertContains(
  /debugId="marketplace\.row\.rosca"[\s\S]*?aria-label="Open ROSCA contribution cycles for this marketplace"[\s\S]*?openMarketplaceSection\(event, "rosca", "marketplace-rosca"\)[\s\S]*?Start a guided member savings circle in this community/,
  "Marketplace ROSCA operating row must open the ROSCA section only."
);

assertContains(
  /debugId="marketplace\.row\.loan-process"[\s\S]*?aria-label="Open Loan Process and support workbench"[\s\S]*?openMarketplaceSection\(\s*event,\s*"support",\s*"marketplace-loans-support"\s*\)[\s\S]*?Support Request[\s\S]*?Start the request, check fit, then continue the borrowing flow/,
  "Marketplace Support Request operating row must open the support section only and explain the guided flow."
);

assertContains(
  /debugId="marketplace\.row\.member-ledger"[\s\S]*?aria-label="Open Member Ledger and visible shops"[\s\S]*?openMarketplaceSection\(\s*event,\s*"members",\s*"marketplace-members-shops"\s*\)[\s\S]*?Trusted Trade[\s\S]*?See known members, GSN IDs, and connected shops/,
  "Marketplace Trusted Trade operating row must open the members/shops trade lane with clear member-shop wording."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"[\s\S]*?function touchedMarketplaceSectionState[\s\S]*?\[key\]: true/,
  "Marketplace Support Requests must no longer open Members visually; each major lane must focus one open body."
);

assertContains(
  /id="marketplace-money-routes"[\s\S]*?Money Pool[\s\S]*?This community's pool, money in, and money out\.[\s\S]*?Visible Pool[\s\S]*?Current pool view[\s\S]*?Community Account[\s\S]*?Money In route[\s\S]*?Personal Payout[\s\S]*?Money Out route/,
  "Marketplace money route detail must keep the compact Money Pool reference-card structure."
);

const moneySection = sectionBetween(
  /id="marketplace-money-routes"/,
  /id="marketplace-rosca"/
);

if (!moneySection) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: "Marketplace money route section was not found for scoped button auditing.",
    text: "Expected id=\"marketplace-money-routes\" before id=\"marketplace-owned-links\".",
  });
} else {
  const moneyActionIds = [
    ...moneySection.matchAll(/debugId="(marketplace\.money\.[^"]+)"/g),
  ].map((item) => item[1]);
  const expectedMoneyActionIds = [
    "marketplace.money.toggle",
    "marketplace.money.money-in",
    "marketplace.money.money-out",
    "marketplace.money.finance",
  ];

  if (moneyActionIds.join("|") !== expectedMoneyActionIds.join("|")) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(moneySection)),
      message: "Marketplace money detail section must expose only the audited money actions in the audited order.",
      text: `found=${moneyActionIds.join(", ") || "none"}`,
    });
  }

  if (/(trust|trustSlip|trustslip|cci|identity|Trust Passport|TrustSlip|CCI)/.test(moneySection)) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(moneySection)),
      message: "Marketplace money detail section must not contain Trust Passport, TrustSlip, CCI, or identity route wording/calls.",
      text: "Money detail should remain Money In, Money Out, and Finance only.",
    });
  }
}

const roscaSection = sectionBetween(
  /id="marketplace-rosca"/,
  /id="marketplace-owned-links"/
);

if (!roscaSection) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: "Marketplace ROSCA section was not found for scoped button auditing.",
    text: "Expected id=\"marketplace-rosca\" before id=\"marketplace-owned-links\".",
  });
} else {
  const roscaActionIds = [
    ...roscaSection.matchAll(/debugId="(marketplace\.rosca\.[^"]+)"/g),
  ].map((item) => item[1]);
  const expectedRoscaActionIds = [
    "marketplace.rosca.toggle",
    "marketplace.rosca.activate-yearly",
    "marketplace.rosca.start-cycle",
    "marketplace.rosca.record-payout",
  ];

  if (roscaActionIds.join("|") !== expectedRoscaActionIds.join("|")) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(roscaSection)),
      message: "Marketplace ROSCA section must expose only the audited ROSCA actions in the audited order.",
      text: `found=${roscaActionIds.join(", ") || "none"}`,
    });
  }

  if (!/Activate the GBP 60 yearly ROSCA service before starting a cycle/.test(roscaSection)) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(roscaSection)),
      message: "Marketplace ROSCA Start button must stay tappable and explain inactive yearly service instead of becoming a dead disabled button.",
      text: "Expected inactive yearly service explainer was not found.",
    });
  }

  [
    /Member savings circle for this community only/,
    /What this savings circle does/,
    /Step \{step\}/,
    /Activate yearly service/,
    /Start member cycle/,
    /Record payout/,
    /roscaYearlyActive \? "secondary" : "primary"/,
  ].forEach((pattern) => {
    if (!pattern.test(roscaSection)) {
      findings.push({
        file: marketplaceFile,
        line: lineAt(source.indexOf(roscaSection)),
        message: "Marketplace ROSCA lane must keep the guided three-step savings-circle structure.",
        text: pattern.toString(),
      });
    }
  });
}

const trustedTradeSection = sectionBetween(
  /id="marketplace-members-shops"/,
  /id="marketplace-loans-support"/
);

if (!trustedTradeSection) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: "Marketplace Trusted Trade section was not found for scoped button auditing.",
    text: "Expected id=\"marketplace-members-shops\" before id=\"marketplace-loans-support\".",
  });
} else {
  [
    /Trusted Trade/,
    /See known members and visible shops inside this selected/,
    /What this trade lane does/,
    /community-bound/,
    /Step \{step\}/,
    /Check the member[\s\S]*?Read the name and GSN ID first/,
    /Open the shop[\s\S]*?Visit only shops visible in this community/,
    /Keep it local[\s\S]*?Use other lanes for support, money, or trust work/,
    /debugId=\{`marketplace\.member\.\$\{row\.gmfnId[\s\S]{0,140}\}\.shop`\}/,
  ].forEach((pattern) => {
    if (!pattern.test(trustedTradeSection)) {
      findings.push({
        file: marketplaceFile,
        line: lineAt(source.indexOf(trustedTradeSection)),
        message: "Marketplace Trusted Trade lane must keep the guided member/shop structure.",
        text: pattern.toString(),
      });
    }
  });

  if (/choose-supporter|Choose supporter|toggleMemberAsSupporter|guarantor|loan|Loan Readiness/.test(trustedTradeSection)) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(trustedTradeSection)),
      message: "Marketplace Trusted Trade lane must not expose support or guarantor actions.",
      text: "Trusted Trade should stay member/shop focused; Support Requests owns guarantor selection.",
    });
  }
}

const supportSection = sectionBetween(
  /id="marketplace-loans-support"/,
  /<\/MarketplaceShell>/
);

if (!supportSection) {
  findings.push({
    file: marketplaceFile,
    line: 1,
    message: "Marketplace Support Requests section was not found for scoped button auditing.",
    text: "Expected id=\"marketplace-loans-support\" before the Marketplace shell closes.",
  });
} else {
  const requiredSupportIds = [
    "marketplace.support.toggle",
    "marketplace.support.start-request",
    "marketplace.support.loan-readiness",
    "marketplace.support.loan-suggestions",
    "marketplace.support.loan-workbench",
    "marketplace.support.finance",
    "marketplace.support.full-loans",
    "marketplace.support.send-guarantor-requests",
  ];

  for (const debugId of requiredSupportIds) {
    if (!supportSection.includes(`debugId="${debugId}"`)) {
      findings.push({
        file: marketplaceFile,
        line: lineAt(source.indexOf(supportSection)),
        message: "Marketplace Support Requests section is missing an expected support action.",
        text: debugId,
      });
    }
  }

  [
    /Support Requests[\s\S]*?Start one guided support request inside this selected/,
    /What this support area does[\s\S]*?one guided community request/,
    /Step \{step\}/,
    /Start request[\s\S]*?Enter amount, days, and reason here/,
    /Check fit[\s\S]*?Review guarantor need and suggested supporters/,
    /Continue flow[\s\S]*?Open readiness or workbench only when needed/,
    /fit suggestions appear below inside this same lane/,
  ].forEach((pattern) => {
    if (!pattern.test(supportSection)) {
      findings.push({
        file: marketplaceFile,
        line: lineAt(source.indexOf(supportSection)),
        message: "Marketplace Support Requests lane must keep the guided three-step support structure.",
        text: pattern.toString(),
      });
    }
  });
}

assertContains(
  /debugId="marketplace\.money\.money-in"[\s\S]{0,260}onClick=\{\(event\) => openMarketplaceCta\(event, "moneyIn"\)\}/,
  "Marketplace Money In detail button must route through the shared moneyIn CTA target."
);

assertContains(
  /debugId="marketplace\.money\.money-in"[\s\S]{0,220}stableHeight=\{58\}[\s\S]{0,220}marketplaceInlineActionStyle\("primary", false, isCompact\)/,
  "Marketplace Money In detail button must keep fixed 58px geometry and the audited inline action style."
);

assertContains(
  /debugId="marketplace\.money\.money-out"[\s\S]{0,260}openMarketplaceCta\(event, "moneyOut"\)/,
  "Marketplace Money Out detail button must route through the shared moneyOut CTA target."
);

assertContains(
  /debugId="marketplace\.money\.money-out"[\s\S]{0,220}stableHeight=\{58\}[\s\S]{0,220}marketplaceInlineActionStyle\("secondary", false, isCompact\)/,
  "Marketplace Money Out detail button must keep fixed 58px geometry and the audited inline action style."
);

assertContains(
  /debugId="marketplace\.money\.finance"[\s\S]{0,260}onClick=\{\(event\) => openMarketplaceCta\(event, "finance"\)\}/,
  "Marketplace Finance detail button must route through the shared finance CTA target."
);

assertContains(
  /debugId="marketplace\.money\.finance"[\s\S]{0,220}stableHeight=\{58\}[\s\S]{0,220}marketplaceInlineActionStyle\("secondary", false, isCompact\)/,
  "Marketplace Finance detail button must keep fixed 58px geometry and the audited inline action style."
);

assertFileContains(
  actionTargetRoutesFile,
  actionTargetRoutesSource,
  /moneyIn:\s*"MONEY_IN"[\s\S]*?moneyOut:\s*"MONEY_OUT"[\s\S]*?finance:\s*"FINANCE"/,
  "CTA resolver must keep Marketplace money intents mapped to Money In, Money Out, and Finance route keys."
);

assertFileContains(
  ctaTargetsFile,
  ctaTargetsSource,
  /import \{ CTA_INTENT_ROUTES \} from "\.\/actionTargetRoutes";[\s\S]*?appRoute\(CTA_INTENT_ROUTES\[intent\], context\)/,
  "CTA resolver must read Marketplace money intents from the shared action-target route table."
);

assertFileContains(
  appRoutesFile,
  appRoutesSource,
  /MONEY_IN:\s*"\/app\/payment\/pool"[\s\S]*?MONEY_OUT:\s*"\/app\/withdrawal-instructions"[\s\S]*?FINANCE:\s*"\/app\/finance"[\s\S]*?\[[\s\S]*?"MONEY_IN"[\s\S]*?"MONEY_OUT"[\s\S]*?"FINANCE"/,
  "Money In, Money Out, and Finance routes must stay in the shared route registry and preserve selected-community query carry."
);

const expectedOrder = [
  exactDebugId("marketplace.empty.community-home"),
  exactDebugId("marketplace.empty.dashboard"),
  exactDebugId("marketplace.tile.money"),
  exactDebugId("marketplace.tile.rosca"),
  exactDebugId("marketplace.tile.support"),
  exactDebugId("marketplace.tile.members"),
  exactDebugId("marketplace.tile.trust"),
  exactDebugId("marketplace.row.money"),
  exactDebugId("marketplace.row.payment-rails"),
  exactDebugId("marketplace.row.rosca"),
  exactDebugId("marketplace.row.loan-process"),
  exactDebugId("marketplace.row.member-ledger"),
  exactDebugId("marketplace.row.demand-box"),
  exactDebugId("marketplace.row.records-links"),
  exactDebugId("marketplace.extra-tools.toggle"),
  exactDebugId("marketplace.intent.submit"),
  dynamicDebugId(
    "marketplace.intent.${item.id}",
    /debugId=\{`marketplace\.intent\.\$\{item\.id\}`\}/
  ),
  exactDebugId("marketplace.money.toggle"),
  exactDebugId("marketplace.money.money-in"),
  exactDebugId("marketplace.money.money-out"),
  exactDebugId("marketplace.money.finance"),
  exactDebugId("marketplace.rosca.toggle"),
  exactDebugId("marketplace.rosca.activate-yearly"),
  exactDebugId("marketplace.rosca.start-cycle"),
  exactDebugId("marketplace.rosca.record-payout"),
  exactDebugId("marketplace.links.toggle"),
  exactDebugId("marketplace.links.join.copy"),
  exactDebugId("marketplace.links.join.refresh"),
  exactDebugId("marketplace.links.join.copy-message"),
  exactDebugId("marketplace.links.join.email"),
  exactDebugId("marketplace.links.join.whatsapp"),
  exactDebugId("marketplace.links.community-desk.copy"),
  exactDebugId("marketplace.links.community-desk.email"),
  exactDebugId("marketplace.links.community-desk.open"),
  exactDebugId("marketplace.public-shop.visible-link"),
  exactDebugId("marketplace.public-shop.refresh"),
  exactDebugId("marketplace.public-shop.copy"),
  exactDebugId("marketplace.public-shop.email"),
  exactDebugId("marketplace.public-shop.open"),
  exactDebugId("marketplace.network-repost.find-targets"),
  dynamicDebugId(
    "marketplace.network-repost.target.*.use",
    /debugId=\{`marketplace\.network-repost\.target\.\$\{code \|\| index\}\.use`\}/
  ),
  exactDebugId("marketplace.network-repost.generate-payment-code"),
  exactDebugId("marketplace.network-repost.refresh-credits"),
  exactDebugId("marketplace.network-repost.place"),
  exactDebugId("marketplace.network-repost.subscription"),
  exactDebugId("marketplace.links.owner-shop-control"),
  exactDebugId("marketplace.members.toggle"),
  dynamicDebugId(
    "marketplace.member.*.shop",
    /debugId=\{`marketplace\.member\.\$\{row\.gmfnId[\s\S]{0,140}\}\.shop`\}/
  ),
  exactDebugId("marketplace.support.toggle"),
  exactDebugId("marketplace.support.start-request"),
  exactDebugId("marketplace.support.refresh-fit"),
  exactDebugId("marketplace.support.cancel-draft"),
  exactDebugId("marketplace.support.loan-readiness"),
  exactDebugId("marketplace.support.loan-suggestions"),
  exactDebugId("marketplace.support.loan-workbench"),
  exactDebugId("marketplace.support.finance"),
  exactDebugId("marketplace.support.full-loans"),
  dynamicDebugId(
    "marketplace.support.suggestion.*.choose",
    /debugId=\{`marketplace\.support\.suggestion\.\$\{item\.key\}\.choose`\}/
  ),
  dynamicDebugId(
    "marketplace.support.selected.*.remove",
    /debugId=\{`marketplace\.support\.selected\.\$\{item\.key\}\.remove`\}/
  ),
  exactDebugId("marketplace.support.send-guarantor-requests"),
];

let cursor = -1;
for (const expected of expectedOrder) {
  const afterCursor = source.slice(cursor + 1);
  const found = expected.pattern.exec(afterCursor);
  const next = found ? cursor + 1 + found.index : -1;
  if (next === -1) {
    findings.push({
      file: marketplaceFile,
      line: 1,
      message: "Marketplace front-to-inner action inventory is missing an expected action.",
      text: expected.label,
    });
    continue;
  }
  if (next < cursor) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(next),
      message: "Marketplace front-to-inner action order changed. Re-audit phone flow before accepting this reorder.",
      text: expected.label,
    });
  }
  cursor = next;
}

assertContains(
  /const MARKETPLACE_INTENT_ITEMS:[\s\S]*?id: "money-in"[\s\S]*?id: "money-out"[\s\S]*?id: "finance"[\s\S]*?id: "rosca"[\s\S]*?id: "support"[\s\S]*?id: "shop"[\s\S]*?id: "invite"[\s\S]*?id: "trust"[\s\S]*?id: "identity"[\s\S]*?id: "trustslip"[\s\S]*?id: "demand"[\s\S]*?id: "community"[\s\S]*?id: "messages"/,
  "Marketplace intent guide must keep the full inner action manifest in stable order."
);

assertNotContains(
  /id: "(?:identity|trustslip)"[\s\S]{0,260}?visible: false/g,
  "Marketplace CCI and TrustSlip shortcuts must stay visible in the extra-tools panel."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?money: "marketplace-money-routes"[\s\S]*?rosca: "marketplace-rosca"[\s\S]*?tools: "marketplace-owned-links"[\s\S]*?members: "marketplace-members-shops"[\s\S]*?support: "marketplace-loans-support"/,
  "Marketplace section anchors must stay aligned to money, ROSCA, links, members, and support sections."
);

assertContains(
  /function marketplaceInlineActionsStyle[\s\S]*?gridAutoRows: "58px"[\s\S]*?function marketplaceInlineActionStyle[\s\S]*?height: 58[\s\S]*?minHeight: 58[\s\S]*?maxHeight: 58[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.open"[\s\S]*?stableHeight=\{58\}/,
  "Marketplace inline/link-desk buttons must keep one 58px row reserve so public-shop controls cannot jump between refresh/copy/email/open states."
);

assertNotContains(
  /display: "none"|marketplace\.links\.create\.|publicCreateEntryLink|Start a new community/g,
  "Marketplace button inventory must not include hidden create-community source-only actions."
);

assertContains(
  /type MarketplaceGlyphName[\s\S]*?function MarketplaceGlyph[\s\S]*?name: MarketplaceGlyphName/,
  "Marketplace front button inventory must keep deterministic SVG glyphs for phone-stable action marks."
);

assertNotContains(
  /[\u{1F6CD}\u{1F465}\u{1F6E1}\u{1F4B3}\u{1F91D}\u{1F6D2}\u{1F4B7}\u{1F3E6}\u{1F49A}\u{1F4CB}\u{1F4E3}\u{1F5C2}\u{2728}\u{203A}\u{2303}]/gu,
  "Marketplace front button inventory must not use emoji or text chevrons in action marks."
);

assertLayoutContains(
  /if \(pathname === "\/app\/marketplace"\) \{[\s\S]*?return uniqueNavItems\(\[[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?Loans & Support[\s\S]*?makeShopControlItem\(\)[\s\S]*?Finance[\s\S]*?Notifications[\s\S]*?Trust Passport[\s\S]*?\]\);/,
  "Marketplace page tools must keep the six route-local navigator actions: Public Shop, Loans & Support, Shop Control, Finance, Notifications, and Trust Passport."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.open-navigation"[\s\S]*?debugId="app-layout\.mobile\.open-tools"/,
  "Marketplace mobile route surface must count the two fixed top navigator buttons: Menu and Tools."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-navigation"[\s\S]*?mobileDrawerGroups\.map[\s\S]*?debugId=\{`app-layout\.drawer\.\$\{group\.title\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.drawer\.logout"/,
  "Marketplace mobile drawer must count close, grouped route links, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-tools"[\s\S]*?pageActions\.map[\s\S]*?debugId=\{`app-layout\.page-action\.\$\{item\.label\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.page-action\.logout"/,
  "Marketplace mobile Tools panel must count close, six page actions, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /const mobileBottomItems = useMemo<NavLinkItem\[\]>\(\(\) => \{[\s\S]*?makeDashboardItem\(\)[\s\S]*?label: "Community"[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?makeFinanceItem\(\)[\s\S]*?makeLoansItem\("Loans"\)[\s\S]*?label: "Trust"[\s\S]*?debugId=\{`app-layout\.bottom-nav\.\$\{item\.label\.toLowerCase\(\)/,
  "Marketplace mobile bottom rail must count the seven normal route buttons: Dashboard, Community, Marketplace, Public Shop, Finance, Loans, and Trust."
);

assertLayoutContains(
  /function mobileIconButton\(\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?overflow: "hidden"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"[\s\S]*?function MobileTopIcon/,
  "Marketplace mobile top Menu and Tools buttons must keep fixed 44px geometry."
);

assertLayoutContains(
  /function bottomNavItem\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 42,[\s\S]*?minHeight: 42,[\s\S]*?maxHeight: 42[\s\S]*?pointerEvents: "auto"[\s\S]*?opacity: disabled \? 0\.7 : 1/,
  "Marketplace mobile bottom navigator buttons must keep fixed 42px geometry and active pointer targets."
);

assertLayoutContains(
  /function mainContent\([\s\S]*?bottomNavReservePx: number[\s\S]*?bottomRailReserve \+ 16[\s\S]*?const showMobileBottomRail =[\s\S]*?showMobileBottomRail \? mobileBottomNavReservePx : 0[\s\S]*?\{showMobileBottomRail \?/,
  "Marketplace mobile content must reserve the measured bottom rail height so paid Repost controls cannot sit under the Trust bottom-nav tap target."
);

if (findings.length > 0) {
  console.error("Marketplace button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Marketplace button inventory audit passed: ${actions.length} stable source actions ` +
    `(${sourceBreakdown.front} front, ${sourceBreakdown.body} body; ` +
    `${visibleIntentActionCount} visible intent buttons when More marketplace tools is open), ` +
    `${expectedMobileShellActionCount} mobile app-shell controls ` +
    `(${expectedMobileShellBreakdown.top} top, ${expectedMobileShellBreakdown.drawer} drawer, ` +
    `${expectedMobileShellBreakdown.pageTools} tools, ${expectedMobileShellBreakdown.bottom} bottom), ` +
    `${expectedWholeMobileRouteActionCount} whole-route mobile controls total, ` +
    "with hidden create-community actions removed."
);
