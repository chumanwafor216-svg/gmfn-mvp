import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
import GsnInstallPrompt from "../components/GsnInstallPrompt";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
} from "../components/StableButton";
import {
  GsnLegacyIcon,
  type GsnIconName,
} from "../components/GsnLegacyIcon";
import { getCurrentClan, getMe, getMySettings, getSelectedClanId } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  brandBadge,
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
  problem: string;
  tools: string;
  where: string;
  evidence: string;
  helps: string;
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

function identityBadge(primary = false): React.CSSProperties {
  return {
    ...brandBadge(primary),
    background: primary
      ? "rgba(47,129,247,0.18)"
      : "rgba(255,255,255,0.10)",
    color: primary ? "#7DB7FF" : "#E6F1FF",
    border: primary
      ? "1px solid rgba(47,129,247,0.34)"
      : "1px solid rgba(255,255,255,0.16)",
    boxShadow: primary ? "inset 0 1px 0 rgba(255,255,255,0.10)" : "none",
  };
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
    padding: "18px",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 16% 0%, rgba(201,154,39,0.16) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 92% 10%, rgba(83,132,178,0.18) 0%, rgba(83,132,178,0) 30%), linear-gradient(180deg, #07131F 0%, #12304A 42%, #D9E4EF 42.1%, #EEF3F8 100%)",
    color: "#F8FBFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  };
}

function publicGuideFrame(): React.CSSProperties {
  return {
    width: "min(100%, 1160px)",
    margin: "0 auto",
    display: "grid",
    gap: 14,
  };
}

function publicGuideHeader(): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(214,228,242,0.22)",
    background:
      "linear-gradient(180deg, rgba(13,31,50,0.92) 0%, rgba(7,20,35,0.98) 100%)",
    boxShadow:
      "0 24px 54px rgba(1,9,22,0.34), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: "18px",
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
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.13)",
    background:
      `linear-gradient(90deg, ${accent} 0%, ${accent} 1.2%, rgba(255,255,255,0) 1.21%), radial-gradient(circle at 14% 12%, rgba(18,49,77,0.055) 0%, rgba(18,49,77,0) 32%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(239,245,251,0.985) 100%)`,
    boxShadow:
      "0 14px 28px rgba(8,24,42,0.13), inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -1px 0 rgba(8,24,42,0.04)",
    padding: "16px 16px 15px",
  };
}

