export type PublicShopSpotlightEffectiveMediaKind = "image" | "video";

export type PublicShopSpotlightRotationInput = {
  mediaKind: PublicShopSpotlightEffectiveMediaKind;
  videoDurationSeconds?: number | null;
};

export const PUBLIC_SHOP_SPOTLIGHT_IMAGE_ROTATION_MS = 5000;
export const PUBLIC_SHOP_SPOTLIGHT_VIDEO_MIN_ROTATION_MS = 8000;
export const PUBLIC_SHOP_SPOTLIGHT_VIDEO_MAX_ROTATION_MS = 10000;
// Compatibility/default value for older policy consumers. Images use this
// exact dwell; videos use the duration-aware policy below.
export const PUBLIC_SHOP_SPOTLIGHT_PRESENTATION_ROTATION_MS =
  PUBLIC_SHOP_SPOTLIGHT_IMAGE_ROTATION_MS;
export const PUBLIC_SHOP_SPOTLIGHT_QUALIFYING_VISIBLE_MS = 1000;
export const PUBLIC_SHOP_SPOTLIGHT_MIN_VISIBLE_RATIO = 0.6;
export const PUBLIC_SHOP_SPOTLIGHT_INTERACTION_PAUSE_MS = 8000;
export const PUBLIC_SHOP_SPOTLIGHT_REDUCED_MOTION_ROTATION_MS = 30000;

export function publicShopSpotlightRotationMs(
  input: PublicShopSpotlightRotationInput
): number {
  if (input.mediaKind === "image") {
    return PUBLIC_SHOP_SPOTLIGHT_IMAGE_ROTATION_MS;
  }

  const durationSeconds = Number(input.videoDurationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return PUBLIC_SHOP_SPOTLIGHT_VIDEO_MAX_ROTATION_MS;
  }

  return Math.min(
    PUBLIC_SHOP_SPOTLIGHT_VIDEO_MAX_ROTATION_MS,
    Math.max(
      PUBLIC_SHOP_SPOTLIGHT_VIDEO_MIN_ROTATION_MS,
      Math.round(durationSeconds * 1000)
    )
  );
}
