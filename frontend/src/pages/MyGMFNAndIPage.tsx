import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
import CompanionSettingsPanel from "../components/CompanionSettingsPanel";
import GsnInstallPrompt from "../components/GsnInstallPrompt";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  StableDisclosureSummary,
} from "../components/StableButton";
import {
  GsnLegacyIcon,
  type GsnIconName,
} from "../components/GsnLegacyIcon";
import {
  getCurrentClan,
  getMe,
  getMySettings,
  getSelectedClanId,
  updateMyProfile,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  brandHelperText,
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  brandSoftCard,
  gmfnBrand,
} from "../styles/gmfnBrand";
import {
  GMFN_CAPABILITY_COUNT,
  GMFN_CAPABILITIES,
} from "../lib/gmfnCapabilities";
import { buildIdentityEvidenceCompletion } from "../lib/identityEvidenceCompletion";
import { buildTrustPassportViewModel } from "../lib/trustPassportViewModel";
import { isIosManualInstallTarget } from "../lib/pwaInstall";
import * as api from "../lib/api";

type SettingsState = {
  notificationsMode: "summary" | "detailed";
  unreadFirst: boolean;
  openActionsDirectly: boolean;
  tonePreset: "balanced-default" | "cooperative-warm" | "enterprise-green";
};

type NoticeTone = "success" | "error";
type CapabilityMapCategory =
  | "Identity & Verification"
  | "Trust & Evidence"
  | "Buying & Selling"
  | "Community & Membership"
  | "Finance & Support"
  | "Visibility & Opportunity"
  | "Security & Privacy";

type CapabilityMapDetail = {
  category: CapabilityMapCategory;
  realWorld: string;
  danger: string;
  decision: string;
  tools: string;
  where: string;
  evidence: string;
  summary: string;
};

const SETTINGS_STORAGE_KEY = "gmfn.myGmfnAndI.settings.v2";
const SLOW_WORKSPACE_SETTINGS_LOAD_MS = 8000;

const DEFAULT_SETTINGS: SettingsState = {
  notificationsMode: "summary",
  unreadFirst: true,
  openActionsDirectly: true,
  tonePreset: "balanced-default",
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function truthyEvidence(...values: any[]): boolean {
  for (const value of values) {
    if (value === true) return true;
    const text = safeStr(value).toLowerCase();
    if (
      [
        "true",
        "yes",
        "recorded",
        "verified",
        "active",
        "confirmed",
        "complete",
        "completed",
      ].includes(text)
    ) {
      return true;
    }
  }

  return false;
}

function firstPositiveNumber(...values: any[]): number {
  for (const value of values) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function normalizeIdentityTrustSlip(raw: any): any | null {
  if (!raw) return null;

  const src = raw?.item || raw?.summary || raw?.trust_slip || raw?.data || raw;
  if (!src || typeof src !== "object") return null;

  return src;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return brandPageCard(bg);
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return brandSoftCard(bg);
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return brandInnerCard(bg);
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minHeight: 92,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(214,170,69,0.28)"
      : "1px solid rgba(15,23,42,0.08)",
    background: primary
      ? "linear-gradient(180deg, rgba(239,246,255,0.98) 0%, rgba(255,255,255,0.995) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(250,252,255,0.99) 100%)",
    padding: 14,
    textDecoration: "none",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflowAnchor: "none",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 16px 32px rgba(11,99,209,0.10), inset 0 1px 0 rgba(255,255,255,0.98)"
      : "0 14px 28px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.96)",
  };
}

function capabilityVisualRail(): React.CSSProperties {
  return {
    display: "grid",
    justifyItems: "center",
    gap: 8,
    minWidth: 0,
  };
}

function appGuideMiniIconBubble(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#7A4A00",
    background: "rgba(255,255,255,0.97)",
    border: "1px solid rgba(226,192,106,0.34)",
    boxShadow:
      "0 8px 16px rgba(8,24,42,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
  };
}

function capabilityCardTop(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minWidth: 0,
  };
}

function sectionLabel(): React.CSSProperties {
  return brandSectionLabel();
}

function helperText(): React.CSSProperties {
  return brandHelperText();
}

function appGuidePanel(compact = false): React.CSSProperties {
  return {
    borderRadius: compact ? 20 : 24,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#FFFFFF",
    boxShadow:
      compact
        ? "0 12px 26px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.98)"
        : "0 18px 38px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.98)",
    padding: compact ? 14 : 16,
    boxSizing: "border-box",
  };
}

function appNavyCard(compact = false): React.CSSProperties {
  return {
    borderRadius: compact ? 18 : 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "radial-gradient(circle at 84% 22%, rgba(214,170,69,0.18) 0%, rgba(214,170,69,0) 22%), radial-gradient(circle at 92% 76%, rgba(79,128,178,0.18) 0%, rgba(79,128,178,0) 32%), linear-gradient(180deg, #071C31 0%, #082846 100%)",
    boxShadow:
      compact
        ? "0 14px 26px rgba(8,24,42,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 18px 34px rgba(8,24,42,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: compact ? 16 : 18,
    color: "#F8FBFF",
    boxSizing: "border-box",
  };
}

function appGuideIconBox(active = false, compact = false): React.CSSProperties {
  return {
    width: compact ? 44 : 54,
    height: compact ? 44 : 54,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    background: active
      ? "linear-gradient(180deg, #071C31 0%, #082846 100%)"
      : "linear-gradient(180deg, #08233A 0%, #061827 100%)",
    border: "1px solid rgba(214,170,69,0.24)",
    color: "#F2C766",
    fontWeight: 1000,
    boxShadow:
      "0 10px 20px rgba(8,24,42,0.13), inset 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function appGuideNumber(): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, #F2C766 0%, #D6AA45 100%)",
    color: "#08233A",
    fontSize: 11,
    fontWeight: 1000,
    flex: "0 0 auto",
    boxShadow: "0 8px 16px rgba(214,170,69,0.22)",
  };
}

function selectStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background: gmfnBrand.colors.panel,
    padding: "11px 12px",
    fontSize: 14,
    color: gmfnBrand.colors.ink,
    outline: "none",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function capabilityPagerButton(primary = false): React.CSSProperties {
  return {
    minHeight: 44,
    borderRadius: 999,
    border: primary
      ? "1px solid rgba(214,170,69,0.34)"
      : `1px solid ${gmfnBrand.colors.lineStrong}`,
    background: primary
      ? "linear-gradient(180deg, #F2C766 0%, #D6AA45 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #EEF4FA 100%)",
    color: primary ? "#07172C" : "#12314D",
    padding: "10px 13px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 1000,
    lineHeight: 1,
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    boxShadow: primary
      ? "0 12px 22px rgba(214,170,69,0.18)"
      : "0 8px 18px rgba(15,23,42,0.06)",
  };
}

function checkboxRow(): React.CSSProperties {
  return {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    color: gmfnBrand.colors.ink,
    fontSize: 14,
    lineHeight: 1.6,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function publicGuideShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    padding: "14px 12px 18px",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 16% 0%, rgba(201,154,39,0.13) 0%, rgba(201,154,39,0) 26%), radial-gradient(circle at 92% 8%, rgba(83,132,178,0.15) 0%, rgba(83,132,178,0) 28%), linear-gradient(180deg, #07131F 0%, #12304A 36%, #D9E4EF 36.1%, #EEF3F8 100%)",
    color: "#F8FBFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  };
}

function publicGuideFrame(): React.CSSProperties {
  return {
    width: "min(100%, 1160px)",
    margin: "0 auto",
    display: "grid",
    gap: 10,
  };
}

function publicGuideHeader(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(214,228,242,0.22)",
    background:
      "linear-gradient(180deg, rgba(13,31,50,0.92) 0%, rgba(7,20,35,0.98) 100%)",
    boxShadow:
      "0 18px 38px rgba(1,9,22,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: "15px",
  };
}

function publicCapabilityCard(category: string): React.CSSProperties {
  const accent =
    category === "trade"
      ? "#C8A85C"
      : category === "visibility"
      ? "#5E8CB7"
      : category === "finance"
      ? "#5E9C84"
      : category === "support"
      ? "#8B9BB0"
      : category === "community"
      ? "#6F87AD"
      : category === "identity"
      ? "#A8775B"
      : category === "work"
      ? "#7E8C9C"
      : "#1D4D76";

  return {
    position: "relative",
    overflow: "hidden",
    minHeight: 150,
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.13)",
    background:
      `linear-gradient(90deg, ${accent} 0%, ${accent} 1%, rgba(255,255,255,0) 1.01%), radial-gradient(circle at 14% 10%, rgba(18,49,77,0.045) 0%, rgba(18,49,77,0) 30%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(242,247,252,0.985) 100%)`,
    boxShadow:
      "0 12px 24px rgba(8,24,42,0.11), inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -1px 0 rgba(8,24,42,0.04)",
    padding: "15px",
  };
}

function publicCapabilityCardIos(category: string): React.CSSProperties {
  return {
    ...publicCapabilityCard(category),
    minHeight: "auto",
    padding: "13px",
    borderRadius: 16,
  };
}

function publicCapabilityNumber(): React.CSSProperties {
  return {
    position: "absolute",
    top: 13,
    right: 13,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 32,
    borderRadius: 11,
    background:
      "linear-gradient(180deg, #12314D 0%, #081D33 100%)",
    color: "#F4D37B",
    border: "1px solid rgba(201,154,39,0.30)",
    boxShadow:
      "0 10px 22px rgba(1,9,22,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
    fontWeight: 1000,
    fontSize: 13,
  };
}

function publicCapabilityNumberIos(): React.CSSProperties {
  return {
    ...publicCapabilityNumber(),
    top: 12,
    right: 12,
    width: 32,
    height: 28,
    borderRadius: 10,
    fontSize: 12,
  };
}

function publicCapabilityIcon(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 58,
    height: 58,
    borderRadius: 18,
    background: "rgba(255,255,255,0.97)",
    border: "1px solid rgba(226,192,106,0.34)",
    boxShadow:
      "0 12px 22px rgba(8,24,42,0.09), inset 0 1px 0 rgba(255,255,255,0.96)",
    color: "#7A4A00",
    fontSize: 27,
    lineHeight: 1,
  };
}

function publicCapabilityIconIos(): React.CSSProperties {
  return {
    ...publicCapabilityIcon(),
    width: 44,
    height: 44,
    borderRadius: 15,
  };
}

