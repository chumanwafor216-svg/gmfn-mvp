/* global console, document, getComputedStyle, HTMLInputElement, localStorage, location, Node, process, URL, window */

import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const shopControlSource = readFileSync(join(frontendRoot, "src/pages/ShopControlPage.tsx"), "utf8");

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
    "/community-domains",
    "/community-meetings",
    "/dashboard",
    "/identity",
    "/loans",
    "/marketplace",
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
  display_name: "Audit Owner",
  name: "Audit Owner",
  email: "audit-owner@gsn.local",
  gmfn_id: "GMFN-U-SHOP-QC",
  gsn_id: "GMFN-U-SHOP-QC",
  role: "member",
  phone_verified: true,
  status: "active",
};

const clan = {
  id: 8,
  clan_id: 8,
  name: "Homeland isa Marketplace",
  display_name: "Homeland isa Marketplace",
  community_name: "Homeland isa Marketplace",
  marketplace_name: "Homeland isa Marketplace",
  clan_code: "GMFN-C-SHOP-QC",
  community_code: "GMFN-C-SHOP-QC",
  gmfn_id: "GMFN-C-SHOP-QC",
  role: "admin",
  member_role: "admin",
  member_count: 18,
  public_shop_count: 2,
  trust_band: "B",
};

const shop = {
  id: 101,
  shop_id: 101,
  owner_id: 216,
  user_id: 216,
  clan_id: 8,
  name: "Audit Community Shop",
  title: "Audit Community Shop",
  description: "Public shelf ready for local evidence review.",
  visibility_mode: "community_visible",
  is_active: true,
  status: "active",
  shop_product_slots_total: 12,
  public_product_count: 12,
};

const products = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  product_id: index + 1,
  shop_id: 101,
  clan_id: 8,
  title: `Public item ${index + 1}`,
  name: `Public item ${index + 1}`,
  price: "1000.00",
  currency: "NGN",
  is_active: true,
  visibility_mode: "community_visible",
  shop_product_slot_number: index + 1,
  shop_product_slots_total: 12,
}));

const demandRows = [
  {
    id: 301,
    request_id: 301,
    clan_id: 8,
    requester_user_id: 310,
    title: "Food items",
    body: "Few food items available for those who might need it.",
    status: "open",
    created_at: "2026-09-14T10:00:00Z",
    tags: ["food", "local-need"],
  },
  {
    id: 302,
    request_id: 302,
    clan_id: 8,
    requester_user_id: 311,
    title: "Vacancies",
    body: "Community work openings people should know about.",
    status: "open",
    created_at: "2026-09-14T10:05:00Z",
    tags: ["work", "local-need"],
  },
];

