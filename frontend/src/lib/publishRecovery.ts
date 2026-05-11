const PUBLISH_RECOVERY_KEY = "gmfn_publish_recovery";
const PUBLISH_RECOVERY_TTL_MS = 5 * 60 * 1000;

type PublishRecoveryMarker = {
  to: string;
  ctaId: string;
  createdAt: number;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function safeTarget(value: unknown): string {
  const target = String(value ?? "").trim();
  return target.startsWith("/app/") || target === "/app" ? target : "";
}

export function rememberPublishRecovery(to: string, ctaId: string): void {
  if (!canUseStorage()) return;

  const target = safeTarget(to);
  if (!target) return;

  const marker: PublishRecoveryMarker = {
    to: target,
    ctaId: String(ctaId || "publish").trim() || "publish",
    createdAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(PUBLISH_RECOVERY_KEY, JSON.stringify(marker));
  } catch {
    // If storage is blocked, publish still continues normally.
  }
}

export function publishRecoveryTarget(): string {
  if (!canUseStorage()) return "";

  try {
    const raw = String(window.sessionStorage.getItem(PUBLISH_RECOVERY_KEY) || "").trim();
    if (!raw) return "";

    const marker = JSON.parse(raw) as Partial<PublishRecoveryMarker>;
    const target = safeTarget(marker?.to);
    const createdAt = Number(marker?.createdAt || 0);
    const expired = !Number.isFinite(createdAt) || Date.now() - createdAt > PUBLISH_RECOVERY_TTL_MS;

    if (!target || expired) {
      window.sessionStorage.removeItem(PUBLISH_RECOVERY_KEY);
      return "";
    }

    window.sessionStorage.removeItem(PUBLISH_RECOVERY_KEY);
    return target;
  } catch {
    try {
      window.sessionStorage.removeItem(PUBLISH_RECOVERY_KEY);
    } catch {
      // ignore
    }
    return "";
  }
}
