/* global console, document, getComputedStyle, HTMLInputElement, localStorage, location, Node, process, URL, window */

import { chromium } from "@playwright/test";

const baseUrl = process.env.GSN_AUDIT_BASE_URL || "http://127.0.0.1:5180";

const routes = [
  "/cover",
  "/login",
  "/join-approval/8",
  "/activate-membership?request_id=8&gsn_id=GMFN-U-0B5A2953",
  "/join",
  "/create",
  "/pending-approval?request_id=8",
  "/app/dashboard",
  "/app/community",
  "/app/marketplace",
  "/app/shop-control",
  "/app/finance",
  "/app/trust-passport",
  "/app/loans",
  "/app/payment/loans/1",
];

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

function isApiRequest(url) {
  const parsed = new URL(url);
  const apiPathPrefixes = [
    "/api/",
    "/auth/",
    "/clans/",
    "/entry/",
    "/marketplace",
    "/dashboard",
    "/loans",
    "/borrowing",
    "/notifications",
    "/identity",
    "/trust",
    "/finance",
  ];

  return (
    url.includes("localhost:8000") ||
    url.includes("127.0.0.1:8000") ||
    apiPathPrefixes.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix))
  );
}

async function mockApi(route) {
  const url = route.request().url();

  if (!isApiRequest(url)) {
    await route.continue();
    return;
  }

  if (url.includes("/auth/login")) {
    await route.fulfill(
      json({
        access_token: "audit-token",
        token_type: "bearer",
        user: {
          id: 1,
          email: "audit@gsn.local",
          gsn_id: "GMFN-U-0B5A2953",
        },
      })
    );
    return;
  }

  if (url.includes("/auth/me") || url.includes("/users/me")) {
    await route.fulfill(
      json({
        id: 1,
        email: "audit@gsn.local",
        name: "Audit Member",
        gsn_id: "GMFN-U-0B5A2953",
        gmfn_id: "GMFN-U-0B5A2953",
        status: "active",
        role: "member",
      })
    );
    return;
  }

  if (url.includes("/clans/me")) {
    await route.fulfill(
      json({
        items: [
          {
            id: 1,
            clan_id: 1,
            name: "Homeland isa",
            status: "active",
            role: "admin",
            member_role: "admin",
            marketplace_name: "Homeland isa Marketplace",
          },
        ],
      })
    );
    return;
  }

  if (url.includes("/join-requests/8") || url.includes("/membership-requests/8")) {
    await route.fulfill(
      json({
        id: 8,
        request_id: 8,
        status: "approved",
        community: "Homeland isa",
        community_name: "Homeland isa",
        market_name: "Homeland isa Marketplace",
        gsn_id: "GMFN-U-0B5A2953",
        current_step: "Activation ready",
      })
    );
    return;
  }

  if (url.includes("/communities")) {
    await route.fulfill(json([{ id: 1, name: "Homeland isa", status: "active", role: "owner" }]));
    return;
  }

  if (url.includes("/dashboard")) {
    await route.fulfill(json({ community: { id: 1, name: "Homeland isa" }, totals: {}, spotlight: null }));
    return;
  }

  if (url.includes("/marketplace")) {
    await route.fulfill(json({ items: [], listings: [] }));
    return;
  }

  if (url.includes("/loans") || url.includes("/borrowing")) {
    await route.fulfill(json({ items: [], loans: [] }));
    return;
  }

  if (url.includes("/notifications")) {
    await route.fulfill(json([]));
    return;
  }

  await route.fulfill(json({ items: [], results: [], data: [] }));
}