const attentionSummary = {
  periods: {
    last_7_days: {
      shop_visits: 7,
      unique_visitors: 7,
      product_opens: 3,
      contact_taps: 0,
      spotlight_impressions: 106,
      spotlight_shop_clicks: 11,
    },
  },
  spotlight: {
    possible_member_reach: 18,
  },
  followers: {
    follower_count: 1,
  },
  follower_notifications: {
    last_7_days: 1,
    year_to_date: 1,
    boundary_label: "Attention only",
    delivery_label: "Follower notice",
    by_kind: [{ kind: "shop_update", count: 1 }],
  },
  follower_notification_response: {
    shop_visits: 0,
    unique_visitors: 0,
    product_opens: 0,
    contact_taps: 0,
    boundary_label: "No response yet",
    by_kind: [],
  },
  share_actions: {
    last_7_days: 0,
    boundary_label: "Not started",
    by_channel: [],
  },
  share_response: {
    shop_visits: 0,
    unique_visitors: 0,
    product_opens: 0,
    contact_taps: 0,
    boundary_label: "No shared-link response yet",
    by_channel: [],
  },
  recommendation_actions: {
    last_7_days: 0,
    boundary_label: "No recommendation action yet",
    by_action: [],
  },
  trade_outcomes: {
    last_7_days: 0,
    shop_linked_records: 0,
    seller_side_records: 0,
    released_records: 0,
    payment_claimed_or_recorded: 0,
    receipt_confirmed: 0,
    dispute_records: 0,
    unresolved_records: 0,
    boundary_label: "Evidence only",
    count_method: "protected records",
    recent_records: [],
  },
  daily_activity: [
    { date: "2026-09-08", visitors: 0, visits: 0 },
    { date: "2026-09-09", visitors: 1, visits: 1 },
    { date: "2026-09-10", visitors: 0, visits: 0 },
    { date: "2026-09-11", visitors: 2, visits: 2 },
    { date: "2026-09-12", visitors: 1, visits: 1 },
    { date: "2026-09-13", visitors: 1, visits: 1 },
    { date: "2026-09-14", visitors: 2, visits: 2 },
  ],
  source_breakdown: [
    { source: "spotlight", label: "Spotlight", visitors: 7, visits: 11, product_opens: 3, contact_taps: 0 },
    { source: "shared_link", label: "Shared links", visitors: 0, visits: 0, product_opens: 0, contact_taps: 0 },
  ],
  opportunity_engine: {
    aggregator_ready: false,
    engine_state: "computed_owner_summary",
    live_signal_count: 5,
    signal_group_count: 6,
    boundary_label: "Snapshot only: not an automatic decision, sales proof, public trend claim or command to change products.",
    count_method: "owner summary",
    snapshot: {
      title: "Current evidence snapshot",
      headline: "5 of 6 owner-summary signal groups are live.",
      evidence: "Marketplace and DemandBox signals exist, but trade evidence is not complete.",
      next_step: "Record promotion cost before comparing business return.",
    },
    signal_groups: [
      { key: "shop", label: "Shop and marketplace", status: "Live", count: 12, evidence: "12 public items" },
      { key: "spotlight", label: "Spotlight", status: "Live", count: 106, evidence: "106 seen" },
      { key: "demand", label: "DemandBox", status: "Live", count: 2, evidence: "2 open needs" },
      { key: "community", label: "Community context", status: "Live", count: 1, evidence: "Selected community" },
      { key: "trade", label: "Trade evidence", status: "Next", count: 0, evidence: "No protected trade record" },
      { key: "outside", label: "Governance and outside context", status: "Next", count: 0, evidence: "Not connected" },
    ],
    unit_economics_readiness: {
      title: "Business return readiness",
      status: "Partial",
      summary: "You can see attention. You cannot measure return yet.",
      cac_side: "Promotion evidence exists, but cost and effort are missing.",
      ltv_side: "Outcome evidence is missing.",
      current_evidence: ["7 visitors", "3 product opens", "1 follower"],
      missing_evidence: ["Promotion cost", "Completed outcomes", "Repeat purchases", "Retention"],
      next_step: "Record cost or effort, then link protected outcome evidence.",
      boundary: "Readiness only: not return, profit or investor-grade evidence.",
    },
    evidence_ledger: [
      { source: "Marketplace and Shop Diary", status: "Live", records: 12, reads: "Public shop shelf is ready", privacy_boundary: "Community-scoped reading only" },
      { source: "DemandBox", status: "Live", records: 2, reads: "Two open local needs", privacy_boundary: "Context only" },
    ],
    measurement_plan: [
      { step: "Record cost", metric: "Promotion cost", currently_available: false, reads: "Cost is missing", owner_action: "Record cost or effort", boundary: "Not a profit claim" },
      { step: "Link outcome", metric: "Outcome evidence", currently_available: false, reads: "Outcome is missing", owner_action: "Use Protected Trade or TrustSlip", boundary: "Not automatic trust approval" },
    ],
    experiment_plan: [
      { title: "Share once", trigger: "Low distribution", hypothesis: "One clear share may increase visitors", metric: "Visitors", owner_action: "Share shop", review_window: "7 days", success_signal: "More visits", stop_rule: "Do not repeat without learning", boundary: "Experiment only" },
    ],
    capture_checklist: [
      { category: "Promotion cost", status: "Missing", records_now: 0, capture_now: "Record promotion cost", why: "Know what attention cost.", later_source: "Owner diary", boundary: "Not a billing right" },
      { category: "Serious contact", status: "Next", records_now: 0, capture_now: "Link contact activity", why: "Separate curiosity from useful intent.", later_source: "Contact record", boundary: "A tap is not a buyer or payment" },
      { category: "Protected outcome", status: "Next", records_now: 0, capture_now: "Protect an outcome", why: "Connect serious activity to outcome evidence.", later_source: "Protected Trade", boundary: "Evidence is not automatic profit or legal proof" },
      { category: "Outcome value", status: "Missing", records_now: 0, capture_now: "Record outcome value", why: "Learn value over time.", later_source: "Outcome ledger", boundary: "One action cannot define long-term value" },
    ],
    review_cadence: [
      { cadence: "7 days", status: "Live", review_now: "Compare visits and opens", evidence_required: "Fresh attention rows", upgrade_rule: "Wait for repeat signal", boundary: "Guidance, not a guarantee" },
      { cadence: "90 days", status: "Next", review_now: "Compare DemandBox patterns", evidence_required: "Repeated requests", upgrade_rule: "Need repeated evidence", boundary: "Not a market proof" },
    ],
    output_cards: [
      {
        lens: "Demand",
        signal: "Two open needs",
        evidence: "DemandBox requests are visible",
        interpretation: "Repeated requests may reveal demand",
        opportunity: "Compare with public offers",
        risk: "Evidence is still thin",
        time_horizon: "90 days",
        confidence: "low",
        suggested_next_step: "Read DemandBox first",
        human_review: "Owner reviews before acting or publishing.",
      },
    ],
  },
  boundary_note: "Attention and stated need do not prove buyers, sales, payment, delivery, satisfaction or trust.",
};