const PUBLIC_CAPABILITY_LINES: Record<number, string> = {
  1: "Lets a seller check identity, community, TrustSlip, and current evidence before releasing goods or credit.",
  2: "Keeps shops, buyers, followers, shelf items, and public shop records tied to visible community evidence.",
  3: "Lets a member or shop carry a readable trust record beyond one marketplace or local community.",
  4: "Surfaces weak evidence, missing witness renewal, inactive records, and caution signs before people act.",
  5: "Gives approved shop updates a clearer place to be seen without pretending visibility is verification.",
  6: "Lets better recorded trust earn better reach while still showing the limits of the record.",
  7: "Keeps one public shop identity connected across marketplaces, shelves, spotlight, WhatsApp, and verification.",
  8: "Turns support requests into recorded drafts with amount, purpose, duration, supporters, and fit signals.",
  9: "Shows who may back a support request and keeps help connected to visible responsibility.",
  10: "Gives urgent support a faster evidence path through identity, community, TrustSlip, and confirmation checks.",
  11: "Helps families, markets, churches, unions, and diaspora groups read trust across distance.",
  12: "Adds GSN records around ROSCA savings circles so contribution cycles are easier to track.",
  13: "Turns contributions, support, repayment, and community activity into records people can later review.",
  14: "Keeps a member's identity, community role, and trust trail usable when they move or reconnect.",
  15: "Lets a member carry a public GSN ID, TrustSlip, credential, and Trust Passport context together.",
  16: "Keeps earned reputation from staying trapped in one street, shop, phone contact, or local circle.",
  17: "Gives one shop a public home for shelf items, spotlight, WhatsApp, verification, and trust signals.",
  18: "Helps informal service work become visible through demand, evidence, community context, and follow-up.",
  19: "Helps work decisions read public identity, record strength, and community evidence before commitment.",
  20: "Lets people post local needs or offers so demand is visible before opportunity is missed.",
  21: "Connects community identity, marketplace activity, finance evidence, and trust records into one working layer.",
  22: "Turns savings, repayment, business, retirement, and personal goals into clearer commitments and follow-through.",
  23: "Gives schools, unions, churches, cooperatives, markets, and associations a structured domain for members, roles, branches, evidence, policies, and public claims.",
};

const CAPABILITY_ICON_NAMES: Record<number, GsnIconName> = {
  1: "shield",
  2: "shop",
  3: "globe",
  4: "alert",
  5: "spark",
  6: "spark",
  7: "shop",
  8: "wallet",
  9: "community",
  10: "alert",
  11: "globe",
  12: "wallet",
  13: "document",
  14: "globe",
  15: "id",
  16: "chart",
  17: "shop",
  18: "briefcase",
  19: "user",
  20: "document",
  21: "community",
  22: "check",
  23: "home",
};

const CAPABILITY_MAP_CATEGORIES: readonly CapabilityMapCategory[] = [
  "Identity & Verification",
  "Trust & Evidence",
  "Buying & Selling",
  "Community & Membership",
  "Finance & Support",
  "Visibility & Opportunity",
  "Security & Privacy",
];

const CAPABILITY_MAP_DETAILS: Record<number, CapabilityMapDetail> = {
  1: {
    category: "Buying & Selling",
    realWorld: "Every day, people release goods, provide services, or extend credit to someone they only partly know.",
    danger: "The buyer may be genuine, but the seller can still lose stock, time, cash flow, or reputation when the decision rests only on promises.",
    decision: "GSN changes the question from \"Can I trust this person?\" to \"What evidence already exists before I release value?\"",
    tools: "Community Verification -> Merchant Verification -> TrustSlip -> Protected Trade Record -> Merchant Release Rail.",
    where: "Marketplace -> Members & Trade; Trust -> TrustSlip; Shop -> Public Shop.",
    evidence: "Merchant Release Record, Trade Evidence, Community Context, Trust Event, and future TrustSlip evidence.",
    summary: "Reduces blind release by making the seller look for evidence before accepting payment risk or credit risk.",
  },
  2: {
    category: "Buying & Selling",
    realWorld: "Buyers, sellers, suppliers, and service providers often meet through messages, referrals, or marketplace posts with thin identity context.",
    danger: "A good-looking offer can hide a weak seller, a false buyer, an unreliable supplier, or a trade that leaves no usable record afterwards.",
    decision: "GSN lets both sides read shop identity, member context, TrustSlip evidence, and trade history before committing.",
    tools: "Public Shop -> Merchant Verification -> TrustSlip -> Merchant Release Rail -> Shop Diary -> Vault.",
    where: "Marketplace -> Members & Trade; Shop -> Public Shop / Vault; Trust -> TrustSlip.",
    evidence: "Shop identity, shelf activity, followers, trade records, verification links, and public shop record.",
    summary: "Turns buying and selling into an evidence-backed decision instead of a confidence guess.",
  },
  3: {
    category: "Buying & Selling",
    realWorld: "A person may be trusted in one street, church, union, market, or family circle but unknown in another.",
    danger: "Without portable context, good members restart from zero while bad actors can move to a new circle with no visible history.",
    decision: "GSN carries identity and community evidence across circles while keeping each community boundary readable.",
    tools: "GSN ID -> Community Record -> Public Shop -> TrustSlip -> Community Credential.",
    where: "Marketplace -> Members & Trade; Community -> Community Record; Trust -> TrustSlip.",
    evidence: "Cross-community identity trail, member credential, shop record, and community-scoped confirmation.",
    summary: "Lets trade travel with context without pretending every community has made the same judgement.",
  },
  4: {
    category: "Security & Privacy",
    realWorld: "Fraud often looks ordinary until value, access, or reputation has already moved.",
    danger: "By the time the pattern is clear, the victim may have lost goods, money, time, or social standing.",
    decision: "GSN surfaces weak evidence, missing renewal, inactive records, and boundary notes before people act.",
    tools: "Trust Reading -> TrustSlip Verify -> Community Member Verify -> Trust Passport boundary notes.",
    where: "Trust -> TrustSlip; Marketplace -> Members & Trade; Community -> Verify Member.",
    evidence: "Visible posture, caution notes, missing evidence signals, and verification limits.",
    summary: "Moves caution to the front of the decision without pretending GSN can guarantee future behaviour.",
  },
  5: {
    category: "Visibility & Opportunity",
    realWorld: "A useful shop update, service offer, or opportunity can disappear before the right people see it.",
    danger: "Attention can reward noise, timing, or loud posting instead of recorded value and accountable identity.",
    decision: "GSN gives approved updates a clearer place to be seen while separating visibility from verification.",
    tools: "Spotlight -> Public Shop -> Marketplace Broadcast -> Shop Gallery.",
    where: "Shop -> Spotlight; Marketplace -> Public Shops; Dashboard -> Spotlight preview.",
    evidence: "Published spotlight, shop owner identity, community placement, media record, and timestamp.",
    summary: "Helps recorded value reach people without turning publicity into a trust guarantee.",
  },
  6: {
    category: "Visibility & Opportunity",
    realWorld: "Serious members can be harder to find than louder members when visibility depends only on posting volume.",
    danger: "Opportunity can flow toward noise while stronger evidence stays hidden from buyers, supporters, and partners.",
    decision: "GSN lets recorded reputation support reach while still showing the limits of the evidence.",
    tools: "Reputation signals -> Trust Reading -> Spotlight placement -> Marketplace visibility.",
    where: "Dashboard -> Market Wisdom; Marketplace -> Public Shops; Trust -> Trust Passport.",
    evidence: "Trust posture, activity trail, shop status, community context, and current public record.",
    summary: "Lets stronger recorded evidence influence visibility without confusing reach with certainty.",
  },
  7: {
    category: "Visibility & Opportunity",
    realWorld: "A merchant may sell across several communities while still relying on scattered screenshots, chats, and repeated introductions.",
    danger: "Customers cannot easily tell whether the shop, owner, shelf, and contact path belong together.",
    decision: "GSN gives one merchant a controlled shop identity that can travel with community and verification context.",
    tools: "Public Shop -> Shop Gallery -> Spotlight -> WhatsApp contact -> Merchant Verification.",
    where: "Shop -> Public Shop; Marketplace -> Public Shops; Trust -> Merchant Verification.",
    evidence: "One public shop link, shelf items, spotlight media, owner GSN ID, and verification entry points.",
    summary: "Keeps one shop presence connected across marketplaces while preserving community context.",
  },
  8: {
    category: "Finance & Support",
    realWorld: "A person may need money, stock, school fees, emergency support, or working capital before formal finance will listen.",
    danger: "If amount, purpose, duration, and backing are unclear, support can become blind lending, pressure, or informal begging.",
    decision: "GSN turns the request into a reviewable decision with purpose, fit, supporters, and repayment context visible.",
    tools: "Loan Support -> Support Draft -> Fit Check -> Supporter List -> Guarantor Request.",
    where: "Marketplace -> Loan Support; Loan Support -> Readiness / Suggestions / Workbench.",
    evidence: "Amount, purpose, duration, repayment plan, fit signal, suggested supporters, and request record.",
    summary: "Turns support into a visible request people can review before backing it.",
  },
  9: {
    category: "Finance & Support",
    realWorld: "People often want to help someone they know, but they may not know the full responsibility attached to that help.",
    danger: "Support can become emotional pressure, unclear obligation, or hidden risk for the person standing behind the request.",
    decision: "GSN helps a supporter read the request, relationship context, responsibility, and trust evidence before saying yes.",
    tools: "Supporter Check -> Guarantor Inbox -> Trust Passport -> Community Relationship Evidence.",
    where: "Loan Support -> Guarantor Inbox; Trust -> Trust Passport; Marketplace -> Support Requests.",
    evidence: "Support invitation, relationship context, trust reading, guarantor decision, and support trail.",
    summary: "Keeps help connected to responsibility, evidence, and community-backed judgement.",
  },
  10: {
    category: "Finance & Support",
    realWorld: "Urgent support decisions often arrive through calls, messages, or relatives before anyone has time to verify the situation.",
    danger: "A real emergency can be delayed, while a false or unclear request can pull money and attention away from safer decisions.",
    decision: "GSN shortens uncertainty by putting identity, community confirmation, TrustSlip context, and need record together.",
    tools: "TrustSlip -> Community Confirmation -> Demand Box -> Support Request -> Identity Record.",
    where: "Trust -> TrustSlip; Community -> Confirmation; Marketplace -> Demand Box / Support.",
    evidence: "Urgent need record, member identity, community confirmation, TrustSlip code, and support response.",
    summary: "Shortens uncertainty in urgent moments while preserving the evidence boundary.",
  },
  11: {
    category: "Community & Membership",
    realWorld: "Diaspora members and distant supporters often make decisions from far away with only family reports or chat messages.",
    danger: "Distance weakens context, so support, trade, and opportunity can depend on incomplete or one-sided information.",
    decision: "GSN gives distant readers controlled community evidence before they send support, goods, or opportunity.",
    tools: "Community Record -> TrustSlip -> Public Shop -> Community Confirmation -> GSN ID.",
    where: "Community -> Community Record; Trust -> TrustSlip; Shop -> Public Shop.",
    evidence: "Community membership, public identity, shop record, confirmation notes, and verification link.",
    summary: "Lets people across distance see controlled evidence before sending support, goods, or opportunity.",
  },
  12: {
    category: "Finance & Support",
    realWorld: "Savings circles depend on repeated contribution, timing, and mutual confidence.",
    danger: "When memory and informal pressure are the only record, missed contributions and payout disputes are harder to resolve.",
    decision: "GSN adds visible contribution and payout context around familiar savings culture without acting as the bank.",
    tools: "ROSCA Desk -> Contribution Cycle -> Payout Record -> Member Evidence.",
    where: "Marketplace -> ROSCA; Finance -> Community Money.",
    evidence: "Cycle setup, selected members, contribution schedule, payout record, and community context.",
    summary: "Adds a visible trust layer to familiar savings culture without turning GSN into a bank.",
  },
  13: {
    category: "Trust & Evidence",
    realWorld: "People contribute, repay, support, volunteer, sell, and follow through, but much of that history disappears.",
    danger: "When the record is lost, future decisions return to hearsay even after someone has already built evidence.",
    decision: "GSN turns useful behaviour into reviewable Trust Events and records that can inform later decisions.",
    tools: "Trust Events -> Finance Records -> Repayment Record -> Support Evidence -> Trust Passport.",
    where: "Trust -> Trust Passport; Finance -> Records; Loan Support -> Repayment.",
    evidence: "Contribution events, repayment behaviour, support records, timestamps, and community source.",
    summary: "Turns useful history into reviewable evidence for future decisions.",
  },
  14: {
    category: "Community & Membership",
    realWorld: "People move, reconnect, change work, join new circles, and still need their real history to make sense.",
    danger: "Without continuity, a responsible member can look unknown while old accountability becomes hard to find.",
    decision: "GSN keeps identity, community role, and trust trail readable without merging distinct communities into one claim.",
    tools: "GSN ID -> Community Membership -> Trust Passport -> Community Record.",
    where: "Profile -> My GSN Identity; Community -> My Communities; Trust -> Trust Passport.",
    evidence: "GSN ID, active community count, role context, community membership, and trust trail.",
    summary: "Keeps identity continuity visible without merging distinct community records.",
  },
  15: {
    category: "Identity & Verification",
    realWorld: "A person may be known locally but still need a controlled way to present identity and trust context outside that circle.",
    danger: "Screenshots, nicknames, and informal introductions can expose too much private information or prove too little.",
    decision: "GSN gives the member a portable identity package while keeping deeper evidence protected and bounded.",
    tools: "GSN ID -> Trust Passport -> TrustSlip -> Profile photo/selfie -> Community Credential.",
    where: "Profile -> My GSN Identity; Trust -> Trust Passport / TrustSlip; Community -> Member Verify.",
    evidence: "GSN ID, display name, photo/selfie status, credential, TrustSlip code, and verification boundary.",
    summary: "Makes identity portable while keeping private evidence protected.",
  },
  16: {
    category: "Trust & Evidence",
    realWorld: "A good name can be real but trapped inside one street, shop, contact list, or local circle.",
    danger: "When reputation cannot travel with evidence, opportunity stays local and new readers fall back to gossip.",
    decision: "GSN lets reputation move with recorded behaviour, relationship evidence, and community context.",
    tools: "Trust Passport -> Trust Graph -> Community Record -> TrustSlip.",
    where: "Trust -> Trust Passport; Dashboard -> Trust signals; Community -> Community Record.",
    evidence: "Recorded activity, relationship evidence, community footprint, TrustSlip, and current reading.",
    summary: "Lets reputation move with evidence instead of gossip.",
  },
  17: {
    category: "Buying & Selling",
    realWorld: "A shop may be represented by chats, photos, flyers, and personal contacts scattered across many places.",
    danger: "Customers may not know whether the item, owner, contact route, and verification signal belong to the same shop.",
    decision: "GSN gives the shop one public home for shelf items, media, contact, and verification entry points.",
    tools: "Public Shop -> Vault -> Shop Gallery -> Spotlight -> Merchant Verification.",
    where: "Shop -> Public Shop / Vault; Marketplace -> Public Shops.",
    evidence: "Public shop link, shelf blocks, owner GSN ID, spotlight media, and verification actions.",
    summary: "Gives one shop a controlled public home instead of scattered screenshots and phone-only claims.",
  },
  18: {
    category: "Visibility & Opportunity",
    realWorld: "Informal service work often happens through referrals, chats, and one-off introductions.",
    danger: "Good workers remain invisible, and buyers may hire from weak claims because previous work is not easy to review.",
    decision: "GSN helps service work become visible through demand, public identity, community context, and follow-up evidence.",
    tools: "Demand Box -> Public Shop -> TrustSlip -> Community Activity -> Shop Diary.",
    where: "Marketplace -> Demand Box; Shop -> Public Shop; Trust -> TrustSlip.",
    evidence: "Service offer, demand response, community context, public identity, and follow-up activity.",
    summary: "Makes informal service participation more visible and reviewable.",
  },
  19: {
    category: "Trust & Evidence",
    realWorld: "Hiring, task assignment, and service decisions often depend on referrals, confidence, or a quick conversation.",
    danger: "A weak claim can sound strong, and a strong worker can look ordinary when evidence is not visible.",
    decision: "GSN helps the reader check identity, role evidence, community activity, and confirmation before commitment.",
    tools: "Trust Passport -> Community Credential -> TrustSlip -> Community Confirmation.",
    where: "Trust -> Trust Passport; Community -> Member Verify; Marketplace -> Members & Trade.",
    evidence: "Identity status, role evidence, community activity, TrustSlip code, and confirmation note.",
    summary: "Helps work decisions read credibility before commitment.",
  },
  20: {
    category: "Visibility & Opportunity",
    realWorld: "People need work, goods, services, stock, help, or buyers before the right person knows they exist.",
    danger: "Opportunity can be missed simply because demand stayed hidden inside private chats or late conversations.",
    decision: "GSN makes demand visible early enough for members to match needs, supply, and opportunity.",
    tools: "Demand Box -> Marketplace Needs -> Public Shop -> Community Broadcast.",
    where: "Marketplace -> Demand Box; Dashboard -> What Matters Now.",
    evidence: "Need or offer post, community placement, requester context, and response trail.",
    summary: "Makes demand visible so members can match needs, supply, and opportunity earlier.",
  },
  21: {
    category: "Community & Membership",
    realWorld: "A community may hold identity, trade, support, finance, trust, and opportunity records across many disconnected places.",
    danger: "When those records do not meet, the community cannot see its own economic power or protect its members consistently.",
    decision: "GSN connects those records into one operating layer while keeping personal, shop, and institutional claims distinct.",
    tools: "Community Home -> Marketplace -> Finance -> Trust Passport -> Community Domain.",
    where: "Community -> Community Home; Marketplace; Finance; Trust.",
    evidence: "Community identity, member activity, marketplace records, finance evidence, and trust records.",
    summary: "Connects community power into one working layer without confusing personal marketplaces with institutions.",
  },
  22: {
    category: "Trust & Evidence",
    realWorld: "People make savings goals, repayment plans, business promises, and personal commitments that need follow-through.",
    danger: "Without a visible execution trail, intention fades and future readers cannot separate promise from discipline.",
    decision: "GSN turns intention into a focused commitment record with progress, reminders, and completion evidence.",
    tools: "Commitment Builder -> Focus Commitments -> Reminders -> Progress Evidence.",
    where: "Dashboard -> Focus Commitments; Profile -> Member Guide.",
    evidence: "Commitment record, progress steps, reminders, completion trail, and follow-through signal.",
    summary: "Turns intention into a visible discipline record that can support future judgement.",
  },
  23: {
    category: "Community & Membership",
    realWorld: "Schools, unions, churches, cooperatives, markets, and associations need membership, roles, branches, policies, and public claims.",
    danger: "If institutional identity is mixed with personal marketplaces, authority, evidence, and public trust become confusing.",
    decision: "GSN gives institutions a Community Domain so governance, membership, services, and public claims stay structured.",
    tools: "Community Domain -> Domain Settings -> Governance Roles -> Service Panels -> Public Community Record.",
    where: "Community -> Community Domain; Profile -> Route list; Community -> Settings.",
    evidence: "Domain identity, member placement, branch/unit records, role structure, service status, and controlled public claim.",
    summary: "Helps schools, unions, churches, cooperatives, markets, and associations operate with institutional structure.",
  },
};

