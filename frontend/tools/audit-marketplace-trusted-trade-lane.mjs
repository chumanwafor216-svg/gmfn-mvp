/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const marketplaceToolsFile = "src/pages/marketplace/MarketplaceToolsSection.tsx";
const marketplaceMembersFile = "src/pages/marketplace/MarketplaceMembersSection.tsx";
const marketplaceSupportFile = "src/pages/marketplace/MarketplaceSupportSection.tsx";
const marketplaceTradeEvidenceFile = "src/pages/marketplace/MarketplaceTradeEvidenceSection.tsx";
const marketplacePageSource = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const marketplaceToolsSource = readFileSync(join(frontendRoot, marketplaceToolsFile), "utf8");
const marketplaceMembersSource = readFileSync(join(frontendRoot, marketplaceMembersFile), "utf8");
const marketplaceSupportSource = readFileSync(join(frontendRoot, marketplaceSupportFile), "utf8");
const marketplaceTradeEvidenceSource = readFileSync(join(frontendRoot, marketplaceTradeEvidenceFile), "utf8");
const source = marketplacePageSource
  .replace(/<MarketplaceToolsSection\b[\s\S]*?\n\s*\/>/, marketplaceToolsSource)
  .replace(/<MarketplaceMembersSection\b[\s\S]*?\n\s*\/>/, marketplaceMembersSource)
  .replace(/<MarketplaceSupportSection\b[\s\S]*?\n\s*\/>/, marketplaceSupportSource)
  .replace(/<MarketplaceTradeEvidenceSection\b[\s\S]*?\n\s*\/>/, marketplaceTradeEvidenceSource);
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(index, message, text = "Expected pattern was not found.") {
  findings.push({
    file: marketplaceFile,
    line: index >= 0 ? lineAt(index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  addFinding(-1, message);
}

function assertNotContains(pattern, message) {
  source.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file: marketplaceFile,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

function sectionBetween(startPattern, endPattern) {
  const start = source.search(startPattern);
  if (start === -1) return { text: "", start: -1 };
  const rest = source.slice(start);
  const end = rest.search(endPattern);
  return {
    text: end === -1 ? rest : rest.slice(0, end),
    start,
  };
}

assertContains(
  /trade: "marketplace"[\s\S]*?function MarketplaceGlyph[\s\S]*?<GsnLegacyIcon/,
  "Trade Evidence must use the stable GSN 3D marketplace/trade pictogram through the shared icon adapter."
);

assertNotContains(
  /debugId="marketplace\.tile\.trade-evidence"/,
  "Trade Evidence must not stay as a duplicate front card after being grouped under Marketing Tools."
);

assertContains(
  /debugId="marketplace\.progressive\.trade-evidence"[\s\S]*?openMarketplaceSection\(event, "trade", "marketplace-trade-evidence"\)[\s\S]*?Trade Evidence/,
  "Trade Evidence must be available through progressive evidence intent while staying separate from other Marketplace lanes."
);

assertContains(
  /debugId="marketplace\.job\.find-people-services"[\s\S]*?aria-label="Open Shops and Services in this marketplace"[\s\S]*?openMarketplaceSection[\s\S]*?"members"[\s\S]*?"marketplace-members-shops"[\s\S]*?Shops & Services/,
  "Shops & Services must open from the human discovery job and stay separate from Trade Evidence."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?members: "marketplace-members-shops"[\s\S]*?trade: "marketplace-trade-evidence"/,
  "Trade Evidence and Members & Shops section anchors must stay separate."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?support: key === "support"/,
  "Opening Trade Evidence must use the focused one-lane state, leaving unrelated remaining lanes stepped back."
);

assertContains(
  /visibleTradeMemberRows = memberRows\.slice\(0, isCompact \? 6 : 8\)[\s\S]*?hiddenTradeMemberRows = memberRows\.slice\(visibleTradeMemberRows\.length\)[\s\S]*?visibleTradeShopCount = memberRows\.filter\(\(row\) => row\.shopTo\)\.length/,
  "Trade Evidence/member options must cap the first visible member list and keep overflow separate."
);

assertContains(
  /PROTECTED_TRADE_EVENT_OPTIONS[\s\S]*?Payment claimed[\s\S]*?This is not bank confirmation/,
  "Protected Trade event options must warn that payment claims are not bank confirmation."
);

assertContains(
  /payment\.under_review[\s\S]*?Payment under review[\s\S]*?without calling it bank-confirmed/,
  "Protected Trade event options must expose payment-under-review as an evidence state, not bank confirmation."
);

assertContains(
  /function protectedTradeOutcomeActions[\s\S]*?receipt\.confirmed[\s\S]*?Received and OK[\s\S]*?receipt\.not_received[\s\S]*?Not received[\s\S]*?dispute\.opened[\s\S]*?Open issue/,
  "Trade Evidence must expose simple buyer-side outcome actions backed by existing protected-trade events."
);

assertContains(
  /function protectedTradeOutcomeActions[\s\S]*?release\.recorded[\s\S]*?Released \/ done[\s\S]*?payment\.under_review[\s\S]*?Payment issue[\s\S]*?dispute\.opened[\s\S]*?Open issue/,
  "Trade Evidence must expose simple seller-side outcome actions backed by existing protected-trade events."
);

assertContains(
  /Evidence update only\. Not escrow, not automatic payout, not a bank guarantee, not a delivery guarantee/,
  "Protected Trade event logging must keep the non-custodial boundary in metadata."
);

assertContains(
  /marketplace_trade_outcome_panel[\s\S]*?not_star_rating: true[\s\S]*?not_person_review: true[\s\S]*?trust_event_backed: true/,
  "Outcome confirmation must record event-backed evidence metadata instead of a star rating or person review."
);

assertContains(
  /const GsnSnapshotPaperCard = lazy\([\s\S]*?import\("(?:\.\.\/components|\.\.\/\.\.\/components)\/GsnSnapshotPaperCard"\)/,
  "Protected Trade evidence papers must use the shared GSN headed-paper card."
);

assertContains(
  /Title: GSN Trade Evidence Paper[\s\S]*?Privacy: private trade record\. Do not forward as public verification unless GSN provides a public link for this exact record\.[\s\S]*?Limitation: evidence only\. Not escrow, payout approval, bank confirmation, or delivery guarantee\./,
  "Trade Evidence paper must carry private-record privacy and non-custodial limitation language."
);

assertContains(
  /Minimum trade packet[\s\S]*?Invoice \/ product \/ agreement \/ courier \/ payment references[\s\S]*?Conversation boundary: GSN keeps the agreed evidence reference/,
  "Trade Evidence paper must expose the minimum packet reference without pretending to store the whole conversation."
);

assertContains(
  /minimum_trade_packet:[\s\S]*?trade_context: "gsn_gsn"[\s\S]*?evidence_packet_note[\s\S]*?conversation_system_of_record: "gsn_marketplace_or_parties"[\s\S]*?not_escrow[\s\S]*?not_money_custody[\s\S]*?not_payout[\s\S]*?not_bank_confirmation[\s\S]*?not_delivery_guarantee[\s\S]*?not_release_authority/,
  "Protected Trade creation must store the GSN+GSN minimum packet metadata with non-custodial boundaries."
);

assertContains(
  /getProtectedTrade[\s\S]*?selectedProtectedTradeDetail[\s\S]*?loadingProtectedTradeDetail/,
  "Marketplace must load selected protected-trade detail so event trails can back the evidence paper."
);

assertContains(
  /safeStr\(trade\.trade_code\) \|\| "No trade code yet"/,
  "Protected Trade record list must show honest missing-code language."
);

assertNotContains(
  /Code pending/,
  "Protected Trade record list must not show a fake pending code placeholder."
);

assertContains(
  /MarketplaceDepartmentTone[\s\S]*?function marketplaceDepartmentShellStyle[\s\S]*?function marketplaceDepartmentHeaderStyle/,
  "Marketplace must keep a shared department shell so nested marketplace arms are visibly separated system-wide."
);

assertContains(
  /textAreaStyle\(\): React\.CSSProperties \{[\s\S]*?fontFamily: "inherit"[\s\S]*?overflowY: "hidden"[\s\S]*?whiteSpace: "pre-wrap"/,
  "Marketplace textareas must keep human app styling and avoid code-like internal scroll boxes."
);

const tradeEvidenceSection = sectionBetween(
  /id="marketplace-trade-evidence"/,
  /id="marketplace-members-shops"/
);

if (!tradeEvidenceSection.text) {
  addFinding(-1, "Trade Evidence detail section must exist before Members & Shops.");
} else {
  [
    /Trade Evidence/,
    /Trade Evidence Record/,
    /Trade record lane/,
    /marketplace\.trade\.evidence-module/,
    /marketplaceDepartmentShellStyle\("trade", isCompact\)/,
    /creates evidence, not escrow/,
    /Confirm outcome[\s\S]*?One tap records what happened\. It becomes event evidence,\s+not a human score\./,
    /debugId="marketplace\.protected-trade\.outcome\.good"[\s\S]*?selectedProtectedTradeOutcomeActions\.good\.label/,
    /debugId="marketplace\.protected-trade\.outcome\.blocked"[\s\S]*?selectedProtectedTradeOutcomeActions\.blocked\.label/,
    /debugId="marketplace\.protected-trade\.outcome\.issue"[\s\S]*?selectedProtectedTradeOutcomeActions\.issue\.label/,
    /debugId="marketplace\.protected-trade\.start-another"[\s\S]*?New record/,
    /debugId="marketplace\.protected-trade\.refresh"[\s\S]*?Refresh/,
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.role"\)/,
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.counterpart"\)/,
    /Minimum evidence packet[\s\S]*?marketplaceFieldTouchProps\("marketplace\.protected-trade\.packet"\)[\s\S]*?invoice reference[\s\S]*?courier handoff[\s\S]*?payment schedule/,
    /debugId="marketplace\.protected-trade\.create"[\s\S]*?Start record/,
    /debugId="marketplace\.protected-trade\.refresh-empty"[\s\S]*?Refresh records/,
    /debugId="marketplace\.protected-trade\.refresh"[\s\S]*?Refresh records/,
    /Record update/,
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.update\.record"\)/,
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.update\.type"\)/,
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.update\.note"\)/,
    /debugId="marketplace\.protected-trade\.record-update"[\s\S]*?Record update/,
    /Evidence paper/,
    /Signed-in evidence paper/,
    /selectedProtectedTradeHasDetail/,
    /recentProtectedTradeEvents/,
    /Event trail/,
    /<GsnSnapshotPaperCard[\s\S]*?paperText=\{protectedTradeEvidencePaperText\}/,
    /debugId="marketplace\.protected-trade\.copy-paper"[\s\S]*?Copy paper text/,
  ].forEach((pattern) => {
    if (!pattern.test(tradeEvidenceSection.text)) {
      addFinding(
        tradeEvidenceSection.start,
        "Trade Evidence detail section is missing an expected guided evidence-record element.",
        pattern.toString()
      );
    }
  });

  if (/(choose-supporter|Choose supporter|toggleMemberAsSupporter|guarantor|Loan Readiness|Loan Suggestions|Loan Workbench|Money Pool|ROSCA|Trust Passport|TrustSlip|CCI|Owner Shop)/.test(tradeEvidenceSection.text)) {
    addFinding(
      tradeEvidenceSection.start,
      "Trade Evidence detail section must not expose other major lane responsibilities.",
      "Trade Evidence should stay member/shop focused; Support owns guarantor selection."
    );
  }

  if (/DemandBox|marketplace\.members\.demand-box|Post a local need or offer request for this marketplace/.test(tradeEvidenceSection.text)) {
    addFinding(
      tradeEvidenceSection.start,
      "Trade Evidence detail section must not embed DemandBox.",
      "DemandBox owns request lifecycle; Marketplace may only route or show read-only Board signals."
    );
  }

  if (/What this trade lane does|Step \{step\}|Read the name and GSN ID first|Use other lanes for support, money, or trust work/.test(tradeEvidenceSection.text)) {
    addFinding(
      tradeEvidenceSection.start,
      "Trade Evidence detail section must not restore the old explainer and three-card instruction stack.",
      "The compact Trade lane should show status chips, DemandBox, visible members, and a tucked-away member disclosure."
    );
  }

  if (/(escrow released|bank confirmed|automatic payout|guaranteed delivery|release money automatically)/i.test(tradeEvidenceSection.text)) {
    addFinding(
      tradeEvidenceSection.start,
      "Trade Evidence record updates must not imply escrow, bank confirmation, payout automation, or delivery guarantee.",
      "Keep the protected-trade lane as an evidence rail unless paid/API verification and regulated release rails exist."
    );
  }

  if (/Trusted Trade/.test(tradeEvidenceSection.text)) {
    addFinding(
      tradeEvidenceSection.start,
      "Trade Evidence detail section must not restore the old Trusted Trade label.",
      "Use Trade Evidence so the customer-facing lane does not overclaim protected commerce."
    );
  }
}

const memberShopSection = {
  text: marketplaceMembersSource,
  start: source.indexOf('id="marketplace-members-shops"'),
};

if (!/id="marketplace-members-shops"/.test(memberShopSection.text)) {
  addFinding(-1, "Shops & Services detail section must exist.");
} else {
  [
    /Shops & Services Directory/,
    /Browse public shops in this selected marketplace\. Open shop is the[\s\S]*?handoff to the canonical Public Shop; management stays elsewhere\./,
    /\{visibleTradeShopCount\} public shop/,
    /\{directoryRows\.length\} searchable entr/,
    /\{marketplaceCommunityDomainRows\.length\} domain/,
    /\{weakDataCount \? `\$\{weakDataCount\} light profile/,
    /Community Domains[\s\S]*?Professional marketplace communities[\s\S]*?They sit with community members and shops\. Setup stays in the[\s\S]*?Community Domain dashboard\./,
    /debugId=\{`marketplace\.domain\.\$\{row\.id \|\| row\.key\}\.open`\}/,
    /marketplace\.members\.visible-members-module/,
    /marketplaceDepartmentShellStyle\("members", isCompact\)/,
    /Find a shop or service/,
    /Search uses loaded shop names, descriptions, product\/service text,[\s\S]*?owner labels, and DemandBox match titles\./,
    /Neutral A-Z order/,
    /marketplaceFieldTouchProps\("marketplace\.members\.search"\)/,
    /No public shops are visible in this marketplace yet\. This is the[\s\S]*?current community scope only\./,
    /No shop in this marketplace matches that search yet\. Try a business[\s\S]*?name, service, product, or owner label\./,
    /debugId="marketplace\.members\.more-visible\.summary"[\s\S]*?More directory results/,
    /Public shop/,
    /No shop yet/,
    /Contact ready/,
    /Relevant to current need/,
    /debugId="marketplace\.members\.toggle"/,
    /debugId=\{`marketplace\.member\.\$\{row\.gmfnId[\s\S]{0,140}\}\.shop`\}/,
  ].forEach((pattern) => {
    if (!pattern.test(memberShopSection.text)) {
      addFinding(
        memberShopSection.start,
        "Shops & Services detail section is missing an expected guided directory element.",
        pattern.toString()
      );
    }
  });

  if (/(choose-supporter|Choose supporter|toggleMemberAsSupporter|guarantor|Loan Readiness|Loan Suggestions|Loan Workbench|Money Pool|ROSCA|Trust Passport|TrustSlip|CCI|Owner Shop|Trade Evidence Record)/.test(memberShopSection.text)) {
    addFinding(
      memberShopSection.start,
      "Shops & Services detail section must not expose other major lane responsibilities.",
      "Shops & Services should stay directory focused; Support owns guarantor selection and Trade Evidence owns records."
    );
  }
}

if (/MarketplaceDemandSection|id="marketplace-demand-box"|marketplace\.demand\.|marketplaceDepartmentShellStyle\("demand", isCompact\)/.test(source)) {
  addFinding(
    source.search(/MarketplaceDemandSection|id="marketplace-demand-box"|marketplace\.demand\.|marketplaceDepartmentShellStyle\("demand", isCompact\)/),
    "Marketplace must not keep a duplicate DemandBox department after DemandBox became the canonical request owner.",
    "DemandBox should be reached through marketplace.job.ask-for-something and legacy #marketplace-demand-box handoff."
  );
}

const supportSection = sectionBetween(
  /id="marketplace-loans-support"/,
  /<BottomNav/
);
if (supportSection.text) {
  [
    /marketplace\.support\.selected-module/,
    /marketplace\.support\.path-chooser/,
    /marketplace\.support\.financial-support-module/,
    /marketplaceDepartmentShellStyle\("support", isCompact\)/,
    /marketplaceDepartmentShellStyle\("rosca", isCompact\)/,
    /Loan Support requests/,
    /Open ROSCA/,
  ].forEach((pattern) => {
    if (!pattern.test(supportSection.text)) {
      addFinding(
        supportSection.start,
        "Support and ROSCA must remain visibly separate marketplace departments.",
        pattern.toString()
      );
    }
  });
}

if (findings.length > 0) {
  console.error("Marketplace Trade Evidence lane audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace Trade Evidence lane audit passed.");
