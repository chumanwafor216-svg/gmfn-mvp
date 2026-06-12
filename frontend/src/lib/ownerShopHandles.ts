export const OWNER_SHOP_HASHES = {
  overview: "shop-control-summary",
  billboard: "shop-control-details",
  diaries: "shop-control-gallery-tools",
  freeSpotlight: "shop-control-spotlight",
  subscriptionSpotlight: "shop-control-paid-spotlight",
  communityPackage: "shop-control-community-packages",
  summary: "shop-control-counts",
} as const;

export const PAID_REPOST_HASH = "marketplace-paid-network-placement";
export const ROSCA_MARKETPLACE_HASH = "marketplace-rosca";

export type OwnerShopHandleId =
  | "shop-control"
  | "shop-gallery-tools"
  | "vault-control"
  | "free-spotlight"
  | "spotlight-subscription"
  | "paid-repost"
  | "community-package";

export type OwnerShopHandle = {
  id: OwnerShopHandleId;
  label: string;
  detail: string;
  hash?: string;
  route: "shop" | "freeSpotlight" | "subscriptionSpotlight" | "marketplace" | "vaultControl";
};

export const OWNER_SHOP_HANDLES: OwnerShopHandle[] = [
  {
    id: "shop-control",
    label: "Owner Shop Control",
    detail: "Main owner controls for your one global shop",
    route: "shop",
    hash: OWNER_SHOP_HASHES.overview,
  },
  {
    id: "shop-gallery-tools",
    label: "Shop Gallery Tools",
    detail: "Pictures, products, shop diary, and public shop blocks",
    route: "shop",
    hash: OWNER_SHOP_HASHES.diaries,
  },
  {
    id: "vault-control",
    label: "Private Vault",
    detail: "Paid private blocks, one link at a time",
    route: "vaultControl",
  },
  {
    id: "free-spotlight",
    label: "Free Spotlight",
    detail: "Current free spotlight status and next step",
    route: "freeSpotlight",
    hash: OWNER_SHOP_HASHES.freeSpotlight,
  },
  {
    id: "spotlight-subscription",
    label: "Spotlight Subscription",
    detail: "Control the paid priority spotlight lane",
    route: "subscriptionSpotlight",
  },
  {
    id: "paid-repost",
    label: "Paid Repost",
    detail: "Send one shop block into another community Spotlight",
    route: "marketplace",
    hash: PAID_REPOST_HASH,
  },
  {
    id: "community-package",
    label: "Community Package",
    detail: "Extra members, shop blocks, ROSCA, and meeting pack",
    route: "shop",
    hash: OWNER_SHOP_HASHES.communityPackage,
  },
];

export type ShopControlShortcutId =
  | "shop-billboard"
  | "shop-diaries"
  | "shop-summary"
  | "community-package";

export type ShopControlShortcut = {
  id: ShopControlShortcutId;
  label: string;
  hash: string;
};

export const SHOP_CONTROL_SHORTCUTS: ShopControlShortcut[] = [
  {
    id: "shop-billboard",
    label: "Shop billboard",
    hash: OWNER_SHOP_HASHES.billboard,
  },
  {
    id: "shop-diaries",
    label: "12 Shop Diaries",
    hash: OWNER_SHOP_HASHES.diaries,
  },
  {
    id: "shop-summary",
    label: "Shop summary",
    hash: OWNER_SHOP_HASHES.summary,
  },
  {
    id: "community-package",
    label: "Community package",
    hash: OWNER_SHOP_HASHES.communityPackage,
  },
];

export function ownerShopLayerForTarget(targetId: string):
  | "overview"
  | "products"
  | "spotlight"
  | "shop-details"
  | "paid-tools"
  | "vault"
  | "summary" {
  const normalized = String(targetId || "").replace(/^#/, "").toLowerCase();
  if (normalized.includes("overview")) return "overview";
  if (
    normalized.includes("products") ||
    normalized.includes("picture") ||
    normalized.includes("gallery") ||
    normalized.includes("diar")
  ) {
    return "products";
  }
  if (normalized.includes("spotlight")) return "spotlight";
  if (normalized.includes("face")) return "overview";
  if (normalized.includes("details")) return "shop-details";
  if (normalized.includes("vault")) return "vault";
  if (
    normalized.includes("unlock") ||
    normalized.includes("paid") ||
    normalized.includes("subscription") ||
    normalized.includes("package")
  ) {
    return "paid-tools";
  }
  if (normalized.includes("summary") || normalized.includes("count")) return "summary";
  return "overview";
}
