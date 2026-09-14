/* global console, document, getComputedStyle, HTMLInputElement, localStorage, location, Node, process, URL, window */

import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

function apiPathFrom(urlText) {
  const url = new URL(urlText);
  if (url.pathname.startsWith("/api/")) return url.pathname.replace(/^\/api/, "");
  return url.pathname;
}

function isApiRequest(urlText) {
  const url = new URL(urlText);
  const prefixes = [
    "/api/",
    "/auth/",
    "/clans/",
    "/community-confirmations",
    "/community-domains",
    "/community-meetings",
    "/dashboard",
    "/identity",
    "/loans",
    "/marketplace",
    "/merchant",
    "/notifications",
    "/payment-instructions",
    "/pool",
    "/protected-trades",
    "/rosca",
    "/trust",
    "/trust-slips",
  ];

  return (
    url.port === "8000" ||
    prefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix))
  );
}

const me = {
  id: 216,
  user_id: 216,
  display_name: "Audit Member",
  name: "Audit Member",
  email: "audit-member@gsn.local",
  gmfn_id: "GMFN-U-TRUST-QC",
  gsn_id: "GMFN-U-TRUST-QC",
  role: "admin",
  phone: "+2348012345678",
  phone_verified: true,
  status: "active",
  identity_verified: true,
  official_id_recorded: true,
  identity_photo_recorded: true,
  bank_details_recorded: true,
};

const clan = {
  id: 8,
  clan_id: 8,
  name: "Homeland isa Marketplace",
  display_name: "Homeland isa Marketplace",
  community_name: "Homeland isa Marketplace",
  marketplace_name: "Homeland isa Marketplace",
  clan_code: "GMFN-C-TRUST-QC",
  community_code: "GMFN-C-TRUST-QC",
  gmfn_id: "GMFN-C-TRUST-QC",
  role: "admin",
  member_role: "admin",
  member_count: 18,
  public_shop_count: 2,
  trust_band: "B",
  status: "active",
};

const trustSlip = {
  id: 401,
  user_id: 216,
  holder_id: 216,
  verified: true,
  active: true,
  status: "active",
  code: "TS-TRUST-QC",
  verification_code: "TS-TRUST-QC",
  public_code: "TS-TRUST-QC",
  public_verify_url: "/t/TS-TRUST-QC",
  display_name: "Audit Member",
  holder_name: "Audit Member",
  gmfn_id: "GMFN-U-TRUST-QC",
  gsn_id: "GMFN-U-TRUST-QC",
  community: "Homeland isa Marketplace",
  community_name: "Homeland isa Marketplace",
  community_id: "GMFN-C-TRUST-QC",
  level: "B",
  band: "B",
  trust_band: "B",
  open_trust_class: "B",
  cross_community_integrity_class: "B",
  trust_score: 72,
  standing_score: 72,
  cci_score: 0.72,
  cci_band: "B",
  issued_at: "2026-09-14T09:00:00Z",
  expires_at: "2026-09-21T09:00:00Z",
  phone_recorded: true,
  phone_verified: true,
  bank_details_recorded: true,
  bank_verified: false,
  official_id_recorded: true,
  official_id_verified: false,
  photo_recorded: true,
  identity_verified: true,
  community_identity_confirmed: true,
  community_identity_label: "Active community evidence recorded",
  membership_currentness_label: "Current",
  membership_currentness_scope: "Recorded membership is active in the selected community.",
  identity_context: {
    phone_recorded: true,
    phone_verified: true,
    bank_details_recorded: true,
    official_id_recorded: true,
    photo_recorded: true,
    identity_verified: true,
    community_identity_confirmed: true,
    identity_status_label: "Identity evidence recorded",
    profile_image_url: "",
  },
  identity_evidence_summary: {
    score: 76,
    label: "Identity evidence recorded",
    phone: "Verified",
    bank: "Recorded",
    official_id: "Recorded",
    photo: "Recorded",
  },
  recent_events: [
    { id: 1, type: "community_joined", label: "Community joined", created_at: "2026-09-12T10:00:00Z" },
    { id: 2, type: "shop_visible", label: "Shop visible", created_at: "2026-09-13T11:00:00Z" },
  ],
};

const trustWhy = {
  user_id: 216,
  current_score: 72,
  score: 72,
  band: "B",
  latest_reason: "Current community evidence remains visible.",
  recent_events: trustSlip.recent_events,
  breakdown: {
    identity: 76,
    membership: 70,
    activity: 68,
    repayment: 0,
  },
};