function pageAudit() {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const scrollingElement = document.scrollingElement || document.documentElement;
  const scrollW = scrollingElement.scrollWidth;
  const scrollH = scrollingElement.scrollHeight;

  function parseColor(value) {
    const match = String(value || "").match(/rgba?\(([^)]+)\)/);
    if (!match) return null;

    const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      a: parts.length > 3 ? parts[3] : 1,
    };
  }

  function luminance(color) {
    const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(first, second) {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function isVisible(element, rect, styles) {
    return (
      rect.width > 2 &&
      rect.height > 2 &&
      styles.display !== "none" &&
      styles.visibility !== "hidden" &&
      Number(styles.opacity || 1) > 0.05
    );
  }

  function isInHorizontalScroller(element) {
    let node = element.parentElement;

    while (node && node !== document.body) {
      const styles = getComputedStyle(node);
      const overflowX = styles.overflowX;
      if (
        (overflowX === "auto" || overflowX === "scroll") &&
        node.scrollWidth > node.clientWidth + 2
      ) {
        return true;
      }
      node = node.parentElement;
    }

    return false;
  }

  function backgroundFor(element) {
    let node = element;

    while (node && node.nodeType === 1) {
      const styles = getComputedStyle(node);
      if (styles.backgroundImage && styles.backgroundImage !== "none") return null;

      const color = parseColor(styles.backgroundColor);
      if (color && color.a > 0.35) return color;
      node = node.parentElement;
    }

    return parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  }

  const overflow = [];
  const lowContrast = [];
  const oversized = [];

  for (const element of Array.from(document.querySelectorAll("body *"))) {
    const styles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    if (!isVisible(element, rect, styles)) continue;

    const hiddenFromA11y = element.getAttribute("aria-hidden") === "true";
    const directText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const explicitLabel =
      element.getAttribute("aria-label") ||
      element.getAttribute("placeholder") ||
      (element instanceof HTMLInputElement ? element.value : "");
    const label = (directText || explicitLabel || element.tagName)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 90);

    if (!label && !["IMG", "SVG", "CANVAS"].includes(element.tagName)) continue;

    const isFullyOffscreen = rect.right <= 0 || rect.left >= viewportW;
    const isInVisibleVerticalRange = rect.bottom > 0 && rect.top < viewportH;
    const hasOwnLabel = Boolean(directText || explicitLabel);
    const isUnlabeledSvgPart = ["svg", "g", "path"].includes(element.tagName.toLowerCase()) && !hasOwnLabel;
    if (
      (rect.left < -8 || rect.right > viewportW + 8) &&
      !isFullyOffscreen &&
      isInVisibleVerticalRange &&
      !isInHorizontalScroller(element) &&
      !isUnlabeledSvgPart
    ) {
      overflow.push({
        tag: element.tagName,
        label,
        className: typeof element.className === "string" ? element.className : "",
        style: element.getAttribute("style")?.slice(0, 160) || "",
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }

    const isWrapper = ["BODY", "MAIN", "SECTION"].includes(element.tagName) || element.children.length > 2;
    const isMedia = ["IMG", "SVG", "CANVAS", "VIDEO"].includes(element.tagName);
    if (!isWrapper && (hasOwnLabel || isMedia) && (rect.height > 300 || rect.width > viewportW + 20)) {
      oversized.push({
        tag: element.tagName,
        label,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
      });
    }

    if (
      hiddenFromA11y ||
      !isInVisibleVerticalRange ||
      element.closest("button:disabled, [aria-disabled='true']") ||
      (!directText && !explicitLabel) ||
      rect.width <= 4 ||
      rect.height <= 4
    ) continue;

    const foreground = parseColor(styles.color);
    const background = backgroundFor(element);
    const fontSize = Number.parseFloat(styles.fontSize || "16");

    if (!foreground || !background || fontSize < 10) continue;

    const ratio = contrast(foreground, background);
    const weight = Number.parseInt(styles.fontWeight || "400", 10);
    const required = fontSize >= 24 || (fontSize >= 18 && weight >= 700) ? 3 : 4.5;

          if (ratio < required && ratio < 3) {
      lowContrast.push({
        tag: element.tagName,
        label,
        ratio: Number(ratio.toFixed(2)),
        font: Math.round(fontSize),
        top: Math.round(rect.top),
      });
    }
  }

  return {
    path: location.pathname + location.search,
    viewportW,
    viewportH,
    scrollW,
    scrollH,
    horizontalOverflow: scrollW > viewportW + 2,
    overflow: overflow.slice(0, 12),
    lowContrast: lowContrast.slice(0, 14),
    oversized: oversized.slice(0, 12),
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

await page.route("**/*", mockApi);
await page.addInitScript(() => {
  localStorage.setItem("access_token", "audit-token");
  localStorage.setItem("gmfn_auth_token", "audit-token");
  localStorage.setItem("token", "audit-token");
  localStorage.setItem("gmfn_current_id", "GMFN-U-0B5A2953");
  localStorage.setItem("gmfn_selected_clan_id", "1");
  localStorage.setItem("selected_clan_id", "1");
});

const findings = [];

for (const route of routes) {
  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(700);
    const result = await page.evaluate(pageAudit);

    const routeFindings = [];
    if (result.horizontalOverflow) {
      routeFindings.push(`horizontal overflow: scroll width ${result.scrollW}px on ${result.viewportW}px viewport`);
    }
    if (result.overflow.length > 0) {
      routeFindings.push(`visible elements outside viewport: ${JSON.stringify(result.overflow)}`);
    }
    if (result.lowContrast.length > 0) {
      routeFindings.push(`possible low contrast text: ${JSON.stringify(result.lowContrast)}`);
    }
    if (result.oversized.length > 0) {
      routeFindings.push(`large visible blocks to review: ${JSON.stringify(result.oversized)}`);
    }

    if (routeFindings.length > 0) {
      findings.push({ route, routeFindings });
    }
  } catch (error) {
    findings.push({ route, routeFindings: [`render failed: ${error.message}`] });
  }
}

await browser.close();

if (findings.length > 0) {
  console.error("Mobile visual sweep found review items:");
  for (const finding of findings) {
    console.error(`- ${finding.route}`);
    for (const item of finding.routeFindings) {
      console.error(`  ${item}`);
    }
  }
  process.exit(1);
}

console.log("Mobile visual sweep passed.");