function publicCapabilityLine(item: (typeof GMFN_CAPABILITIES)[number]) {
  return PUBLIC_CAPABILITY_LINES[item.id] || item.gmfn || item.proverb;
}

function capabilityIconName(item: (typeof GMFN_CAPABILITIES)[number]): GsnIconName {
  return CAPABILITY_ICON_NAMES[item.id] || "spark";
}

function capabilityMapDetail(
  item: (typeof GMFN_CAPABILITIES)[number]
): CapabilityMapDetail {
  return (
    CAPABILITY_MAP_DETAILS[item.id] || {
      category: "Trust & Evidence",
      realWorld: item.proverb,
      danger: "The decision is weaker when the reader cannot see the identity, community, or behaviour evidence behind the claim.",
      decision: publicCapabilityLine(item),
      tools: item.title,
      where: "Profile -> GSN Decision Guide.",
      evidence: item.gmfn,
      summary: publicCapabilityLine(item),
    }
  );
}

function publicCategoryKey(category: string): string {
  if (category === "trade") return "MARKET";
  if (category === "visibility") return "VISIBILITY";
  if (category === "finance") return "MONEY";
  if (category === "support") return "SUPPORT";
  if (category === "community") return "COMMUNITY";
  if (category === "identity") return "TRUST ID";
  if (category === "work") return "WORK";
  return "OPERATING";
}

function publicToneKey(tone: string): string {
  if (tone === "alert") return "RISK";
  if (tone === "spotlight") return "REACH";
  if (tone === "calm") return "STEADY";
  return "FOCUS";
}

