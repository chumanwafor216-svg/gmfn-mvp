export const PUBLIC_SHOP_SPOTLIGHT_PRESENTATION_ROTATION_MS = 5000;
export const PUBLIC_SHOP_SPOTLIGHT_MIN_ROTATION_MS = 2000;
export const PUBLIC_SHOP_SPOTLIGHT_MAX_CYCLE_MS = 120000;
export const PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS = 1000;
export const PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO = 0.6;
export const PUBLIC_SHOP_SPOTLIGHT_INTERACTION_PAUSE_MS = 8000;
export const PUBLIC_SHOP_SPOTLIGHT_REDUCED_MOTION_ROTATION_MS = 30000;

export function publicShopSpotlightRotationMs(itemCount: number): number {
  const safeItemCount = Math.max(1, Math.floor(itemCount));
  const cycleBoundRotationMs = Math.floor(
    PUBLIC_SHOP_SPOTLIGHT_MAX_CYCLE_MS / safeItemCount
  );
  return Math.min(
    PUBLIC_SHOP_SPOTLIGHT_PRESENTATION_ROTATION_MS,
    Math.max(PUBLIC_SHOP_SPOTLIGHT_MIN_ROTATION_MS, cycleBoundRotationMs)
  );
}
