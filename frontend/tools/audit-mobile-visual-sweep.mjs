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
  "/app/demand-box?queue=open",
  "/app/notifications",
  "/app/shop-control",
  "/app/shop-assets",
  "/app/vault-control",
  "/app/finance",
  "/app/trust-passport",
  "/app/trust-slip",
  "/app/identity",
  "/app/open-trust-reading",
  "/app/cci-reading",
  "/app/trust-timeline",
  "/app/community-confirmations",
  "/app/community-confirmations/policy",
  "/app/loans",
  "/app/payment/loans/1",
  "/app/command-center",
  "/app/command-center/trust-analytics",
  "/app/command-center/trust-events",
  "/app/command-center/identity-risk",
  "/app/command-center/system-operations",
  "/app/command-center/trust-graph",
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
    "/community-confirmations",
    "/community-domains",
    "/merchant",
    "/marketplace",
    "/dashboard",
    "/loans",
    "/borrowing",
    "/notifications",
    "/identity",
    "/trust",
    "/finance",
    "/payment-instructions",
    "/pool",
    "/protected-trades",
    "/rosca",
    "/trust-slips",
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
        role: "admin",
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

  if (url.includes("/marketplace/requests")) {
    await route.fulfill(
      json([
        {
          id: 301,
          request_id: 301,
          clan_id: 1,
          requester_user_id: 2,
          title: "Food items",
          body: "Few food items available for those who might need it.",
          status: "open",
          created_at: "2026-09-14T10:00:00Z",
          tags: ["food", "local-need"],
          queue_keys: ["open"],
        },
        {
          id: 302,
          request_id: 302,
          clan_id: 1,
          requester_user_id: 3,
          title: "Vacancies",
          body: "Community work openings people should know about.",
          status: "open",
          created_at: "2026-09-14T10:05:00Z",
          tags: ["work", "local-need"],
          queue_keys: ["open", "ask_community"],
        },
      ])
    );
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


  if (url.includes("/trust-slips")) {
    await route.fulfill(
      json({
        verified: true,
        active: true,
        status: "active",
        code: "TS-MOBILE-QC",
        verification_code: "TS-MOBILE-QC",
        public_verify_url: "/t/TS-MOBILE-QC",
        display_name: "Audit Member",
        gmfn_id: "GMFN-U-0B5A2953",
        gsn_id: "GMFN-U-0B5A2953",
        community: "Homeland isa",
        level: "B",
        band: "B",
        trust_score: 72,
        phone_recorded: true,
        phone_verified: true,
        bank_details_recorded: true,
        official_id_recorded: true,
        photo_recorded: true,
        identity_verified: true,
      })
    );
    return;
  }

  if (url.includes("/community-confirmations")) {
    await route.fulfill(json({ items: [], rows: [], open_count: 0, pending_count: 0 }));
    return;
  }

  if (url.includes("/protected-trades") || url.includes("/rosca")) {
    await route.fulfill(json({ items: [], records: [], cycles: [] }));
    return;
  }

  if (url.includes("/payment-instructions") || url.includes("/pool")) {
    await route.fulfill(json({ items: [], balance: 0, available_balance: 0 }));
    return;
  }

  await route.fulfill(json({ items: [], results: [], data: [], records: [] }));
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
  const crampedText = [];
  const duplicateHeadings = [];

  for (const element of Array.from(document.querySelectorAll("body *"))) {
    const styles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    if (!isVisible(element, rect, styles)) continue;

    const hiddenFromA11y = Boolean(element.closest("[aria-hidden='true'], [data-gsn-visual-decor='true']"));
    if (hiddenFromA11y) continue;
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

    const textLength = directText.length;
    const isAppShell = Boolean(element.closest("[aria-label='Bottom navigation'], [data-app-shell='true']"));
    const narrowWithLongText =
      hasOwnLabel &&
      textLength >= 32 &&
      rect.width < 132 &&
      Number.parseFloat(styles.fontSize || "16") >= 14 &&
      isInVisibleVerticalRange &&
      !isAppShell;

    if (narrowWithLongText) {
      crampedText.push({
        tag: element.tagName,
        label,
        width: Math.round(rect.width),
        font: Math.round(Number.parseFloat(styles.fontSize || "16")),
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

  const headingCounts = new Map();
  for (const heading of Array.from(document.querySelectorAll("h1, h2, h3, [data-gsn-major-block='true']"))) {
    const styles = getComputedStyle(heading);
    const rect = heading.getBoundingClientRect();
    if (!isVisible(heading, rect, styles)) continue;

    const text = (heading.textContent || "").replace(/\s+/g, " ").trim();
    if (!text || text.length < 10) continue;
    const normalized = text.toLowerCase();
    headingCounts.set(normalized, (headingCounts.get(normalized) || 0) + 1);
  }

  for (const [heading, count] of headingCounts.entries()) {
    if (count > 1) {
      duplicateHeadings.push({ heading, count });
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
    crampedText: crampedText.slice(0, 12),
    duplicateHeadings: duplicateHeadings.slice(0, 10),
  };
}

async function collectRouteFindings(page) {
  const findings = [];

  function addFindings(result, prefix = "") {
    if (result.horizontalOverflow) {
      findings.push(`${prefix}horizontal overflow: scroll width ${result.scrollW}px on ${result.viewportW}px viewport`);
    }
    if (result.overflow.length > 0) {
      findings.push(`${prefix}visible elements outside viewport: ${JSON.stringify(result.overflow)}`);
    }
    if (result.lowContrast.length > 0) {
      findings.push(`${prefix}possible low contrast text: ${JSON.stringify(result.lowContrast)}`);
    }
    if (result.oversized.length > 0) {
      findings.push(`${prefix}large visible blocks to review: ${JSON.stringify(result.oversized)}`);
    }
    if (result.crampedText.length > 0) {
      findings.push(`${prefix}narrow long text: ${JSON.stringify(result.crampedText)}`);
    }
    if (result.duplicateHeadings.length > 0) {
      findings.push(`${prefix}duplicate visible headings: ${JSON.stringify(result.duplicateHeadings)}`);
    }
  }

  const firstResult = await page.evaluate(pageAudit);
  const maxScrollY = Math.max(0, firstResult.scrollH - firstResult.viewportH);
  const positions = Array.from(
    new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxScrollY * ratio)))
  );

  for (const scrollY of positions) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), scrollY);
    await page.waitForTimeout(160);
    const result = await page.evaluate(pageAudit);
    addFindings(result, scrollY > 0 ? `scrollY ${scrollY}: ` : "");
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  return findings.slice(0, 24);
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
    const routeFindings = await collectRouteFindings(page);

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
