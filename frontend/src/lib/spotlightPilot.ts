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
