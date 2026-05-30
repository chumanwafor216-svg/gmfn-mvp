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

function importMetaEnv(): Record<string, any> {
  return typeof import.meta !== "undefined"
    ? (import.meta as any)?.env || {}
    : {};
}

function isDevelopmentFrontend(): boolean {
  const env = importMetaEnv();
  return Boolean(env.DEV || String(env.MODE || "").toLowerCase() === "development");
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

export function isSuspendedPublicFrontendHost(hostname: string): boolean {
  return SUSPENDED_PUBLIC_FRONTEND_HOSTS.has(cleanText(hostname).toLowerCase());
}

function publicEnvCandidates(): string[] {
  const env = importMetaEnv();

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
  const env = importMetaEnv();

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

function developmentFrontendOrigin(): string {
  if (!isDevelopmentFrontend()) return "";
  if (typeof window === "undefined" || !window.location?.origin) return "";

  try {
    const url = new URL(window.location.origin);
    if (!/^https?:$/i.test(url.protocol)) return "";
    if (isSuspendedPublicFrontendHost(url.hostname)) return "";
    return trimTrailingSlash(url.origin);
  } catch {
    return "";
  }
}

export function shareablePublicFrontendUrl(pathOrUrl: string): string {
  const raw = cleanText(pathOrUrl);
  if (!raw) return "";

  const developmentOrigin = developmentFrontendOrigin();
  if (developmentOrigin) {
    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        return `${developmentOrigin}${url.pathname}${url.search}${url.hash}`;
      } catch {
        return raw;
      }
    }

    const path = raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`;
    return `${developmentOrigin}${path}`;
  }

  return canonicalPublicFrontendUrl(raw);
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

export function publicShopRootPath(pathOrUrl: string): string {
  const raw = cleanText(pathOrUrl);
  if (!raw) return "";

  try {
    const isAbsolute = /^https?:\/\//i.test(raw);
    const url = new URL(
      isAbsolute ? raw : raw.startsWith("/") ? raw : `/${raw.replace(/^\/+/, "")}`,
      "https://public-shop.local"
    );

    url.search = "";
    url.hash = "";

    if (isAbsolute) return url.toString();
    return url.pathname;
  } catch {
    const [withoutHash] = raw.split("#");
    const [path] = withoutHash.split("?");
    return path || "/";
  }
}

export function publicShopRootUrl(pathOrUrl: string): string {
  return shareablePublicFrontendUrl(publicShopRootPath(pathOrUrl));
}

export function publicShopPath(gmfnId: string): string {
  const ownerId = cleanText(gmfnId);
  if (!ownerId) return "";
  return `/shop/${encodeURIComponent(ownerId)}`;
}

export function publicShopUrl(gmfnId: string): string {
  const path = publicShopPath(gmfnId);
  return path ? shareablePublicFrontendUrl(path) : "";
}

export function publicShopDiariesPath(gmfnId: string): string {
  const path = publicShopPath(gmfnId);
  return path ? `${path}#${PUBLIC_SHOP_DIARIES_ANCHOR}` : "";
}

export function publicShopDiariesUrl(gmfnId: string): string {
  const path = publicShopDiariesPath(gmfnId);
  return path ? shareablePublicFrontendUrl(path) : "";
}

export function publicShopBlockPath(params: {
  gmfnId: string;
  productId?: string | number | null;
  block?: string | number | null;
}): string {
  const path = publicShopPath(params.gmfnId);
  if (!path) return "";

  const productId = cleanText(params.productId);
  const blockNumber = Number(params.block || 0);
  const hasBlock = Number.isFinite(blockNumber) && blockNumber > 0;
  const productQuery = productId
    ? `?product_id=${encodeURIComponent(productId)}`
    : "";
  const anchor = hasBlock
    ? `shop-block-${Math.trunc(blockNumber)}`
    : productId
      ? `product-${productId}`
      : PUBLIC_SHOP_DIARIES_ANCHOR;

  return `${path}${productQuery}#${encodeURIComponent(anchor)}`;
}

export function publicShopBlockUrl(params: {
  gmfnId: string;
  productId?: string | number | null;
  block?: string | number | null;
}): string {
  const path = publicShopBlockPath(params);
  return path ? shareablePublicFrontendUrl(path) : "";
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

export function publicShopSharePath(params: {
  gmfnId: string;
  productId?: string | number | null;
  block?: string | number | null;
}): string {
  return publicShopBlockPath(params);
}

export function publicShopShareUrl(params: {
  gmfnId: string;
  productId?: string | number | null;
  block?: string | number | null;
}): string {
  const path = publicShopSharePath(params);
  return path ? shareablePublicFrontendUrl(path) : "";
}

export function buildPublicWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(cleanText(message))}`;
}
