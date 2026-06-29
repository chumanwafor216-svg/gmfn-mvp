/* global AbortSignal, Buffer, fetch, process, URL, URLSearchParams */

import { createServer } from "node:http";
import { createReadStream, existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(__dirname, "dist");
const indexPath = path.join(distRoot, "index.html");
const publicFrontendOrigin = firstOrigin(
  [
    process.env.PUBLIC_FRONTEND_URL,
    process.env.VITE_PUBLIC_FRONTEND_URL ||
      process.env.VITE_FRONTEND_BASE_URL,
    process.env.FRONTEND_BASE_URL,
  ],
  "https://gmfn-frontend.onrender.com"
);
const publicApiOrigin = firstOrigin(
  [
    process.env.VITE_API_BASE_URL,
    process.env.PUBLIC_API_URL ||
      process.env.GMFN_API_BASE_URL,
    process.env.API_BASE_URL,
  ],
  "https://gmfn-api.onrender.com"
);

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function cleanOrigin(value) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  if (!text) return "";
  try {
    const url = new URL(text);
    if (!/^https?:$/i.test(url.protocol)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function firstOrigin(values, fallback) {
  for (const value of values) {
    const origin = cleanOrigin(value);
    if (origin) return origin;
  }
  return fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function apiUrl(pathname) {
  const apiPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (publicApiOrigin.endsWith("/api") && apiPath.startsWith("/api/")) {
    return `${publicApiOrigin.slice(0, -4)}${apiPath}`;
  }
  return `${publicApiOrigin}${apiPath}`;
}

function frontendUrl(pathname, search = "", hash = "") {
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${publicFrontendOrigin}${cleanPath}${search}${hash}`;
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && !["null", "undefined", "string", "n/a", "na"].includes(text.toLowerCase())) {
      return text;
    }
  }
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatPrice(value, currency) {
  const amount = firstText(value);
  const unit = firstText(currency, "NGN").toUpperCase();
  if (!amount) return "Price on request";
  if (unit === "GBP" || unit === "GDP" || unit === "POUND" || unit === "POUNDS") return `£${amount}`;
  if (unit === "USD") return `$${amount}`;
  if (unit === "EUR") return `€${amount}`;
  if (unit === "NGN") return `₦${amount}`;
  return `${amount} ${unit}`;
}

function selectedProduct(products, productId) {
  const requested = Number(productId || 0);
  if (!requested) return { product: products[0] || null, block: products[0] ? 1 : 0 };
  const index = products.findIndex((item) => Number(item?.id || 0) === requested);
  if (index >= 0) return { product: products[index], block: index + 1 };
  return { product: products[0] || null, block: products[0] ? 1 : 0 };
}

function positiveInteger(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function shopMetaHash(productId, block) {
  if (!productId) return "#shop-diaries";
  const blockNumber = positiveInteger(block) || 1;
  return `#shop-block-${blockNumber}`;
}

function fallbackShopMeta(gmfnId, productId, block) {
  const ownerId = firstText(gmfnId, "GSN").toUpperCase();
  const hasProduct = Boolean(productId);
  const search = hasProduct ? `?product_id=${encodeURIComponent(String(productId))}` : "";

  return {
    title: hasProduct ? "GSN Shop Item" : "GSN Public Shop",
    description: hasProduct
      ? "Open this trusted GSN shop item and check the public shop details."
      : "Open this trusted GSN public shop link and check the shop details.",
    imageUrl: frontendUrl("/gsn-share-poster.png"),
    targetUrl: frontendUrl(`/shop/${encodeURIComponent(ownerId)}`, search, shopMetaHash(productId, block)),
  };
}

async function fetchShopMeta(gmfnId, productId, blockParam) {
  const url = new URL(apiUrl(`/marketplace/public/shop/${encodeURIComponent(gmfnId)}`));
  if (productId) url.searchParams.set("product_id", productId);
  url.searchParams.set("product_limit", "100");

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`Public shop lookup failed: ${response.status}`);

  const data = await response.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  const { product, block } = selectedProduct(products, productId);
  const shop = data?.item || {};
  const ownerId = firstText(data?.gmfn_id, gmfnId).toUpperCase();
  const marketplace = firstText(data?.community_name, shop?.shop_name, shop?.name, "GSN Marketplace");
  const productName = firstText(product?.name, product?.description, "Public shop item");
  const title = product ? `${productName} | ${marketplace}` : `${marketplace} | GSN public shop`;
  const description = product
    ? "Trusted GSN shop item. Tap to open product."
    : "Trusted GSN shop. Tap to open shop.";
  const requestedBlock = positiveInteger(blockParam);
  const targetBlock = requestedBlock || block || 1;
  const targetHash = product ? shopMetaHash(product.id, targetBlock) : "#shop-diaries";
  const targetSearch = product ? `?product_id=${encodeURIComponent(String(product.id))}` : "";
  const targetUrl = frontendUrl(`/shop/${encodeURIComponent(ownerId)}`, targetSearch, targetHash);
  const imageUrl = frontendUrl(
    `/shop/${encodeURIComponent(ownerId)}/share-card.png`,
    product
      ? `?product_id=${encodeURIComponent(String(product.id))}&block=${encodeURIComponent(String(targetBlock))}`
      : ""
  );

  return {
    title,
    description,
    imageUrl,
    targetUrl,
  };
}

function decodeShareText(value) {
  return firstText(String(value || "").replace(/\+/g, " "));
}

function looksLikeSystemId(value) {
  const text = String(value || "").trim().toUpperCase();
  return /^GMFN-[UC]-/.test(text) || /^GSN-[UC]-/.test(text);
}

function humanInviteName(value, fallback = "A known GSN member") {
  const text = decodeShareText(value);
  if (!text || looksLikeSystemId(text)) return fallback;
  if (text.includes("@")) return firstText(text.split("@")[0], fallback);
  return text;
}

function joinInviteMeta(searchParams, pathname, search) {
  const community = decodeShareText(
    firstText(
      searchParams.get("marketplace_name"),
      searchParams.get("community_name"),
      searchParams.get("clan_name"),
      "this GSN community"
    )
  );
  const inviter = humanInviteName(
    firstText(
      searchParams.get("inviter_name"),
      searchParams.get("invited_by"),
      searchParams.get("sender_name")
    )
  );
  const receiver = decodeShareText(
    firstText(
      searchParams.get("receiver_name"),
      searchParams.get("receiver"),
      searchParams.get("to")
    )
  );
  const addressed = receiver ? `${receiver}: ` : "";
  const title = "GSN Invite";
  const description = `${addressed}${inviter} invites you to request access to ${community}.`;

  return {
    title,
    description,
    imageUrl: frontendUrl("/gsn-community-invitation-poster.png"),
    targetUrl: frontendUrl(pathname, search),
  };
}

function metaTags(meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const imageUrl = escapeHtml(meta.imageUrl);
  const targetUrl = escapeHtml(meta.targetUrl);

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${targetUrl}" />`,
    `<meta property="og:site_name" content="Global Support Network" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:image:secure_url" content="${imageUrl}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:url" content="${targetUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
  ].join("\n    ");
}

async function indexHtmlWithMeta(meta) {
  const indexHtml = await fs.readFile(indexPath, "utf8");
  const cleaned = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<meta\s+name="description"[\s\S]*?>/gi, "")
    .replace(/\s*<link\s+rel="canonical"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+(?:property|name)="(?:og|twitter):[\s\S]*?>/gi, "");

  return cleaned.replace("</head>", `    ${metaTags(meta)}\n  </head>`);
}

async function serveShopHtml(res, gmfnId, searchParams) {
  let meta = fallbackShopMeta(
    gmfnId,
    searchParams.get("product_id") || "",
    searchParams.get("block") || ""
  );

  try {
    meta = await fetchShopMeta(
      gmfnId,
      searchParams.get("product_id") || "",
      searchParams.get("block") || ""
    );
  } catch {
    // Keep social previews shop-shaped even when the public API lookup times out.
  }

  try {
    const html = await indexHtmlWithMeta(meta);
    send(res, 200, html, "text/html; charset=utf-8", {
      "Cache-Control": "public, max-age=300",
    });
  } catch {
    createReadStream(indexPath).pipe(writeHead(res, 200, "text/html; charset=utf-8"));
  }
}

async function serveJoinInviteHtml(res, url) {
  try {
    const html = await indexHtmlWithMeta(
      joinInviteMeta(url.searchParams, url.pathname, url.search)
    );
    send(res, 200, html, "text/html; charset=utf-8", {
      "Cache-Control": "public, max-age=300",
    });
  } catch {
    createReadStream(indexPath).pipe(writeHead(res, 200, "text/html; charset=utf-8"));
  }
}

async function serveShareCardProxy(res, gmfnId, searchParams) {
  try {
    const url = new URL(apiUrl(`/share/shop/${encodeURIComponent(gmfnId)}/card.png`));
    for (const key of ["product_id", "block"]) {
      const value = searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: { accept: "image/png" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Preview card failed: ${response.status}`);

    const bytes = Buffer.from(await response.arrayBuffer());
    send(res, 200, bytes, "image/png", {
      "Cache-Control": "public, max-age=300",
    });
  } catch {
    const fallback = path.join(distRoot, "gsn-share-poster.png");
    if (existsSync(fallback)) {
      createReadStream(fallback).pipe(writeHead(res, 200, "image/png"));
      return;
    }
    send(res, 404, "Preview card unavailable", "text/plain; charset=utf-8");
  }
}

function writeHead(res, status, contentType, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  return res;
}

function send(res, status, body, contentType, extraHeaders = {}) {
  writeHead(res, status, contentType, extraHeaders);
  res.end(body);
}

function welcomeShouldRedirectToCover(url) {
  const entryFrom = String(url.searchParams.get("entry_from") || "")
    .trim()
    .toLowerCase();
  return url.pathname === "/welcome" && entryFrom !== "cover";
}

function coverRedirectLocation(url) {
  const params = new URLSearchParams(url.searchParams);
  params.delete("entry_from");
  const search = params.toString();
  return `/cover${search ? `?${search}` : ""}`;
}

function safeStaticPath(urlPathname) {
  try {
    const decoded = decodeURIComponent(urlPathname);
    const target = path.normalize(path.join(distRoot, decoded));
    return target.startsWith(distRoot) ? target : "";
  } catch {
    return "";
  }
}

async function serveStaticOrFallback(res, urlPathname) {
  const target = safeStaticPath(urlPathname);
  if (target && existsSync(target)) {
    const stat = await fs.stat(target);
    if (stat.isFile()) {
      const contentType = mimeTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream";
      createReadStream(target).pipe(writeHead(res, 200, contentType, {
        "Cache-Control": urlPathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=300",
      }));
      return;
    }
  }
  createReadStream(indexPath).pipe(writeHead(res, 200, "text/html; charset=utf-8"));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", publicFrontendOrigin);
    if (welcomeShouldRedirectToCover(url)) {
      send(res, 302, "Redirecting to GSN Cover", "text/plain; charset=utf-8", {
        Location: coverRedirectLocation(url),
        "Cache-Control": "no-store",
      });
      return;
    }

    const match = url.pathname.match(/^\/shop\/([^/]+)(?:\/share-card\.png)?$/);
    if (match && url.pathname.endsWith("/share-card.png")) {
      await serveShareCardProxy(res, decodeURIComponent(match[1]), url.searchParams);
      return;
    }
    if (match) {
      await serveShopHtml(res, decodeURIComponent(match[1]), url.searchParams);
      return;
    }
    const joinMatch = url.pathname.match(/^\/(?:start\/join|start\/invite|join|get-invite|join\/community)\/([^/]+)$/);
    if (joinMatch) {
      await serveJoinInviteHtml(res, url);
      return;
    }
    await serveStaticOrFallback(res, url.pathname);
  } catch {
    send(res, 500, "GSN frontend server error", "text/plain; charset=utf-8");
  }
}).listen(Number(process.env.PORT || 4173), "0.0.0.0");
