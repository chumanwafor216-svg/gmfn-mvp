export type ShopHeroKind = "shop" | "product" | "fallback";

export type ShopHeroProductCandidate = {
  id?: number;
  slotNumber?: number;
  publicBlockNumber?: number;
  name?: string;
  imageUrl?: string;
  imageAvailable?: boolean;
  isActive?: boolean;
  visibilityMode?: string;
};

export type ShopHeroSource = {
  kind: ShopHeroKind;
  imageUrl: string;
  altText: string;
  productId?: number;
};

type SelectShopHeroSourceArgs = {
  shopName?: string;
  shopImageUrl?: string;
  products?: ShopHeroProductCandidate[];
  brokenImageUrls?: Record<string, boolean>;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function positiveNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function publicOrder(product: ShopHeroProductCandidate): number {
  return (
    positiveNumber(product.publicBlockNumber) ||
    positiveNumber(product.slotNumber) ||
    Number.MAX_SAFE_INTEGER
  );
}

function isPublicProductCandidate(product: ShopHeroProductCandidate): boolean {
  const mode = clean(product.visibilityMode).toLowerCase();
  const publicModes = new Set([
    "",
    "community_visible",
    "community",
    "public",
    "public_gallery",
    "shop_gallery",
  ]);
  return product.isActive !== false && publicModes.has(mode);
}

export function selectShopHeroSource({
  shopName,
  shopImageUrl,
  products = [],
  brokenImageUrls = {},
}: SelectShopHeroSourceArgs): ShopHeroSource {
  const resolvedShopName = clean(shopName) || "this shop";
  const selectedShopImage = clean(shopImageUrl);

  if (selectedShopImage && !brokenImageUrls[selectedShopImage]) {
    return {
      kind: "shop",
      imageUrl: selectedShopImage,
      altText: `${resolvedShopName} shop photo`,
    };
  }

  const selectedProduct = products
    .filter((product) => {
      const imageUrl = clean(product.imageUrl);
      return (
        imageUrl &&
        product.imageAvailable !== false &&
        !brokenImageUrls[imageUrl] &&
        isPublicProductCandidate(product)
      );
    })
    .sort((left, right) => {
      const blockDifference = publicOrder(left) - publicOrder(right);
      if (blockDifference !== 0) return blockDifference;
      return positiveNumber(left.id) - positiveNumber(right.id);
    })[0];

  if (selectedProduct) {
    return {
      kind: "product",
      imageUrl: clean(selectedProduct.imageUrl),
      altText: `${clean(selectedProduct.name) || "Featured product"} at ${resolvedShopName}`,
      productId: positiveNumber(selectedProduct.id) || undefined,
    };
  }

  return {
    kind: "fallback",
    imageUrl: "",
    altText: `${resolvedShopName} storefront`,
  };
}
