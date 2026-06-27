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
const expectedStableActionCount = 72;
const expectedNativeFieldCount = 36;
const expectedSourceBreakdown = {
  front: 12,
  body: 60,
};
const expectedVisibleIntentActionCount = 5;
const expectedMobileShellBreakdown = {
  top: 2,
  drawer: 30,
  pageTools: 7,
  bottom: 5,
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

const actionPattern = /<(?:Stable(?:Button|CtaLink)|SocialTagShareButton)\b[\s\S]*?(?:\/>|<\/(?:Stable(?:Button|CtaLink)|SocialTagShareButton)>)/g;
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
  if (!/\{\s*\.\.\.marketplaceFieldTouchProps\(\s*(?:"[^"]+"|`[^`]+`)\s*\)\s*\}/.test(field.block)) {
    findings.push({
      file: marketplaceFile,
      line: field.line,
      message: "Every Marketplace native input/select/textarea must use marketplaceFieldTouchProps because mobile field taps can leak into neighbouring route buttons.",
      text: field.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

assertContains(
  /function marketplaceFieldTouchProps\(debugId: string\)[\s\S]*?const rememberMarketplaceFieldPointer[\s\S]*?markMarketplaceFieldInteraction\(\)[\s\S]*?const rememberMarketplaceFieldFocus[\s\S]*?markMarketplaceFieldInteraction\(\)[\s\S]*?"data-gmfn-field-root": "true"[\s\S]*?"data-gmfn-debug-id": debugId[\s\S]*?onPointerDownCapture: rememberMarketplaceFieldPointer[\s\S]*?onFocusCapture: rememberMarketplaceFieldFocus/,
  "Marketplace native field tap roots must mark recent field interaction early and keep field-only debug metadata without swallowing native mobile focus/click events."
);

assertNotContains(
  /function marketplaceFieldTouchProps\(debugId: string\)(?:(?!function marketplaceSurfaceTouchProps)[\s\S])*?(stopPropagation|stopMarketplaceTap|onClick(?:Capture)?:|onPointerDown:|onPointerUp(?:Capture)?:|onMouseDown(?:Capture)?:)/,
  "Marketplace native fields must not stop pointer/mouse/click propagation; real phone Chrome must own native input focus."
);

assertNotContains(
  /function marketplaceFieldTouchProps\(debugId: string\)(?:(?!function marketplaceSurfaceTouchProps)[\s\S])*?(?:"data-gmfn-action-root"|"data-cta-id": debugId)/,
  "Marketplace native fields must not register as action roots or CTA ids."
);

assertContains(
  /function inputStyle\(\): React\.CSSProperties \{[\s\S]*?pointerEvents: "auto"[\s\S]*?touchAction: "auto"[\s\S]*?position: "relative"[\s\S]*?zIndex: 2/,
  "Marketplace native fields must keep native touch behavior so typing and vertical dragging do not feel like button taps."
);

assertContains(
  /<label[\s\S]*?htmlFor="marketplace-join-invite-note"[\s\S]*?Message to receiver \(optional\)[\s\S]*?<input[\s\S]*?\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\.invite-note"\)\}[\s\S]*?id="marketplace-join-invite-note"[\s\S]*?type="text"[\s\S]*?placeholder="Short note"[\s\S]*?enterKeyHint="next"[\s\S]*?style=\{marketplaceJoinFixedFieldStyle\(isCompact\)\}/,
  "Marketplace Join short-note field must be a native one-line input with an explicit label/id pair, not a tiny textarea scroll trap."
);

assertContains(
  /htmlFor="marketplace-join-sender-name"[\s\S]*?id="marketplace-join-sender-name"[\s\S]*?htmlFor="marketplace-join-recipient-name"[\s\S]*?id="marketplace-join-recipient-name"[\s\S]*?htmlFor="marketplace-join-invite-note"[\s\S]*?id="marketplace-join-invite-note"[\s\S]*?htmlFor="marketplace-join-relationship-type"[\s\S]*?id="marketplace-join-relationship-type"[\s\S]*?htmlFor="marketplace-join-known-duration"[\s\S]*?id="marketplace-join-known-duration"[\s\S]*?htmlFor="marketplace-join-relationship-context"[\s\S]*?id="marketplace-join-relationship-context"/,
  "Marketplace Join fields must keep explicit label/htmlFor and id wiring so mobile taps focus the intended native control."
);

assertContains(
  /joinInviteManualCopyMessage \? \([\s\S]*?\{\.\.\.marketplaceFieldTouchProps\("marketplace\.join\.manual-copy"\)\}[\s\S]*?id="marketplace-join-manual-copy"[\s\S]*?readOnly[\s\S]*?onFocus=\{\(event\) => event\.currentTarget\.select\(\)\}[\s\S]*?minHeight: isCompact \? 170 : 184[\s\S]*?maxHeight: isCompact \? 170 : 184/,
  "Marketplace Join manual copy fallback must be an audited readonly native field with stable phone geometry and field touch props."
);

assertContains(
  /function marketplaceJoinActionsStyle\([\s\S]*?gridTemplateColumns: isCompact \? "1fr" : "repeat\(auto-fit, minmax\(168px, 1fr\)\)"[\s\S]*?style=\{marketplaceJoinActionsStyle\(isCompact\)\}/,
  "Marketplace Join invite buttons must be one-column on phone so field taps are not crowded by side-by-side share controls."
);

assertContains(
  /type LinkCenterTool[\s\S]*?\| "join"[\s\S]*?\| "verify"[\s\S]*?\| "shopFace"[\s\S]*?\| "repost"[\s\S]*?const \[activeLinkCenterTool, setActiveLinkCenterTool\][\s\S]*?useState<LinkCenterTool \| null>\(null\)/,
  "Marketplace public links desk must keep an explicit active selection state without owner/package tools as equal Link Center choices."
);

assertContains(
  /function marketplaceLinkChooserButtonStyle\([\s\S]*?height: isCompact \? 68 : 88[\s\S]*?minHeight: isCompact \? 68 : 88[\s\S]*?maxHeight: isCompact \? 68 : 88[\s\S]*?gridTemplateColumns: isCompact \? "44px minmax\(0, 1fr\)" : "58px minmax\(0, 1fr\)"[\s\S]*?overflow: "hidden"[\s\S]*?overflowAnchor: "none"[\s\S]*?transition: "none"/,
  "Marketplace Link Center chooser buttons must reserve the exact icon-shell width and keep fixed no-transition geometry."
);

assertContains(
  /function marketplaceLinkActiveToolStackStyle\(\): React\.CSSProperties \{[\s\S]*?width: "100%"[\s\S]*?maxWidth: "100%"[\s\S]*?minWidth: 0[\s\S]*?overflow: "visible"[\s\S]*?overflowAnchor: "none"[\s\S]*?transition: "none"[\s\S]*?style=\{marketplaceLinkActiveToolStackStyle\(\)\}/,
  "Marketplace Link Center selected-tool stack must keep a stable shell while allowing native field focus UI to escape clipping."
);

assertContains(
  /debugId="marketplace\.links\.choose\.verify"[\s\S]*?setActiveLinkCenterTool\("verify"\)[\s\S]*?debugId="marketplace\.links\.choose\.join"[\s\S]*?setActiveLinkCenterTool\("join"\)[\s\S]*?debugId="marketplace\.links\.choose\.create-community"[\s\S]*?openMarketplaceRoute\(event, APP_ROUTES\.CLANS\)[\s\S]*?debugId="marketplace\.links\.choose\.shop-face"[\s\S]*?setActiveLinkCenterTool\("shopFace"\)/,
  "Marketplace public links chooser must expose the four true link jobs, with Create Community using the authenticated existing-member create lane."
);

assertContains(
  /debugId="marketplace\.links\.back-to-center"[\s\S]*?setActiveLinkCenterTool\(null\)[\s\S]*?activeLinkCenterTool === "join"[\s\S]*?activeLinkCenterTool === "verify"[\s\S]*?activeLinkCenterTool === "shopFace"[\s\S]*?activeLinkCenterTool === "repost"/,
  "Marketplace Link Center must show one selected tool at a time with a stable Back to Link Center action."
);

assertNotContains(
  /debugId="marketplace\.links\.choose\.(?:repost|packages|owner-control)"|setActiveLinkCenterTool\("(?:packages|ownerControl)"\)|activeLinkCenterTool === "(?:packages|ownerControl)"/g,
  "Marketplace public links chooser must not expose paid repost, packages, or owner controls as equal public-link choices."
);

assertContains(
  /function marketplaceActiveElementIsEditable\(\): boolean[\s\S]*?tagName === "input"[\s\S]*?tagName === "textarea"[\s\S]*?tagName === "select"[\s\S]*?marketplaceRecentlyInteractedWithField[\s\S]*?section-scroll-skipped-field-focus[\s\S]*?section-scroll-skipped-recent-field-touch[\s\S]*?section-schedule-skipped-field-focus[\s\S]*?section-schedule-skipped-recent-field-touch/,
  "Marketplace section landing scroll must skip while a native field is focused or inside the recent touch-to-focus window so Chrome keyboard focus is not fighting route-local scroll code."
);

assertContains(
  /From \(sender\)[\s\S]*?Receiver name[\s\S]*?Message to receiver \(optional\)[\s\S]*?How do you know this person\?[\s\S]*?How long have you known them\?[\s\S]*?Private GSN relationship note \(optional\)[\s\S]*?debugId="marketplace\.links\.join\.refresh"[\s\S]*?debugId="marketplace\.links\.join\.copy-message"[\s\S]*?debugId="marketplace\.links\.join\.whatsapp"/,
  "Marketplace Join compact phone view must keep sender, receiver, message, relationship, duration, private note, Refresh, Copy Invite, and WhatsApp in one continuous stable form."
);

assertNotContains(
  /\bjoinCompactStep\b/g,
  "Marketplace Join compact phone view must not hide evidence fields behind a computed step while the user is typing."
);

assertNotContains(
  /display:\s*!isCompact\s*\|\|\s*join/g,
  "Marketplace Join evidence fields must not use phone-only display:none stage gating."
);

assertContains(
  /\{!isCompact \? \([\s\S]*?debugId="marketplace\.links\.join\.copy"[\s\S]*?\) : null\}[\s\S]*?\{!isCompact \? \([\s\S]*?debugId="marketplace\.links\.join\.email"[\s\S]*?\) : null\}[\s\S]*?\{!isCompact \? \([\s\S]*?debugId="marketplace\.links\.join\.tag-social"[\s\S]*?\) : null\}/,
  "Marketplace Join Copy Link, Email, and social Share controls must stay desktop-only."
);

assertContains(
  /\{!isCompact \? \([\s\S]*?debugId="marketplace\.public-shop\.tag-social"[\s\S]*?\) : null\}/,
  "Marketplace Public Shop social Share must stay desktop-only so the phone action cluster remains simple."
);

assertContains(
  /const hasRepostContext = Boolean\([\s\S]*?routeRepostSource[\s\S]*?routeRepostProductId[\s\S]*?routeRepostBlockNumber[\s\S]*?hash === "marketplace-paid-network-placement"[\s\S]*?hasRepostContext/,
  "Marketplace Paid Repost must require product/block/source context; a naked hash must not open a finance-adjacent promotion panel."
);

assertContains(
  /selectedRoscaMemberIds\.length < 2[\s\S]*?Choose at least two members for this ROSCA cycle[\s\S]*?createRoscaCycle\(\{[\s\S]*?member_user_ids: selectedRoscaMemberIds/,
  "Marketplace ROSCA Start Cycle must require explicit member selection and pass member_user_ids."
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
  /debugId="marketplace\.tile\.money"[\s\S]*?aria-label="Open Money In and this marketplace pool"[\s\S]*?openMarketplaceSection\(event, "money", "marketplace-money-routes"\)[\s\S]*?<MarketplaceGlyph name="pool"[\s\S]*?Money In \/ Pool[\s\S]*?Put money into this marketplace pool\.[\s\S]*?Money In[\s\S]*?Pool[\s\S]*?Pay-In Rail/,
  "Marketplace Money In / Pool card must open the money section only and must not mix normal withdrawal into its front-door label."
);

assertContains(
  /const marketplaceMoneyOutTo = useMemo\([\s\S]*?resolveCtaTarget\("moneyOut"[\s\S]*?debugId: "marketplace\.route\.moneyOut"[\s\S]*?to=\{marketplaceMoneyOutTo\}[\s\S]*?debugId="marketplace\.tile\.withdrawal"[\s\S]*?aria-label="Open normal Money Out withdrawal for this marketplace"[\s\S]*?<MarketplaceGlyph name="card"[\s\S]*?Money Out \/ Withdrawal[\s\S]*?Withdraw your own available money\.[\s\S]*?Own Money[\s\S]*?Payout Account[\s\S]*?Check First/,
  "Marketplace must expose normal Money Out / Withdrawal as a separate front-door route from Support & Loans."
);

assertContains(
  /Focus your work[\s\S]*?Open one lane at a time\. Everything else steps back\./,
  "Marketplace front door must keep the focus-your-work guide after the grouped lane cards."
);

assertContains(
  /debugId="marketplace\.tile\.rosca"[\s\S]*?aria-label="Open ROSCA contribution cycles for this marketplace"[\s\S]*?openMarketplaceSection\(event, "rosca", "marketplace-rosca"\)[\s\S]*?<MarketplaceGlyph name="rosca"[\s\S]*?ROSCA[\s\S]*?Member savings circle for this community[\s\S]*?Yearly Service[\s\S]*?Member Cycle[\s\S]*?Payout Record/,
  "Marketplace ROSCA grouped card must stay a distinct major front lane and open the ROSCA section only."
);

assertContains(
  /debugId="marketplace\.extra-tools\.toggle"[\s\S]*?More \/ Community Tools[\s\S]*?Trust, ID, evidence, messages, and route help[\s\S]*?Trust[\s\S]*?Identity[\s\S]*?TrustSlip[\s\S]*?Messages/,
  "Marketplace More / Community Tools grouped card must keep only secondary helper tools visible on the front card."
);

assertContains(
  /debugId="marketplace\.tile\.support"[\s\S]*?aria-label="Open Support Requests, supporters and loans"[\s\S]*?openMarketplaceSection\(\s*event,\s*"support",\s*"marketplace-loans-support"\s*\)[\s\S]*?<MarketplaceGlyph name="support"[\s\S]*?Support & Loans[\s\S]*?Get help and manage loans[\s\S]*?Support Requests[\s\S]*?Loan Process/,
  "Marketplace Support & Loans grouped card must open the support section only."
);

assertContains(
  /debugId="marketplace\.tile\.trust"[\s\S]*?aria-label="Open this marketplace trust summary"[\s\S]*?onClick=\{toggleProfileDetails\}[\s\S]*?\{marketplaceTrustDisplay\}/,
  "Marketplace Trust tile must toggle the local marketplace trust summary, not hijack the Money Pool tile or route directly to Trust Passport."
);

assertContains(
  /debugId="marketplace\.tile\.members"[\s\S]*?aria-label="Open evidence-backed trade, members and visible shops"[\s\S]*?openMarketplaceSection\(\s*event,\s*"members",\s*"marketplace-members-shops"\s*\)[\s\S]*?<MarketplaceGlyph name="trade"[\s\S]*?Trade & Shops[\s\S]*?Shops, offers, and visible trade[\s\S]*?Trade Evidence[\s\S]*?Demand Box[\s\S]*?Public Shops/,
  "Marketplace Trade & Shops grouped card must open the members/shops trade lane with community-bound wording."
);

assertContains(
  /visibleTradeMemberRows = memberRows\.slice\(0, isCompact \? 3 : 5\)[\s\S]*?hiddenTradeMemberRows = memberRows\.slice\(visibleTradeMemberRows\.length\)[\s\S]*?visibleTradeShopCount = memberRows\.filter\(\(row\) => row\.shopTo\)\.length/,
  "Marketplace Trade Evidence must cap the first visible member list and tuck the rest behind a compact disclosure."
);

assertContains(
  /debugId="marketplace\.row\.records-links"[\s\S]*?aria-label="Open access and public links for this marketplace"[\s\S]*?openMarketplaceSection\(event, "tools", "marketplace-owned-links"\)[\s\S]*?<MarketplaceGlyph name="links"[\s\S]*?Public Links[\s\S]*?Verify, invite, create, or share the shop\.[\s\S]*?Verify[\s\S]*?Invite[\s\S]*?Create[\s\S]*?Shop Face/,
  "Marketplace public links grouped card must open marketplace-owned links and advertise verify, invite, create, and shop sharing."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"[\s\S]*?function touchedMarketplaceSectionState[\s\S]*?\[key\]: true/,
  "Marketplace Support Requests must no longer open Members visually; each major lane must focus one open body."
);

assertContains(
  /id="marketplace-money-routes"[\s\S]*?Money In \/ Pool[\s\S]*?Pay into this marketplace pool and check the receiving rail\.[\s\S]*?Visible Pool[\s\S]*?Current pool view[\s\S]*?Money In Rail[\s\S]*?Pay this account[\s\S]*?Money Out[\s\S]*?Withdrawal and payout details[\s\S]*?to=\{marketplaceMoneyOutTo\}[\s\S]*?debugId="marketplace\.money\.money-out-destination"[\s\S]*?Open Withdrawal/,
  "Marketplace money route detail must keep Money In editing local and send Money Out destination work to the Withdrawal route."
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
    "marketplace.money.pay-in-account",
    "marketplace.money.money-out-destination",
    "marketplace.money.pay-in-account-save",
    "marketplace.money.pay-in-account-close",
    "marketplace.money.money-in",
    "marketplace.money.money-out",
  ];

  if (moneyActionIds.join("|") !== expectedMoneyActionIds.join("|")) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(moneySection)),
      message: "Marketplace money detail section must expose the audited money actions and rail editors in the audited order.",
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
    /Choose members/,
    /Start cycle/,
    /Membership/,
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
    message: "Marketplace Trade Evidence section was not found for scoped button auditing.",
    text: "Expected id=\"marketplace-members-shops\" before id=\"marketplace-loans-support\".",
  });
} else {
  [
    /Trade Evidence/,
    /See known members and visible shops inside this selected/,
    /\{memberRows\.length\} visible member/,
    /\{visibleTradeShopCount\} public shop/,
    /Community-bound trade/,
    /Demand Box[\s\S]*?Post a local need or offer request for this marketplace/,
    /Visible members/,
    /more tucked away/,
    /debugId="marketplace\.members\.more-visible\.summary"[\s\S]*?More visible members/,
    /Shop visible/,
    /No shop yet/,
    /debugId=\{`marketplace\.member\.\$\{row\.gmfnId[\s\S]{0,140}\}\.shop`\}/,
  ].forEach((pattern) => {
    if (!pattern.test(trustedTradeSection)) {
      findings.push({
        file: marketplaceFile,
        line: lineAt(source.indexOf(trustedTradeSection)),
        message: "Marketplace Trade Evidence lane must keep the guided member/shop structure.",
        text: pattern.toString(),
      });
    }
  });

  if (/choose-supporter|Choose supporter|toggleMemberAsSupporter|guarantor|loan|Loan Readiness/.test(trustedTradeSection)) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(trustedTradeSection)),
      message: "Marketplace Trade Evidence lane must not expose support or guarantor actions.",
      text: "Trade Evidence should stay member/shop focused; Support Requests owns guarantor selection.",
    });
  }

  if (/What this trade lane does|Step \{step\}|Read the name and GSN ID first|Use other lanes for support, money, or trust work/.test(trustedTradeSection)) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(trustedTradeSection)),
      message: "Marketplace Trade Evidence lane must not restore the old explainer and three-card instruction stack.",
      text: "The compact Trade lane should show status chips, Demand Box, visible members, and a tucked-away member disclosure.",
    });
  }

  if (/Trusted Trade/.test(trustedTradeSection)) {
    findings.push({
      file: marketplaceFile,
      line: lineAt(source.indexOf(trustedTradeSection)),
      message: "Marketplace Trade Evidence lane must not restore the old Trusted Trade label.",
      text: "Use Trade Evidence so the customer-facing lane does not overclaim protected commerce.",
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
    "marketplace.support.refresh-fit",
    "marketplace.support.cancel-draft",
    "marketplace.support.deeper-pages.summary",
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
    /Support Requests[\s\S]*?Ask this marketplace for support when your withdrawal needs[\s\S]*?backing/,
    /What this support area does[\s\S]*?ask the selected marketplace for support/,
    /Selected marketplace[\s\S]*?ID: \{activeCommunityId \|\| "not ready"\}/,
    /From Money Out/,
    /Step \{step\}/,
    /Start request[\s\S]*?Amount, duration, repayment, purpose/,
    /Check supporters[\s\S]*?GSN shows who can back the request/,
    /Send requests[\s\S]*?Send only after the draft is ready/,
    /Enter the amount, duration, repayment plan, and purpose[\s\S]*?creates one support draft/,
    /No draft yet/,
    /Supporters: \{requiredGuarantorCount \|\| "not checked"\}/,
    /Fit: \{suggestedSupporters\.length\}/,
    /\{loanDraftId \? \([\s\S]*?debugId="marketplace\.support\.deeper-pages\.summary"[\s\S]*?More support tools/,
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
  /to=\{marketplaceMoneyOutTo\}[\s\S]{0,260}debugId="marketplace\.money\.money-out"/,
  "Marketplace Money Out detail button must route through the shared moneyOut CTA link target."
);

assertContains(
  /debugId="marketplace\.money\.money-out"[\s\S]{0,220}stableHeight=\{58\}[\s\S]{0,220}marketplaceInlineActionStyle\("secondary", false, isCompact\)/,
  "Marketplace Money Out detail button must keep fixed 58px geometry and the audited inline action style."
);

assertContains(
  /Money In Rail[\s\S]{0,1500}Pay this account[\s\S]{0,1500}debugId="marketplace\.money\.pay-in-account"[\s\S]{0,1500}setPayInEditorOpen\(\(value\) => !value\)[\s\S]{0,1500}stableHeight=\{isCompact \? 38 : 42\}[\s\S]{0,1500}(Set rail|Open rail|Close rail)/,
  "Marketplace Money In Rail card button must open the pay-in editor in the money section."
);

assertContains(
  /Money Out[\s\S]{0,1500}Withdrawal and payout details[\s\S]{0,1500}to=\{marketplaceMoneyOutTo\}[\s\S]{0,1500}debugId="marketplace\.money\.money-out-destination"[\s\S]{0,1500}stableHeight=\{isCompact \? 38 : 42\}[\s\S]{0,1500}Open Withdrawal/,
  "Marketplace Money Out Rail card button must route to the Withdrawal page instead of reopening an editor inside Money Pool."
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
  exactDebugId("marketplace.tile.trust"),
  exactDebugId("marketplace.tile.money"),
  exactDebugId("marketplace.tile.withdrawal"),
  exactDebugId("marketplace.tile.rosca"),
  exactDebugId("marketplace.tile.members"),
  exactDebugId("marketplace.tile.support"),
  exactDebugId("marketplace.row.records-links"),
  exactDebugId("marketplace.extra-tools.toggle"),
  exactDebugId("marketplace.intent.submit"),
  dynamicDebugId(
    "marketplace.intent.${item.id}",
    /debugId=\{`marketplace\.intent\.\$\{item\.id\}`\}/
  ),
  exactDebugId("marketplace.money.toggle"),
  exactDebugId("marketplace.money.pay-in-account"),
  exactDebugId("marketplace.money.money-out-destination"),
  exactDebugId("marketplace.money.pay-in-account-save"),
  exactDebugId("marketplace.money.pay-in-account-close"),
  exactDebugId("marketplace.money.money-in"),
  exactDebugId("marketplace.money.money-out"),
  exactDebugId("marketplace.rosca.toggle"),
  exactDebugId("marketplace.rosca.activate-yearly"),
  exactDebugId("marketplace.rosca.start-cycle"),
  exactDebugId("marketplace.rosca.record-payout"),
  exactDebugId("marketplace.links.toggle"),
  exactDebugId("marketplace.links.choose.verify"),
  exactDebugId("marketplace.links.choose.join"),
  exactDebugId("marketplace.links.choose.create-community"),
  exactDebugId("marketplace.links.choose.shop-face"),
  exactDebugId("marketplace.links.back-to-center"),
  exactDebugId("marketplace.links.join.copy"),
  exactDebugId("marketplace.links.join.refresh"),
  exactDebugId("marketplace.links.join.copy-message"),
  exactDebugId("marketplace.links.join.email"),
  exactDebugId("marketplace.links.join.whatsapp"),
  exactDebugId("marketplace.links.join.tag-social"),
  exactDebugId("marketplace.links.community-desk.copy"),
  exactDebugId("marketplace.links.community-desk.email"),
  exactDebugId("marketplace.links.community-desk.open"),
  exactDebugId("marketplace.public-shop.visible-link"),
  exactDebugId("marketplace.public-shop.refresh"),
  exactDebugId("marketplace.public-shop.copy"),
  exactDebugId("marketplace.public-shop.email"),
  exactDebugId("marketplace.public-shop.tag-social"),
  exactDebugId("marketplace.public-shop.open"),
  exactDebugId("marketplace.network-repost.selected-block.copy-link"),
  exactDebugId("marketplace.network-repost.find-targets"),
  dynamicDebugId(
    "marketplace.network-repost.target.*.use",
    /debugId=\{`marketplace\.network-repost\.target\.\$\{code \|\| index\}\.use`\}/
  ),
  exactDebugId("marketplace.network-repost.generate-payment-code"),
  exactDebugId("marketplace.network-repost.refresh-credits"),
  exactDebugId("marketplace.network-repost.place"),
  exactDebugId("marketplace.network-repost.subscription"),
  exactDebugId("marketplace.members.toggle"),
  exactDebugId("marketplace.members.demand-box"),
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
  exactDebugId("marketplace.notice.close"),
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
  /function marketplaceInlineActionsStyle[\s\S]*?width: "100%"[\s\S]*?maxWidth: "100%"[\s\S]*?minWidth: 0[\s\S]*?boxSizing: "border-box"[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?\? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?gridAutoRows: isCompact \? "56px" : "58px"[\s\S]*?justifyItems: "stretch"[\s\S]*?overflow: "hidden"[\s\S]*?function marketplaceInlineActionStyle[\s\S]*?maxWidth: "100%"[\s\S]*?boxSizing: "border-box"[\s\S]*?height: _isCompact \? 56 : 58[\s\S]*?minHeight: _isCompact \? 56 : 58[\s\S]*?maxHeight: _isCompact \? 56 : 58[\s\S]*?whiteSpace: "normal"[\s\S]*?wordBreak: "normal"/,
  "Marketplace inline/link-desk buttons must keep stable readable phone geometry: 56px phone rows, 58px desktop rows, and whole-word wrapping."
);

assertContains(
  /debugId="marketplace\.public-shop\.refresh"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?stableHeight=\{58\}[\s\S]*?debugId="marketplace\.public-shop\.open"[\s\S]*?stableHeight=\{58\}/,
  "Marketplace public-shop controls must keep stable refresh, copy, email, and open row heights."
);

assertContains(
  /\{!isCompact \? \([\s\S]*?debugId="marketplace\.links\.join\.copy"[\s\S]*?\) : null\}[\s\S]*?debugId="marketplace\.links\.join\.copy-message"[\s\S]*?debugId="marketplace\.links\.join\.whatsapp"[\s\S]*?\{!isCompact \? \([\s\S]*?debugId="marketplace\.links\.join\.tag-social"[\s\S]*?\) : null\}/,
  "Marketplace Join Link Center phone action cluster must stay collapsed to Copy Invite plus WhatsApp, with extra share surfaces kept off compact phones."
);

assertNotContains(
  /display: "none"|marketplace\.links\.create\.|publicCreateEntryLink|Start a new community/g,
  "Marketplace button inventory must not include hidden create-community source-only actions."
);

assertContains(
  /import \{ GsnLegacyIcon, type GsnIconName \} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*?type MarketplaceGlyphName[\s\S]*?MARKETPLACE_GLYPH_ICON_MAP[\s\S]*?satisfies Record<MarketplaceGlyphName, GsnIconName>[\s\S]*?function MarketplaceGlyph[\s\S]*?name: MarketplaceGlyphName[\s\S]*?<GsnLegacyIcon/,
  "Marketplace front button inventory must keep deterministic 3D GSN icons for phone-stable action marks."
);

assertNotContains(
  /[\u{1F6CD}\u{1F465}\u{1F6E1}\u{1F4B3}\u{1F91D}\u{1F6D2}\u{1F4B7}\u{1F3E6}\u{1F49A}\u{1F4CB}\u{1F4E3}\u{1F5C2}\u{2728}\u{203A}\u{2303}]/gu,
  "Marketplace front button inventory must not use emoji or text chevrons in action marks."
);

assertLayoutContains(
  /if \(pathname === "\/app\/marketplace"\) \{[\s\S]*?return uniqueNavItems\(\[[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?Loans & Support[\s\S]*?makeShopControlItem\(\)[\s\S]*?Marketplace Rails[\s\S]*?marketplace-money-routes[\s\S]*?Notifications[\s\S]*?\]\);/,
  "Marketplace page tools must keep the route-local navigator actions: Public Shop, Loans & Support, Shop Control, Marketplace Rails, and Notifications."
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
  /const mobileBottomItems = useMemo<NavLinkItem\[\]>\(\(\) => \{[\s\S]*?makeDashboardItem\(\)[\s\S]*?label: "Community"[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?label: "Shop"[\s\S]*?makeProfileItem\(\)[\s\S]*?debugId=\{`app-layout\.bottom-nav\.\$\{item\.label\.toLowerCase\(\)/,
  "Marketplace mobile bottom rail must count the five stable route anchors: Dashboard, Community, Marketplace, Shop, and Profile."
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
  /function mainContent\(\s*isMobile: boolean,\s*taskMode: boolean\s*\): React\.CSSProperties \{[\s\S]*?const mobileBottomPadding = "calc\(16px \+ env\(safe-area-inset-bottom, 0px\)\)";[\s\S]*?function bottomNav\(\): React\.CSSProperties \{[\s\S]*?position: "relative"[\s\S]*?flexShrink: 0[\s\S]*?style=\{mainContent\(isMobile, !!taskMode\)\}[\s\S]*?\{showMobileBottomRail \?/,
  "Marketplace mobile content must not double-reserve the bottom rail while the rail remains visible in normal layout flow."
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
