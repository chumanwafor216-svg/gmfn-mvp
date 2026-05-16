const PUBLISH_RECOVERY_KEY = "gmfn_publish_recovery";
const PUBLISH_RECOVERY_TTL_MS = 30 * 60 * 1000;
const PUBLISH_RECOVERY_WINDOW_NAME_PREFIX = "gmfn_publish_recovery:";

type PublishRecoveryMarker = {
  to: string;
  ctaId: string;
  createdAt: number;
};

function storageAreas(): Storage[] {
  if (typeof window === "undefined") return [];
  const areas: Storage[] = [];
  try {
    if (window.sessionStorage) areas.push(window.sessionStorage);
  } catch {
    // ignore unavailable storage
  }
  try {
    if (window.localStorage) areas.push(window.localStorage);
  } catch {
    // ignore unavailable storage
  }
  return areas;
}

function safeTarget(value: unknown): string {
  const target = String(value ?? "").trim();
  return target.startsWith("/app/") || target === "/app" ? target : "";
}

export function rememberPublishRecovery(to: string, ctaId: string): void {
  if (typeof window === "undefined") return;

  const target = safeTarget(to);
  if (!target) return;

  const marker: PublishRecoveryMarker = {
    to: target,
    ctaId: String(ctaId || "publish").trim() || "publish",
    createdAt: Date.now(),
  };

  try {
    const payload = JSON.stringify(marker);
    for (const storage of storageAreas()) {
      try {
        storage.setItem(PUBLISH_RECOVERY_KEY, payload);
      } catch {
        // Try the next storage area.
      }
    }
    try {
      window.name = `${PUBLISH_RECOVERY_WINDOW_NAME_PREFIX}${payload}`;
    } catch {
      // Some embedded browsers can reject window.name writes.
    }
  } catch {
    // If recovery writes are blocked, publish still continues normally.
  }
}

export function publishRecoveryTarget(): string {
  return readPublishRecoveryTarget(true);
}

export function peekPublishRecoveryTarget(): string {
  return readPublishRecoveryTarget(false);
}

function readPublishRecoveryTarget(consume: boolean): string {
  if (typeof window === "undefined") return "";

  try {
    const storageRaw = storageAreas()
      .map((storage) => {
        try {
          return String(storage.getItem(PUBLISH_RECOVERY_KEY) || "").trim();
        } catch {
          return "";
        }
      })
      .find(Boolean) || "";
    const windowNameRaw = readWindowNameMarker();
    const raw = storageRaw || windowNameRaw;
    if (!raw) return "";

    const marker = JSON.parse(raw) as Partial<PublishRecoveryMarker>;
    const target = safeTarget(marker?.to);
    const createdAt = Number(marker?.createdAt || 0);
    const expired = !Number.isFinite(createdAt) || Date.now() - createdAt > PUBLISH_RECOVERY_TTL_MS;

    if (!target || expired) {
      clearPublishRecoveryMarker();
      return "";
    }

    if (consume) {
      clearPublishRecoveryMarker();
    }
    return target;
  } catch {
    clearPublishRecoveryMarker();
    return "";
  }
}

function clearPublishRecoveryMarker(): void {
  for (const storage of storageAreas()) {
    try {
      storage.removeItem(PUBLISH_RECOVERY_KEY);
    } catch {
      // ignore
    }
  }

  try {
    if (
      typeof window !== "undefined" &&
      String(window.name || "").startsWith(PUBLISH_RECOVERY_WINDOW_NAME_PREFIX)
    ) {
      window.name = "";
    }
  } catch {
    // ignore
  }
}

function readWindowNameMarker(): string {
  try {
    if (typeof window === "undefined") return "";
    const value = String(window.name || "").trim();
    if (!value.startsWith(PUBLISH_RECOVERY_WINDOW_NAME_PREFIX)) return "";
    return value.slice(PUBLISH_RECOVERY_WINDOW_NAME_PREFIX.length).trim();
  } catch {
    return "";
  }
}
