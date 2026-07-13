export type CommunityDomainFeatureKey =
  | "announcement_board"
  | "demand_box"
  | "spotlight"
  | "shop_diary"
  | "vault"
  | "marketplace_shops"
  | "member_invites"
  | "payments_contributions"
  | "rosca_cycles";

export type CommunityDomainFeaturePolicyMatch = {
  domainName: string;
  mode: string;
  item: any;
};

function rowsOf(value: any): any[] {
  return Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : [];
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numericId(value: unknown): number {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function domainClanId(item: any): number {
  const domain = item?.community_domain || item?.domain || item;
  return numericId(
    domain?.clan_id ||
      domain?.root_clan_id ||
      domain?.root_node?.clan_id ||
      domain?.clan?.id ||
      item?.clan_id
  );
}

function domainId(item: any): number {
  const domain = item?.community_domain || item?.domain || item;
  return numericId(domain?.id || item?.community_domain_id || item?.domain_id);
}

export function communityDomainDisplayNameFromItem(item: any, fallback = "this Community Domain"): string {
  const domain = item?.community_domain || item?.domain || item;
  return safeText(
    domain?.display_name ||
      domain?.domain_name ||
      domain?.name ||
      domain?.domain_code ||
      domain?.code,
    fallback
  );
}

export function communityDomainFeatureModeFromPayload(
  payload: any,
  communityOrDomainId: number | string | null | undefined,
  featureKey: CommunityDomainFeatureKey
): CommunityDomainFeaturePolicyMatch | null {
  const targetId = numericId(communityOrDomainId);
  if (!targetId) return null;

  const item = rowsOf(payload).find((row) => {
    const clanId = domainClanId(row);
    const ownDomainId = domainId(row);
    return clanId === targetId || ownDomainId === targetId;
  });
  if (!item) return null;

  const features = item?.feature_policy?.features;
  const mode =
    features && typeof features === "object" ? safeText(features[featureKey]) : "";
  return {
    domainName: communityDomainDisplayNameFromItem(item),
    mode,
    item,
  };
}

export function communityDomainFeatureIsOff(
  match: CommunityDomainFeaturePolicyMatch | null
): boolean {
  return match?.mode === "off";
}

export function communityDomainFeatureOffMessage(
  featureLabel: string,
  domainName = "this Community Domain"
): string {
  return `${featureLabel} is turned off for ${domainName}. Ask a Community Domain owner/admin to enable it in Domain feature policy before using this tool.`;
}