function publicKeyChip(kind: "category" | "tone" = "category"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 24,
    padding: "4px 8px",
    borderRadius: 999,
    border:
      kind === "category"
        ? "1px solid rgba(18,49,77,0.13)"
        : "1px solid rgba(201,154,39,0.22)",
    background:
      kind === "category"
        ? "rgba(18,49,77,0.07)"
        : "rgba(201,154,39,0.10)",
    color: kind === "category" ? "#12314D" : "#76591D",
    fontSize: 10,
    fontWeight: 1000,
    letterSpacing: 0,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

function publicCloseButton(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: primary ? 44 : 38,
    padding: primary ? "11px 16px" : "9px 13px",
    borderRadius: 999,
    border: primary
      ? "1px solid rgba(255,255,255,0.78)"
      : "1px solid rgba(201,154,39,0.32)",
    background: primary
      ? "linear-gradient(180deg, #FFFFFF 0%, #EEF4FA 64%, #DCE7F2 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
    color: primary ? "#10253B" : "#F3D06A",
    fontSize: primary ? 14 : 12.5,
    fontWeight: 1000,
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: primary
      ? "0 12px 22px rgba(1,13,32,0.21), inset 0 1px 0 rgba(255,255,255,0.90)"
      : "0 8px 16px rgba(1,13,32,0.13), inset 0 1px 0 rgba(255,255,255,0.10)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function publicGuideLightButton(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: primary ? 44 : 38,
    padding: primary ? "11px 16px" : "9px 13px",
    borderRadius: 999,
    border: primary
      ? "1px solid rgba(214,170,69,0.46)"
      : "1px solid rgba(18,49,77,0.16)",
    background: primary
      ? "linear-gradient(180deg, #F2C766 0%, #D6AA45 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #EEF4FA 100%)",
    color: primary ? "#07172C" : "#12314D",
    fontSize: primary ? 14 : 12.5,
    fontWeight: 1000,
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: primary
      ? "0 12px 22px rgba(214,170,69,0.20)"
      : "0 8px 16px rgba(8,24,42,0.08)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function publicGuideEvidenceCue(): React.CSSProperties {
  return {
    justifySelf: "center",
    width: "min(100%, 342px)",
    borderRadius: 18,
    border: "1px solid rgba(18,49,77,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(246,250,254,0.72) 100%)",
    boxShadow: "0 10px 22px rgba(8,24,42,0.07)",
    padding: "11px 12px 12px",
    color: "#12314D",
  };
}

function PublicCapabilitiesGuidePage({
  compact,
  ios,
  onClose,
}: {
  compact: boolean;
  ios: boolean;
  onClose: () => void;
}) {
  const useIosSingleColumn = compact;
  const [publicCapabilityId, setPublicCapabilityId] = useState<number>(
    GMFN_CAPABILITIES[0]?.id || 1
  );
  const [showAllPublicCapabilities, setShowAllPublicCapabilities] =
    useState<boolean>(false);
  const publicSelectedCapability =
    GMFN_CAPABILITIES.find((item) => item.id === publicCapabilityId) ||
    GMFN_CAPABILITIES[0];
  const publicSelectedIndex = Math.max(
    0,
    GMFN_CAPABILITIES.findIndex((item) => item.id === publicSelectedCapability?.id)
  );

  function stepPublicCapability(direction: -1 | 1) {
    setPublicCapabilityId((currentId) => {
      const currentIndex = GMFN_CAPABILITIES.findIndex((item) => item.id === currentId);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        (safeIndex + direction + GMFN_CAPABILITIES.length) %
        GMFN_CAPABILITIES.length;
      return GMFN_CAPABILITIES[nextIndex]?.id || GMFN_CAPABILITIES[0]?.id || 1;
    });
  }

  return (
    <main style={publicGuideShell()}>
      <div style={publicGuideFrame()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <SecondaryButton
            onClick={onClose}
            debugId="my-gmfn.public.close-top"
            style={publicCloseButton(false)}
          >
            Close
          </SecondaryButton>

          <PrimaryButton
            onClick={onClose}
            debugId="my-gmfn.public.continue-top"
            style={publicCloseButton(true)}
          >
            Continue
          </PrimaryButton>
        </div>

        <section style={publicGuideHeader()}>
          <div
            style={{
              color: "#C8A85C",
              fontSize: 11,
              fontWeight: 1000,
              letterSpacing: 2.2,
              textTransform: "uppercase",
            }}
          >
            GSN Identity Guide
          </div>

          <h1
            style={{
              margin: "8px 0 0",
              color: "#F8FBFF",
              fontSize: useIosSingleColumn ? 25 : compact ? 29 : 42,
              lineHeight: 1.05,
              fontWeight: 1000,
              letterSpacing: 0,
            }}
          >
            GSN Decision Guide
          </h1>

          <div
            style={{
              marginTop: 8,
              color: "#D6E3F0",
              fontSize: useIosSingleColumn ? 13 : 14,
              lineHeight: useIosSingleColumn ? 1.42 : 1.55,
              maxWidth: 760,
            }}
          >
            See the real-world decisions GSN helps people make, why those
            decisions are risky, which tools cooperate, and what evidence
            remains afterwards.
          </div>
        </section>

        {ios ? (
          <GsnInstallPrompt
            tone="dark"
            compact={compact}
            surface="my-gsn-and-i-ios"
          />
        ) : null}

        {publicSelectedCapability ? (
          <section
            style={{
              display: "grid",
              gap: 9,
            }}
          >
            <article
              data-my-gmfn-public-selected-capability="true"
              style={{
                ...(useIosSingleColumn
                  ? publicCapabilityCardIos(publicSelectedCapability.category)
                  : publicCapabilityCard(publicSelectedCapability.category)),
                minHeight: useIosSingleColumn ? "auto" : 174,
              }}
            >
              <span
                style={
                  useIosSingleColumn
                    ? publicCapabilityNumberIos()
                    : publicCapabilityNumber()
                }
              >
                {publicSelectedCapability.id}
              </span>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: useIosSingleColumn
                    ? "44px minmax(0, 1fr)"
                    : "68px minmax(0, 1fr)",
                  gap: useIosSingleColumn ? 9 : 15,
                  alignItems: "start",
                  paddingRight: useIosSingleColumn ? 30 : 44,
                  minWidth: 0,
                }}
              >
                <span
                  style={
                    useIosSingleColumn
                      ? publicCapabilityIconIos()
                      : { ...publicCapabilityIcon(), width: 68, height: 68 }
                  }
                  aria-hidden="true"
                >
                  <GsnLegacyIcon
                    name={capabilityIconName(publicSelectedCapability)}
                    size={useIosSingleColumn ? 33 : 48}
                    decorative
                  />
                </span>

                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      color: "#071D33",
                      fontSize: useIosSingleColumn ? 15.5 : 24,
                      lineHeight: useIosSingleColumn ? 1.14 : 1.12,
                      fontWeight: 1000,
                      letterSpacing: 0,
                      paddingTop: 2,
                      overflowWrap: "normal",
                      wordBreak: "normal",
                    }}
                  >
                    {publicSelectedCapability.title}
                  </h2>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#32465C",
                      fontSize: useIosSingleColumn ? 12.5 : 15,
                      lineHeight: useIosSingleColumn ? 1.32 : 1.45,
                      fontWeight: 760,
                      overflowWrap: "normal",
                      wordBreak: "normal",
                    }}
                  >
                    {capabilityMapDetail(publicSelectedCapability).summary}
                  </div>

                  <div
                    style={{
                      marginTop: 9,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      maxWidth: "100%",
                    }}
                  >
                    <span style={publicKeyChip("category")}>
                      {publicCategoryKey(publicSelectedCapability.category)}
                    </span>
                    <span style={publicKeyChip("tone")}>
                      {publicToneKey(publicSelectedCapability.tone)}
                    </span>
                  </div>
                </div>
              </div>
            </article>

            <div
              aria-label="Move through public GSN capabilities"
              style={{
                display: "grid",
                gridTemplateColumns: useIosSingleColumn
                  ? "minmax(0, 1fr) auto minmax(0, 1fr)"
                  : "150px minmax(0, 1fr) 150px",
                gap: useIosSingleColumn ? 7 : 8,
                alignItems: "center",
              }}
            >
              <SecondaryButton
                type="button"
                debugId="my-gmfn.public.previous-capability"
                onClick={() => stepPublicCapability(-1)}
                aria-label="Show previous public GSN capability"
                style={{
                  ...capabilityPagerButton(false),
                  minHeight: useIosSingleColumn ? 40 : 44,
                  padding: useIosSingleColumn ? "9px 10px" : "10px 13px",
                }}
              >
                <span aria-hidden="true">{"<"}</span>
                Previous
              </SecondaryButton>
              <div
                style={{
                  minHeight: useIosSingleColumn ? 36 : 44,
                  minWidth: useIosSingleColumn ? 48 : 92,
                  borderRadius: 999,
                  border: "1px solid rgba(18,49,77,0.12)",
                  background: "linear-gradient(180deg, #FFFFFF 0%, #EEF4FA 100%)",
                  color: "#12314D",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: useIosSingleColumn ? "8px 10px" : "10px 12px",
                  fontSize: useIosSingleColumn ? 11 : 12,
                  fontWeight: 950,
                  lineHeight: 1.2,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {publicSelectedIndex + 1}/{GMFN_CAPABILITY_COUNT}
              </div>
              <SecondaryButton
                type="button"
                debugId="my-gmfn.public.next-capability"
                onClick={() => stepPublicCapability(1)}
                aria-label="Show next public GSN capability"
                style={{
                  ...capabilityPagerButton(true),
                  minHeight: useIosSingleColumn ? 40 : 44,
                  padding: useIosSingleColumn ? "9px 10px" : "10px 13px",
                }}
              >
                Next
                <span aria-hidden="true">{">"}</span>
              </SecondaryButton>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <SecondaryButton
                onClick={() => setShowAllPublicCapabilities((value) => !value)}
                debugId="my-gmfn.public.toggle-all-capabilities"
                style={publicGuideLightButton(false)}
              >
                {showAllPublicCapabilities ? "Hide full list" : "All capabilities"}
              </SecondaryButton>
            </div>

            {!showAllPublicCapabilities ? (
              <div style={publicGuideEvidenceCue()}>
                <div
                  style={{
                    color: "#32465C",
                    fontSize: 12.5,
                    lineHeight: 1.34,
                    fontWeight: 780,
                    textAlign: "center",
                  }}
                >
                  Each decision card keeps the question, the risk, and the
                  evidence boundary together.
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 6,
                    marginTop: 9,
                  }}
                >
                  {["Question", "Risk", "Evidence"].map((label) => (
                    <span
                      key={label}
                      style={{
                        minHeight: 30,
                        borderRadius: 999,
                        border: "1px solid rgba(18,49,77,0.10)",
                        background: "rgba(255,255,255,0.74)",
                        color: label === "Evidence" ? "#76591D" : "#12314D",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "7px 8px",
                        fontSize: 10.5,
                        fontWeight: 1000,
                        lineHeight: 1,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {showAllPublicCapabilities ? (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: useIosSingleColumn
                ? "1fr"
                : compact
                ? "repeat(auto-fit, minmax(158px, 1fr))"
                : "repeat(4, minmax(0, 1fr))",
              gap: useIosSingleColumn ? 9 : 10,
            }}
          >
            {GMFN_CAPABILITIES.map((item) => {
              const line = publicCapabilityLine(item);

              return (
                <article
                  key={item.id}
                  style={
                    useIosSingleColumn
                      ? publicCapabilityCardIos(item.category)
                      : publicCapabilityCard(item.category)
                  }
                >
                  <span
                    style={
                      useIosSingleColumn
                        ? publicCapabilityNumberIos()
                        : publicCapabilityNumber()
                    }
                  >
                    {item.id}
                  </span>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: useIosSingleColumn
                        ? "48px minmax(0, 1fr)"
                        : "58px 1fr",
                      gap: useIosSingleColumn ? 10 : 13,
                      alignItems: "start",
                      paddingRight: useIosSingleColumn ? 28 : 34,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={
                        useIosSingleColumn
                          ? publicCapabilityIconIos()
                          : publicCapabilityIcon()
                      }
                      aria-hidden="true"
                    >
                      <GsnLegacyIcon
                        name={capabilityIconName(item)}
                        size={useIosSingleColumn ? 36 : 42}
                        decorative
                      />
                    </span>

                    <div style={{ minWidth: 0 }}>
                      <h2
                        style={{
                          margin: 0,
                          color: "#071D33",
                          fontSize: useIosSingleColumn ? 16 : 17,
                          lineHeight: useIosSingleColumn ? 1.14 : 1.18,
                          fontWeight: 1000,
                          letterSpacing: 0,
                          paddingTop: 2,
                          overflowWrap: "normal",
                          wordBreak: "normal",
                        }}
                      >
                        {item.title}
                      </h2>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#32465C",
                          fontSize: useIosSingleColumn ? 12.5 : 13,
                          lineHeight: useIosSingleColumn ? 1.36 : 1.42,
                          fontWeight: 700,
                          overflowWrap: "normal",
                          wordBreak: "normal",
                        }}
                      >
                        {line}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          maxWidth: "100%",
                        }}
                      >
                        <span style={publicKeyChip("category")}>
                          {publicCategoryKey(item.category)}
                        </span>
                        <span style={publicKeyChip("tone")}>
                          {publicToneKey(item.tone)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        {showAllPublicCapabilities ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 8,
            }}
          >
            <SecondaryButton
              onClick={onClose}
              debugId="my-gmfn.public.collapse-bottom"
              style={publicGuideLightButton(false)}
            >
              Collapse
            </SecondaryButton>
            <PrimaryButton
              onClick={onClose}
              debugId="my-gmfn.public.continue-bottom"
              style={publicGuideLightButton(true)}
            >
              Continue
            </PrimaryButton>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function normalizeSettings(raw: any): SettingsState {
  const tone = safeStr(raw?.tonePreset || raw?.tone_preset);

  return {
    notificationsMode:
      safeStr(raw?.notificationsMode || raw?.notifications_mode) === "detailed"
        ? "detailed"
        : "summary",
    unreadFirst: Boolean(raw?.unreadFirst ?? raw?.unread_first ?? true),
    openActionsDirectly: Boolean(
      raw?.openActionsDirectly ?? raw?.open_actions_directly ?? true
    ),
    tonePreset:
      tone === "cooperative-warm" || tone === "enterprise-green"
        ? (tone as SettingsState["tonePreset"])
        : "balanced-default",
  };
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

export default function MyGMFNAndIPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAppRoute = location.pathname.startsWith("/app/");
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "my-gmfn.route.dashboard-target"),
      community: routeTarget("communityHome", selectedClanId, "my-gmfn.route.community-target"),
      marketplace: routeTarget("marketplace", selectedClanId, "my-gmfn.route.marketplace-target"),
      finance: routeTarget("finance", selectedClanId, "my-gmfn.route.finance-target"),
      loans: routeTarget("loans", selectedClanId, "my-gmfn.route.loans-target"),
      guide: routeTarget("profile", selectedClanId, "my-gmfn.route.guide-target"),
      settings: routeTarget("settings", selectedClanId, "my-gmfn.route.settings-target"),
      trust: routeTarget("trust", selectedClanId, "my-gmfn.route.trust-target"),
      demandBox: routeTarget("demandBox", selectedClanId, "my-gmfn.route.demand-box-target"),
    }),
    [selectedClanId]
  );
  const routeState = (location.state || {}) as { returnTo?: string };
  const publicReturnTo = safeStr(routeState.returnTo) || "/cover";

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [isIosTarget, setIsIosTarget] = useState<boolean>(() =>
    isIosManualInstallTarget()
  );

  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [trustSlipSummary, setTrustSlipSummary] = useState<any | null>(null);
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<number>(1);
  const [capabilitySearch, setCapabilitySearch] = useState<string>("");
  const [capabilityCategory, setCapabilityCategory] = useState<
    CapabilityMapCategory | "All"
  >("All");
  const [settings, setSettings] = useState<SettingsState>(() =>
    readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
  );
  const [profileDisplayName, setProfileDisplayName] = useState("");

  const activeTab = useMemo(() => {
    if (!isAppRoute) return "guide";
    const params = new URLSearchParams(location.search);
    return safeStr(params.get("tab")).toLowerCase() === "settings"
      ? "settings"
      : "guide";
  }, [isAppRoute, location.search]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
      setIsIosTarget(isIosManualInstallTarget());
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    writeLocalJSON(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!loading || !isAppRoute) {
      setSlowLoad(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setSlowLoad(true);
    }, SLOW_WORKSPACE_SETTINGS_LOAD_MS);

    return () => window.clearTimeout(timer);
  }, [loading, isAppRoute]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!isAppRoute) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [meRes, clanRes, settingsRes, trustSlipRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getMySettings().catch(() => null),
          callFirstAvailable(
            [
              "getMyTrustSlipSummary",
              "getTrustSlipSummary",
              "getTrustSlipMeSummary",
              "getMyTrustSlip",
            ],
            [[], [{ clan_id: selectedClanId || undefined }]]
          ),
        ]);

        if (!alive) return;

        const localSettings = readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

        setMe(meRes || null);
        setProfileDisplayName(
          firstTruthy(
            meRes?.display_name,
            meRes?.nickname,
            meRes?.name,
            meRes?.first_name
          )
        );
        setCurrentClan(clanRes || null);
        setTrustSlipSummary(normalizeIdentityTrustSlip(trustSlipRes));
        setSettings(
          settingsRes ? normalizeSettings(settingsRes) : normalizeSettings(localSettings)
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAppRoute, selectedClanId]);

  const displayName = useMemo(() => {
    return (
      firstTruthy(
        trustSlipSummary?.display_name,
        trustSlipSummary?.identity_context?.display_name,
        trustSlipSummary?.identity_context?.name,
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me, trustSlipSummary]);

  const gmfnIdValue = useMemo(() => {
    return firstTruthy(
      trustSlipSummary?.gmfn_id,
      trustSlipSummary?.identity_context?.gmfn_id,
      me?.gmfn_id
    );
  }, [me, trustSlipSummary]);

  const gmfnId = gmfnIdValue || "Not issued yet";

  const hasGsnId = useMemo(() => {
    const text = safeStr(gmfnIdValue);
    return Boolean(text && text.toLowerCase() !== "not issued yet");
  }, [gmfnIdValue]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        trustSlipSummary?.community,
        trustSlipSummary?.community_context?.community,
        trustSlipSummary?.community_context?.name,
        trustSlipSummary?.community_context?.marketplace_name,
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || "No current community"
    );
  }, [currentClan, trustSlipSummary]);

  const activeCommunityCount = useMemo(() => {
    const footprintCount = Array.isArray(trustSlipSummary?.community_footprint)
      ? trustSlipSummary.community_footprint.length
      : 0;
    return firstPositiveNumber(
      trustSlipSummary?.active_clan_count,
      trustSlipSummary?.community_context?.active_clan_count,
      trustSlipSummary?.community_context?.community_footprint_count,
      footprintCount,
      me?.active_clan_count,
      me?.active_membership_count,
      me?.communities_count,
      me?.community_count,
      currentClan ? 1 : ""
    );
  }, [currentClan, me, trustSlipSummary]);

  const phoneRecorded = truthyEvidence(
    trustSlipSummary?.phone_recorded,
    trustSlipSummary?.phone_verified,
    trustSlipSummary?.identity_context?.phone_recorded,
    trustSlipSummary?.identity_context?.phone_verified,
    trustSlipSummary?.merchant_summary?.phone_recorded,
    trustSlipSummary?.merchant_summary?.phone_verified,
    me?.phone_recorded,
    me?.phone_verified
  );
  const phoneVerified = truthyEvidence(
    trustSlipSummary?.phone_verified,
    trustSlipSummary?.identity_context?.phone_verified,
    trustSlipSummary?.merchant_summary?.phone_verified,
    me?.phone_verified
  );
  const bankRecorded = truthyEvidence(
    trustSlipSummary?.bank_details_recorded,
    trustSlipSummary?.bank_verified,
    trustSlipSummary?.identity_context?.bank_details_recorded,
    trustSlipSummary?.identity_context?.bank_verified,
    trustSlipSummary?.merchant_summary?.bank_details_recorded,
    trustSlipSummary?.merchant_summary?.bank_verified,
    me?.bank_details_recorded,
    me?.bank_recorded
  );
  const bankVerified = trustSlipSummary?.bank_verified === true ||
    trustSlipSummary?.identity_context?.bank_verified === true ||
    trustSlipSummary?.merchant_summary?.bank_verified === true
    ? true
    : null;
  const officialIdRecorded = truthyEvidence(
    trustSlipSummary?.official_id_recorded,
    trustSlipSummary?.official_id_verified,
    trustSlipSummary?.passport_recorded,
    trustSlipSummary?.passport_verified,
    trustSlipSummary?.identity_context?.official_id_recorded,
    trustSlipSummary?.identity_context?.official_id_verified,
    trustSlipSummary?.identity_context?.passport_recorded,
    trustSlipSummary?.merchant_summary?.official_id_recorded,
    trustSlipSummary?.merchant_summary?.passport_recorded,
    me?.official_id_recorded,
    me?.passport_recorded
  );
  const officialIdVerified = truthyEvidence(
    trustSlipSummary?.official_id_verified,
    trustSlipSummary?.passport_verified,
    trustSlipSummary?.identity_context?.official_id_verified,
    trustSlipSummary?.identity_context?.passport_verified,
    trustSlipSummary?.merchant_summary?.official_id_verified,
    me?.official_id_verified,
    me?.passport_verified
  );
  const profilePhotoRecorded = truthyEvidence(
    trustSlipSummary?.photo_recorded,
    trustSlipSummary?.identity_context?.photo_recorded,
    trustSlipSummary?.identity_context?.photo_evidence_recorded,
    trustSlipSummary?.merchant_summary?.photo_recorded,
    trustSlipSummary?.profile_image_url,
    trustSlipSummary?.identity_context?.profile_image_url,
    me?.profile_image_url,
    me?.profile_photo_url,
    me?.photo_url,
    me?.avatar_url,
    me?.photo_recorded,
    me?.selfie_recorded
  );
  const communityIdentityConfirmed = truthyEvidence(
    trustSlipSummary?.community_identity_confirmed,
    trustSlipSummary?.identity_context?.community_identity_confirmed,
    trustSlipSummary?.community_context?.current_user_is_active_member,
    currentClan ? "confirmed" : ""
  );
  const communityActivityCount = firstPositiveNumber(
    trustSlipSummary?.community_activity_count,
    trustSlipSummary?.merchant_summary?.community_activity_count,
    trustSlipSummary?.community_context?.community_activity_count,
    activeCommunityCount
  );

  const identityEvidence = useMemo(() => {
    const backendSummary =
      trustSlipSummary?.identity_evidence_summary ||
      trustSlipSummary?.identity_context?.identity_evidence_summary ||
      trustSlipSummary?.merchant_summary?.identity_evidence_summary ||
      null;
    const local = buildIdentityEvidenceCompletion({
      detailsDone: Boolean(displayName !== "Member" || hasGsnId),
      phoneDone: phoneRecorded,
      photoRecorded: profilePhotoRecorded,
      bankRecorded,
      officialIdRecorded,
      countReadyAsProgress: false,
    });
    if (!backendSummary || typeof backendSummary !== "object") return local;
    return {
      ...local,
      score: Number(backendSummary.score ?? local.score),
      degrees: Number(backendSummary.degrees ?? local.degrees),
      label: firstTruthy(backendSummary.label, local.label),
      status: firstTruthy(backendSummary.status, local.status) as typeof local.status,
      next: firstTruthy(backendSummary.institutional_note, local.next),
    };
  }, [
    bankRecorded,
    displayName,
    hasGsnId,
    officialIdRecorded,
    phoneRecorded,
    profilePhotoRecorded,
    trustSlipSummary,
  ]);

  const sourceIdentityStatusLabel = useMemo(
    () =>
      firstTruthy(
        trustSlipSummary?.identity_status_label,
        trustSlipSummary?.identity_context?.identity_status_label
      ),
    [trustSlipSummary]
  );

  const passportVm = useMemo(
    () =>
      buildTrustPassportViewModel({
        displayName,
        profileImageUrl: firstTruthy(
          trustSlipSummary?.profile_image_url,
          trustSlipSummary?.identity_context?.profile_image_url,
          me?.profile_image_url,
          me?.profile_photo_url,
          me?.photo_url,
          me?.avatar_url
        ),
        gmfnId,
        communityName: communityLabel,
        communityId: firstTruthy(
          trustSlipSummary?.community_global_id,
          trustSlipSummary?.community_code,
          trustSlipSummary?.community_context?.community_global_id,
          trustSlipSummary?.community_context?.community_code,
          currentClan?.community_code,
          currentClan?.id
        ),
        holderRole: firstTruthy(
          trustSlipSummary?.holder_role,
          trustSlipSummary?.community_context?.holder_role,
          "member"
        ),
        activeMemberCount: firstTruthy(
          trustSlipSummary?.active_member_count,
          trustSlipSummary?.community_member_count,
          trustSlipSummary?.community_context?.active_member_count,
          activeCommunityCount
        ),
        phoneRecorded,
        phoneVerified,
        bankRecorded,
        bankVerified,
        bankVerificationLabel: firstTruthy(
          trustSlipSummary?.bank_verification_label,
          trustSlipSummary?.merchant_summary?.bank_verification_label,
          trustSlipSummary?.identity_context?.bank_verification_label
        ),
        passportRecorded: officialIdRecorded,
        officialIdRecorded,
        passportVerified: officialIdVerified,
        passportVerificationLabel: firstTruthy(
          trustSlipSummary?.passport_verification_label,
          trustSlipSummary?.merchant_summary?.passport_verification_label,
          trustSlipSummary?.identity_context?.passport_verification_label,
          trustSlipSummary?.official_id_label,
          trustSlipSummary?.identity_context?.official_id_label
        ),
        identityEvidenceScore: identityEvidence.score,
        identityEvidenceLabel: identityEvidence.label,
        communityIdentityConfirmed,
        communityIdentityLabel: firstTruthy(
          trustSlipSummary?.community_identity_label,
          trustSlipSummary?.merchant_summary?.community_identity_label,
          trustSlipSummary?.identity_context?.community_identity_label
        ),
        communityActivityCount,
        communityActivityLabel: firstTruthy(
          trustSlipSummary?.community_activity_label,
          trustSlipSummary?.merchant_summary?.community_activity_label,
          trustSlipSummary?.community_context?.community_activity_label
        ),
        membershipCurrentnessLabel: firstTruthy(
          trustSlipSummary?.membership_currentness_label,
          trustSlipSummary?.community_context?.membership_currentness_label
        ),
        membershipCurrentnessScope: firstTruthy(
          trustSlipSummary?.membership_currentness_scope,
          trustSlipSummary?.community_context?.membership_currentness_scope
        ),
        identityVerified:
          trustSlipSummary?.identity_verified ??
          trustSlipSummary?.identity_context?.identity_verified,
        identityStatusLabel: sourceIdentityStatusLabel,
        hasSelectedCommunity: Boolean(currentClan || selectedClanId),
        band: firstTruthy(
          trustSlipSummary?.band,
          trustSlipSummary?.level,
          trustSlipSummary?.level_label,
          "Evidence building"
        ),
        score: firstTruthy(
          trustSlipSummary?.standing_score,
          trustSlipSummary?.trust_score,
          "0"
        ),
        eventCount: firstTruthy(
          trustSlipSummary?.event_count,
          trustSlipSummary?.community_activity_count,
          communityActivityCount
        ),
        activeClans: activeCommunityCount,
        counterparties: trustSlipSummary?.unique_counterparties,
        sponsorCount: trustSlipSummary?.sponsor_count,
        riskLevel: trustSlipSummary?.risk_level,
        riskFlags: Array.isArray(trustSlipSummary?.risk_flags)
          ? trustSlipSummary.risk_flags
          : [],
        trustSlipStatus: firstTruthy(
          trustSlipSummary?.status,
          trustSlipSummary?.active === true ? "active" : ""
        ),
        trustSlipCode: firstTruthy(
          trustSlipSummary?.code,
          trustSlipSummary?.verification_code,
          trustSlipSummary?.token
        ),
        verifyUrl: firstTruthy(trustSlipSummary?.public_verify_url),
      }),
    [
      activeCommunityCount,
      bankRecorded,
      bankVerified,
      communityActivityCount,
      communityIdentityConfirmed,
      communityLabel,
      currentClan,
      displayName,
      gmfnId,
      identityEvidence,
      me,
      officialIdRecorded,
      officialIdVerified,
      phoneRecorded,
      phoneVerified,
      selectedClanId,
      sourceIdentityStatusLabel,
      trustSlipSummary,
    ]
  );

  const identityStatus = useMemo(() => {
    if (sourceIdentityStatusLabel) {
      return sourceIdentityStatusLabel;
    }
    if (passportVm.identity.identityVerified === true) return "Identity recorded";
    if (identityEvidence.score >= 55) return `${identityEvidence.label} recorded`;
    if (identityEvidence.score > 0) return `${identityEvidence.label} building`;
    return "Evidence not recorded yet";
  }, [identityEvidence, passportVm, sourceIdentityStatusLabel]);

  const trustPassportStatus = useMemo(() => {
    if (passportVm.identity.identityVerified === true) return "Identity verified";
    if (identityEvidence.score >= 55) return `${identityEvidence.label} record`;
    if (
      identityEvidence.score >= 35 &&
      passportVm.verdict.evidenceLabel !== "Evidence still building"
    ) {
      return passportVm.verdict.evidenceLabel;
    }
    if (identityEvidence.score >= 35) return "Evidence record building";
    return "Evidence building";
  }, [identityEvidence.label, identityEvidence.score, passportVm]);

  const profilePhotoStatus = profilePhotoRecorded
    ? "Photo/selfie recorded"
    : "Photo/selfie needed";

  const capabilityCount = GMFN_CAPABILITY_COUNT;
  const filteredCapabilities = useMemo(() => {
    const query = safeStr(capabilitySearch).toLowerCase();
    return GMFN_CAPABILITIES.filter((item) => {
      const detail = capabilityMapDetail(item);
      const categoryOk =
        capabilityCategory === "All" || detail.category === capabilityCategory;
      if (!categoryOk) return false;
      if (!query) return true;
      return [
        item.title,
        detail.category,
        detail.realWorld,
        detail.danger,
        detail.decision,
        detail.tools,
        detail.where,
        detail.evidence,
        detail.summary,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [capabilityCategory, capabilitySearch]);
  const selectedCapability = useMemo(
    () =>
      filteredCapabilities.find((item) => item.id === selectedCapabilityId) ||
      filteredCapabilities[0] ||
      GMFN_CAPABILITIES.find((item) => item.id === selectedCapabilityId) ||
      GMFN_CAPABILITIES[0],
    [filteredCapabilities, selectedCapabilityId]
  );
  const selectedCapabilityDetail = useMemo(
    () => capabilityMapDetail(selectedCapability),
    [selectedCapability]
  );
  const selectedCapabilityIndex = useMemo(() => {
    const list = filteredCapabilities.length ? filteredCapabilities : GMFN_CAPABILITIES;
    const index = list.findIndex((item) => item.id === selectedCapability?.id);
    return index >= 0 ? index : 0;
  }, [filteredCapabilities, selectedCapability?.id]);
  function stepCapability(direction: -1 | 1) {
    setSelectedCapabilityId((currentId) => {
      const list = filteredCapabilities.length ? filteredCapabilities : GMFN_CAPABILITIES;
      const currentIndex = list.findIndex((item) => item.id === currentId);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        (safeIndex + direction + list.length) %
        list.length;
      return list[nextIndex]?.id || GMFN_CAPABILITIES[0]?.id || 1;
    });
  }
  const topNavHomeTo = isAppRoute ? routes.dashboard : "/cover";
  const topNavHomeLabel = isAppRoute ? "Dashboard" : "Cover";
  const topNavTitle = isAppRoute ? "My GSN Identity" : "GSN Guide";
  const topNavSubtitle = isAppRoute
    ? "Identity, trust records, communities, shops, and opportunities."
    : `Understand what GSN can do before you sign in, enter a community, or move into protected pages.`;
  const publicGuideEntryItems = useMemo<NextActionGuideItem[]>(
    () => [
      {
        id: "open-cover",
        label: "Open GSN cover",
        detail:
          "Start from the public front door when you want the broadest entry view before choosing a path.",
        to: "/cover",
        keywords: ["cover", "entry", "front door", "open gsn"],
        tone: "secondary",
      },
      {
        id: "create-or-join",
        label: "Create or join a community",
        detail:
          "Use the entry page when the next job is entering, building, or joining a real community path.",
        to: "/welcome",
        keywords: ["welcome", "join", "create", "community"],
        tone: "primary",
      },
      {
        id: "sign-in",
        label: "Sign in to reopen protected pages",
        detail:
          "Use sign in when you already have an account and need dashboard, marketplace, loans, trust, or other protected member tools.",
        to: "/login",
        keywords: ["login", "sign in", "dashboard", "member", "protected"],
        tone: "secondary",
      },
    ],
    []
  );
  const appGuideRoutes = useMemo(
    () => [
      {
        label: "Dashboard",
        detail: "Start here for your next step.",
        icon: "chart" as GsnIconName,
        to: routes.dashboard,
        debugId: "my-gmfn.route.dashboard",
      },
      {
        label: "Community Home",
        detail: "Community power and private control.",
        icon: "home" as GsnIconName,
        to: routes.community,
        debugId: "my-gmfn.route.community",
      },
      {
        label: "Marketplace",
        detail: "Buying, selling, and visibility.",
        icon: "shop" as GsnIconName,
        to: routes.marketplace,
        debugId: "my-gmfn.route.marketplace",
      },
      {
        label: "Finance",
        detail: "Money records and payment evidence.",
        icon: "financeInstitution" as GsnIconName,
        to: routes.finance,
        debugId: "my-gmfn.route.finance",
      },
      {
        label: "Loan Support",
        detail: "Support actions and community-backed loans.",
        icon: "wallet" as GsnIconName,
        to: routes.loans,
        debugId: "my-gmfn.route.loans",
      },
      {
        label: "Trust Passport",
        detail: "Deeper trust identity and evidence.",
        icon: "shield" as GsnIconName,
        to: routes.trust,
        debugId: "my-gmfn.route.trust",
      },
      {
        label: "Demand Box",
        detail: "Needs and opportunities.",
        icon: "document" as GsnIconName,
        to: routes.demandBox,
        debugId: "my-gmfn.route.demand-box",
      },
      {
        label: "My GSN Identity",
        detail: "Guidance, settings, and capability overview.",
        icon: "user" as GsnIconName,
        to: routes.guide,
        debugId: "my-gmfn.route.my-gmfn",
        active: true,
      },
    ],
    [routes]
  );

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  async function saveSettings() {
    setSaving(true);

    try {
      const payload = {
        notificationsMode: settings.notificationsMode,
        notifications_mode: settings.notificationsMode,
        unreadFirst: settings.unreadFirst,
        unread_first: settings.unreadFirst,
        openActionsDirectly: settings.openActionsDirectly,
        open_actions_directly: settings.openActionsDirectly,
        tonePreset: settings.tonePreset,
        tone_preset: settings.tonePreset,
      };

      const saved = await callFirstAvailable(
        [
          "updateMySettings",
          "saveMySettings",
          "updateSettings",
          "saveSettings",
          "setMySettings",
        ],
        [[payload]]
      );

      writeLocalJSON(SETTINGS_STORAGE_KEY, settings);

      if (saved) {
        showNotice("success", "Settings saved.");
      } else {
        showNotice(
          "success",
          "Settings saved on this device."
        );
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Settings could not be saved right now."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveProfileName() {
    const cleanName = profileDisplayName.trim();
    if (cleanName.length < 2) {
      showNotice("error", "Enter the name or street name people know you by.");
      return;
    }

    setProfileSaving(true);

    try {
      const updated = await updateMyProfile({ display_name: cleanName });
      const savedName = firstTruthy(updated?.display_name, cleanName);
      setMe(updated || me);
      setProfileDisplayName(savedName);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("gmfn_profile_name", savedName);
      }
      showNotice(
        "success",
        "Display name saved. Admin Tools and trust pages can now use it."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "GSN could not save this name right now."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    showNotice("success", "Settings reset to the calmer defaults.");
  }

  function closePublicGuide() {
    navigate(publicReturnTo, { replace: false });
  }

  if (!isAppRoute) {
    return (
      <PublicCapabilitiesGuidePage
        compact={isCompact}
        ios={isIosTarget}
        onClose={closePublicGuide}
      />
    );
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        <PageTopNav
          sectionLabel={topNavTitle}
          title={topNavTitle}
          subtitle={isAppRoute ? "Loading your workspace settings..." : "Loading the public guide..."}
          homeTo={topNavHomeTo}
          homeLabel={topNavHomeLabel}
          backTo={topNavHomeTo}
        />

        <section style={pageCard()}>
          <div style={{ color: "#64748B", lineHeight: 1.8, fontWeight: 800 }}>
            {slowLoad
              ? "This is taking longer than expected."
              : "Loading workspace settings..."}
          </div>
          {slowLoad ? (
            <p
              style={{
                margin: "10px 0 0",
                color: "#617085",
                fontSize: 14,
                lineHeight: 1.65,
                maxWidth: 680,
              }}
            >
              Your guide can still open from Dashboard after the connection
              settles. Wait here, or use the Dashboard link above and come back.
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: isCompact ? 28 : 40,
        display: "grid",
        gap: isCompact ? 14 : 18,
        WebkitTextSizeAdjust: "100%",
      }}
    >
      {!isCompact ? (
        <PageTopNav
          sectionLabel={topNavTitle}
          title={topNavTitle}
          subtitle={topNavSubtitle}
          homeTo={topNavHomeTo}
          homeLabel={topNavHomeLabel}
          backTo={topNavHomeTo}
        />
      ) : null}

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section style={appGuidePanel(isCompact)}>
        <div style={appNavyCard(isCompact)}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "48px minmax(0, 1fr)" : "60px minmax(0, 1fr)",
              alignItems: "center",
              gap: isCompact ? 10 : 14,
            }}
          >
            <span style={appGuideIconBox(true, isCompact)}>
              <GsnLegacyIcon
                name="id"
                size={isCompact ? 38 : 46}
                decorative
              />
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#C8A85C",
                  fontSize: 11,
                  fontWeight: 1000,
                  letterSpacing: 1.8,
                  textTransform: "uppercase",
                }}
              >
                Personal command centre
              </div>
              <h1
                style={{
                  margin: "5px 0 0",
                  fontSize: isCompact ? 24 : 34,
                  lineHeight: 1.05,
                  fontWeight: 1000,
                  letterSpacing: 0,
                }}
              >
                My GSN Identity
              </h1>
              <div
                style={{
                  marginTop: 7,
                  color: "#DCEBFA",
                  fontSize: isCompact ? 13 : 15,
                  lineHeight: 1.4,
                  fontWeight: 750,
                  maxWidth: 780,
                }}
              >
                Your identity, trust records, communities, shops, and
                opportunities in one place.
              </div>
            </div>
          </div>

          <div
            data-my-gsn-identity-status-grid="true"
            style={{
              marginTop: isCompact ? 14 : 18,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
              gap: 9,
            }}
          >
            {[
              ["GSN ID", gmfnId],
              ["Identity evidence", identityStatus],
              [
                "Active communities",
                activeCommunityCount > 0
                  ? String(activeCommunityCount)
                  : "No active community",
              ],
              ["Trust Passport", trustPassportStatus],
              ["Photo/selfie", profilePhotoStatus],
              ["Main context", communityLabel],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  minHeight: isCompact ? 66 : 72,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.13)",
                  background: "rgba(255,255,255,0.075)",
                  padding: isCompact ? 10 : 12,
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    color: "#9FB5CA",
                    fontSize: 10.5,
                    fontWeight: 1000,
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    color: "#F8FBFF",
                    fontSize: isCompact ? 12.5 : 14,
                    fontWeight: 950,
                    lineHeight: 1.18,
                    overflowWrap: "anywhere",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <StableCtaLink
            to={routes.dashboard}
            kind="primary"
            debugId="my-gmfn.hero.dashboard"
            style={{
              marginTop: isCompact ? 14 : 18,
              minHeight: isCompact ? 54 : 58,
              borderRadius: 18,
              justifyContent: "center",
              fontSize: isCompact ? 14 : 15,
            }}
          >
            Open dashboard
            <span aria-hidden="true">{">"}</span>
          </StableCtaLink>
        </div>

        <div
          style={{
            marginTop: isCompact ? 12 : 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "180px 180px minmax(0, 1fr)",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <StableCtaLink
            to={routes.guide}
            kind={activeTab === "guide" ? "primary" : "secondary"}
            debugId="my-gmfn.tab.guide"
            style={{
              minHeight: isCompact ? 46 : 52,
              borderRadius: 999,
              padding: isCompact ? "10px 12px" : undefined,
              fontSize: isCompact ? 14 : undefined,
              gap: 7,
            }}
          >
            <GsnLegacyIcon name="spark" size={24} decorative />
            Decision Guide
          </StableCtaLink>

          <StableCtaLink
            to={routes.settings}
            kind={activeTab === "settings" ? "primary" : "secondary"}
            debugId="my-gmfn.tab.settings"
            style={{
              minHeight: isCompact ? 46 : 52,
              borderRadius: 999,
              padding: isCompact ? "10px 12px" : undefined,
              fontSize: isCompact ? 14 : undefined,
            }}
          >
            Member Guide
          </StableCtaLink>

          <StableCtaLink
            to={routes.trust}
            kind="secondary"
            debugId="my-gmfn.quick-guide.trust"
            style={{
              gridColumn: isCompact ? "1 / -1" : undefined,
              minHeight: isCompact ? 72 : 82,
              borderRadius: 18,
              justifyContent: "flex-start",
              padding: isCompact ? "12px 14px" : "14px 16px",
              textAlign: "left",
              fontSize: isCompact ? 13.5 : undefined,
              lineHeight: 1.35,
            }}
          >
            <span style={appGuideMiniIconBubble()}>
              <GsnLegacyIcon name="spark" size={24} decorative />
            </span>
            <span>
              <strong>Quick Guide</strong>
              <br />
              {profilePhotoRecorded
                ? "Review your Trust Passport and TrustSlip evidence before sharing a public record."
                : "Strengthen your identity evidence. Add a clear photo/selfie to keep your Trust Passport and TrustSlip strong."}
            </span>
          </StableCtaLink>
        </div>
      </section>

      {activeTab === "guide" ? (
        <>
          <section
            style={{
              ...appGuidePanel(isCompact),
              display: "grid",
              gap: isCompact ? 10 : 12,
            }}
          >
            {selectedCapability ? (
              <div
                data-my-gmfn-selected-capability="true"
                style={{
                  borderRadius: isCompact ? 18 : 22,
                  border: "1px solid rgba(15,23,42,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(247,250,255,0.99) 100%)",
                  boxShadow:
                    "0 14px 28px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.98)",
                  padding: isCompact ? 14 : 16,
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "64px minmax(0, 1fr)",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div style={isCompact ? capabilityCardTop() : capabilityVisualRail()}>
                    <span style={appGuideNumber()}>{selectedCapability.id}</span>
                    <span style={appGuideMiniIconBubble()}>
                      <GsnLegacyIcon
                        name={capabilityIconName(selectedCapability)}
                        size={isCompact ? 24 : 30}
                        decorative
                      />
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={publicKeyChip("category")}>
                      {selectedCapabilityDetail.category}
                    </span>
                    <h2
                      style={{
                        margin: "9px 0 0",
                        color: "#07172C",
                        fontSize: isCompact ? 20 : 24,
                        fontWeight: 1000,
                        lineHeight: 1.08,
                        letterSpacing: 0,
                        overflowWrap: "normal",
                      }}
                    >
                      {selectedCapability.title}
                    </h2>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#425466",
                        fontSize: isCompact ? 13 : 14,
                        fontWeight: 760,
                        lineHeight: 1.45,
                      }}
                    >
                      {selectedCapabilityDetail.summary}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {[
                    ["The real-world problem", selectedCapabilityDetail.realWorld],
                    ["Why it is dangerous", selectedCapabilityDetail.danger],
                    ["How GSN changes the decision", selectedCapabilityDetail.decision],
                    ["Which GSN tools cooperate", selectedCapabilityDetail.tools],
                    ["Where you use them", selectedCapabilityDetail.where],
                    ["Evidence created", selectedCapabilityDetail.evidence],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(15,23,42,0.07)",
                        background: "#FFFFFF",
                        padding: 12,
                        minHeight: isCompact ? 0 : 112,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          color: "#526579",
                          fontSize: 11,
                          fontWeight: 1000,
                          letterSpacing: 0.7,
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          marginTop: 7,
                          color: "#10253B",
                          fontSize: isCompact ? 13 : 13.5,
                          fontWeight: 760,
                          lineHeight: 1.42,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <details
              data-my-gmfn-decision-guide-tools="collapsed"
              style={{
                borderRadius: 18,
                border: "1px solid rgba(37,78,119,0.12)",
                background:
                  "linear-gradient(180deg, rgba(248,251,255,0.96) 0%, rgba(255,255,255,0.995) 100%)",
                boxShadow:
                  "0 10px 22px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.98)",
                overflow: "hidden",
              }}
            >
              <StableDisclosureSummary
                debugId="my-gmfn.profile.decision-guide-tools"
                stableHeight={isCompact ? 56 : 60}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: isCompact ? "11px 13px" : "12px 15px",
                  color: "#07172C",
                  fontSize: isCompact ? 13.5 : 14,
                  fontWeight: 1000,
                  background: "transparent",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    minWidth: 0,
                  }}
                >
                  <span style={appGuideMiniIconBubble()}>
                    <GsnLegacyIcon name="search" size={24} decorative />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block" }}>Find another decision</span>
                    {!isCompact ? (
                      <span
                        style={{
                          display: "block",
                          marginTop: 2,
                          color: "#64748B",
                          fontSize: 12,
                          fontWeight: 760,
                          lineHeight: 1.2,
                        }}
                      >
                        Search, filter, or open the full guide boundary.
                      </span>
                    ) : null}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRight: "2px solid #64748B",
                    borderBottom: "2px solid #64748B",
                    transform: "rotate(45deg)",
                    flex: "0 0 auto",
                    marginRight: 4,
                  }}
                />
              </StableDisclosureSummary>

              <div
                style={{
                  padding: isCompact ? "0 13px 13px" : "0 15px 15px",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    color: "#07172C",
                    fontSize: isCompact ? 18 : 22,
                    fontWeight: 1000,
                    lineHeight: 1.08,
                  }}
                >
                  GSN Decision Guide
                </div>

                <div
                  style={{
                    color: "#64748B",
                    fontSize: isCompact ? 12.5 : 13.5,
                    fontWeight: 700,
                    lineHeight: 1.42,
                  }}
                >
                  Read each capability as a decision story: what happens in real
                  life, why the decision is dangerous, how GSN changes the question,
                  which tools cooperate, and what evidence remains afterwards. This
                  guide explains capability; it is not proof that any one member,
                  shop, payout, paid verification, or protected trade release is
                  already approved.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(220px, 0.55fr)",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "grid", gap: 8 }}>
                    <label
                      htmlFor="my-gmfn-capability-search"
                      style={{
                        ...sectionLabel(),
                        color: "#425466",
                        fontSize: 12,
                      }}
                    >
                      Search by decision
                    </label>
                    <input
                      id="my-gmfn-capability-search"
                      aria-label="Search GSN capabilities by decision, risk, tool, location, or evidence"
                      value={capabilitySearch}
                      onChange={(event) => setCapabilitySearch(event.target.value)}
                      placeholder="Search decision, risk, tool, page, or evidence"
                      style={selectStyle()}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label
                      htmlFor="my-gmfn-capability-category"
                      style={{
                        ...sectionLabel(),
                        color: "#425466",
                        fontSize: 12,
                      }}
                    >
                      Category filter
                    </label>
                    <select
                      id="my-gmfn-capability-category"
                      aria-label="Filter GSN capabilities by category"
                      value={capabilityCategory}
                      onChange={(event) =>
                        setCapabilityCategory(
                          event.target.value === "All"
                            ? "All"
                            : (event.target.value as CapabilityMapCategory)
                        )
                      }
                      style={selectStyle()}
                    >
                      <option value="All">All categories</option>
                      {CAPABILITY_MAP_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <label
                    htmlFor="my-gmfn-capability-select"
                    style={{
                      ...sectionLabel(),
                      color: "#425466",
                      fontSize: 12,
                    }}
                  >
                    Choose capability
                  </label>
                  <select
                    id="my-gmfn-capability-select"
                    aria-label="Choose GSN capability"
                    value={selectedCapability?.id || selectedCapabilityId}
                    onChange={(event) =>
                      setSelectedCapabilityId(Number(event.target.value) || 1)
                    }
                    style={selectStyle()}
                  >
                    {(filteredCapabilities.length ? filteredCapabilities : GMFN_CAPABILITIES).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id}. {item.title}
                      </option>
                    ))}
                  </select>
                  <div
                    aria-label="Move through GSN capabilities"
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "minmax(0, 1fr) minmax(0, 1fr)"
                        : "140px minmax(0, 1fr) 140px",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <SecondaryButton
                      type="button"
                      debugId="my-gmfn.profile.previous-capability"
                      onClick={() => stepCapability(-1)}
                      aria-label="Show previous GSN capability"
                      style={capabilityPagerButton(false)}
                    >
                      <span aria-hidden="true">{"<"}</span>
                      Previous
                    </SecondaryButton>
                    {!isCompact ? (
                      <div
                        style={{
                          minHeight: 44,
                          borderRadius: 999,
                          border: "1px solid rgba(37,78,119,0.12)",
                          background: "rgba(248,251,255,0.92)",
                          color: "#526579",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "10px 12px",
                          fontSize: 12,
                          fontWeight: 950,
                          lineHeight: 1.2,
                          textAlign: "center",
                        }}
                      >
                        {selectedCapabilityIndex + 1} of{" "}
                        {(filteredCapabilities.length
                          ? filteredCapabilities
                          : GMFN_CAPABILITIES
                        ).length}
                      </div>
                    ) : null}
                    <SecondaryButton
                      type="button"
                      debugId="my-gmfn.profile.next-capability"
                      onClick={() => stepCapability(1)}
                      aria-label="Show next GSN capability"
                      style={capabilityPagerButton(true)}
                    >
                      Next
                      <span aria-hidden="true">{">"}</span>
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            </details>
          </section>

          <section style={appGuidePanel(isCompact)}>
            <div
              style={{
                color: "#07172C",
                fontSize: isCompact ? 21 : 27,
                fontWeight: 1000,
                lineHeight: 1.1,
              }}
            >
              {isAppRoute
                ? "Where You See These In The App"
                : "How To Move Into The Live Product"}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: isCompact ? 13 : 14,
                fontWeight: 700,
                lineHeight: 1.45,
              }}
            >
              {isAppRoute
                ? "Different pages carry different parts of the system."
                : "Choose the page that matches where you are now."}
            </div>

            {isAppRoute ? (
              <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                {appGuideRoutes.map((item) => (
                  <StableCtaLink
                    key={item.label}
                    to={item.to}
                    kind={item.active ? "primary" : "secondary"}
                    debugId={item.debugId}
                    style={{
                      ...routeTile(Boolean(item.active)),
                      minHeight: isCompact ? 76 : 92,
                      padding: isCompact ? 12 : 14,
                      gap: isCompact ? 11 : 14,
                    }}
                  >
                    <span style={appGuideIconBox(Boolean(item.active), isCompact)}>
                      <GsnLegacyIcon
                        name={item.icon}
                        size={isCompact ? 38 : 44}
                        decorative
                      />
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#07172C",
                          fontSize: isCompact ? 13.8 : 15,
                          fontWeight: 1000,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 5,
                          color: "#64748B",
                          fontSize: isCompact ? 11.8 : 12.5,
                          fontWeight: 700,
                          lineHeight: 1.38,
                        }}
                      >
                        {item.detail}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        color: item.active ? "#C99B3B" : "#A7B0BE",
                        fontSize: 22,
                        fontWeight: 900,
                        lineHeight: 1,
                      }}
                    >
                      {">"}
                    </span>
                  </StableCtaLink>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <NextActionGuide
                  compact={isCompact}
                  defaultOpen
                  eyebrow="Public next step"
                  title="Which public door should you use next?"
                  intro="Choose the page that matches where you are: broad orientation, community entry, or reopening your protected member work."
                  items={publicGuideEntryItems}
                  onSelect={(item) => {
                    if (!item.to) return;
                    window.location.assign(item.to);
                  }}
                />
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                borderRadius: 20,
                border: "1px solid rgba(214,170,69,0.16)",
                background:
                  "linear-gradient(180deg, rgba(255,249,232,0.96) 0%, rgba(255,253,246,0.98) 100%)",
                padding: isCompact ? 18 : 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#07172C",
                  fontSize: 16,
                  fontWeight: 1000,
                }}
              >
                <span style={appGuideMiniIconBubble()}>
                  <GsnLegacyIcon name="document" size={28} decorative />
                </span>
                How to use this page
              </div>

              <div style={{ marginTop: 18, display: "grid", gap: 15 }}>
                {[
                  "Read the real-world decision.",
                  "Check the GSN evidence path.",
                  "Open the page that creates or reviews evidence.",
                ].map((step, index) => (
                  <div
                    key={step}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "center",
                      color: "#243247",
                      fontSize: 14,
                      fontWeight: 850,
                    }}
                  >
                    <span style={appGuideNumber()}>{index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section style={pageCard()}>
            <div style={sectionLabel()}>Workspace settings</div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
              Keep the app calmer and easier to read without changing the {capabilityCount} core capabilities guide.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.05fr) 320px",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 14 }}>
                <div style={innerCard()}>
                  <div style={sectionLabel()}>Profile display name</div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    This is the name GSN should show on account, Admin Tools,
                    TrustSlip, and profile surfaces instead of your login
                    identifier.
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <input
                      value={profileDisplayName}
                      onChange={(e) => setProfileDisplayName(e.target.value)}
                      placeholder="Name or street name people know you by"
                      style={selectStyle()}
                    />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <PrimaryButton
                      onClick={() => void saveProfileName()}
                      busy={profileSaving}
                      busyLabel="Saving..."
                      disabled={profileSaving}
                      debugId="my-gmfn.profile-name.save"
                    >
                      Save Display Name
                    </PrimaryButton>
                  </div>
                </div>

                <div style={innerCard()}>
                  <div style={sectionLabel()}>Notification reading mode</div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    Choose whether the inbox and related pages should feel shorter or fuller.
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <select
                      value={settings.notificationsMode}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          notificationsMode: e.target.value as SettingsState["notificationsMode"],
                        }))
                      }
                      style={selectStyle()}
                    >
                      <option value="summary">Summary</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>

                  <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    <label style={checkboxRow()}>
                      <input
                        type="checkbox"
                        checked={settings.unreadFirst}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            unreadFirst: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        Put unread items first so the most unread work rises to the top.
                      </span>
                    </label>

                    <label style={checkboxRow()}>
                      <input
                        type="checkbox"
                        checked={settings.openActionsDirectly}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            openActionsDirectly: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        Open the destination page directly from the primary action instead of reviewing it here first.
                      </span>
                    </label>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div style={sectionLabel()}>Tone preset</div>
                    <div style={{ marginTop: 8, ...helperText() }}>
                      Choose how the guidance language should sound.
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <select
                        value={settings.tonePreset}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            tonePreset: e.target.value as SettingsState["tonePreset"],
                          }))
                        }
                        style={selectStyle()}
                      >
                        <option value="balanced-default">Balanced default</option>
                        <option value="cooperative-warm">Cooperative warm</option>
                        <option value="enterprise-green">Enterprise direct</option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <PrimaryButton
                      onClick={() => void saveSettings()}
                      busy={saving}
                      busyLabel="Saving..."
                      debugId="my-gmfn.settings.save"
                    >
                      Save Settings
                    </PrimaryButton>

                    <SecondaryButton
                      onClick={resetSettings}
                      debugId="my-gmfn.settings.reset"
                    >
                      Reset Defaults
                    </SecondaryButton>
                  </div>
                </div>
              </div>

              <div style={softCard()}>
                <div style={sectionLabel()}>Current reading</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={innerCard()}>
                    <div style={sectionLabel()}>Notification mode</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 16,
                      }}
                    >
                      {settings.notificationsMode === "detailed"
                        ? "Detailed"
                        : "Summary"}
                    </div>
                  </div>

                  <div style={innerCard()}>
                    <div style={sectionLabel()}>Unread ordering</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 16,
                      }}
                    >
                      {settings.unreadFirst ? "Unread first" : "Latest first"}
                    </div>
                  </div>

                  <div style={innerCard()}>
                    <div style={sectionLabel()}>Primary action style</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 16,
                      }}
                    >
                      {settings.openActionsDirectly ? "Open directly" : "Review first"}
                    </div>
                  </div>

                  <div style={innerCard()}>
                    <div style={sectionLabel()}>Tone</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 16,
                      }}
                    >
                      {settings.tonePreset === "cooperative-warm"
                        ? "Cooperative warm"
                        : settings.tonePreset === "enterprise-green"
                        ? "Enterprise direct"
                        : "Balanced default"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <CompanionSettingsPanel />
        </>
      )}
    </div>
  );
}
