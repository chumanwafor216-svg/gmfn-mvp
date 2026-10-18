/* global console, document, localStorage, window, URL, Event, CustomEvent */

import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ownerGsnId = "GSN-U-SPOTOWNER";
const visitorGsnId = "GSN-U-SPOTVISITOR";
const activatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const authorizedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
  image_url:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='%2308274A'/%3E%3C/svg%3E",
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

function spotlightItem({
  label = "Owner saved Spotlight",
  canonical = false,
  replay = false,
  streamIndex = 1,
} = {}) {
  const canonicalOffset = Math.max(Number(streamIndex || 1) - 1, 0);
  return {
    id: canonical ? 502 + canonicalOffset : 501,
    broadcast_id: canonical ? 502 + canonicalOffset : 501,
    shop_id: canonical ? 202 + canonicalOffset : 101,
    clan_id: 8,
    author_user_id: canonical ? 318 + canonicalOffset : 216,
    author_gmfn_id: canonical ? `GSN-U-OTHEROWNER-${streamIndex}` : ownerGsnId,
    source_shop_name: canonical ? `Eligible visitor source ${streamIndex}` : "Owner Visibility Shop",
    source_shop_whatsapp: "+441234567890",
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
    is_canonical_replay: canonical && replay,
    opportunity_campaign_id: canonical ? 702 + canonicalOffset : undefined,
    spotlight_campaign_id: canonical ? 702 + canonicalOffset : 701,
    opportunity_presentation_id: canonical ? `visitor-presentation-${streamIndex}` : undefined,
    opportunity_presentation_token: canonical && !replay
      ? `visitor-presentation-token-${streamIndex}-123456789`
      : undefined,
    opportunity_presentation_expires_at: canonical && !replay
      ? new Date(Date.now() + 25_000).toISOString()
      : undefined,
    opportunity_replay_expires_at: canonical && replay
      ? new Date(Date.now() + 2 * 60_000).toISOString()
      : undefined,
    opportunity_counts_as_delivery: canonical && replay ? false : undefined,
    opportunity_counts_as_exposure: canonical && replay ? false : undefined,
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
      const streamIndex = scenario.canonicalCalls;
      if (streamIndex > scenario.streamLimit) {
        if (scenario.replayAfterStream) {
          scenario.replayResponses = Number(scenario.replayResponses || 0) + 1;
          const items = Array.from(
            { length: scenario.streamLimit },
            (_, index) =>
              spotlightItem({
                label:
                  index === 0
                    ? "Visitor eligible Spotlight"
                    : `Community Spotlight ${index + 1}`,
                canonical: true,
                replay: true,
                streamIndex: index + 1,
              })
          );
          return route.fulfill(
            json({
              serving_contract_version: 2,
              item: items[0] || null,
              items,
              presentation: null,
              rejection_code: "no_delivery_opportunity",
            })
          );
        }
        return route.fulfill(
          json({
            serving_contract_version: 2,
            item: null,
            items: [],
            presentation: null,
            rejection_code: "no_delivery_opportunity",
          })
        );
      }
      const item = spotlightItem({
        label:
          streamIndex === 1
            ? "Visitor eligible Spotlight"
            : `Community Spotlight ${streamIndex}`,
        canonical: true,
        streamIndex,
      });
      return route.fulfill(
        json({
          serving_contract_version: 2,
          item,
          items: [item],
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
    streamLimit: 4,
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
  const spotlightRail = page.locator("#public-shop-spotlight");
  const spotlightWhatsApp = spotlightRail.getByRole("button", {
    name: /WhatsApp/i,
  });
  await spotlightWhatsApp.waitFor({ state: "visible", timeout: 15_000 });
  const [railBounds, whatsappBounds] = await Promise.all([
    spotlightRail.boundingBox(),
    spotlightWhatsApp.boundingBox(),
  ]);
  if (
    !railBounds ||
    !whatsappBounds ||
    whatsappBounds.x < railBounds.x - 1 ||
    whatsappBounds.x + whatsappBounds.width > railBounds.x + railBounds.width + 1
  ) {
    throw new Error("Compact Spotlight WhatsApp action overflowed the card bounds.");
  }
  await openOwnerSpotlight(page);
  await page.waitForTimeout(1_200);
  if (scenario.qualifyCalls !== 0 || scenario.impressionCalls !== 0) {
    throw new Error(
      `Owner inspection counted exposure before another member appeared: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  await page.getByText("Visitor eligible Spotlight", { exact: true }).waitFor({
    state: "visible",
    timeout: 8_000,
  });
  await page
    .locator('[data-spotlight-canonical="true"]')
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_400);
  if (scenario.qualifyCalls < 1 || scenario.impressionCalls < 1) {
    throw new Error(
      `Another member's Spotlight did not qualify normally: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  for (const label of [
    "Community Spotlight 2",
    "Community Spotlight 3",
    "Community Spotlight 4",
  ]) {
    await page.getByText(label, { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }
  await page.waitForTimeout(1_400);
  if (scenario.canonicalCalls < 4 || scenario.qualifyCalls < 4) {
    throw new Error(
      `Just-in-time feed did not advance through four governed members: canonical=${scenario.canonicalCalls}, qualify=${scenario.qualifyCalls}`
    );
  }

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  const canonicalCallsBeforePreview = scenario.canonicalCalls;
  await page.goto(
    `${baseUrl}/shop/${ownerGsnId}?owner_spotlight_preview=1#public-shop-spotlight`,
    { waitUntil: "domcontentloaded", timeout: 60_000 }
  );
  await page.getByText("Owner preview · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await page.waitForTimeout(300);
  if (scenario.canonicalCalls !== canonicalCallsBeforePreview) {
    throw new Error("Explicit owner Preview consumed another member's delivery opportunity.");
  }
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

  if (scenario.canonicalCalls < 1 || scenario.legacyBroadcastCalls !== 0) {
    throw new Error(
      `Ordinary owner entry did not use the governed member feed cleanly: canonical=${scenario.canonicalCalls}, legacy=${scenario.legacyBroadcastCalls}`
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
    streamLimit: 1,
  };
  const { context, page } = await newPage(browser);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator('[data-public-shop-more="secondary"] > summary').waitFor({
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
    streamLimit: 1,
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
    streamLimit: 1,
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
  const expiredRail = page.locator("#public-shop-spotlight");
  if (
    (await expiredRail.getByRole("button", { name: /WhatsApp/i }).count()) !== 0
  ) {
    throw new Error("Expired Spotlight kept an actionable WhatsApp contact.");
  }
  if ((await expiredRail.locator('img[alt="Owner Visibility Shop"]').count()) !== 0) {
    throw new Error("Expired Spotlight reused the shop hero as if it were live campaign media.");
  }
  await context.close();
  return scenario;
}

async function testCanonicalReplayKeepsCommunityRotationWithoutDoubleCounting(
  browser,
  baseUrl
) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 3,
    replayAfterStream: true,
    replayResponses: 0,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page
    .locator('[data-spotlight-canonical="true"]')
    .scrollIntoViewIfNeeded();

  const waitForSpotlightLabel = async (label) => {
    await page.getByText(label, { exact: true }).waitFor({
      state: "visible",
      timeout: 15_000,
    });
    return Date.now();
  };
  const assertReadableDwell = (fromLabel, fromTime, toLabel, toTime) => {
    const dwellMs = toTime - fromTime;
    if (dwellMs < 4_500) {
      throw new Error(
        "Spotlight rotated too quickly from " +
          fromLabel +
          " to " +
          toLabel +
          ": " +
          dwellMs +
          "ms"
      );
    }
  };

  const firstVisibleAt = await waitForSpotlightLabel("Visitor eligible Spotlight");
  await page.evaluate(() => {
    window.open = () => null;
  });
  await page
    .locator("#public-shop-spotlight")
    .getByRole("button", { name: /WhatsApp/i })
    .tap();
  const secondVisibleAt = await waitForSpotlightLabel("Community Spotlight 2");
  assertReadableDwell(
    "Visitor eligible Spotlight",
    firstVisibleAt,
    "Community Spotlight 2",
    secondVisibleAt
  );
  if (secondVisibleAt - firstVisibleAt > 14_000) {
    throw new Error(
      "Touch-focused Spotlight contact paused rotation beyond the bounded interaction window."
    );
  }
  const thirdVisibleAt = await waitForSpotlightLabel("Community Spotlight 3");
  assertReadableDwell(
    "Community Spotlight 2",
    secondVisibleAt,
    "Community Spotlight 3",
    thirdVisibleAt
  );
  const firstReplayAt = await waitForSpotlightLabel("Visitor eligible Spotlight");
  assertReadableDwell(
    "Community Spotlight 3",
    thirdVisibleAt,
    "Visitor eligible Spotlight",
    firstReplayAt
  );

  const qualifiedBeforeReplayRotation = scenario.qualifyCalls;
  const impressionsBeforeReplayRotation = scenario.impressionCalls;
  const secondReplayAt = await waitForSpotlightLabel("Community Spotlight 2");
  assertReadableDwell(
    "Visitor eligible Spotlight",
    firstReplayAt,
    "Community Spotlight 2",
    secondReplayAt
  );

  if (scenario.replayResponses < 1 || scenario.canonicalCalls < 4) {
    throw new Error(
      `Canonical replay was not requested after fresh delivery stopped: calls=${scenario.canonicalCalls}, replay=${scenario.replayResponses}`
    );
  }
  if (
    scenario.qualifyCalls !== qualifiedBeforeReplayRotation ||
    scenario.impressionCalls !== impressionsBeforeReplayRotation
  ) {
    throw new Error(
      `Canonical replay double-counted visibility: qualify=${scenario.qualifyCalls}/${qualifiedBeforeReplayRotation}, impressions=${scenario.impressionCalls}/${impressionsBeforeReplayRotation}`
    );
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
    await testCanonicalReplayKeepsCommunityRotationWithoutDoubleCounting(
      browser,
      baseUrl
    ),
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