function payloadFor(path) {
  if (path === "/auth/me" || path === "/users/me") return me;
  if (path === "/clans/me") return { items: [clan] };
  if (path === "/clans/select" || path === "/clans/select/") return { selected_clan_id: 8 };
  if (/^\/clans\/\d+\/select\/?$/.test(path)) return { selected_clan_id: 8 };
  if (/^\/clans\/\d+\/members/.test(path)) return { items: [] };
  if (/^\/clans\/\d+\/invite-link/.test(path)) return { invite_url: "", code: "" };
  if (path === "/community-domains/my") return { items: [] };
  if (/^\/dashboard/.test(path)) return { community: clan, totals: {}, spotlight: null };
  if (/^\/marketplace\/shops\/me/.test(path)) return { item: shop, shop, products };
  if (/^\/marketplace\/products/.test(path)) return { items: products };
  if (/^\/marketplace\/broadcasts/.test(path)) {
    return {
      items: [
        {
          id: 501,
          broadcast_id: 501,
          shop_id: 101,
          clan_id: 8,
          status: "active",
          title: "Shop spotlight",
          created_at: "2026-09-14T09:00:00Z",
          expires_at: "2026-09-21T09:00:00Z",
        },
      ],
    };
  }
  if (/^\/marketplace\/analytics\/shops\/\d+\/summary/.test(path)) return attentionSummary;
  if (/^\/marketplace\/requests/.test(path)) return demandRows;
  if (/^\/marketplace\/shops/.test(path)) return { item: shop, items: [shop], shops: [shop], products };
  if (/^\/marketplace/.test(path)) return { items: [], listings: [] };
  if (/^\/notifications/.test(path)) return [];
  if (/^\/loans/.test(path) || /^\/borrowing/.test(path)) return { items: [], loans: [] };
  if (/^\/pool\//.test(path)) return { balance: 0, available_balance: 0, items: [] };
  if (/^\/payment-instructions/.test(path)) return { items: [] };
  if (/^\/protected-trades/.test(path)) return { items: [], records: [] };
  if (/^\/rosca/.test(path)) return { items: [], cycles: [] };
  if (/^\/trust-slips\/me/.test(path)) {
    return {
      verified: true,
      active: true,
      status: "active",
      code: "TS-SHOP-QC",
      verification_code: "TS-SHOP-QC",
      display_name: "Audit Owner",
      community: "Homeland isa Marketplace",
      level: "B",
      band: "B",
      trust_score: 72,
      phone_recorded: true,
      phone_verified: true,
      public_verify_url: "/t/TS-SHOP-QC",
    };
  }
  if (/^\/trust/.test(path)) return { score: 72, band: "B", grade: "B", events: [] };
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
      .slice(0, 110);
    if (!label && !["IMG", "SVG", "CANVAS"].includes(element.tagName)) continue;

    const isInVisibleVerticalRange = rect.bottom > 0 && rect.top < viewportH;
    const isFullyOffscreen = rect.right <= 0 || rect.left >= viewportW;
    const hasOwnLabel = Boolean(directText || explicitLabel);
    const tag = element.tagName.toLowerCase();
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
        style: element.getAttribute("style")?.slice(0, 180) || "",
      });
    }

    const textLength = directText.length;
    const fontSize = Number.parseFloat(styles.fontSize || "16");
    const narrowWithLongText =
      hasOwnLabel &&
      textLength >= 28 &&
      rect.width < 130 &&
      fontSize >= 14 &&
      isInVisibleVerticalRange &&
      !element.closest("[aria-label='Bottom navigation']");

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
    path: location.pathname + location.search,
    viewportW,
    viewportH,
    scrollW,
    scrollH,
    horizontalOverflow: scrollW > viewportW + 2,
    overflow: overflow.slice(0, 12),
    crampedText: crampedText.slice(0, 12),
    duplicateHeadings: duplicateHeadings.slice(0, 10),
  };
}

