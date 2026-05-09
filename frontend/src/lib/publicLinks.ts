const DEFAULT_PUBLIC_FRONTEND_ORIGIN = "https://gmfn-frontend.onrender.com";
const DEFAULT_PUBLIC_API_ORIGIN = "https://gmfn-api.onrender.com";
export const PUBLIC_SHOP_DIARIES_ANCHOR = "shop-diaries";
const SUSPENDED_PUBLIC_FRONTEND_HOSTS = new Set(["frontend.onrender.com"]);

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function isPrivateFrontendHost(hostname: string): boolean {
  const host = cleanText(hostname).toLowerCase();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  if (host.startsWith("192.168.") || host.startsWith("10.")) {
    return true;
  }

  const parts = host.split(".");
  if (parts.length >= 2 && parts[0] === "172") {
    const second = Number(parts[1]);
    return Number.isInteger(second) && second >= 16 && second <= 31;
  }

  return false;
}

function isSuspendedPublicFrontendHost(hostname: string): boolean {
  return SUSPENDED_PUBLIC_FRONTEND_HOSTS.has(cleanText(hostname).toLowerCase());
}

function publicEnvCandidates(): string[] {
  const env =
    typeof import.meta !== "undefined" ? (import.meta as any)?.env || {} : {};

  return [
    env.VITE_PUBLIC_FRONTEND_URL,
    env.VITE_FRONTEND_BASE_URL,
    env.VITE_FRONTEND_ORIGIN,
    env.VITE_APP_PUBLIC_ORIGIN,
  ]
    .map(cleanText)
    .filter(Boolean);
}

function publicApiEnvCandidates(): string[] {
  const env =
    typeof import.meta !== "undefined" ? (import.meta as any)?.env || {} : {};

  return [
    env.VITE_PUBLIC_API_URL,
    env.VITE_API_BASE_URL,
    env.VITE_API_ORIGIN,
    env.VITE_BACKEND_BASE_URL,
  ]
    .map(cleanText)
    .filter(Boolean);
}

function normalizePublicOrigin(raw: string): string {
  const text = trimTrailingSlash(cleanText(raw));
  if (!text) return "";

  try {
    const url = new URL(text);
    if (!/^https?:$/i.test(url.protocol)) return "";
    if (isPrivateFrontendHost(url.hostname)) return "";
    if (isSuspendedPublicFrontendHost(url.hostname)) return "";
    return trimTrailingSlash(url.origin);
  } catch {
    return "";
  }
}

export function configuredPublicFrontendOrigin(): string {
  for (const candidate of publicEnvCandidates()) {
    const origin = normalizePublicOrigin(candidate);
    if (origin) return origin;
  }

  return DEFAULT_PUBLIC_FRONTEND_ORIGIN;
}

export function configuredPublicApiOrigin(): string {
  for (const candidate of publicApiEnvCandidates()) {
    const origin = normalizePublicOrigin(candidate);
    if (origin) return origin;
  }

  return DEFAULT_PUBLIC_API_ORIGIN;
}

export function publicFrontendOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const current = normalizePublicOrigin(window.location.origin);
    if (current) return current;
  }

  return configuredPublicFrontendOrigin();
}

export function publicApiOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const current = normalizePublicOrigin(window.location.origin);
    if (current && current !== publicFrontendOrigin()) return current;
  }

  return configuredPublicApiOrigin();
}

export function publicFrontendUrl(pathOrUrl: string): string {
  const raw = cleanText(pathOrUrl);
  if (!raw) return "";

  const publicOrigin = publicFrontendOrigin();

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (isPrivateFrontendHost(url.hostname)) {
        return `${publicOrigin}${url.pathname}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch {
      return raw;
    }
  }

  const path = raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
  return `${publicOrigin}${path}`;
}

export function canonicalPublicFrontendUrl(pathOrUrl: string): string {
  const raw = cleanText(pathOrUrl);
  if (!raw) return "";

  const publicOrigin = configuredPublicFrontendOrigin();

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return `${publicOrigin}${url.pathname}${url.search}${url.hash}`;
    } catch {
      return raw;
    }
  }

  const path = raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
  return `${publicOrigin}${path}`;
}

export function publicShopDiariesPath(pathOrUrl: string): string {
  const raw = cleanText(pathOrUrl);
  if (!raw) return "";

  try {
    const isAbsolute = /^https?:\/\//i.test(raw);
    const url = new URL(
      isAbsolute ? raw : raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`,
      "https://public-shop.local"
    );

    url.searchParams.delete("product_id");
    url.searchParams.delete("product");
    url.searchParams.delete("block");
    url.searchParams.delete("clan_id");
    url.searchParams.delete("community");
    url.searchParams.delete("community_id");
    url.hash = PUBLIC_SHOP_DIARIES_ANCHOR;

    if (isAbsolute) return url.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const [withoutHash] = raw.split("#");
    const [path, search = ""] = withoutHash.split("?");
    const params = new URLSearchParams(search);
    params.delete("product_id");
    params.delete("product");
    params.delete("block");
    params.delete("clan_id");
    params.delete("community");
    params.delete("community_id");
    const query = params.toString();
    return `${path || "/"}${query ? `?${query}` : ""}#${PUBLIC_SHOP_DIARIES_ANCHOR}`;
  }
}

export function publicShopDiariesUrl(pathOrUrl: string): string {
  return canonicalPublicFrontendUrl(publicShopDiariesPath(pathOrUrl));
}

export function publicShopPath(gmfnId: string): string {
  const ownerId = cleanText(gmfnId);
  if (!ownerId) return "";
  return `/shop/${encodeURIComponent(ownerId)}#${PUBLIC_SHOP_DIARIES_ANCHOR}`;
}

export function publicShopUrl(gmfnId: string): string {
  const path = publicShopPath(gmfnId);
  return path ? canonicalPublicFrontendUrl(path) : "";
}

export function publicShopBlockPath(params: {
  gmfnId: string;
  productId?: string | number | null;
  block?: string | number | null;
}): string {
  return publicShopPath(params.gmfnId);
}

export function publicShopBlockUrl(params: {
  gmfnId: string;
  productId?: string | number | null;
  block?: string | number | null;
}): string {
  const path = publicShopBlockPath(params);
  return path ? canonicalPublicFrontendUrl(path) : "";
}

export function publicApiUrl(pathOrUrl: string): string {
  const raw = cleanText(pathOrUrl);
  if (!raw) return "";

  const publicOrigin = publicApiOrigin();

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (isPrivateFrontendHost(url.hostname)) {
        return `${publicOrigin}${url.pathname}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch {
      return raw;
    }
  }

  const path = raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
  return `${publicOrigin}${path}`;
}

export function buildPublicWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(cleanText(message))}`;
}
