const DASHBOARD_AVATAR_STORAGE_KEY = "gmfn.member.avatar";

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch {
      return typeof window !== "undefined"
        ? String(window.location.origin || "").trim().replace(/\/+$/, "")
        : "";
    }
  }

  return typeof window !== "undefined"
    ? String(window.location.origin || "").trim().replace(/\/+$/, "")
    : "";
}

function storageIdentitySegment(value: unknown): string {
  const raw = safeStr(value);
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "default";
}

function scopedDashboardStorageKey(identity: string): string {
  return `${DASHBOARD_AVATAR_STORAGE_KEY}.${storageIdentitySegment(identity)}`;
}

function dashboardAvatarStorageKeysForUser(user: any): string[] {
  const identityKeys = [
    user?.gmfn_id,
    user?.id,
    user?.email,
    user?.phone_e164,
    user?.phone_number,
    user?.username,
    user?.display_name,
  ]
    .map(safeStr)
    .filter(Boolean);

  return [
    DASHBOARD_AVATAR_STORAGE_KEY,
    ...Array.from(new Set(identityKeys)).map(scopedDashboardStorageKey),
  ];
}

function readStoredImage(keys: string[]): string {
  if (typeof localStorage === "undefined") return "";

  try {
    for (const key of keys) {
      const value = localStorage.getItem(key) || "";
      if (value) return value;
    }
  } catch {
    return "";
  }

  return "";
}

export function resolveProfileImageUrl(value?: string | null): string {
  const raw = safeStr(value);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const origin = apiOrigin();
  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export function resolveSharedProfileImage(user: any, ...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const resolved = resolveProfileImageUrl(safeStr(candidate));
    if (resolved) return resolved;
  }

  const profileField = [
    user?.profile_image_url,
    user?.avatar_url,
    user?.avatar,
    user?.photo_url,
  ].find((value) => safeStr(value));

  const resolvedProfileField = resolveProfileImageUrl(safeStr(profileField));
  if (resolvedProfileField) return resolvedProfileField;

  return readStoredImage(dashboardAvatarStorageKeysForUser(user));
}
