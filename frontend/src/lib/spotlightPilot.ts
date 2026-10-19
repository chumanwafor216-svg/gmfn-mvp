// Pilot spotlight controls. During live testing, keep the process stable and
// only tune these timing/media values here. Backend quota override lives in
// gmfn_backend/app/api/routes/marketplace.py.
export const SPOTLIGHT_PILOT_REFRESH_MS = 30000;
export const SPOTLIGHT_PILOT_ROTATION_MS = 30000;
export const SPOTLIGHT_PILOT_MAX_VIDEO_SECONDS = 10;

export const SPOTLIGHT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const SPOTLIGHT_MAX_VIDEO_BYTES = 15 * 1024 * 1024;
export const SPOTLIGHT_MAX_SOURCE_VIDEO_BYTES = 100 * 1024 * 1024;
export const SPOTLIGHT_MIN_VIDEO_SHORT_EDGE = 360;
export const SPOTLIGHT_MAX_VIDEO_ASPECT_RATIO = 2.4;
export const SPOTLIGHT_VIDEO_QUALITY_GUIDANCE =
  "Before recording, clean the lens, use good light, hold the phone steady, keep the product centred, and choose a quiet place. Upload a clear, playable portrait, square, or landscape video. Common social-video downloads are accepted when they remain usable. You do not need to cut it yourself: GSN prepares the file and keeps only the opening 10 seconds. Only unreadable, extremely small, unusually narrow, or very choppy video is rejected.";

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

  // Weight may influence how often an item appears, but never by placing the
  // same presentation in consecutive slots. With too little alternative
  // inventory, surplus weight is deliberately dropped instead of making the
  // rail look frozen.
  const queue: T[] = [];
  const maximumSafeOccurrences = Math.max(items.length - 1, 1);
  const remaining = items.map((item, index) => ({
    index,
    item,
    count: Math.min(spotlightRotationWeight(item), maximumSafeOccurrences),
  }));

  while (remaining.some((entry) => entry.count > 0)) {
    const previous = queue[queue.length - 1];
    const next = remaining
      .filter((entry) => entry.count > 0 && entry.item !== previous)
      .sort((a, b) => b.count - a.count || a.index - b.index)[0];
    if (!next) break;
    queue.push(next.item);
    next.count -= 1;
  }

  while (queue.length > 1 && queue[0] === queue[queue.length - 1]) {
    queue.pop();
  }

  return queue.length > 0 ? queue : items;
}
