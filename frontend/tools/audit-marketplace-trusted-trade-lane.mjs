/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const source = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
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
  /case "trade":[\s\S]*?<path d="M5 10h14l-1\.2-4\.5H6\.2z"[\s\S]*?<path d="M13\.8 16\.1 15\.4 17\.7 18\.5 14\.5"/,
  "Trade Evidence must use the stable checked-shop pictogram, not the generic shop mark."
);

assertContains(
  /debugId="marketplace\.tile\.trade-evidence"[\s\S]*?aria-label="Open Trade Evidence records"[\s\S]*?openMarketplaceSection\(\s*event,\s*"trade",\s*"marketplace-trade-evidence"\s*\)[\s\S]*?<MarketplaceGlyph name="ledger"[\s\S]*?Trade Evidence[\s\S]*?Record goods, service, and terms\.[\s\S]*?Evidence[\s\S]*?Terms[\s\S]*?Record/,
  "Trade Evidence grouped card must stay a guided evidence-record launcher and open only the trade evidence section."
);

assertContains(
  /debugId="marketplace\.tile\.members"[\s\S]*?aria-label="Open visible members and public shops"[\s\S]*?openMarketplaceSection\(\s*event,\s*"members",\s*"marketplace-members-shops"\s*\)[\s\S]*?<MarketplaceGlyph name="trade"[\s\S]*?Members & Shops[\s\S]*?Known members and public shops\.[\s\S]*?Public Shops[\s\S]*?Members/,
  "Members & Shops grouped card must open only the community-bound directory."
);

assertContains(
  /const MARKETPLACE_SECTION_ANCHORS:[\s\S]*?members: "marketplace-members-shops"[\s\S]*?trade: "marketplace-trade-evidence"/,
  "Trade Evidence and Members & Shops section anchors must stay separate."
);

