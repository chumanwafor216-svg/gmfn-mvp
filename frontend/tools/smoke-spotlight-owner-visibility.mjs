/* global console, document, localStorage, window */

import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ownerGsnId = "GSN-U-SPOTOWNER";
const visitorGsnId = "GSN-U-SPOTVISITOR";
const activatedAt = "2026-10-16T14:35:00Z";
const authorizedExpiry = "2026-10-17T14:35:00Z";
const shop = {
  id: 101,
  shop_id: 101,
  clan_id: 8,
  owner_user_id: 216,
  gmfn_id: ownerGsnId,
  owner_gmfn_id: ownerGsnId,
  name: "Owner Visibility Shop",
  shop_name: "Owner Visibility Shop",
  description: "Synthetic owner visibility qualification shop.",
  is_active: true,
};
const product = {
  id: 1,
  product_id: 1,
  shop_id: 101,
  clan_id: 8,
  seller_user_id: 216,
  title: "Independent Shop Diary product",
  name: "Independent Shop Diary product",
  description: "Products and Shop Diary remain separate from Spotlight.",
  price: "10.00",
  currency: "TST",
  visibility_mode: "community_visible",
  is_active: true,
  public_block_number: 1,
  slot_number: 1,
};
const clan = {
  id: 8,
  clan_id: 8,
  name: "Owner Visibility Community",
  marketplace_name: "Owner Visibility Market",
  status: "active",
};
const diaryEntry = {
  id: 91,
  shop_id: 101,
  clan_id: 8,
  entry_type: "owner_update",
  title: "Independent diary entry",
  message: "Shop Diary stayed separate from Spotlight owner inspection.",
  text: "Shop Diary stayed separate from Spotlight owner inspection.",
  visibility: "public",
  is_active: true,
  occurred_at: "2026-10-16T15:00:00Z",
  created_at: "2026-10-16T15:00:00Z",
};

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function apiPath(urlText) {
  return new URL(urlText).pathname.replace(/^\/api/, "");
}

function isApi(urlText) {
  const url = new URL(urlText);
  return (
    url.port === "8000" ||
    [
      "/api/",
      "/auth/",
      "/clans/",
      "/community-domains",
      "/dashboard",
      "/marketplace",
      "/notifications",
      "/shop-diaries",
      "/trust",
    ].some((prefix) => url.pathname.startsWith(prefix))
  );
}

function member(identity) {
  return {
    id: identity === ownerGsnId ? 216 : 317,
    user_id: identity === ownerGsnId ? 216 : 317,
    display_name: identity === ownerGsnId ? "Synthetic Owner" : "Synthetic Visitor",
    email: "synthetic@example.invalid",
    gmfn_id: identity,
    role: "member",
    status: "active",
  };
}

function spotlightItem({ label = "Owner saved Spotlight", canonical = false } = {}) {
  return {
    id: canonical ? 502 : 501,
    broadcast_id: canonical ? 502 : 501,
    shop_id: canonical ? 202 : 101,
    clan_id: 8,
    author_user_id: canonical ? 318 : 216,
    author_gmfn_id: canonical ? "GSN-U-OTHEROWNER" : ownerGsnId,
    source_shop_name: canonical ? "Eligible visitor source" : "Owner Visibility Shop",
    message: label,
    image_url: null,
    video_url: null,
    priority_mode: "free",
    visibility_scope: "direct_communities",
    serving_status: "serving",
    campaign_serving_status: "serving",
    content_version: 1,
    created_at: activatedAt,
    expires_at: authorizedExpiry,
    authorized_expires_at: authorizedExpiry,
    is_canonical_opportunity: canonical,
    opportunity_campaign_id: canonical ? 702 : undefined,
    spotlight_campaign_id: canonical ? 702 : 701,
    opportunity_presentation_id: canonical ? "visitor-presentation" : undefined,
    opportunity_presentation_token: canonical
      ? "visitor-presentation-token-123456789"
      : undefined,
    opportunity_presentation_expires_at: canonical
      ? new Date(Date.now() + 25_000).toISOString()
      : undefined,
    opportunity_presentation_surface: canonical
      ? "public_shop_spotlight_rail"
      : undefined,
  };
}

