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
  socialMessage?: string;  // shorter caption for public social apps
  socialUrl?: string;      // scraper-friendly URL for public social apps
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
  const url = normalizeUrl(target.socialUrl || target.url);
  const extra = String(target.message || "").trim();

  // Put the scraper-friendly URL before package copy so WhatsApp previews the
  // route-specific card instead of the generic frontend shell.
  return [title, url, extra].filter(Boolean).join("\n");
}

function compactText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function trimAtWord(value: string, maxLength: number): string {
  const text = compactText(value);
  if (text.length <= maxLength) return text;

  const sliced = text.slice(0, Math.max(0, maxLength - 3)).trimEnd();
  const wordBoundary = sliced.lastIndexOf(" ");
  const candidate = wordBoundary > 48 ? sliced.slice(0, wordBoundary) : sliced;
  return `${candidate.trimEnd()}...`;
}

function stripUrls(value: string): string {
  return value.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
}

function paperLineValue(line: string): string {
  return line.replace(/^[^:]{1,42}:\s*/, "").trim();
}

function compactPaperMessage(value: string): string {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^GLOBAL SUPPORT NETWORK/i.test(line) &&
        !/^Official GSN (?:headed paper|public record)/i.test(line) &&
        !/^(?:Generated \(UTC\)|Prepared for you \(UTC\)):/i.test(line) &&
        !/^(?:Reference|Record code):/i.test(line) &&
        !/^(?:GSN record context|Public record context)/i.test(line) &&
        !/^(?:Record details|What you need to know)/i.test(line) &&
        !/^(?:Verification \/ action link|Open this record):/i.test(line) &&
        !/^Privacy:/i.test(line) &&
        !/^Limitation:/i.test(line) &&
        !/^Footer:/i.test(line)
    );

  const itemLine = lines.find((line) => /^Item \/ update:/i.test(line));
  const blockLine = lines.find((line) => /^Public block:/i.test(line));
  const shopLine = lines.find((line) => /^Shop:/i.test(line));
  const purposeLine = lines.find((line) => /^Purpose:/i.test(line));

  const pieces = [
    itemLine ? paperLineValue(itemLine) : "",
    blockLine ? paperLineValue(blockLine) : "",
    shopLine ? `from ${paperLineValue(shopLine)}` : "",
  ].filter(Boolean);

  if (pieces.length) return compactText(pieces.join(" "));
  return compactText(purposeLine ? paperLineValue(purposeLine) : "Open this GSN record.");
}

function socialMessageForTarget(target: ShareTarget): string {
  const direct = compactText(target.socialMessage);
  if (direct) return stripUrls(direct);

  const raw = String(target.message || "").trim();
  if (!raw) return "";

  if (/GLOBAL SUPPORT NETWORK|Official GSN (?:headed paper|public record)/i.test(raw)) {
    return compactPaperMessage(raw);
  }

  return stripUrls(raw);
}

function buildCompactSocialShareText(
  target: ShareTarget,
  handle: string,
  platform: SocialSharePlatform,
  includeUrl: boolean
): string {
  const cleanHandle = normalizeSocialHandle(handle);
  const tag = cleanHandle && platform !== "facebook" ? `@${cleanHandle}` : "";
  const title = trimAtWord(String(target.title || "GSN").trim(), 82);
  const url = normalizeUrl(target.socialUrl || target.url);
  const message = trimAtWord(socialMessageForTarget(target), 148);
  const lines = [tag, title, message, includeUrl ? url : ""].filter(Boolean);
  const limit = platform === "x" ? (includeUrl ? 260 : 210) : 520;
  return trimAtWord(lines.join("\n"), limit);
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
  if (platform !== "copy") {
    return buildCompactSocialShareText(target, handle, platform, true);
  }

  const cleanHandle = normalizeSocialHandle(handle);
  const tag = cleanHandle ? `@${cleanHandle}\n` : "";
  return `${tag}${buildShareText(target)}`.trim();
}

export function buildXIntentShareUrl(target: ShareTarget, handle = ""): string {
  const text = buildCompactSocialShareText(target, handle, "x", false);
  const url = normalizeUrl(target.socialUrl || target.url);
  const params = new URLSearchParams();
  if (text) params.set("text", text);
  if (url) params.set("url", url);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildFacebookShareUrl(target: ShareTarget): string {
  const url = normalizeUrl(target.socialUrl || target.url);
  return url
    ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    : "";
}

export function buildLinkedInShareUrl(target: ShareTarget): string {
  const url = normalizeUrl(target.socialUrl || target.url);
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