const trustAnalytics = {
  score: 72,
  band: "B",
  status: "evidence_reading",
  current_reading: "Evidence is usable for a cautious local decision.",
  evidence_mix: [
    { label: "Identity", value: 76, status: "Live" },
    { label: "Community", value: 70, status: "Live" },
    { label: "Trade", value: 0, status: "Next" },
  ],
  timeline: trustSlip.recent_events,
  notes: ["Evidence reading only", "Not a payment, sales, credit, or legal approval"],
};

const communityConfirmation = {
  items: [],
  rows: [],
  open_count: 0,
  pending_count: 0,
  summary: "No active confirmation request in this audit fixture.",
};

function payloadFor(path) {
  if (path === "/auth/me" || path === "/users/me") return me;
  if (path === "/clans/me") return { items: [clan] };
  if (path === "/clans/select" || path === "/clans/select/") return { selected_clan_id: 8 };
  if (/^\/clans\/\d+\/select\/?$/.test(path)) return { selected_clan_id: 8 };
  if (/^\/clans\/\d+\/members/.test(path)) return { items: [{ ...me, clan_id: 8 }] };
  if (/^\/clans\/\d+\/invite-link/.test(path)) return { invite_url: "", code: "" };
  if (path === "/community-domains/my") return { items: [] };
  if (/^\/community-domains/.test(path)) return { items: [], results: [] };
  if (/^\/community-confirmations/.test(path)) return communityConfirmation;
  if (/^\/dashboard/.test(path)) return { community: clan, totals: {}, spotlight: null };
  if (/^\/identity/.test(path)) return { me, trust_slip: trustSlip, communities: [clan], status: "ok" };
  if (/^\/marketplace\/shops\/me/.test(path)) return { shop: null, products: [] };
  if (/^\/marketplace\/shops/.test(path)) return { items: [], shops: [] };
  if (/^\/marketplace\/analytics/.test(path)) return { items: [], results: [], total: 0 };
  if (/^\/marketplace\/requests/.test(path)) return { items: [], requests: [] };
  if (/^\/marketplace/.test(path)) return { items: [], listings: [] };
  if (/^\/merchant/.test(path)) return { item: null, items: [] };
  if (/^\/notifications/.test(path)) return [];
  if (/^\/loans/.test(path) || /^\/borrowing/.test(path)) return { items: [], loans: [] };
  if (/^\/pool\//.test(path)) return { balance: 0, available_balance: 0, items: [] };
  if (/^\/payment-instructions/.test(path)) return { items: [] };
  if (/^\/protected-trades/.test(path)) return { items: [], records: [] };
  if (/^\/rosca/.test(path)) return { items: [], cycles: [] };
  if (path === "/trust/me/why") return trustWhy;
  if (/^\/trust-explainability/.test(path) || /^\/trust_explainability/.test(path)) return trustWhy;
  if (/^\/trust\/analytics/.test(path) || /^\/trust-analytics/.test(path)) return trustAnalytics;
  if (/^\/trust\/timeline/.test(path) || /^\/trust-events/.test(path)) return { items: trustSlip.recent_events, events: trustSlip.recent_events };
  if (/^\/trust-slips\/me\/summary/.test(path)) return trustSlip;
  if (/^\/trust-slips\/me\/decision-pack-accesses/.test(path)) return { items: [] };
  if (/^\/trust-slips\/me\/decision-pack-consent-shares/.test(path)) return { items: [] };
  if (/^\/trust-slips\/me\/decision-pack-evidence/.test(path)) {
    return {
      available: true,
      scope_summary: "Private holder preview available.",
      scope_boundary: "Not public evidence, not approval, not a score.",
      categories: [],
      event_refs: [],
    };
  }
  if (/^\/trust-slips\/me/.test(path)) return trustSlip;
  if (/^\/trust-slips\/verify\//.test(path)) return trustSlip;
  if (/^\/trust/.test(path)) return { score: 72, band: "B", grade: "B", events: trustSlip.recent_events, trust_slip: trustSlip };
  if (/^\/community-meetings/.test(path)) return { meetings: [] };
  return { items: [], results: [], total: 0, status: "ok" };
}

async function mockApi(route) {
  const url = route.request().url();
  if (!isApiRequest(url)) {
    await route.continue();
    return;
  }

  await route.fulfill(json(payloadFor(apiPathFrom(url))));
}

function pageAudit() {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const scrollingElement = document.scrollingElement || document.documentElement;
  const scrollW = scrollingElement.scrollWidth;
  const scrollH = scrollingElement.scrollHeight;
  const overflow = [];
  const crampedText = [];
  const duplicateHeadings = [];

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

  for (const element of Array.from(document.querySelectorAll("body *"))) {
    const styles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (!isVisible(element, rect, styles)) continue;

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
      .slice(0, 120);
    if (!label && !["IMG", "SVG", "CANVAS"].includes(element.tagName)) continue;

    const tag = element.tagName.toLowerCase();
    const hasOwnLabel = Boolean(directText || explicitLabel);
    const isInVisibleVerticalRange = rect.bottom > 0 && rect.top < viewportH;
    const isFullyOffscreen = rect.right <= 0 || rect.left >= viewportW;
    const isUnlabeledSvgPart = ["svg", "g", "path"].includes(tag) && !hasOwnLabel;

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
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }

    const textLength = directText.length;
    const fontSize = Number.parseFloat(styles.fontSize || "16");
    const isAppShell = Boolean(element.closest("[aria-label='Bottom navigation'], [data-app-shell='true']"));
    const narrowWithLongText =
      hasOwnLabel &&
      textLength >= 32 &&
      rect.width < 132 &&
      fontSize >= 14 &&
      isInVisibleVerticalRange &&
      !isAppShell;

    if (narrowWithLongText) {
      crampedText.push({
        tag: element.tagName,
        label,
        width: Math.round(rect.width),
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
    path: location.pathname + location.search + location.hash,
    viewportW,
    viewportH,
    scrollW,
    scrollH,
    horizontalOverflow: scrollW > viewportW + 2,
    overflow: overflow.slice(0, 14),
    crampedText: crampedText.slice(0, 14),
    duplicateHeadings: duplicateHeadings.slice(0, 10),
  };
}

async function collectRouteAudit(page, label) {
  const findings = [];

  function addFindings(result, prefix = "") {
    if (result.horizontalOverflow) {
      findings.push(`${prefix}horizontal overflow: scroll width ${result.scrollW}px on ${result.viewportW}px viewport`);
    }
    if (result.overflow.length > 0) {
      findings.push(`${prefix}visible elements outside viewport: ${JSON.stringify(result.overflow)}`);
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

  if (firstResult.scrollH > firstResult.viewportH * 9) {
    findings.push(`phone surface is too long: ${firstResult.scrollH}px on ${firstResult.viewportH}px viewport`);
  }

  for (const scrollY of positions) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), scrollY);
    await page.waitForTimeout(160);
    const result = await page.evaluate(pageAudit);
    addFindings(result, scrollY > 0 ? `scrollY ${scrollY}: ` : "");
  }

  await page.evaluate(() => window.scrollTo(0, 0));

  return findings.length > 0 ? { label, findings: findings.slice(0, 24) } : null;
}
async function collectPassiveTrustTapAudit(page, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const selector = '[data-gsn-inert-meter="true"], [data-dashboard-passport-feature-status="true"]';
  const before = new URL(page.url());
  const beforePath = before.pathname + before.search + before.hash;
  const targetCount = await page.locator(selector).count();
  const findings = [];

  for (let index = 0; index < Math.min(targetCount, 6); index += 1) {
    const target = page.locator(selector).nth(index);
    const visible = await target.isVisible().catch(() => false);
    if (!visible) continue;

    const labelText = await target
      .evaluate((node) => {
        const aria = node.getAttribute("aria-label") || "";
        const text = node.textContent || "";
        return (aria || text).replace(/\s+/g, " ").trim().slice(0, 80);
      })
      .catch(() => `passive target ${index + 1}`);

    await target.tap({ timeout: 2500 }).catch(async () => {
      await target.click({ timeout: 2500, force: true });
    });
    await page.waitForTimeout(160);

    const after = new URL(page.url());
    const afterPath = after.pathname + after.search + after.hash;
    if (afterPath !== beforePath) {
      findings.push(`passive trust status tap navigated from ${beforePath} to ${afterPath}: ${labelText}`);
      await page.goto(before.href, { waitUntil: "networkidle", timeout: 30000 });
    }
  }

  return findings.length > 0 ? { label, findings } : null;
}
const routeChecks = [
  {
    label: "Dashboard Trust Passport status",
    path: "/app/dashboard",
    selector: '[data-dashboard-passport-reference="gsn-trust-card"]',
  },
  {
    label: "Identity Integrity",
    path: "/app/identity",
    selector: '[data-gsn-identity-card="true"], [data-identity-integrity-front-package="true"]',
  },
  {
    label: "Trust Passport",
    path: "/app/trust",
    selector: '[data-trust-passport-decision-first="one-answer-four-facts"]',
  },
  {
    label: "TrustSlip holder",
    path: "/app/trust-slip",
    selector: '[data-gsn-trust-document-certificate="trustslip-holder"], [data-gsn-trustslip-setup-only="true"]',
  },
  {
    label: "Open Trust Reading",
    path: "/app/open-trust-reading",
    selector: 'main, [data-page-shell="open-trust-reading"]',
  },
  {
    label: "CCI Reading",
    path: "/app/cci-reading",
    selector: 'main, [data-page-shell="cci-reading"]',
  },
  {
    label: "Trust Timeline",
    path: "/app/trust-timeline",
    selector: 'main, [data-page-shell="trust-timeline"]',
  },
  {
    label: "Trust Analytics",
    path: "/app/command-center/trust-analytics",
    selector: 'main, [data-page-shell="trust-analytics"]',
  },
  {
    label: "Trust Command Center",
    path: "/app/command-center",
    selector: "main",
  },
  {
    label: "Admin Trust Events",
    path: "/app/command-center/trust-events",
    selector: "main",
  },
  {
    label: "Admin Identity Risk",
    path: "/app/command-center/identity-risk",
    selector: "main",
  },
  {
    label: "System Operations",
    path: "/app/command-center/system-operations",
    selector: "main",
  },
  {
    label: "Admin Trust Graph",
    path: "/app/command-center/trust-graph",
    selector: "main",
  },
  {
    label: "Community Confirmation Inbox",
    path: "/app/community-confirmations",
    selector: "main",
  },
  {
    label: "Community Confirmation Policy",
    path: "/app/community-confirmations/policy",
    selector: "main",
  },
];

const server = await createServer({
  root: frontendRoot,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});

await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

try {
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error(`Browser console error: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.error(`Browser page error: ${error.message}`);
  });
  await page.route("**/*", mockApi);
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "trust-infrastructure-qc-token");
    localStorage.setItem("gmfn_auth_token", "trust-infrastructure-qc-token");
    localStorage.setItem("token", "trust-infrastructure-qc-token");
    localStorage.setItem("gmfn_current_id", "GMFN-U-TRUST-QC");
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.setItem("selected_clan_id", "8");
    localStorage.setItem("gmfn_companion_settings_local", JSON.stringify({ companionMode: "off" }));
    localStorage.removeItem("gmfn.commandCenter.sections.v2");
    localStorage.removeItem("gmfn.trustAnalytics.sections.v2");
    localStorage.removeItem("gmfn.systemOperations.sections.v2");
    localStorage.removeItem("gmfn.trustGraph.sections.v2");
  });

  const findings = [];

  for (const routeCheck of routeChecks) {
    await page.goto(`${baseUrl}${routeCheck.path}`, { waitUntil: "networkidle", timeout: 30000 });
    try {
      await page.locator(routeCheck.selector).first().waitFor({ state: "visible", timeout: 20000 });
    } catch (error) {
      const visibleText = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
      throw new Error(
        `Expected ${routeCheck.label} selector ${routeCheck.selector} on ${page.url()}, but it did not appear. Body text: ${visibleText.replace(/\\s+/g, " ").slice(0, 500)}`,
        { cause: error }
      );
    }
    await page.waitForTimeout(450);
    const routeFinding = await collectRouteAudit(page, routeCheck.label);
    if (routeFinding) findings.push(routeFinding);
    const passiveTapFinding = await collectPassiveTrustTapAudit(page, routeCheck.label);
    if (passiveTapFinding) findings.push(passiveTapFinding);
  }

  if (findings.length > 0) {
    console.error("Trust infrastructure mobile visual audit found review items:");
    for (const finding of findings) {
      console.error(`- ${finding.label}`);
      for (const item of finding.findings) console.error(`  ${item}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Trust infrastructure mobile visual audit passed.");
  }
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