function ownerInspection(state = "live") {
  return {
    state,
    campaign: {
      campaign_id: 701,
      status: state === "withdrawn" ? "ended" : "active",
      serving_status:
        state === "correction_hold"
          ? "correction_hold"
          : state === "withdrawn"
          ? "withdrawn"
          : "serving",
      content_version: 1,
      activated_at: activatedAt,
      authorized_expires_at: authorizedExpiry,
    },
    item: state === "live" ? spotlightItem() : null,
    counts_as_delivery: false,
    counts_as_exposure: false,
  };
}

function genericPayload(path, identity) {
  if (path === "/auth/me" || path === "/users/me") return member(identity);
  if (path === "/clans/me") return { items: [clan] };
  if (path.includes("/clans/select")) return { selected_clan_id: 8 };
  if (path.startsWith("/marketplace/shops/me")) {
    return { item: shop, shop, products: [product] };
  }
  if (path.startsWith("/marketplace/products")) {
    return { items: [product], products: [product] };
  }
  if (path.startsWith("/community-domains")) return { items: [] };
  if (path.startsWith("/trust")) return { score: 0, band: "Not shown", events: [] };
  return { items: [], results: [], records: [], total: 0, status: "ok" };
}

async function newPage(browser, identity = "") {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  if (identity) {
    await page.addInitScript((storedIdentity) => {
      localStorage.setItem("access_token", "synthetic-owner-visibility-token");
      localStorage.setItem("gmfn_current_id", storedIdentity);
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn_companion_settings_local",
        JSON.stringify({ companionMode: "off" })
      );
    }, identity);
  }
  return { context, page };
}

async function installMocks(page, scenario) {
  await page.route("**/*", async (route) => {
    if (!isApi(route.request().url())) return route.continue();
    const path = apiPath(route.request().url());
    if (path === `/marketplace/public/shop/${ownerGsnId}`) {
      return route.fulfill(
        json({
          ok: true,
          item: shop,
          shop,
          products: [product],
          broadcasts: [spotlightItem()],
          primary_broadcast: spotlightItem(),
          clan_id: 8,
        })
      );
    }
    if (path.startsWith(`/shop-diaries/public/${ownerGsnId}`)) {
      scenario.diaryCalls += 1;
      return route.fulfill(json({ items: [diaryEntry], total: 1 }));
    }
    if (path === "/marketplace/shops/101/spotlight-status") {
      scenario.ownerStatusCalls += 1;
      return route.fulfill(
        json({
          ok: true,
          shop_id: 101,
          owner_spotlight_inspection: ownerInspection(scenario.ownerState),
        })
      );
    }
    if (path.endsWith("/spotlight-opportunity")) {
      scenario.canonicalCalls += 1;
      const item = spotlightItem({ label: "Visitor eligible Spotlight", canonical: true });
      return route.fulfill(
        json({
          serving_contract_version: 2,
          item,
          presentation: {
            presentation_id: item.opportunity_presentation_id,
            presentation_token: item.opportunity_presentation_token,
            presentation_expires_at: item.opportunity_presentation_expires_at,
          },
        })
      );
    }
    if (path === "/marketplace/spotlight-presentations/qualify") {
      scenario.qualifyCalls += 1;
      return route.fulfill(json({ ok: true, qualified: true }));
    }
    if (path === "/marketplace/analytics/attention") {
      const payload = route.request().postDataJSON();
      if (payload?.event_type === "spotlight_impression") {
        scenario.impressionCalls += 1;
      }
      return route.fulfill(json({ ok: true }));
    }
    if (path === "/marketplace/broadcasts") {
      scenario.legacyBroadcastCalls += 1;
      return route.fulfill(json({ items: [spotlightItem()] }));
    }
    return route.fulfill(json(genericPayload(path, scenario.identity)));
  });
}

