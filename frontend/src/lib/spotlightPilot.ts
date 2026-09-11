// Pilot spotlight controls. During live testing, keep the process stable and
// only tune these timing/media values here. Backend quota override lives in
// gmfn_backend/app/api/routes/marketplace.py.
export const SPOTLIGHT_PILOT_REFRESH_MS = 30000;
export const SPOTLIGHT_PILOT_ROTATION_MS = 30000;
export const SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS = 10;

export const SPOTLIGHT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const SPOTLIGHT_MAX_VIDEO_BYTES = 15 * 1024 * 1024;

export const SPOTLIGHT_PILOT_ROTATION_SECONDS_LABEL = Math.max(
  1,
  Math.round(SPOTLIGHT_PILOT_ROTATION_MS / 1000)
);
export const SPOTLIGHT_STANDARD_ROTATION_WEIGHT = 1;
export const SPOTLIGHT_PAID_ROTATION_WEIGHT = 3;
export const SPOTLIGHT_MAX_ROTATION_WEIGHT = 6;

type SpotlightRotationCandidate = {
  priority_mode?: unknown;
  priorityMode?: unknown;
  rotation_weight?: unknown;
  rotationWeight?: unknown;
};

function cleanRotationWeight(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(
    SPOTLIGHT_STANDARD_ROTATION_WEIGHT,
    Math.min(SPOTLIGHT_MAX_ROTATION_WEIGHT, Math.round(parsed))
  );
}

export function spotlightRotationWeight(
  item: SpotlightRotationCandidate | null | undefined
): number {
  const explicitWeight = cleanRotationWeight(
    item?.rotation_weight ?? item?.rotationWeight
  );
  if (explicitWeight > 0) return explicitWeight;

  const priorityMode = String(item?.priority_mode ?? item?.priorityMode ?? "")
    .trim()
    .toLowerCase();

  return priorityMode === "paid"
    ? SPOTLIGHT_PAID_ROTATION_WEIGHT
    : SPOTLIGHT_STANDARD_ROTATION_WEIGHT;
}

export function buildSpotlightRotationQueue<T extends SpotlightRotationCandidate>(
  items: T[]
): T[] {
  if (!Array.isArray(items) || items.length <= 1) return items;

  const queue: T[] = [];
  for (const item of items) {
    const weight = spotlightRotationWeight(item);
    for (let index = 0; index < weight; index += 1) {
      queue.push(item);
    }
  }

  return queue.length > 0 ? queue : items;
}