assertContains(
  /function focusedMarketplaceSectionState\(key: keyof SectionState\): SectionState \{[\s\S]*?money: key === "money"[\s\S]*?rosca: key === "rosca"[\s\S]*?tools: key === "tools"[\s\S]*?members: key === "members"[\s\S]*?demand: key === "demand"[\s\S]*?support: key === "support"/,
  "Opening Trade Evidence must use the focused one-lane state, leaving unrelated lanes stepped back."
);

assertContains(
  /visibleTradeMemberRows = memberRows\.slice\(0, isCompact \? 3 : 5\)[\s\S]*?hiddenTradeMemberRows = memberRows\.slice\(visibleTradeMemberRows\.length\)[\s\S]*?visibleTradeShopCount = memberRows\.filter\(\(row\) => row\.shopTo\)\.length/,
  "Trade Evidence must cap the first visible member list and tuck the rest behind a compact disclosure."
);

assertContains(
  /PROTECTED_TRADE_EVENT_OPTIONS[\s\S]*?Payment claimed[\s\S]*?This is not bank confirmation/,
  "Protected Trade event options must warn that payment claims are not bank confirmation."
);

assertContains(
  /Evidence update only\. Not escrow, not automatic payout, not a bank guarantee, not a delivery guarantee/,
  "Protected Trade event logging must keep the non-custodial boundary in metadata."
);

assertContains(
  /import GsnSnapshotPaperCard from "\.\.\/components\/GsnSnapshotPaperCard"/,
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
  /type MarketplaceDepartmentTone[\s\S]*?marketplaceDepartmentShellStyle[\s\S]*?marketplaceDepartmentHeaderStyle/,
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
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.role"\)/,
    /marketplaceFieldTouchProps\("marketplace\.protected-trade\.counterpart"\)/,
    /Minimum evidence packet[\s\S]*?marketplaceFieldTouchProps\("marketplace\.protected-trade\.packet"\)[\s\S]*?invoice reference[\s\S]*?courier handoff[\s\S]*?payment schedule/,
    /debugId="marketplace\.protected-trade\.create"[\s\S]*?Start record/,
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
      "Trade Evidence should stay member/shop focused; Support Requests owns guarantor selection."
    );
  }

  if (/Demand Box|marketplace\.members\.demand-box|Post a local need or offer request for this marketplace/.test(tradeEvidenceSection.text)) {
    addFinding(
      tradeEvidenceSection.start,
      "Trade Evidence detail section must not embed Demand Box.",
      "Demand Box owns its own marketplace-local lane between Trade & Shops and Support Requests."
    );
  }

  if (/What this trade lane does|Step \{step\}|Read the name and GSN ID first|Use other lanes for support, money, or trust work/.test(tradeEvidenceSection.text)) {
    addFinding(
      tradeEvidenceSection.start,
      "Trade Evidence detail section must not restore the old explainer and three-card instruction stack.",
      "The compact Trade lane should show status chips, Demand Box, visible members, and a tucked-away member disclosure."
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

const memberShopSection = sectionBetween(
  /id="marketplace-members-shops"/,
  /id="marketplace-demand-box"/
);

if (!memberShopSection.text) {
  addFinding(-1, "Members & Shops detail section must exist before Demand Box.");
} else {
  [
    /Members & Shops/,
    /See known members and visible shops inside this selected/,
    /Open a shop record for current evidence before you[\s\S]*?act/,
    /\{memberRows\.length\} visible member/,
    /\{visibleTradeShopCount\} public shop/,
    /Community-bound directory/,
    /Visible members/,
    /marketplace\.members\.visible-members-module/,
    /marketplaceDepartmentShellStyle\("members", isCompact\)/,
    /Full visible list shown/,
    /more tucked away/,
    /debugId="marketplace\.members\.more-visible\.summary"[\s\S]*?More visible members/,
    /Shop visible/,
    /No shop yet/,
    /debugId="marketplace\.members\.toggle"/,
    /debugId=\{`marketplace\.member\.\$\{row\.gmfnId[\s\S]{0,140}\}\.shop`\}/,
  ].forEach((pattern) => {
    if (!pattern.test(memberShopSection.text)) {
      addFinding(
        memberShopSection.start,
        "Members & Shops detail section is missing an expected guided directory element.",
        pattern.toString()
      );
    }
  });

  if (/(choose-supporter|Choose supporter|toggleMemberAsSupporter|guarantor|Loan Readiness|Loan Suggestions|Loan Workbench|Money Pool|ROSCA|Trust Passport|TrustSlip|CCI|Owner Shop|Trade Evidence Record)/.test(memberShopSection.text)) {
    addFinding(
      memberShopSection.start,
      "Members & Shops detail section must not expose other major lane responsibilities.",
      "Members & Shops should stay directory focused; Support Requests owns guarantor selection and Trade Evidence owns records."
    );
  }
}

const demandSection = sectionBetween(
  /id="marketplace-demand-box"/,
  /id="marketplace-loans-support"/
);
if (demandSection.text) {
  [
    /marketplace\.demand\.module/,
    /marketplaceDepartmentShellStyle\("demand", isCompact\)/,
    /Local needs and offers/,
  ].forEach((pattern) => {
    if (!pattern.test(demandSection.text)) {
      addFinding(
        demandSection.start,
        "Demand Box must remain a visibly separate marketplace department.",
        pattern.toString()
      );
    }
  });
}

const supportSection = sectionBetween(
  /id="marketplace-loans-support"/,
  /<BottomNav/
);
if (supportSection.text) {
  [
    /marketplace\.support\.selected-module/,
    /marketplace\.support\.financial-support-module/,
    /marketplaceDepartmentShellStyle\("support", isCompact\)/,
    /marketplace\.support\.rosca-module/,
    /marketplaceDepartmentShellStyle\("rosca", isCompact\)/,
    /Financial support requests/,
    /Separate ROSCA desk/,
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
