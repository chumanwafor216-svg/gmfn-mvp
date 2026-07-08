import {
  getWebPushStatus,
  registerWebPushSubscription,
  unregisterWebPushSubscription,
} from "./api";

type WebPushSyncResult = {
  ok: boolean;
  status:
    | "registered"
    | "unsupported"
    | "not-configured"
    | "permission-denied"
    | "permission-default"
    | "failed";
  message?: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return buffer;
}

function subscriptionPayload(subscription: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  permission_state?: string;
} | null {
  const json = subscription.toJSON() as any;
  const endpoint = String(json?.endpoint || subscription.endpoint || "").trim();
  const p256dh = String(json?.keys?.p256dh || "").trim();
  const auth = String(json?.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !auth) return null;
  return {
    endpoint,
    keys: { p256dh, auth },
    permission_state:
      typeof Notification !== "undefined" ? Notification.permission : undefined,
  };
}

export async function syncGsnWebPushSubscription(options: {
  requestPermission?: boolean;
} = {}): Promise<WebPushSyncResult> {
  if (!isBrowser()) return { ok: false, status: "unsupported" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, status: "unsupported" };
  }
  if (!("Notification" in window)) {
    return { ok: false, status: "unsupported" };
  }

  let permission = Notification.permission;
  if (permission === "default" && options.requestPermission) {
    permission = await Notification.requestPermission().catch(() => "denied");
  }

  if (permission === "denied") {
    return { ok: false, status: "permission-denied" };
  }
  if (permission !== "granted") {
    return { ok: false, status: "permission-default" };
  }

  const status = await getWebPushStatus().catch(() => null);
  const publicKey = String(status?.public_key || "").trim();
  if (!status?.configured || !publicKey) {
    return { ok: false, status: "not-configured" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(publicKey),
      });
    }

    const payload = subscriptionPayload(subscription);
    if (!payload) return { ok: false, status: "failed" };
    await registerWebPushSubscription(payload);
    return { ok: true, status: "registered" };
  } catch (err: any) {
    return {
      ok: false,
      status: "failed",
      message: String(err?.message || "Web Push registration failed."),
    };
  }
}

export async function unregisterCurrentWebPushSubscription(): Promise<boolean> {
  if (!isBrowser()) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    await unregisterWebPushSubscription({ endpoint: subscription.endpoint }).catch(
      () => null
    );
    return await subscription.unsubscribe();
  } catch {
    return false;
  }
}
