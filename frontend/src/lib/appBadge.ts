import {
  getAccessToken,
  getMyUnreadNotificationCount,
} from "./api";

export const GSN_AUTH_SESSION_CHANGED_EVENT = "GSN_AUTH_SESSION_CHANGED";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function unreadCountFromPayload(payload: any): number {
  const count = Number(
    payload?.unread_count ??
      payload?.unreadCount ??
      payload?.count ??
      payload?.total ??
      0
  );
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

export async function setGsnAppBadge(count: number): Promise<void> {
  if (!isBrowser()) return;

  const normalized = Number.isFinite(Number(count)) && Number(count) > 0
    ? Math.floor(Number(count))
    : 0;
  const nav = navigator as any;

  try {
    if (normalized > 0 && typeof nav.setAppBadge === "function") {
      await nav.setAppBadge(normalized);
      return;
    }
    if (normalized <= 0 && typeof nav.clearAppBadge === "function") {
      await nav.clearAppBadge();
    }
  } catch {
    // App badge support is browser/launcher dependent. Never block the app.
  }
}

export async function clearGsnAppBadge(): Promise<void> {
  await setGsnAppBadge(0);
}

export async function refreshGsnAppBadge(): Promise<void> {
  if (!isBrowser()) return;

  if (!getAccessToken()) {
    await clearGsnAppBadge();
    return;
  }

  const payload = await getMyUnreadNotificationCount().catch(() => null);
  if (!payload) return;
  await setGsnAppBadge(unreadCountFromPayload(payload));
}

export function installGsnAppBadgeSync(): void {
  if (!isBrowser()) return;

  const refreshSoon = () => {
    window.setTimeout(() => {
      void refreshGsnAppBadge();
    }, 0);
  };

  window.addEventListener("focus", refreshSoon);
  window.addEventListener("pageshow", refreshSoon);
  window.addEventListener(GSN_AUTH_SESSION_CHANGED_EVENT, refreshSoon);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshSoon();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "GSN_BADGE_COUNT") {
        void setGsnAppBadge(unreadCountFromPayload(event.data));
      }
      if (event.data?.type === "GSN_REFRESH_BADGE") {
        refreshSoon();
      }
    });
  }

  refreshSoon();
}
