/* global console, document, localStorage, process, setTimeout, URL */

import { chromium } from "playwright";

const DEFAULT_FRONTEND_URL = "https://gmfn-frontend.onrender.com";
const FRONTEND_URL = (process.env.GSN_AUDIT_BASE_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, "");
const SECONDARY_DELAY_MS = 21000;
const MAX_FIRST_SURFACE_MS = 7000;

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function apiPathFrom(urlText) {
  const url = new URL(urlText);
  if (url.pathname.startsWith("/api/")) return url.pathname.replace(/^\/api/, "");
  return url.pathname;
}

function isApiRequest(urlText) {
  const url = new URL(urlText);
  return (
    url.hostname === "gmfn-api.onrender.com" ||
    url.pathname.startsWith("/api/") ||
    ["auth", "clans", "notifications", "loans", "trust", "trust-slips", "marketplace", "public"].some(
      (part) => url.pathname.startsWith(`/${part}`)
    )
  );
}

const mePayload = {
  id: 216,
  user_id: 216,
  display_name: "Live Timing Holder",
  name: "Live Timing Holder",
  gmfn_id: "GMFN-U-LIVE-TIMING",
  gsn_id: "GMFN-U-LIVE-TIMING",
  role: "member",
  phone_verified: true,
};

const clanPayload = {
  id: 8,
  clan_id: 8,
  name: "Live Timing Community",
  display_name: "Live Timing Community",
  community_name: "Live Timing Community",
  clan_code: "GMFN-C-LIVE-TIMING",
  community_code: "GMFN-C-LIVE-TIMING",
  gmfn_id: "GMFN-C-LIVE-TIMING",
  role: "member",
  member_count: 18,
};

const trustSlipPayload = {
  verified: true,
  active: true,
  status: "active",
  user_id: 216,
  clan_id: 8,
  gmfn_id: "GMFN-U-LIVE-TIMING",
  display_name: "Live Timing Holder",
  community: "Live Timing Community",
  community_id: 8,
  community_global_id: "GMFN-C-LIVE-TIMING",
  community_code: "GMFN-C-LIVE-TIMING",
  holder_role: "member",
  active_member_count: 18,
  phone_recorded: true,
  phone_verified: true,
  bank_details_recorded: true,
  bank_verified: false,
  passport_recorded: true,
  passport_verified: true,
  official_id_recorded: true,
  official_id_verified: true,
  community_identity_confirmed: true,
  identity_verified: true,
  community_activity_count: 5,
  community_activity_categories: ["Participation", "Contribution"],
  member_witness_count: 4,
  level: "B",
  band: "B",
  level_label: "Strong community evidence",
  lifetime_trust: "74",
  standing_score: "74",
  trust_score: "74",
  trust_slip_limit: "250000",
  trust_limit: "250000",
  currency: "NGN",
  code: "GSN-LIVE-TIMING",
  verification_code: "GSN-LIVE-TIMING",
  issued_at: "2026-07-05T08:00:00.000Z",
  expires_at: "2035-07-05T08:00:00.000Z",
  cci_score: "81",
  cci_band: "B",
  graph_score: "81",
  active_clan_count: 5,
  community_footprint: [
    {
      community_name: "Live Timing Community",
      community_code: "GMFN-C-LIVE-TIMING",
      role: "member",
    },
  ],
  community_role_counts: { member: 1 },
  sponsor_count: 3,
  unique_counterparties: 4,
  risk_flags: [],
  is_current: true,
  not_a_bank_guarantee: true,
  no_auto_debit: true,
  public_verify_url: "/t/GSN-LIVE-TIMING",
  evidence_summary: {
    capacity_context: {
      available_guarantee_capacity: "250000",
      current_locked_guarantees: "0",
      overexposure_ratio: "0",
      risk_level: "low",
      reasons: ["Current visible TrustSlip evidence is active."],
    },
  },
  merchant_summary: {
    gmfn_id: "GMFN-U-LIVE-TIMING",
    display_name: "Live Timing Holder",
    community: "Live Timing Community",
    band: "B",
    trust_limit: "250000",
    currency: "NGN",
    phone_recorded: true,
    phone_verified: true,
    member_witness_count: 4,
    community_activity_count: 5,
    community_activity_categories: ["Participation", "Contribution"],
  },
};

