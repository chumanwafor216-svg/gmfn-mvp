const SHOP_PRODUCT_MEDIA_CACHE_KEY = "gmfn.shopProductMedia.v1";

type CachedShopProductMedia = {
  image_url?: string | null;
  video_url?: string | null;
  updated_at?: string | null;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCache(): Record<string, CachedShopProductMedia> {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(SHOP_PRODUCT_MEDIA_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CachedShopProductMedia>): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(SHOP_PRODUCT_MEDIA_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage limits. Backend data remains the source of truth.
  }
}

export function rememberShopProductMedia(
  productId: number | string | null | undefined,
  media: CachedShopProductMedia
): void {
  const id = safeStr(productId);
  if (!id) return;

  const hasImage = Object.prototype.hasOwnProperty.call(media, "image_url");
  const hasVideo = Object.prototype.hasOwnProperty.call(media, "video_url");
  const imageUrl = safeStr(media.image_url);
  const videoUrl = safeStr(media.video_url);
  if (!hasImage && !hasVideo) return;

  const cache = readCache();
  const current = cache[id] || {};
  cache[id] = {
    ...current,
    image_url: hasImage ? imageUrl || null : current.image_url || null,
    video_url: hasVideo ? videoUrl || null : current.video_url || null,
    updated_at: new Date().toISOString(),
  };
  writeCache(cache);
}

export function getCachedShopProductMedia(
  productId: number | string | null | undefined
): CachedShopProductMedia | null {
  const id = safeStr(productId);
  if (!id) return null;

  const item = readCache()[id];
  return item && typeof item === "object" ? item : null;
}
