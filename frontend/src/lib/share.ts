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

export async function copyToClipboard(text: string): Promise<boolean> {
  const s = String(text || "");
  if (!s) return false;

  safeCopy(s);
  return true;
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