async function openOwnerSpotlight(page) {
  const summary = page.locator('[data-public-shop-more="secondary"] summary');
  await summary.waitFor({ state: "visible", timeout: 15_000 });
  if ((await page.locator('[data-public-shop-more="secondary"]').getAttribute("open")) === null) {
    await summary.click();
  }
  await page
    .locator('[data-owner-spotlight-inspection="live"]')
    .waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText("Owner saved Spotlight", { exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
}

async function testOwnerReopenPreviewBackAndResume(browser, baseUrl) {
  const scenario = {
    identity: ownerGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
  };
  const { context, page } = await newPage(browser, ownerGsnId);
  await installMocks(page, scenario);

  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await openOwnerSpotlight(page);

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  await page.goto(
    `${baseUrl}/shop/${ownerGsnId}?owner_spotlight_preview=1#public-shop-spotlight`,
    { waitUntil: "domcontentloaded", timeout: 60_000 }
  );
  await page.getByText("Owner preview · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  await page.evaluate(() => {
    let state = "hidden";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    state = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  if (scenario.canonicalCalls !== 0 || scenario.legacyBroadcastCalls !== 0) {
    throw new Error(
      `Owner inspection entered delivery feeds: canonical=${scenario.canonicalCalls}, legacy=${scenario.legacyBroadcastCalls}`
    );
  }
  if (scenario.qualifyCalls !== 0 || scenario.impressionCalls !== 0) {
    throw new Error(
      `Owner inspection counted exposure: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  if (scenario.ownerStatusCalls < 4) {
    throw new Error(`Owner status was not revalidated across navigation/resume: ${scenario.ownerStatusCalls}`);
  }
  if (scenario.diaryCalls < 1) throw new Error("Shop Diary stopped loading independently.");
  await context.close();
  return scenario;
}

async function testDelayedOwnerAuthentication(browser, baseUrl) {
  const scenario = {
    identity: ownerGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
  };
  const { context, page } = await newPage(browser);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByText("More from this shop", { exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });

  await page.evaluate((identity) => {
    localStorage.setItem("access_token", "synthetic-delayed-owner-token");
    localStorage.setItem("gmfn_current_id", identity);
    localStorage.setItem("gmfn_selected_clan_id", "8");
    window.dispatchEvent(new CustomEvent("GSN_AUTH_SESSION_CHANGED"));
  }, ownerGsnId);
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  if (scenario.ownerStatusCalls < 1) {
    throw new Error("Delayed owner authentication did not load the owner status read.");
  }
  await context.close();
  return scenario;
}

async function testVisitorCannotForceOwnerPreview(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(
    `${baseUrl}/shop/${ownerGsnId}?owner_spotlight_preview=1#public-shop-spotlight`,
    { waitUntil: "domcontentloaded", timeout: 60_000 }
  );
  await page.getByText("Visitor eligible Spotlight", { exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await page.waitForTimeout(1_400);
  const body = await page.locator("body").innerText();
  if (body.includes("Owner saved Spotlight") || body.includes("Owner preview · Live")) {
    throw new Error("A visitor forced the owner inspection branch with a query flag.");
  }
  if (scenario.ownerStatusCalls !== 0 || scenario.canonicalCalls < 1) {
    throw new Error(
      `Visitor path was not canonical-only: ownerStatus=${scenario.ownerStatusCalls}, canonical=${scenario.canonicalCalls}`
    );
  }
  if (scenario.qualifyCalls < 1 || scenario.impressionCalls < 1) {
    throw new Error(
      `Visitor presentation did not retain qualifying exposure handling: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  await context.close();
  return scenario;
}

async function testExpiredOwnerContentFailsClosed(browser, baseUrl) {
  const scenario = {
    identity: ownerGsnId,
    ownerState: "expired",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
  };
  const { context, page } = await newPage(browser, ownerGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}?owner_spotlight_preview=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByText("Owner preview · Expired", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  const body = await page.locator("body").innerText();
  if (body.includes("Owner saved Spotlight")) {
    throw new Error("Expired owner content was replayed from the public-shop cache/feed.");
  }
  await context.close();
  return scenario;
}

const server = await createServer({
  root: frontendRoot,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 5201, strictPort: true },
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });

try {
  const results = [
    await testOwnerReopenPreviewBackAndResume(browser, baseUrl),
    await testDelayedOwnerAuthentication(browser, baseUrl),
    await testVisitorCannotForceOwnerPreview(browser, baseUrl),
    await testExpiredOwnerContentFailsClosed(browser, baseUrl),
  ];
  console.log(
    JSON.stringify(
      {
        ok: true,
        environment: "local Vite + mocked synthetic API",
        results,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
  await server.close();
}