const mainPanels = [
  "key-metrics",
  "view-contact",
  "visitor-activity",
  "trade-outcomes",
  "traffic-sources",
  "market-intelligence",
];

const opportunityPanels = [
  "overview",
  "signals",
  "lenses",
  "wisdom",
  "return-evidence",
  "community-needs",
  "experiments",
];

async function tapDebug(page, debugId) {
  const control = page.locator(`[data-cta-id="${debugId}"], [data-debug-id="${debugId}"]`).first();
  await control.waitFor({ state: "visible", timeout: 15000 });
  await control.scrollIntoViewIfNeeded();
  await control.tap({ timeout: 8000 });
  await page.waitForTimeout(350);
}

async function collectPanelAudit(page, label) {
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

  if (firstResult.scrollH > firstResult.viewportH * 8) {
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

const sourceFindings = [];
function requireSourcePattern(pattern, message) {
  if (!pattern.test(shopControlSource)) {
    sourceFindings.push({ label: "source:shop-control", findings: [message] });
  }
}

requireSourcePattern(
  /function ShopOpportunityLensesVisualPanel[\s\S]*?if \(isCompact\) \{[\s\S]*?gridTemplateColumns: "1fr"[\s\S]*?visual-lens-compact/,
  "Compact Opportunity Lenses must use relaxed one-column rows, not the old narrow two-column mobile cards."
);
requireSourcePattern(
  /function ShopOpportunityReadingVisualPanel[\s\S]*?if \(isCompact\) \{[\s\S]*?gridTemplateColumns: "1fr"[\s\S]*?opportunity-compact-reading-/,
  "Compact Opportunity Reading must use full-width time rows so text does not stack into narrow towers."
);
requireSourcePattern(
  /function ShopBusinessReturnReadinessVisualPanel[\s\S]*?if \(isCompact\) \{[\s\S]*?Return readiness[\s\S]*?Missing: cost, outcomes, repeat value/,
  "Compact Business Return Readiness must use the shortened mobile copy, not the old bridge/island layout."
);
requireSourcePattern(
  /activeOpportunityEnginePanel === "experiments" && isCompact[\s\S]*?<ShopEvidenceCaptureChecklistVisualPanel/,
  "Compact experiments must render the condensed Evidence Checklist visual panel."
);
requireSourcePattern(
  /display: activeOpportunityEnginePanel === "experiments" && !isCompact \? "block" : "none"/,
  "Older detailed experiment blocks must stay hidden on compact screens."
);
requireSourcePattern(
  /display: isCompact \? "none" : "grid"[\s\S]*?opportunityEngineUnitEconomicsReadiness\.currentEvidence/,
  "Detailed return-evidence grids must stay desktop-only so phone pages do not repeat old containers."
);
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
    localStorage.setItem("access_token", "shop-control-analytics-qc-token");
    localStorage.setItem("gmfn_auth_token", "shop-control-analytics-qc-token");
    localStorage.setItem("token", "shop-control-analytics-qc-token");
    localStorage.setItem("gmfn_current_id", "GMFN-U-SHOP-QC");
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.setItem("selected_clan_id", "8");
    localStorage.setItem("gmfn_companion_settings_local", JSON.stringify({ companionMode: "off" }));
  });

  await page.goto(`${baseUrl}/app/shop-control#shop-control-counts`, { waitUntil: "networkidle", timeout: 25000 });
  await page
    .locator('[aria-label="Shop analytics sections"], [data-cta-id="shop-control.analytics-panel.market-intelligence"], [data-debug-id="shop-control.analytics-panel.market-intelligence"]')
    .first()
    .waitFor({ state: "visible", timeout: 20000 });

  const findings = [...sourceFindings];

  for (const panel of mainPanels) {
    await tapDebug(page, `shop-control.analytics-panel.${panel}`);
    const panelFinding = await collectPanelAudit(page, `analytics:${panel}`);
    if (panelFinding) findings.push(panelFinding);
  }

  for (const panel of opportunityPanels) {
    await tapDebug(page, `shop-control.opportunity-engine.panel.${panel}`);
    const panelFinding = await collectPanelAudit(page, `opportunity-engine:${panel}`);
    if (panelFinding) findings.push(panelFinding);
  }

  if (findings.length > 0) {
    console.error("Shop Control Advanced Analytics mobile visual audit found review items:");
    for (const finding of findings) {
      console.error(`- ${finding.label}`);
      for (const item of finding.findings) console.error(`  ${item}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Shop Control Advanced Analytics mobile visual audit passed.");
  }
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