function publicCapabilityCardIos(category: string): React.CSSProperties {
  return {
    ...publicCapabilityCard(category),
    minHeight: "auto",
    padding: "14px 14px 13px",
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
    width: 48,
    height: 48,
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
    problem: "Goods, credit, or service can move before the other side has enough identity and community evidence.",
    tools: "TrustSlip, Merchant Verification, Community Member Credential, Protected Trade Record.",
    where: "Marketplace -> Members & Trade; Trust -> TrustSlip; Shop -> Public Shop.",
    evidence: "Identity check, community context, TrustSlip code, release note, and trade evidence record.",
    helps: "Reduces blind release by making the seller check evidence before accepting payment risk or credit risk.",
  },
  2: {
    category: "Buying & Selling",
    problem: "People buy, sell, supply, and trade without enough visible evidence about who they are dealing with.",
    tools: "Public Shop, Merchant Verification, TrustSlip, Merchant Release Rail, Shop Diary, Vault.",
    where: "Marketplace -> Members & Trade; Shop -> Public Shop / Vault; Trust -> TrustSlip.",
    evidence: "Shop identity, shelf activity, followers, trade records, verification links, and public shop record.",
    helps: "Reduces blind dealing by connecting shops, buyers, sellers, followers, and trade activity to visible community evidence.",
  },
  3: {
    category: "Buying & Selling",
    problem: "A trustworthy member or shop may lose credibility when moving beyond one local circle.",
    tools: "GSN ID, Community Record, Public Shop, TrustSlip, Community Credential.",
    where: "Marketplace -> Members & Trade; Community -> Community Record; Trust -> TrustSlip.",
    evidence: "Cross-community identity trail, member credential, shop record, and community-scoped confirmation.",
    helps: "Lets trust travel with context while keeping each community boundary visible.",
  },
  4: {
    category: "Security & Privacy",
    problem: "Fraud risk often becomes obvious only after goods, money, or access has already moved.",
    tools: "Trust Reading, TrustSlip Verify, Community Member Verify, Trust Passport boundary notes.",
    where: "Trust -> TrustSlip; Marketplace -> Members & Trade; Community -> Verify Member.",
    evidence: "Visible score, grade, caution notes, missing evidence signals, and verification limits.",
    helps: "Shows warning signs before action without pretending GSN can guarantee a person's future behaviour.",
  },
  5: {
    category: "Visibility & Opportunity",
    problem: "Useful shop updates can disappear in noise before the right community sees them.",
    tools: "Spotlight, Public Shop, Marketplace Broadcast, Shop Gallery.",
    where: "Shop -> Spotlight; Marketplace -> Public Shops; Dashboard -> Spotlight preview.",
    evidence: "Published spotlight, shop owner identity, community placement, media record, and timestamp.",
    helps: "Gives recorded value a clearer place to be seen while keeping visibility separate from verification.",
  },
  6: {
    category: "Visibility & Opportunity",
    problem: "Attention can reward noise instead of stronger evidence, leaving serious members harder to find.",
    tools: "Reputation signals, Trust Reading, Spotlight ranking, Marketplace visibility.",
    where: "Dashboard -> Market Wisdom; Marketplace -> Public Shops; Trust -> Trust Passport.",
    evidence: "Trust score band, activity trail, shop status, community context, and current public record.",
    helps: "Lets stronger recorded evidence support visibility without turning reach into a trust guarantee.",
  },
  7: {
    category: "Visibility & Opportunity",
    problem: "A merchant can rebuild the same shop identity again and again across communities.",
    tools: "Public Shop, Shop Gallery, Spotlight, WhatsApp contact, Merchant Verification.",
    where: "Shop -> Public Shop; Marketplace -> Public Shops; Trust -> Merchant Verification.",
    evidence: "One public shop link, shelf items, spotlight media, owner GSN ID, and verification entry points.",
    helps: "Keeps one shop presence connected across marketplaces while preserving community context.",
  },
  8: {
    category: "Finance & Support",
    problem: "Support requests can look like informal begging or blind lending when amount, purpose, and backing are unclear.",
    tools: "Loans & Support, Support Draft, Fit Check, Supporter List, Guarantor Request.",
    where: "Marketplace -> Loans & Support; Loans -> Readiness / Suggestions / Workbench.",
    evidence: "Amount, purpose, duration, repayment plan, fit signal, suggested supporters, and request record.",
    helps: "Turns support into a visible request that people can review before backing it.",
  },
  9: {
    category: "Finance & Support",
    problem: "People who want to help may not know the request, responsibility, or evidence around the person asking.",
    tools: "Supporter Check, Guarantor Inbox, Trust Passport, Community Relationship Evidence.",
    where: "Loans -> Guarantor Inbox; Trust -> Trust Passport; Marketplace -> Support Requests.",
    evidence: "Support invitation, relationship context, trust reading, guarantor decision, and support trail.",
    helps: "Keeps help connected to responsibility, evidence, and community-backed judgement.",
  },
  10: {
    category: "Finance & Support",
    problem: "Urgent support decisions often happen before identity, community, or need can be checked.",
    tools: "TrustSlip, Community Confirmation, Demand Box, Support Request, Identity Record.",
    where: "Trust -> TrustSlip; Community -> Confirmation; Marketplace -> Demand Box / Support.",
    evidence: "Urgent need record, member identity, community confirmation, TrustSlip code, and support response.",
    helps: "Shortens uncertainty in urgent moments while preserving the evidence boundary.",
  },
  11: {
    category: "Community & Membership",
    problem: "Diaspora members and distant supporters often cannot read local trust context clearly.",
    tools: "Community Record, TrustSlip, Public Shop, Community Confirmation, GSN ID.",
    where: "Community -> Community Record; Trust -> TrustSlip; Shop -> Public Shop.",
    evidence: "Community membership, public identity, shop record, confirmation notes, and verification link.",
    helps: "Lets people across distance see controlled evidence before sending support, goods, or opportunity.",
  },
  12: {
    category: "Finance & Support",
    problem: "Savings circles can depend on memory and informal pressure without a visible contribution trail.",
    tools: "ROSCA Desk, Contribution Cycle, Payout Record, Member Evidence.",
    where: "Marketplace -> Loans & Support -> ROSCA; Finance -> Community Money.",
    evidence: "Cycle setup, selected members, contribution schedule, payout record, and community context.",
    helps: "Adds a visible trust layer to familiar savings culture without turning GSN into a bank.",
  },
  13: {
    category: "Trust & Evidence",
    problem: "Contribution, repayment, and support history can disappear when people change groups or phones.",
    tools: "Trust Events, Finance Records, Repayment Record, Support Evidence, Trust Passport.",
    where: "Trust -> Trust Passport; Finance -> Records; Loans -> Repayment.",
    evidence: "Contribution events, repayment behaviour, support records, timestamps, and community source.",
    helps: "Turns useful history into reviewable evidence for future decisions.",
  },
  14: {
    category: "Community & Membership",
    problem: "When people move or reconnect, their role, identity, and trust history can reset from zero.",
    tools: "GSN ID, Community Membership, Trust Passport, Community Record.",
    where: "Profile -> My GSN Identity; Community -> My Communities; Trust -> Trust Passport.",
    evidence: "GSN ID, active community count, role context, community membership, and trust trail.",
    helps: "Keeps identity continuity visible without merging distinct community records.",
  },
  15: {
    category: "Identity & Verification",
    problem: "A person may be known locally, but outsiders still need a controlled identity and evidence reference.",
    tools: "GSN ID, Trust Passport, TrustSlip, Profile photo/selfie, Community Credential.",
    where: "Profile -> My GSN Identity; Trust -> Trust Passport / TrustSlip; Community -> Member Verify.",
    evidence: "GSN ID, display name, photo/selfie status, credential, TrustSlip code, and verification boundary.",
    helps: "Makes identity portable while keeping private evidence protected.",
  },
  16: {
    category: "Trust & Evidence",
    problem: "Earned reputation can stay trapped in one street, shop, phone contact, or local circle.",
    tools: "Trust Passport, Trust Graph, Community Record, TrustSlip.",
    where: "Trust -> Trust Passport; Dashboard -> Trust signals; Community -> Community Record.",
    evidence: "Recorded activity, relationship evidence, community footprint, TrustSlip, and current reading.",
    helps: "Lets reputation move with evidence instead of gossip.",
  },
  17: {
    category: "Buying & Selling",
    problem: "A shop needs one public identity for shelf items, media, verification, and contact.",
    tools: "Public Shop, Vault, Shop Gallery, Spotlight, Merchant Verification.",
    where: "Shop -> Public Shop / Vault; Marketplace -> Public Shops.",
    evidence: "Public shop link, shelf blocks, owner GSN ID, spotlight media, and verification actions.",
    helps: "Gives one shop a controlled public home instead of scattered screenshots and phone-only claims.",
  },
  18: {
    category: "Visibility & Opportunity",
    problem: "Service work is often informal, under-recorded, and hard to verify before hiring.",
    tools: "Demand Box, Public Shop, TrustSlip, Community Activity, Shop Diary.",
    where: "Marketplace -> Demand Box; Shop -> Public Shop; Trust -> TrustSlip.",
    evidence: "Service offer, demand response, community context, public identity, and follow-up activity.",
    helps: "Makes informal service participation more visible and reviewable.",
  },
  19: {
    category: "Trust & Evidence",
    problem: "Hiring decisions can depend on guesswork, weak referrals, or unverified claims.",
    tools: "Trust Passport, Community Credential, TrustSlip, Community Confirmation.",
    where: "Trust -> Trust Passport; Community -> Member Verify; Marketplace -> Members & Trade.",
    evidence: "Identity status, role evidence, community activity, TrustSlip code, and confirmation note.",
    helps: "Helps work decisions read credibility before commitment.",
  },
  20: {
    category: "Visibility & Opportunity",
    problem: "Local needs and offers can remain invisible until opportunity is already missed.",
    tools: "Demand Box, Marketplace Needs, Public Shop, Community Broadcast.",
    where: "Marketplace -> Demand Box; Dashboard -> What Matters Now.",
    evidence: "Need or offer post, community placement, requester context, and response trail.",
    helps: "Makes demand visible so members can match needs, supply, and opportunity earlier.",
  },
  21: {
    category: "Community & Membership",
    problem: "A community's identity, trade, finance, trust, and opportunity evidence can sit in separate places.",
    tools: "Community Home, Marketplace, Finance, Trust Passport, Community Domain.",
    where: "Community -> Community Home; Marketplace; Finance; Trust.",
    evidence: "Community identity, member activity, marketplace records, finance evidence, and trust records.",
    helps: "Connects community power into one working layer without confusing personal marketplaces with institutions.",
  },
  22: {
    category: "Trust & Evidence",
    problem: "Goals, repayment plans, savings targets, and business promises can fade without execution discipline.",
    tools: "Commitment Builder, Focus Commitments, Reminders, Progress Evidence.",
    where: "Dashboard -> Focus Commitments; Profile -> Member Guide.",
    evidence: "Commitment record, progress steps, reminders, completion trail, and follow-through signal.",
    helps: "Turns intention into a visible discipline record that can support future judgement.",
  },
  23: {
    category: "Community & Membership",
    problem: "Institutions need structured membership, branches, roles, policies, and public claims separate from personal marketplaces.",
    tools: "Community Domain, Domain Settings, Governance Roles, Service Panels, Public Community Record.",
    where: "Community -> Community Domain; Profile -> Route list; Community -> Settings.",
    evidence: "Domain identity, member placement, branch/unit records, role structure, service status, and controlled public claim.",
    helps: "Helps schools, unions, churches, cooperatives, markets, and associations operate with institutional structure.",
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
      problem: item.proverb,
      tools: item.title,
      where: "Profile -> GSN Capability Map.",
      evidence: item.gmfn,
      helps: publicCapabilityLine(item),
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
    minHeight: primary ? 48 : 40,
    padding: primary ? "13px 18px" : "10px 14px",
    borderRadius: 999,
    border: primary
      ? "1px solid rgba(255,255,255,0.78)"
      : "1px solid rgba(201,154,39,0.32)",
    background: primary
      ? "linear-gradient(180deg, #FFFFFF 0%, #EEF4FA 64%, #DCE7F2 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
    color: primary ? "#10253B" : "#F3D06A",
    fontSize: primary ? 15 : 13,
    fontWeight: 1000,
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: primary
      ? "0 16px 28px rgba(1,13,32,0.24), inset 0 1px 0 rgba(255,255,255,0.90)"
      : "0 12px 24px rgba(1,13,32,0.16), inset 0 1px 0 rgba(255,255,255,0.10)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
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
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
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
              fontSize: 12,
              fontWeight: 1000,
              letterSpacing: 2.8,
              textTransform: "uppercase",
            }}
          >
            GSN Identity Guide
          </div>

          <h1
            style={{
              margin: "10px 0 0",
              color: "#F8FBFF",
              fontSize: useIosSingleColumn ? 28 : compact ? 30 : 42,
              lineHeight: 1.05,
              fontWeight: 1000,
              letterSpacing: 0,
            }}
          >
            GSN Capability Map
          </h1>

          <div
            style={{
              marginTop: 10,
              color: "#D6E3F0",
              fontSize: useIosSingleColumn ? 13.5 : 14,
              lineHeight: useIosSingleColumn ? 1.48 : 1.55,
              maxWidth: 760,
            }}
          >
            See the problems GSN solves, the tools that solve them, and where
            each tool lives in the app.
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
              gap: 10,
            }}
          >
            <article
              data-my-gmfn-public-selected-capability="true"
              style={{
                ...(useIosSingleColumn
                  ? publicCapabilityCardIos(publicSelectedCapability.category)
                  : publicCapabilityCard(publicSelectedCapability.category)),
                minHeight: useIosSingleColumn ? "auto" : 190,
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
                    ? "48px minmax(0, 1fr)"
                    : "68px minmax(0, 1fr)",
                  gap: useIosSingleColumn ? 10 : 15,
                  alignItems: "start",
                  paddingRight: useIosSingleColumn ? 28 : 44,
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
                    size={useIosSingleColumn ? 36 : 48}
                    decorative
                  />
                </span>

                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      color: "#071D33",
                      fontSize: useIosSingleColumn ? 16 : 24,
                      lineHeight: 1.12,
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
                      lineHeight: useIosSingleColumn ? 1.36 : 1.45,
                      fontWeight: 760,
                      overflowWrap: "normal",
                      wordBreak: "normal",
                    }}
                  >
                    {publicCapabilityLine(publicSelectedCapability)}
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
                  ? "minmax(0, 1fr) minmax(0, 1fr)"
                  : "150px minmax(0, 1fr) 150px",
                gap: 8,
                alignItems: "center",
              }}
            >
              <SecondaryButton
                type="button"
                debugId="my-gmfn.public.previous-capability"
                onClick={() => stepPublicCapability(-1)}
                aria-label="Show previous public GSN capability"
                style={capabilityPagerButton(false)}
              >
                <span aria-hidden="true">{"<"}</span>
                Previous
              </SecondaryButton>
              {!useIosSingleColumn ? (
                <div
                  style={{
                    minHeight: 44,
                    borderRadius: 999,
                    border: "1px solid rgba(214,170,69,0.22)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#D6E3F0",
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
                  {publicSelectedIndex + 1} of {GMFN_CAPABILITY_COUNT}
                </div>
              ) : null}
              <SecondaryButton
                type="button"
                debugId="my-gmfn.public.next-capability"
                onClick={() => stepPublicCapability(1)}
                aria-label="Show next public GSN capability"
                style={capabilityPagerButton(true)}
              >
                Next
                <span aria-hidden="true">{">"}</span>
              </SecondaryButton>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <SecondaryButton
                onClick={() => setShowAllPublicCapabilities((value) => !value)}
                debugId="my-gmfn.public.toggle-all-capabilities"
                style={publicCloseButton(false)}
              >
                {showAllPublicCapabilities ? "Hide all" : "Show all"}
              </SecondaryButton>
            </div>
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

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 18,
          }}
        >
          <SecondaryButton
            onClick={onClose}
            debugId="my-gmfn.public.collapse-bottom"
            style={publicCloseButton(false)}
          >
            Collapse
          </SecondaryButton>
          <PrimaryButton
            onClick={onClose}
            debugId="my-gmfn.public.continue-bottom"
            style={publicCloseButton(true)}
          >
            Continue
          </PrimaryButton>
        </div>
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
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<number>(1);
  const [capabilitySearch, setCapabilitySearch] = useState<string>("");
  const [capabilityCategory, setCapabilityCategory] = useState<
    CapabilityMapCategory | "All"
  >("All");
  const [settings, setSettings] = useState<SettingsState>(() =>
    readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
  );

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
        const [meRes, clanRes, settingsRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getMySettings().catch(() => null),
        ]);

        if (!alive) return;

        const localSettings = readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
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
  }, [isAppRoute]);

  const displayName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me]);

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, "Awaiting issue");
  }, [me]);

  const hasGsnId = useMemo(() => {
    const text = safeStr(me?.gmfn_id);
    return Boolean(text && text.toLowerCase() !== "awaiting issue");
  }, [me]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || "No current community"
    );
  }, [currentClan]);

  const activeCommunityCount = useMemo(() => {
    const raw = firstTruthy(
      me?.active_clan_count,
      me?.active_membership_count,
      me?.communities_count,
      me?.community_count,
      currentClan ? 1 : ""
    );
    const count = Number(raw || 0);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }, [currentClan, me]);

  const identityStatus = useMemo(() => {
    if (hasGsnId && displayName !== "Member") return "Named GSN profile";
    if (hasGsnId) return "GSN ID issued";
    return "Identity pending";
  }, [displayName, hasGsnId]);

  const trustPassportStatus = useMemo(() => {
    if (
      me?.passport_verified === true ||
      me?.trust_passport_verified === true ||
      me?.trustPassportVerified === true
    ) {
      return "Verified";
    }
    if (
      me?.passport_recorded === true ||
      me?.trust_passport_recorded === true ||
      me?.trustPassportRecorded === true ||
      firstTruthy(me?.trust_passport_status, me?.trustPassportStatus)
    ) {
      return firstTruthy(me?.trust_passport_status, me?.trustPassportStatus, "Recorded");
    }
    return "Not shown";
  }, [me]);

  const profilePhotoRecorded = useMemo(() => {
    const photo = firstTruthy(
      me?.profile_image_url,
      me?.profile_photo_url,
      me?.photo_url,
      me?.avatar_url
    );
    return Boolean(photo || me?.photo_recorded === true || me?.selfie_recorded === true);
  }, [me]);
  const profilePhotoStatus = profilePhotoRecorded ? "Photo recorded" : "Photo not shown";

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
        detail.problem,
        detail.tools,
        detail.where,
        detail.evidence,
        detail.helps,
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
        label: "Loans & Support",
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
              ["GSN ID status", hasGsnId ? "Issued" : "Awaiting issue"],
              ["Identity status", identityStatus],
              ["Active communities", String(activeCommunityCount || "Not shown")],
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

          <div
            style={{
              marginTop: isCompact ? 14 : 18,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={identityBadge(true)}>GSN ID: {gmfnId}</span>
            <span style={identityBadge(false)}>Member: {displayName}</span>
            <span style={identityBadge(false)}>Community: {communityLabel}</span>
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
            Capability Map
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
          <section style={appGuidePanel(isCompact)}>
            <div
              style={{
                color: "#07172C",
                fontSize: isCompact ? 22 : 28,
                fontWeight: 1000,
                lineHeight: 1.08,
              }}
            >
              GSN Capability Map
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
              See the problems GSN solves, the tools that solve them, and where
              each tool lives in the app. This map explains capability; it is
              not proof that any one member, shop, payout, paid verification,
              or protected trade release is already approved.
            </div>

            <div
              style={{
                marginTop: 14,
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
                  Search by problem
                </label>
                <input
                  id="my-gmfn-capability-search"
                  aria-label="Search GSN capabilities by problem, tool, location, or evidence"
                  value={capabilitySearch}
                  onChange={(event) => setCapabilitySearch(event.target.value)}
                  placeholder="Search risk, tool, page, or evidence"
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
                marginTop: 12,
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
                  marginTop: 12,
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
                      {selectedCapabilityDetail.helps}
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
                    ["Problem it solves", selectedCapabilityDetail.problem],
                    ["GSN tools involved", selectedCapabilityDetail.tools],
                    ["Where to open it", selectedCapabilityDetail.where],
                    ["What evidence it creates", selectedCapabilityDetail.evidence],
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
                  "Learn the capability.",
                  "See where it lives.",
                  "Open the right page.",
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
      )}
    </div>
  );
}
