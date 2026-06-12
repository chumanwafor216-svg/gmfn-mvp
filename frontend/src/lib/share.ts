// src/lib/share.ts
// GSN share helpers (low-end friendly)
// - Copy link
// - WhatsApp prefilled message
// - QR image (hosted generator) for screenshot-based sharing
import { buildPublicWhatsAppUrl, publicFrontendUrl } from "./publicLinks";
import { safeCopy } from "./api";

export type ShareTarget = {
  title: string;           // short label shown to user
  url: string;             // absolute URL preferred
  message?: string;        // optional extra message
};

export type SocialSharePlatform =
  | "x"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "copy";

export function normalizeUrl(url: string): string {
  const s = String(url || "").trim();
  if (!s) return "";
  return publicFrontendUrl(s);
}

export function buildWhatsAppUrl(text: string): string {
  return buildPublicWhatsAppUrl(text);
}

export function buildShareText(target: ShareTarget): string {
  const title = String(target.title || "GSN").trim();
  const url = normalizeUrl(target.url);
  const extra = String(target.message || "").trim();

  // Humane compact message for WhatsApp
  if (extra) return `${title}\n${extra}\n${url}`;
  return `${title}\n${url}`;
}

export function normalizeSocialHandle(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/^@+/, "")
    .replace(
      /^https?:\/\/(www\.)?(x|twitter|facebook|instagram|linkedin|tiktok)\.com\//i,
      ""
    )
    .replace(/[?#].*$/, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 64);
}

export function buildSocialShareText(
  target: ShareTarget,
  handle = "",
  platform: SocialSharePlatform = "copy"
): string {
  const cleanHandle = normalizeSocialHandle(handle);
  const tag = cleanHandle && platform !== "facebook" ? `@${cleanHandle}\n` : "";
  return `${tag}${buildShareText(target)}`.trim();
}

export function buildXIntentShareUrl(target: ShareTarget, handle = ""): string {
  const text = buildSocialShareText(target, handle, "x");
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function buildFacebookShareUrl(target: ShareTarget): string {
  const url = normalizeUrl(target.url);
  return url
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    : "";
}

export function buildLinkedInShareUrl(target: ShareTarget): string {
  const url = normalizeUrl(target.url);
  return url
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    : "";
}

export function buildMailtoShareUrl(target: ShareTarget): string {
  const title = String(target.title || "GSN").trim();
  const text = buildShareText(target);
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const s = String(text || "");
  if (!s) return false;

  return safeCopy(s);
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
