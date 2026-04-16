// src/lib/share.ts
// GSN share helpers (low-end friendly)
// - Copy link
// - WhatsApp prefilled message
// - QR image (hosted generator) for screenshot-based sharing

export type ShareTarget = {
  title: string;           // short label shown to user
  url: string;             // absolute URL preferred
  message?: string;        // optional extra message
};

export function normalizeUrl(url: string): string {
  const s = String(url || "").trim();
  if (!s) return "";
  // If it looks like a relative path, convert to absolute using current origin.
  if (s.startsWith("/")) return `${window.location.origin}${s}`;
  return s;
}

export function buildWhatsAppUrl(text: string): string {
  const msg = encodeURIComponent(String(text || "").trim());
  return `https://wa.me/?text=${msg}`;
}

export function buildShareText(target: ShareTarget): string {
  const title = String(target.title || "GSN").trim();
  const url = normalizeUrl(target.url);
  const extra = String(target.message || "").trim();

  // Humane compact message for WhatsApp
  if (extra) return `${title}\n${extra}\n${url}`;
  return `${title}\n${url}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const s = String(text || "");
  if (!s) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(s);
      return true;
    }
  } catch {
    // fall back below
  }

  // Fallback for older browsers
  try {
    const ta = document.createElement("textarea");
    ta.value = s;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/**
 * QR image URL for low-end devices.
 * Users can screenshot and share. Requires internet access.
 * If you want fully offline QR generation, we’ll add a local QR encoder later.
 */
export function buildQrImageUrl(url: string, size = 220): string {
  const u = encodeURIComponent(normalizeUrl(url));
  const s = Math.max(120, Math.min(size, 420));
  // QuickChart QR endpoint (simple + reliable)
  return `https://quickchart.io/qr?size=${s}x${s}&text=${u}`;
}
