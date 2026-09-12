export type CommunityQrPolicyKey =
  | "open_growth"
  | "reviewed_access"
  | "strict_entry"
  | "market_access";

export type CommunityQrPolicy = {
  key: CommunityQrPolicyKey;
  label: string;
  badge: string;
  summary: string;
  scanCopy: string;
  sheetIntro: string;
  announcement: string;
  boundary: string;
};

export const COMMUNITY_QR_POLICIES: CommunityQrPolicy[] = [
  {
    key: "open_growth",
    label: "Open NGO / church growth",
    badge: "Open request",
    summary:
      "Best for NGOs, churches, and service groups that want many people to start a request quickly, then verify later when benefits or trust decisions require it.",
    scanCopy:
      "Scan to request access. Approval can be broad, but verified membership still comes later.",
    sheetIntro:
      "Scan to begin an open community access request. The community may approve many people first and verify later when needed.",
    announcement:
      "This QR is for open access requests. Approval helps you enter GSN, while verified membership can still require later evidence.",
    boundary:
      "Open approval is not verified membership. It only lets the person enter the GSN path for this community.",
  },
  {
    key: "reviewed_access",
    label: "Reviewed community access",
    badge: "Admin review",
    summary:
      "Best for ordinary associations that want each scanner reviewed by an executive before activation.",
    scanCopy: "Scan to request access. An executive must review before activation.",
    sheetIntro:
      "Scan to begin a reviewed join request. Community approval is required before activation.",
    announcement:
      "This QR starts a reviewed GSN access request. An executive still decides before activation.",
    boundary:
      "Review approves access only. Verification can still be requested later for sensitive benefits or formal standing.",
  },
  {
    key: "strict_entry",
    label: "Strict school / professional body",
    badge: "Strict review",
    summary:
      "Best for schools, professional bodies, and high-value groups where belonging must be checked before entry.",
    scanCopy:
      "Scan to request access. Stronger checks may be required before activation.",
    sheetIntro:
      "Scan to begin a strict access request. The community may ask for evidence before approving entry.",
    announcement:
      "This QR starts a strict GSN access request. Please be ready to provide membership, school, or professional evidence if asked.",
    boundary:
      "A scan is never a credential. The community can refuse, delay, or request evidence before activation.",
  },
  {
    key: "market_access",
    label: "Marketplace dues / permit access",
    badge: "Dues review",
    summary:
      "Best for markets and trade groups where entry may depend on dues, stall/shop status, permits, or organiser approval.",
    scanCopy:
      "Scan to request market access. Dues, permit, or organiser checks may still apply.",
    sheetIntro:
      "Scan to begin a market access request. Dues, shop, stall, or organiser checks may still apply before activation.",
    announcement:
      "This QR starts a GSN market access request. Dues, permit, shop, or organiser checks may still apply before approval.",
    boundary:
      "Market approval can be tied to payment or organiser records, but verification remains separate from simply scanning the code.",
  },
];

export function isCommunityQrPolicyKey(value: unknown): value is CommunityQrPolicyKey {
  return COMMUNITY_QR_POLICIES.some((policy) => policy.key === String(value || ""));
}

export function communityQrPolicyByKey(value: unknown): CommunityQrPolicy {
  const key = String(value || "").trim();
  return (
    COMMUNITY_QR_POLICIES.find((policy) => policy.key === key) ||
    COMMUNITY_QR_POLICIES[1]
  );
}

export function communityQrPolicyKeyOrDefault(value: unknown): CommunityQrPolicyKey {
  return isCommunityQrPolicyKey(value) ? value : "reviewed_access";
}