function shouldDelay(path, mode) {
  if (mode === "trust") {
    return (
      path === "/trust/me/why" ||
      path === "/trust-slips/me/summary" ||
      path === "/trust-slips/me-summary" ||
      path === "/trust-slips/summary/me" ||
      /^\/trust-explainability/.test(path) ||
      /^\/trust_explainability/.test(path)
    );
  }

  if (mode === "trust-slip") {
    return /^\/trust-slips\/me\/decision-pack/.test(path);
  }

  return false;
}

function payloadFor(path) {
  if (path === "/auth/me") return mePayload;
  if (path === "/clans/me") return [clanPayload];
  if (path === "/trust/me/why") {
    return {
      user_id: 216,
      current_score: "74",
      score: "74",
      band: "B",
      latest_reason: "Current community evidence remains visible.",
      recent_events: [],
    };
  }
  if (/^\/trust-explainability/.test(path) || /^\/trust_explainability/.test(path)) {
    return {
      user_id: 216,
      score: "74",
      band: "B",
      event_count: 7,
      breakdown: { computed_score: "74", computed_band: "B" },
    };
  }
  if (/^\/trust-slips\/me\/decision-pack/.test(path)) {
    return { items: [], results: [], total: 0 };
  }
  if (/^\/trust-slips\/me/.test(path)) return trustSlipPayload;
  return { items: [], results: [], total: 0, ok: true };
}

async function measureRoute(browser, test) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "live-trust-first-paint-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  const page = await context.newPage();
  const delayed = new Map();
  const requests = [];
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (!isApiRequest(url)) {
      await route.continue();
      return;
    }

    const path = apiPathFrom(url);
    requests.push(`${route.request().method().toUpperCase()} ${path}`);
    if (shouldDelay(path, test.mode)) {
      delayed.set(path, (delayed.get(path) || 0) + 1);
      await sleep(SECONDARY_DELAY_MS);
    }
    await route.fulfill(json(payloadFor(path)));
  });

  const startedAt = Date.now();
  await page.goto(`${FRONTEND_URL}${test.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector(test.selector, { timeout: MAX_FIRST_SURFACE_MS });
  await page.waitForFunction(
    (requiredText) => (document.body.textContent || "").includes(requiredText),
    test.text,
    { timeout: MAX_FIRST_SURFACE_MS }
  );
  const firstSurfaceMs = Date.now() - startedAt;
  const loadingTextStillVisible = await page.evaluate(
    (loadingText) => (document.body.textContent || "").includes(loadingText),
    test.loadingText
  );

  await context.close();
  return {
    name: test.name,
    firstSurfaceMs,
    loadingTextStillVisible,
    delayed: Object.fromEntries(Array.from(delayed.entries()).sort()),
    requestCount: requests.length,
    errors: errors.slice(0, 3),
  };
}

async function run() {
  const tests = [
    {
      name: "Live production Trust Passport bundle",
      mode: "trust",
      path: "/app/trust?community=8",
      selector: '[data-trust-passport-decision-first="one-answer-four-facts"]',
      text: "Aggregate Passport reading",
      loadingText: "Loading Trust Passport",
    },
    {
      name: "Live production TrustSlip holder bundle",
      mode: "trust-slip",
      path: "/app/trust-slip?community=8",
      selector: '[data-gsn-trust-document-certificate="trustslip-holder"]',
      text: "TrustSlip holder",
      loadingText: "Loading TrustSlip",
    },
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const test of tests) {
      results.push(await measureRoute(browser, test));
    }

    const failures = results.filter(
      (result) =>
        result.firstSurfaceMs > MAX_FIRST_SURFACE_MS ||
        result.loadingTextStillVisible ||
        result.errors.length ||
        (result.name.includes("Trust Passport") &&
          (!["/trust/me/why", "/trust-slips/me/summary"].every((path) => result.delayed[path]))) ||
        (result.name.includes("TrustSlip") && Object.keys(result.delayed).length > 0)
    );

    const payload = {
      frontend: FRONTEND_URL,
      secondaryDelayMs: SECONDARY_DELAY_MS,
      maxFirstSurfaceMs: MAX_FIRST_SURFACE_MS,
      results,
    };

    if (failures.length) {
      console.error("Live Trust first-paint audit failed:", JSON.stringify({ ...payload, failures }, null, 2));
      process.exit(1);
    }

    console.log(`Live Trust first-paint audit passed: ${JSON.stringify(payload)}.`);
  } finally {
    await browser.close().catch(() => {});
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
